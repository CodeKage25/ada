import io
import json
import os
import uuid

import pytest

from ada.services.apply import (
    ApplyPrecondition,
    build_answers,
    build_plan,
    cv_docx_bytes,
    is_supported,
)
from ada.services.ats import ApplicantAnswers, split_name
from ada.services.ats.generic import CV_FILE_MARKER, mapping_prompt, parse_mapping

CV_MD = "# Jane Doe\n## Experience\n- Led payments team\n**Skills**: Python"


def _answers() -> ApplicantAnswers:
    return ApplicantAnswers(
        full_name="Jane Doe", first_name="Jane", last_name="Doe",
        email="jane@example.com", phone="+2348000000000", linkedin_url=None,
        cv_filename="Jane-Doe-CV.docx", cv_bytes=b"x",
    )


class _Obj:
    def __init__(self, **kw: object) -> None:
        self.__dict__.update(kw)


def test_split_name():
    assert split_name("Jane Doe") == ("Jane", "Doe")
    assert split_name("Jane Ada Doe") == ("Jane", "Ada Doe")
    assert split_name("Prince") == ("Prince", "Prince")


def test_cv_docx_round_trips():
    from docx import Document

    doc = Document(io.BytesIO(cv_docx_bytes(CV_MD)))
    texts = [p.text for p in doc.paragraphs]
    assert "Jane Doe" in texts
    assert "Led payments team" in texts
    assert any("Skills: Python" in t or "Skills" in t for t in texts)


def test_build_answers_requires_identity():
    user = _Obj(email="jane@example.com")
    with pytest.raises(ApplyPrecondition) as exc:
        build_answers(user, None, CV_MD)
    assert exc.value.code == "identity_required"
    with pytest.raises(ApplyPrecondition):
        build_answers(user, _Obj(full_name="  ", phone=None, linkedin_url=None), CV_MD)


def test_build_answers_shapes_fields():
    user = _Obj(email="jane@example.com")
    profile = _Obj(full_name="Jane Doe", phone=" +234 ", linkedin_url="https://li.in/j")
    answers = build_answers(user, profile, CV_MD)
    assert answers.first_name == "Jane" and answers.last_name == "Doe"
    assert answers.phone == "+234"
    assert answers.cv_filename == "Jane-Doe-CV.docx"
    assert answers.cv_bytes[:2] == b"PK"


@pytest.mark.parametrize(
    ("source", "url", "expected_apply_url"),
    [
        ("greenhouse", "https://boards.greenhouse.io/acme/jobs/1", "https://boards.greenhouse.io/acme/jobs/1"),
        ("lever", "https://jobs.lever.co/acme/uuid", "https://jobs.lever.co/acme/uuid/apply"),
        ("ashby", "https://jobs.ashbyhq.com/acme/uuid", "https://jobs.ashbyhq.com/acme/uuid/application"),
    ],
)
def test_build_plan_per_source(source: str, url: str, expected_apply_url: str):
    plan = build_plan(_Obj(source=source, url=url), _answers())
    assert plan.apply_url == expected_apply_url
    labels = {a.label for a in plan.actions}
    assert "email" in labels and "resume" in labels
    assert plan.submit_selectors and plan.confirmation_markers


def test_build_plan_rejects_missing_url_and_unknown_source():
    with pytest.raises(ApplyPrecondition):
        build_plan(_Obj(source="greenhouse", url=None), _answers())
    with pytest.raises(ApplyPrecondition):
        build_plan(_Obj(source="jooble", url="https://x.example"), _answers())


def test_is_supported_any_source_with_url():
    assert is_supported(_Obj(source="jooble", url="https://x.example"))
    assert not is_supported(_Obj(source="seed", url=None))


def test_mapping_prompt_contains_only_facts_and_rules():
    prompt = mapping_prompt([{"index": 0, "label": "Email"}], _answers())
    assert "jane@example.com" in prompt
    assert CV_FILE_MARKER in prompt
    assert "NEVER invent" in prompt


def test_parse_mapping_validates_shape():
    raw = json.dumps([
        {"index": 0, "value": "Jane Doe"},
        {"index": 99, "value": "out of range"},
        {"index": 1, "value": ""},
        {"index": "bad", "value": "x"},
        "junk",
    ])
    assert parse_mapping(raw, 3) == [(0, "Jane Doe")]
    assert parse_mapping("not json", 3) == []
    assert parse_mapping(json.dumps({"a": 1}), 3) == []


_db = pytest.mark.skipif(not os.getenv("RUN_DB_TESTS"), reason="requires Postgres")


@_db
async def test_application_lifecycle_idempotent_and_tracked():
    from sqlalchemy import delete

    from ada.db.models import Application, ApplicationStatus, Job, User
    from ada.db.repositories import ApplicationRepository, JobRepository
    from ada.db.session import _session_factory, init_db

    await init_db()
    async with _session_factory() as s:
        user = User(id=uuid.uuid4().hex, email=f"{uuid.uuid4().hex}@example.com")
        s.add(user)
        await s.commit()
        job = Job(
            source="greenhouse", external_id=f"apply-{uuid.uuid4().hex}",
            title="QA Engineer", company="Acme", location="Lagos",
            description="test", url="https://boards.greenhouse.io/acme/jobs/9",
        )
        await JobRepository(s).add_many([job])
        repo = ApplicationRepository(s)
        try:
            first, created_first = await repo.create_or_get(
                application_id=uuid.uuid4().hex, user_id=user.id, job_id=job.id, run_id=None
            )
            second, created_second = await repo.create_or_get(
                application_id=uuid.uuid4().hex, user_id=user.id, job_id=job.id, run_id=None
            )
            assert created_first and not created_second
            assert first.id == second.id
            await repo.set_status(first.id, ApplicationStatus.SUBMITTED)
            rows = await repo.list_by_user(user.id)
            assert len(rows) == 1
            application, joined_job = rows[0]
            assert str(application.status) == "submitted"
            assert application.submitted_at is not None
            assert joined_job.title == "QA Engineer"
        finally:
            await s.execute(delete(Application).where(Application.user_id == user.id))
            await s.execute(delete(Job).where(Job.id == job.id))
            await s.execute(delete(User).where(User.id == user.id))
            await s.commit()
