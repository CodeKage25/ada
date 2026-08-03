"""Transient failures requeue a run for the recovery sweep; permanent ones fail it
with a human-readable reason. This is what turns a quota outage into a delay
instead of a dead run."""
import os
import uuid

import pytest

from ada.resilience import is_transient
from ada.services.runs import MAX_RUN_ATTEMPTS, _handle_run_failure, _is_quota

_db = pytest.mark.skipif(not os.getenv("RUN_DB_TESTS"), reason="requires Postgres")


class _Quota(Exception):
    code = 429


def test_is_transient_walks_the_cause_chain():
    inner = _Quota("429 RESOURCE_EXHAUSTED")
    try:
        try:
            raise inner
        except _Quota as exc:
            raise RuntimeError("graph wrapper") from exc
    except RuntimeError as wrapped:
        assert is_transient(wrapped) is True
        assert _is_quota(wrapped) is True
    assert is_transient(ValueError("bad input")) is False
    assert _is_quota(ValueError("nope")) is False


@_db
async def test_transient_failure_requeues_then_permanently_fails_at_cap():
    from sqlalchemy import delete

    from ada.db.models import Run, RunStatus
    from ada.db.repositories import RunRepository
    from ada.db.session import _session_factory, init_db

    await init_db()
    rid = uuid.uuid4().hex
    try:
        async with _session_factory() as s:
            await RunRepository(s).create(Run(
                id=rid, reference=rid, email="x@e.com", target_role="QA",
                cv_text="cv", status=RunStatus.RUNNING,
            ))
        async with _session_factory() as s:
            runs = RunRepository(s)
            await _handle_run_failure(runs, rid, _Quota("429 RESOURCE_EXHAUSTED"))
            run = await runs.get(rid)
            assert run.status == RunStatus.PAID          # requeued, not dead
            assert run.attempts == 1
            assert "queued" in (run.failure_reason or "")

            for _ in range(MAX_RUN_ATTEMPTS - 1):
                await _handle_run_failure(runs, rid, _Quota("still 429"))
            run = await runs.get(rid)
            assert run.status == RunStatus.FAILED        # cap reached
            assert run.attempts == MAX_RUN_ATTEMPTS
    finally:
        async with _session_factory() as s:
            await s.execute(delete(Run).where(Run.id == rid))
            await s.commit()


@_db
async def test_permanent_failure_fails_immediately_with_reason():
    from sqlalchemy import delete

    from ada.db.models import Run, RunStatus
    from ada.db.repositories import RunRepository
    from ada.db.session import _session_factory, init_db

    await init_db()
    rid = uuid.uuid4().hex
    try:
        async with _session_factory() as s:
            await RunRepository(s).create(Run(
                id=rid, reference=rid, email="x@e.com", target_role="QA",
                cv_text="cv", status=RunStatus.RUNNING,
            ))
        async with _session_factory() as s:
            runs = RunRepository(s)
            await _handle_run_failure(runs, rid, KeyError("rewritten_cv"))
            run = await runs.get(rid)
            assert run.status == RunStatus.FAILED
            assert run.attempts == 1
            assert run.failure_reason
    finally:
        async with _session_factory() as s:
            await s.execute(delete(Run).where(Run.id == rid))
            await s.commit()


async def test_sweep_once_runs_both_recoveries(monkeypatch):
    """The in-app poller's unit of work: one pass re-dispatches lost runs and flags
    lost applications, so durability doesn't depend on an external cron being wired."""
    from ada.services import apply as apply_mod
    from ada.services import runs as runs_mod

    calls: list[str] = []

    async def fake_runs() -> int:
        calls.append("runs")
        return 2

    async def fake_apps() -> int:
        calls.append("apps")
        return 1

    monkeypatch.setattr(runs_mod, "recover_stuck_runs", fake_runs)
    monkeypatch.setattr(apply_mod, "recover_stuck_applications", fake_apps)
    assert await runs_mod.sweep_once() == (2, 1)
    assert calls == ["runs", "apps"]
