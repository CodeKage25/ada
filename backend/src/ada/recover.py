"""Recovery sweep entrypoint — re-dispatch runs stuck in PAID (lost dispatch).

Wire to Cloud Scheduler (e.g. every minute):  `python -m ada.recover`.
Idempotent and concurrency-safe via the atomic PAID -> RUNNING claim.
"""
import asyncio

from ada.observability import configure_logging, log
from ada.services.runs import recover_stuck_runs


def main() -> None:
    configure_logging()
    n = asyncio.run(recover_stuck_runs())
    log.info("recover_sweep", redispatched=n)
    print(f"redispatched {n} stuck runs")


if __name__ == "__main__":
    main()
