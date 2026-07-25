"""One-click apply and application tracking."""
import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from ada.auth.dependencies import current_user
from ada.db.models import User
from ada.db.repositories import (
    ApplicationRepository,
    JobRepository,
    ProfileRepository,
    RunRepository,
)
from ada.db.session import get_session
from ada.services.apply import (
    ApplyPrecondition,
    build_answers,
    is_supported,
    latest_cv_markdown,
    run_submission,
)

router = APIRouter(tags=["applications"])


class ApplicationOut(BaseModel):
    id: str
    job_id: int
    title: str
    company: str
    location: str
    status: str
    detail: str | None
    submitted_at: str | None
    created_at: str


class ApplyOut(BaseModel):
    application_id: str
    status: str
    already_applied: bool


@router.post("/jobs/{job_id}/apply", response_model=ApplyOut, status_code=202)
async def apply_to_job(
    job_id: int,
    background: BackgroundTasks,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(current_user),
) -> ApplyOut:
    job = await JobRepository(session).get(job_id)
    if job is None:
        raise HTTPException(404, "Job not found.")
    if not is_supported(job):
        raise HTTPException(422, "This listing has no application page on file.")
    cv = await latest_cv_markdown(RunRepository(session), user.id)
    if cv is None:
        raise HTTPException(409, "Complete a run first — Ada applies with your rewritten CV.")
    profile = await ProfileRepository(session).get(user.id)
    try:
        build_answers(user, profile, cv[0])
    except ApplyPrecondition as exc:
        raise HTTPException(428, str(exc)) from exc
    application, created = await ApplicationRepository(session).create_or_get(
        application_id=uuid.uuid4().hex, user_id=user.id, job_id=job_id, run_id=cv[1]
    )
    if created:
        background.add_task(run_submission, application.id)
    return ApplyOut(
        application_id=application.id,
        status=str(application.status),
        already_applied=not created,
    )


@router.get("/applications", response_model=list[ApplicationOut])
async def list_applications(
    session: AsyncSession = Depends(get_session),
    user: User = Depends(current_user),
) -> list[ApplicationOut]:
    rows = await ApplicationRepository(session).list_by_user(user.id)
    return [
        ApplicationOut(
            id=application.id,
            job_id=job.id,
            title=job.title,
            company=job.company,
            location=job.location,
            status=str(application.status),
            detail=application.detail,
            submitted_at=application.submitted_at.isoformat()
            if application.submitted_at
            else None,
            created_at=application.created_at.isoformat(),
        )
        for application, job in rows
    ]
