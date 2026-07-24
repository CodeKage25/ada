"""The pre-payment teaser: keyword extraction (pure) and the DB lookup (gated)."""
import os
import uuid

import pytest

from ada.db.repositories import role_keywords


def test_role_keywords_extracts_meaningful_tokens():
    assert role_keywords("Senior Sales Manager") == ["senior", "sales", "manager"]


def test_role_keywords_drops_stopwords_short_tokens_and_dupes():
    assert role_keywords("Head of the QA") == ["head"]
    assert role_keywords("sales & Sales!") == ["sales"]
    assert role_keywords("of the a to") == []


def test_role_keywords_caps_token_count():
    many = "alpha beta gamma delta epsilon zeta eta theta"
    assert len(role_keywords(many)) == 6


_db = pytest.mark.skipif(
    not os.getenv("RUN_DB_TESTS"), reason="requires a Postgres instance"
)


@_db
async def test_preview_counts_and_samples_without_paid_fields():
    from ada.db.models import EMBED_DIM, Job
    from ada.db.repositories import JobRepository
    from ada.db.session import _session_factory, init_db

    await init_db()
    # A unique token keeps this test independent of seeded/previous data.
    marker = f"zx{uuid.uuid4().hex[:8]}"
    zero_vec = [0.0] * EMBED_DIM
    async with _session_factory() as s:
        JobRepositorySession = JobRepository(s)
        await JobRepositorySession.add_many(
            [
                Job(
                    title=f"{marker} Sales Manager",
                    company="Acme",
                    location="Lagos",
                    description="sell things",
                    embedding=zero_vec,
                ),
                Job(
                    title=f"{marker} Regional Manager",
                    company="Globex",
                    location="Remote",
                    description="manage regions",
                    embedding=zero_vec,
                ),
                Job(
                    title="Unrelated Nurse",
                    company="Clinic",
                    location="Abuja",
                    description="care",
                    embedding=zero_vec,
                ),
            ]
        )
    async with _session_factory() as s:
        count, jobs = await JobRepository(s).preview(f"{marker} role")
    assert count == 2
    titles = {j.title for j in jobs}
    assert titles == {f"{marker} Sales Manager", f"{marker} Regional Manager"}


@_db
async def test_preview_empty_role_tokens_returns_nothing():
    from ada.db.repositories import JobRepository
    from ada.db.session import _session_factory, init_db

    await init_db()
    async with _session_factory() as s:
        count, jobs = await JobRepository(s).preview("of the")
    assert count == 0
    assert jobs == []
