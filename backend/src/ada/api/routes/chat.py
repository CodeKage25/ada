"""Streaming chat with Ada (SSE), grounded in the user's profile and run history."""
import json
from typing import Literal

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from ada.auth.dependencies import current_user
from ada.db.models import User
from ada.db.repositories import ProfileRepository, RunRepository
from ada.db.session import get_session
from ada.services.coach import CoachService

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=8_000)


class ChatIn(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=60)


@router.post("")
async def chat(
    body: ChatIn,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(current_user),
) -> StreamingResponse:
    profile = await ProfileRepository(session).get(user.id)
    runs = await RunRepository(session).list_by_user(user.id, limit=5)

    async def events():
        try:
            async for delta in CoachService().stream(
                messages=[m.model_dump() for m in body.messages], profile=profile, runs=runs
            ):
                yield f"data: {json.dumps({'delta': delta})}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as exc:  # noqa: BLE001 — stream errors must reach the client
            yield f"data: {json.dumps({'error': repr(exc)})}\n\n"

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
