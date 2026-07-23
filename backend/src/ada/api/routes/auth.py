"""Magic-link authentication.

request-link always returns 202 regardless of whether the email exists, so the
endpoint cannot be used to enumerate accounts. verify consumes the token atomically
and redirects into the app with the session cookie set.
"""
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession

from ada.auth.dependencies import current_user
from ada.auth.mailer import send_magic_link
from ada.auth.repository import AuthRepository
from ada.auth.tokens import hash_token, mint
from ada.config import get_settings
from ada.db.models import User
from ada.db.session import get_session
from ada.observability import log

router = APIRouter(prefix="/auth", tags=["auth"])


class RequestLinkIn(BaseModel):
    email: EmailStr


@router.post("/request-link", status_code=202)
async def request_link(
    body: RequestLinkIn, session: AsyncSession = Depends(get_session)
) -> dict[str, str]:
    s = get_settings()
    repo = AuthRepository(session)
    user = await repo.upsert_user(body.email)
    raw, token_hash = mint()
    await repo.create_magic_token(user.id, token_hash)
    link = f"{s.frontend_origin}/auth/verify?token={raw}"
    try:
        await send_magic_link(user.email, link)
    except RuntimeError as exc:
        log.error("magic_link_delivery_failed", error=str(exc))
        raise HTTPException(status_code=502, detail="email delivery failed") from exc
    return {"status": "sent"}


@router.get("/verify")
async def verify(
    token: str, session: AsyncSession = Depends(get_session)
) -> RedirectResponse:
    s = get_settings()
    repo = AuthRepository(session)
    user_id = await repo.consume_magic_token(hash_token(token))
    if user_id is None:
        return RedirectResponse(f"{s.frontend_origin}/login?error=invalid_link", status_code=302)
    raw, token_hash = mint()
    await repo.create_session(user_id, token_hash)
    resp = RedirectResponse(f"{s.frontend_origin}/app", status_code=302)
    resp.set_cookie(
        key=s.session_cookie,
        value=raw,
        httponly=True,
        secure=s.app_env != "local",
        samesite="lax",
        max_age=30 * 24 * 3600,
        path="/",
    )
    return resp


@router.get("/me")
async def me(user: User = Depends(current_user)) -> dict[str, str]:
    return {"email": user.email}


@router.post("/logout")
async def logout(
    request: Request, response: Response, session: AsyncSession = Depends(get_session)
) -> dict[str, str]:
    s = get_settings()
    raw = request.cookies.get(s.session_cookie)
    if raw:
        await AuthRepository(session).destroy_session(hash_token(raw))
    response.delete_cookie(s.session_cookie, path="/")
    return {"status": "ok"}
