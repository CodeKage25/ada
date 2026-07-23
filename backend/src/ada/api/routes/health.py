"""Liveness (process up) and readiness (can actually serve — DB reachable)."""
from fastapi import APIRouter, HTTPException

from ada.db.session import ping

router = APIRouter(tags=["health"])


@router.get("/healthz")
async def healthz() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/readyz")
async def readyz() -> dict[str, str]:
    try:
        await ping()
    except Exception as exc:  # noqa: BLE001 — any DB failure means not ready
        raise HTTPException(status_code=503, detail="db unavailable") from exc
    return {"status": "ready"}
