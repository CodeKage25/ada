import os
import uuid

import pytest
from fastapi import HTTPException

_db = pytest.mark.skipif(not os.getenv("RUN_DB_TESTS"), reason="requires Postgres")


async def test_require_admin_allows_allowlisted_and_rejects_others(monkeypatch):
    from ada.auth import admin as adm
    from ada.db.models import User

    class _S:
        admin_email_set = {"boss@ada.dev"}

    monkeypatch.setattr(adm, "get_settings", lambda: _S())

    # Case-insensitive match on the allowlist.
    ok = await adm.require_admin(User(id="1", email="Boss@ada.dev"))
    assert ok.id == "1"

    with pytest.raises(HTTPException) as exc:
        await adm.require_admin(User(id="2", email="rando@example.com"))
    assert exc.value.status_code == 403


@_db
async def test_audit_survives_user_deletion_and_overview_shape():
    from sqlalchemy import delete

    from ada.db.models import AdminAudit, Profile, User
    from ada.db.repositories import AdminRepository
    from ada.db.session import _session_factory, init_db

    await init_db()
    uid = uuid.uuid4().hex
    try:
        async with _session_factory() as s:
            s.add(User(id=uid, email=f"{uid}@ex.com"))
            await s.commit()
            s.add(Profile(user_id=uid, profile_text="cv", full_name="Test User"))
            await s.commit()

        async with _session_factory() as s:
            repo = AdminRepository(s)
            await repo.record_audit(
                admin_email="boss@ada.dev", action="delete_user", target_user_id=uid,
                detail={"email": f"{uid}@ex.com"},
            )
            # Delete the user; the child Profile must go, the audit row must remain.
            await repo.delete_user(uid)

        async with _session_factory() as s:
            assert await s.get(User, uid) is None
            assert await s.get(Profile, uid) is None
            repo = AdminRepository(s)
            trail = await repo.list_audit(limit=50)
            mine = [a for a in trail if a.target_user_id == uid]
            assert mine and mine[0].action == "delete_user"  # audit outlives the deletion

            ov = await repo.overview()
            for key in ("users_total", "runs_by_status", "subscriptions_by_tier", "revenue"):
                assert key in ov
    finally:
        async with _session_factory() as s:
            await s.execute(delete(AdminAudit).where(AdminAudit.target_user_id == uid))
            await s.execute(delete(Profile).where(Profile.user_id == uid))
            await s.execute(delete(User).where(User.id == uid))
            await s.commit()


@_db
async def test_delete_employer_cascades_company_and_saved_candidates():
    """An employer has rows candidates don't (company profile, saved candidates, intro
    messages). Missing any of them made admin deletion crash on a FK violation."""
    import uuid as _uuid

    from sqlalchemy import delete, select

    from ada.db.models import (
        CompanyProfile,
        Intro,
        IntroMessage,
        IntroStatus,
        Job,
        SavedCandidate,
        User,
    )
    from ada.db.repositories import AdminRepository
    from ada.db.session import _session_factory, init_db

    await init_db()
    emp, cand = _uuid.uuid4().hex, _uuid.uuid4().hex
    job_id: int | None = None
    intro_id = _uuid.uuid4().hex
    try:
        async with _session_factory() as s:
            s.add(User(id=emp, email=f"{emp}@co.com", account_type="employer", company="Acme"))
            s.add(User(id=cand, email=f"{cand}@ex.com"))
            await s.commit()
            job = Job(source="test", external_id=_uuid.uuid4().hex, title="SWE",
                      company="Acme", location="Remote", description="d", posted_by=emp)
            s.add(job)
            s.add(CompanyProfile(user_id=emp, name="Acme"))
            await s.commit()
            job_id = job.id
            s.add(SavedCandidate(id=_uuid.uuid4().hex, employer_id=emp,
                                 candidate_id=cand, job_id=job_id))
            s.add(Intro(id=intro_id, employer_id=emp, candidate_id=cand, job_id=job_id,
                        message=None, status=IntroStatus.ACCEPTED))
            await s.commit()
            s.add(IntroMessage(intro_id=intro_id, sender="employer", body="hello"))
            await s.commit()

        async with _session_factory() as s:
            await AdminRepository(s).delete_user(emp)

        async with _session_factory() as s:
            assert await s.get(User, emp) is None
            assert await s.get(CompanyProfile, emp) is None
            left = (await s.execute(select(SavedCandidate).where(
                SavedCandidate.employer_id == emp))).scalars().all()
            assert not left
            msgs = (await s.execute(select(IntroMessage).where(
                IntroMessage.intro_id == intro_id))).scalars().all()
            assert not msgs
            # The posted role survives the employer, with its owner cleared.
            job = await s.get(Job, job_id)
            assert job is not None and job.posted_by is None
    finally:
        async with _session_factory() as s:
            await s.execute(delete(IntroMessage).where(IntroMessage.intro_id == intro_id))
            await s.execute(delete(Intro).where(Intro.id == intro_id))
            await s.execute(delete(SavedCandidate).where(SavedCandidate.candidate_id == cand))
            if job_id is not None:
                await s.execute(delete(Job).where(Job.id == job_id))
            await s.execute(delete(CompanyProfile).where(CompanyProfile.user_id == emp))
            await s.execute(delete(User).where(User.id.in_([emp, cand])))
            await s.commit()


