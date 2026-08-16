import os
import uuid

import pytest

from ada.db.models import Job
from ada.ingest import boards
from ada.services.ats import can_retry, looks_blocked, note
from ada.services.ats.resolve import canonical_apply_url

_db = pytest.mark.skipif(not os.getenv("RUN_DB_TESTS"), reason="requires Postgres")


def _job(source: str, company: str, url: str | None, external_id: str = "123") -> Job:
    return Job(source=source, external_id=external_id, title="Engineer", company=company,
               location="Remote", description="d", url=url)


def test_canonical_url_passes_hosted_forms_through():
    hosted = _job("greenhouse", "Acme", "https://boards.greenhouse.io/acme/jobs/123")
    assert canonical_apply_url(hosted) == "https://boards.greenhouse.io/acme/jobs/123"


def test_canonical_url_rebuilds_custom_domains_from_the_registry():
    gh_slug, gh_company = next(iter(boards.GREENHOUSE_BOARDS.items()))
    job = _job("greenhouse", gh_company, "https://example.com/careers/123", external_id="99")
    assert canonical_apply_url(job) == f"https://boards.greenhouse.io/{gh_slug}/jobs/99"

    ashby_slug, ashby_company = next(iter(boards.ASHBY_BOARDS.items()))
    job = _job("ashby", ashby_company, "https://example.com/jobs/x", external_id="u-1")
    assert canonical_apply_url(job) == f"https://jobs.ashbyhq.com/{ashby_slug}/u-1/application"

    lever_slug, lever_company = next(iter(boards.LEVER_COMPANIES.items()))
    job = _job("lever", lever_company, None, external_id="u-2")
    assert canonical_apply_url(job) == f"https://jobs.lever.co/{lever_slug}/u-2/apply"


def test_canonical_url_appends_form_suffixes_on_hosted_pages():
    ashby = _job("ashby", "Any", "https://jobs.ashbyhq.com/org/u-1")
    assert canonical_apply_url(ashby) == "https://jobs.ashbyhq.com/org/u-1/application"
    lever = _job("lever", "Any", "https://jobs.lever.co/org/u-2/apply")
    assert canonical_apply_url(lever) == "https://jobs.lever.co/org/u-2/apply"


def test_canonical_url_unknown_company_or_aggregator_is_none():
    assert canonical_apply_url(_job("greenhouse", "No Such Co", "https://x.com/1")) is None
    assert canonical_apply_url(_job("jooble.org", "Acme", "https://x.com/1")) is None


def test_blocked_page_sniff():
    assert looks_blocked("Just a moment...", "<html>Checking your browser</html>") is True
    assert looks_blocked("Careers", '<div class="cf-turnstile"></div>') is True
    assert looks_blocked("Apply — Acme", "<form><input name='email'></form>") is False


def test_permanent_codes_disable_retry_and_transient_keep_it():
    for code in ("blocked", "no_form", "login_walled", "fields_missing", "manual_questions"):
        assert can_retry(code) is False
    for code in ("timeout", "interrupted", "crashed", None):
        assert can_retry(code) is True


def test_post_submit_outcomes_never_offer_a_blind_retry():
    """Submit was already clicked: retrying could send the employer a duplicate
    application, so these hand off to a manual check instead."""
    assert can_retry("no_confirmation") is False
    assert can_retry("no_submit") is False


async def test_progress_note_is_cosmetic():
    seen: list[str] = []

    async def ok(text: str) -> None:
        seen.append(text)

    async def boom(text: str) -> None:
        raise RuntimeError("db down")

    await note(ok, "Filling…")
    await note(boom, "Submitting…")  # must not raise
    await note(None, "ignored")
    assert seen == ["Filling…"]


@_db
async def test_failure_code_and_progress_lifecycle():
    from sqlalchemy import delete

    from ada.db.models import Application, ApplicationStatus, User
    from ada.db.repositories import ApplicationRepository
    from ada.db.session import _session_factory, init_db

    await init_db()
    uid = uuid.uuid4().hex
    job_id: int | None = None
    try:
        async with _session_factory() as s:
            s.add(User(id=uid, email=f"{uid}@ex.com"))
            await s.commit()
            job = _job("test", "Acme", "https://x.com/j", external_id=uuid.uuid4().hex)
            s.add(job)
            await s.commit()
            job_id = job.id

        async with _session_factory() as s:
            repo = ApplicationRepository(s)
            app, created = await repo.create_or_get(
                application_id=uuid.uuid4().hex, user_id=uid, job_id=job_id, run_id=None
            )
            assert created

            # Live progress lands in detail while PREPARING.
            await repo.set_progress(app.id, "Filling in your details…")
            fresh = await repo.get(app.id)
            assert fresh is not None and fresh.detail == "Filling in your details…"

            # Terminal outcome persists the failure code; a late note can't overwrite it.
            await repo.set_status(
                app.id, ApplicationStatus.NEEDS_ATTENTION,
                detail="Site blocks bots.", failure_code="blocked",
            )
            await repo.set_progress(app.id, "late note")
            fresh = await repo.get(app.id)
            assert fresh is not None
            assert fresh.failure_code == "blocked"
            assert fresh.detail == "Site blocks bots."

            # Retry claims reset the classification for a clean attempt.
            assert await repo.claim_for_retry(app.id) is True
            fresh = await repo.get(app.id)
            assert fresh is not None and fresh.failure_code is None and fresh.detail is None
    finally:
        async with _session_factory() as s:
            await s.execute(delete(Application).where(Application.user_id == uid))
            if job_id is not None:
                await s.execute(delete(Job).where(Job.id == job_id))
            await s.execute(delete(User).where(User.id == uid))
            await s.commit()
