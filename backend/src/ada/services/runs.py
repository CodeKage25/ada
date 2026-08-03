"""Run orchestration, invoked only after a payment is confirmed.

execute_run claims a PAID run atomically before doing work, drives the agent graph
(cv -> match -> interview), and stores the result. recover_stuck_runs re-dispatches runs
whose in-process enqueue was lost (e.g. process crash).
"""
import uuid

from ada.db.models import Run
from ada.db.repositories import RunRepository
from ada.db.session import _session_factory
from ada.observability import emit_run_log, log
from ada.resilience import is_transient
from ada.services.graph import build_graph


async def execute_run(run_id: str) -> None:
    """Background task: atomically claim the paid run, run the agent graph, store output."""
    async with _session_factory() as session:
        runs = RunRepository(session)
        run = await runs.claim_for_execution(run_id)
        if run is None:
            # Not in PAID state: already claimed by another worker, or not yet paid.
            return
        emit_run_log(run_id=run_id, step="run", status="start")
        try:
            # Each node reports itself; the row is the single source of truth the
            # status endpoint (and so the UI timeline) reads from.
            async def on_stage(stage: str) -> None:
                await runs.set_stage(run_id, stage)

            graph = build_graph(session, run_id=run_id, on_stage=on_stage)
            final = await graph.ainvoke(
                {
                    "run_id": run_id,
                    "email": run.email,
                    "target_role": run.target_role,
                    "cv_text": run.cv_text,
                }
            )
            await runs.set_deliverables(
                run,
                rewritten_cv=final["rewritten_cv"],
                matches=final["matches"],
                questions=final["questions"],
            )
            emit_run_log(run_id=run_id, step="run", status="ok")
            if run.user_id:
                from ada.services.notify import notify

                await notify(
                    run.user_id, kind="run_complete",
                    title="Your run is ready",
                    body=f"Ada finished your run for {run.target_role} — CV, matches, "
                         "and interview questions are in.",
                    link=f"/app/runs/{run_id}",
                )
        except Exception as exc:  # noqa: BLE001 — classify, then requeue or fail
            await _handle_run_failure(runs, run_id, exc)


MAX_RUN_ATTEMPTS = 5

_QUOTA_REASON = (
    "Ada's AI is at capacity right now — your run is queued and will finish automatically."
)
_GENERIC_RETRY_REASON = "A temporary problem interrupted this run — it will retry shortly."
_PERMANENT_REASON = "This run couldn't be completed. Our team has been alerted."


async def _handle_run_failure(runs: RunRepository, run_id: str, exc: Exception) -> None:
    """Requeue a run that failed for a transient reason; fail it permanently otherwise.

    A requeued run returns to PAID, so the existing recovery sweep re-dispatches it —
    a quota outage delays a run instead of destroying it.
    """
    transient = is_transient(exc)
    attempts = await runs.attempts_for(run_id)
    if transient and attempts + 1 < MAX_RUN_ATTEMPTS:
        reason = _QUOTA_REASON if _is_quota(exc) else _GENERIC_RETRY_REASON
        await runs.requeue_after_transient_failure(run_id, reason)
        emit_run_log(run_id=run_id, step="run", status="requeued", error=repr(exc))
        return
    reason = _QUOTA_REASON if transient else _PERMANENT_REASON
    await runs.mark_failed(run_id, reason)
    emit_run_log(run_id=run_id, step="run", status="error", error=repr(exc))


def _is_quota(exc: BaseException) -> bool:
    seen: set[int] = set()
    current: BaseException | None = exc
    while current is not None and id(current) not in seen:
        seen.add(id(current))
        if getattr(current, "code", None) == 429 or "RESOURCE_EXHAUSTED" in str(current):
            return True
        current = current.__cause__ or current.__context__
    return False


async def recover_stuck_runs() -> int:
    """Re-dispatch runs left in PAID past the dispatch window.

    Idempotent and concurrency-safe: execute_run re-claims atomically, so a run already
    picked up elsewhere is skipped. Intended to run on a schedule (e.g. Cloud Scheduler).
    """
    from ada.config import get_settings

    s = get_settings()
    async with _session_factory() as session:
        runs = RunRepository(session)
        reclaimed = await runs.reclaim_stale_running(s.stuck_running_seconds)
        if reclaimed:
            log.info("reclaimed_stale_running_runs", count=reclaimed)
        stuck = await runs.find_stuck(s.stuck_run_seconds)
    for run_id in stuck:
        log.info("recover_stuck_run", run_id=run_id)
        await execute_run(run_id)
    return len(stuck)


async def create_pending_run(
    *, session_runs: RunRepository, provider: str, amount: int, currency: str,
    email: str, target_role: str, cv_text: str, transcript: str | None = None,
    user_id: str | None = None, access_token_hash: str | None = None,
) -> Run:
    reference = uuid.uuid4().hex
    run = Run(
        id=reference, reference=reference, provider=provider, amount=amount,
        currency=currency, email=email, target_role=target_role, cv_text=cv_text,
        transcript=transcript, user_id=user_id, access_token_hash=access_token_hash,
    )
    return await session_runs.create(run)
