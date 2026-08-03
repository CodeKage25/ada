"""Pre-payment job-market teaser.

GET /jobs/preview gives a cheap, instant estimate of how many stored jobs
plausibly fit a role, plus a few raw titles as a peek. This is deliberately not
the paid matching: a case-insensitive keyword lookup against job titles — no
embeddings, no scores, no tailored reasons. Those stay behind payment.
"""
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from ada.auth.dependencies import current_user
from ada.db.models import Job, User
from ada.db.repositories import (
    JobFeedRepository,
    JobRepository,
    ProfileRepository,
    RunRepository,
)
from ada.db.session import get_session

router = APIRouter(prefix="/jobs", tags=["jobs"])


class JobPeek(BaseModel):
    title: str
    company: str
    location: str


class JobsPreviewOut(BaseModel):
    count: int
    samples: list[JobPeek]


@router.get("/preview", response_model=JobsPreviewOut)
async def jobs_preview(
    role: str = Query(min_length=2, max_length=256),
    session: AsyncSession = Depends(get_session),
) -> JobsPreviewOut:
    count, jobs = await JobRepository(session).preview(role, sample_size=4)
    return JobsPreviewOut(
        count=count,
        samples=[
            JobPeek(title=j.title, company=j.company, location=j.location)
            for j in jobs
        ],
    )


class FeedJob(BaseModel):
    id: int
    title: str
    company: str
    location: str
    remote: bool
    url: str | None
    description: str
    posted_at: str | None


class FeedOut(BaseModel):
    jobs: list[FeedJob]
    next_cursor: int | None
    total: int
    role: str | None


class TriageIn(BaseModel):
    action: Literal["tracked", "dismissed"]


async def _feed_role(session: AsyncSession, user_id: str) -> str | None:
    """The role the feed is tuned to: the latest run's target, else the profile headline."""
    runs = await RunRepository(session).list_by_user(user_id, limit=1)
    if runs and runs[0].target_role:
        return runs[0].target_role
    profile = await ProfileRepository(session).get(user_id)
    return profile.headline if profile and profile.headline else None


def _feed_job(job: Job) -> FeedJob:
    return FeedJob(
        id=job.id, title=job.title, company=job.company, location=job.location,
        remote=job.remote, url=job.url, description=job.description[:4000],
        posted_at=job.posted_at.isoformat() if job.posted_at else None,
    )


@router.get("/feed", response_model=FeedOut)
async def jobs_feed(
    cursor: int | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=50),
    session: AsyncSession = Depends(get_session),
    user: User = Depends(current_user),
) -> FeedOut:
    """The candidate's standing job inbox: untriaged, role-relevant, newest first."""
    repo = JobFeedRepository(session)
    role = await _feed_role(session, user.id)
    jobs, next_cursor = await repo.feed(user.id, role=role, cursor=cursor, limit=limit)
    total = await repo.feed_count(user.id, role=role)
    return FeedOut(
        jobs=[_feed_job(j) for j in jobs], next_cursor=next_cursor, total=total, role=role
    )


@router.post("/{job_id}/triage")
async def triage_job(
    job_id: int,
    body: TriageIn,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(current_user),
) -> dict[str, str]:
    if await JobRepository(session).get(job_id) is None:
        raise HTTPException(404, "Job not found.")
    await JobFeedRepository(session).triage(user.id, job_id, body.action)
    return {"status": body.action}


@router.get("/tracked", response_model=list[FeedJob])
async def tracked_jobs(
    session: AsyncSession = Depends(get_session),
    user: User = Depends(current_user),
) -> list[FeedJob]:
    rows = await JobFeedRepository(session).tracked(user.id)
    return [_feed_job(j) for j in rows]
