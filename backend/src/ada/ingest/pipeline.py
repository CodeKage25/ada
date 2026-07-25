"""Ingestion pipeline: fetch -> normalize -> upsert -> embed backfill.

Designed to run as a Cloud Run Job on a Cloud Scheduler trigger (see README);
locally via `python -m ada.ingest [--limit N]`. Every stage is idempotent:
upserts dedup on (source, external_id), and embedding is a separate backfill
pass over rows with NULL embeddings — so a run without model creds still lands
listings, and the next credentialed run vectorizes them.
"""
import asyncio
from typing import Any

import httpx

from ada.config import get_settings
from ada.db.repositories import JobRepository
from ada.db.session import _session_factory
from ada.ingest import ashby, boards, greenhouse, jooble, lever
from ada.observability import log

_EMBED_BATCH = 32
_HTTP_TIMEOUT = 30.0
# Jooble serves every query from one host; unbounded concurrency there causes
# intermittent TLS resets, so its requests share a small semaphore.
_JOOBLE_CONCURRENCY = 4


async def _gather_listings(limit: int | None) -> list[dict[str, Any]]:
    """Fetch every configured source; one source failing never sinks the run."""
    s = get_settings()
    listings: list[dict[str, Any]] = []
    async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT, follow_redirects=True) as client:
        tasks: list[tuple[str, Any]] = []
        for slug, company in boards.GREENHOUSE_BOARDS.items():
            tasks.append((f"greenhouse/{slug}", greenhouse.fetch(client, slug, company)))
        for slug, company in boards.LEVER_COMPANIES.items():
            tasks.append((f"lever/{slug}", lever.fetch(client, slug, company)))
        for slug, company in boards.ASHBY_BOARDS.items():
            tasks.append((f"ashby/{slug}", ashby.fetch(client, slug, company)))
        if s.jooble_feeds:
            semaphore = asyncio.Semaphore(_JOOBLE_CONCURRENCY)

            async def _throttled(host: str, key: str, keywords: str, location: str) -> list:
                async with semaphore:
                    return await jooble.fetch(client, host, key, keywords, location)

            for host, key in s.jooble_feeds.items():
                for keywords, location in boards.JOOBLE_QUERIES.get(host, []):
                    coro = _throttled(host, key, keywords, location)
                    tasks.append((f"jooble:{host}/{keywords}", coro))
        else:
            log.info("jooble_skipped", reason="JOOBLE_FEEDS not set")

        results = await asyncio.gather(*(t[1] for t in tasks), return_exceptions=True)
        for (name, _), result in zip(tasks, results, strict=True):
            if isinstance(result, BaseException):
                log.warning("ingest_source_failed", source=name, error=str(result))
                continue
            log.info("ingest_source_ok", source=name, listings=len(result))
            if limit is not None:
                result = result[: max(0, limit - len(listings))]
            listings.extend(result)
            if limit is not None and len(listings) >= limit:
                break
    return listings


async def _backfill_embeddings(repo: JobRepository) -> int:
    """Embed rows ingested without vectors. Missing model creds logs and moves on."""
    from ada.services.search import SearchService

    pending = await repo.unembedded()
    if not pending:
        return 0
    service = SearchService()
    embedded = 0
    for start in range(0, len(pending), _EMBED_BATCH):
        batch = pending[start : start + _EMBED_BATCH]
        texts = [f"{j.title} at {j.company}. {j.description}"[:8_000] for j in batch]
        try:
            vectors = await service.embed_many(texts)
        except Exception as exc:  # creds/quota/network — listings still landed
            log.warning("embed_backfill_skipped", error=str(exc), pending=len(pending) - embedded)
            break
        await repo.set_embeddings(
            [(job.id, vector) for job, vector in zip(batch, vectors, strict=True)]
        )
        embedded += len(batch)
    return embedded


async def run(limit: int | None = None) -> dict[str, int]:
    listings = await _gather_listings(limit)
    async with _session_factory() as session:
        repo = JobRepository(session)
        upserted = await repo.upsert_many(listings)
        embedded = await _backfill_embeddings(repo)
        total = await repo.count()
    stats = {"fetched": len(listings), "upserted": upserted, "embedded": embedded, "total": total}
    log.info("ingest_complete", **stats)
    return stats