@_db
async def test_delete_job_removes_it_and_its_references():
    """A spam or test listing must leave the pool completely — a dangling triage row
    would let the feed resurface a job that no longer exists."""
    import uuid as _uuid

    from sqlalchemy import delete, select

    from ada.db.models import Intro, IntroMessage, IntroStatus, Job, JobInteraction, User
    from ada.db.repositories import AdminRepository
    from ada.db.session import _session_factory, init_db

    await init_db()
    emp, cand = _uuid.uuid4().hex, _uuid.uuid4().hex
    intro_id = _uuid.uuid4().hex
    job_id: int | None = None
    try:
        async with _session_factory() as s:
            s.add(User(id=emp, email=f"{emp}@co.com", account_type="employer"))
            s.add(User(id=cand, email=f"{cand}@ex.com"))
            await s.commit()
            job = Job(source="test", external_id=_uuid.uuid4().hex, title="Spam Role",
                      company="Acme E2E", location="Remote", description="d", posted_by=emp)
            s.add(job)
            await s.commit()
            job_id = job.id
            s.add(JobInteraction(user_id=cand, job_id=job_id, action="tracked"))
            s.add(Intro(id=intro_id, employer_id=emp, candidate_id=cand, job_id=job_id,
                        message=None, status=IntroStatus.REQUESTED))
            await s.commit()
            s.add(IntroMessage(intro_id=intro_id, sender="employer", body="hi"))
            await s.commit()

        async with _session_factory() as s:
            identity = await AdminRepository(s).delete_job(job_id)
        assert identity == ("Spam Role", "Acme E2E")

        async with _session_factory() as s:
            assert await s.get(Job, job_id) is None
            left = (await s.execute(select(JobInteraction).where(
                JobInteraction.job_id == job_id))).scalars().all()
            assert not left
            assert not (await s.execute(select(Intro).where(
                Intro.id == intro_id))).scalars().all()
            assert not (await s.execute(select(IntroMessage).where(
                IntroMessage.intro_id == intro_id))).scalars().all()
            # Deleting an absent job is a clean no-op, not a crash.
            assert await AdminRepository(s).delete_job(job_id) is None
    finally:
        async with _session_factory() as s:
            await s.execute(delete(IntroMessage).where(IntroMessage.intro_id == intro_id))
            await s.execute(delete(Intro).where(Intro.id == intro_id))
            await s.execute(delete(JobInteraction).where(JobInteraction.user_id == cand))
            if job_id is not None:
                await s.execute(delete(Job).where(Job.id == job_id))
            await s.execute(delete(User).where(User.id.in_([emp, cand])))
            await s.commit()
