"""Pre-payment job-market teaser.

GET /jobs/preview gives a cheap, instant estimate of how many stored jobs
plausibly fit a role, plus a few raw titles as a peek. This is deliberately not
the paid matching: a case-insensitive keyword lookup against job titles — no
embeddings, no scores, no tailored reasons. Those stay behind payment.
"""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from ada.db.repositories import JobRepository
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
