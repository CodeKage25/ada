"""JSON structured logging for ingestion by Cloud Logging.

emit_run_log emits one event per graph step, keyed by run_id for tracing.
"""
import logging

import structlog

from ada.config import get_settings


def configure_logging() -> None:
    s = get_settings()
    logging.basicConfig(level=s.log_level, format="%(message)s")
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(logging.getLevelName(s.log_level)),
    )


log = structlog.get_logger()


def emit_run_log(*, run_id: str, step: str, status: str, **extra: object) -> None:
    log.info("ada_run_step", run_id=run_id, step=step, status=status, **extra)
