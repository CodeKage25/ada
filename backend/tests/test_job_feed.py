"""The standing job inbox: cursor pagination, triage exclusion, tracked list."""
import os
import re
import uuid

import pytest

_db = pytest.mark.skipif(not os.getenv("RUN_DB_TESTS"), reason="requires Postgres")


@_db
async def test_feed_paginates_excludes_triaged_and_tracks():
    from sqlalchemy import delete

    from ada.db.models import Job, JobInteraction, User
    from ada.db.repositories import JobFeedRepository
    from ada.db.session import _session_factory, init_db

    await init_db()
    uid = uuid.uuid4().hex
    marker = re.sub(r"\d", "q", uuid.uuid4().hex)[:12]
    job_ids: list[int] = []
    try:
        async with _session_factory() as s:
            s.add(User(id=uid, email=f"{uid}@ex.com"))
            for i in range(5):
                job = Job(source="test", external_id=uuid.uuid4().hex,
                          title=f"Zqx{marker} Engineer {i}", company="Acme",
                          location="Lagos", description="d")
                s.add(job)
            await s.commit()

        async with _session_factory() as s:
            repo = JobFeedRepository(s)
            role = f"Zqx{marker}"

            page1, cursor = await repo.feed(uid, role=role, cursor=None, limit=2)
            assert len(page1) == 2 and cursor is not None
            page2, cursor2 = await repo.feed(uid, role=role, cursor=cursor, limit=2)
            assert len(page2) == 2 and cursor2 is not None
            page3, cursor3 = await repo.feed(uid, role=role, cursor=cursor2, limit=2)
            assert len(page3) == 1 and cursor3 is None          # last page
            seen = {j.id for j in page1 + page2 + page3}
            assert len(seen) == 5                               # no dupes across pages
            job_ids.extend(seen)

            assert await repo.feed_count(uid, role=role) == 5

            # Triage: tracked + dismissed leave the feed; tracked shows in the shortlist.
            await repo.triage(uid, page1[0].id, "tracked")
            await repo.triage(uid, page1[1].id, "dismissed")
            remaining, _ = await repo.feed(uid, role=role, cursor=None, limit=10)
            assert {j.id for j in remaining} == seen - {page1[0].id, page1[1].id}
            assert await repo.feed_count(uid, role=role) == 3

            tracked = await repo.tracked(uid)
            assert [j.id for j in tracked] == [page1[0].id]

            # Re-triaging updates the decision instead of erroring (unique constraint).
            await repo.triage(uid, page1[1].id, "tracked")
            tracked = await repo.tracked(uid)
            assert {j.id for j in tracked} == {page1[0].id, page1[1].id}
    finally:
        async with _session_factory() as s:
            await s.execute(delete(JobInteraction).where(JobInteraction.user_id == uid))
            if job_ids:
                await s.execute(delete(Job).where(Job.id.in_(job_ids)))
            await s.execute(delete(User).where(User.id == uid))
            await s.commit()
