"""Agent workflow as a LangGraph state machine.

    intake -> cv_rewrite -> job_match -> interview_prep

Services and the DB session are bound into node closures at build time so the shared
state holds only serialisable data. Each node emits a structured run-step log for
tracing in Cloud Logging.
"""
from typing import TypedDict

from langgraph.graph import END, START, StateGraph
from sqlalchemy.ext.asyncio import AsyncSession

from ada.config import get_settings
from ada.db.repositories import JobRepository
from ada.observability import emit_run_log
from ada.services.cv import CVService
from ada.services.interview import InterviewService
from ada.services.search import SearchService


class RunState(TypedDict, total=False):
    run_id: str
    email: str
    target_role: str
    cv_text: str
    rewritten_cv: str
    matches: list[dict]
    questions: list[str]


def build_graph(session: AsyncSession, *, run_id: str):
    """Compile a graph for one run, with services and session bound into the nodes."""
    s = get_settings()
    cv = CVService()
    search = SearchService()
    interview = InterviewService()
    jobs = JobRepository(session)

    async def intake(state: RunState) -> RunState:
        # Inputs arrive already on the run (typed form or voice transcript). Placeholder
        # for input normalisation/validation.
        emit_run_log(run_id=run_id, step="intake", status="ok")
        return {}

    async def cv_rewrite(state: RunState) -> RunState:
        emit_run_log(run_id=run_id, step="cv_rewrite", status="start")
        md = await cv.rewrite(cv_text=state["cv_text"], target_role=state["target_role"])
        emit_run_log(run_id=run_id, step="cv_rewrite", status="ok")
        return {"rewritten_cv": md}

    async def job_match(state: RunState) -> RunState:
        emit_run_log(run_id=run_id, step="job_match", status="start")
        matches = await search.match(
            jobs=jobs, target_role=state["target_role"], cv_text=state["cv_text"],
            k=s.jobs_match_k,
        )
        emit_run_log(run_id=run_id, step="job_match", status="ok", n=len(matches))
        return {"matches": matches}

    async def interview_prep(state: RunState) -> RunState:
        emit_run_log(run_id=run_id, step="interview_prep", status="start")
        questions = await interview.questions(
            target_role=state["target_role"], cv_text=state["cv_text"],
            n=s.interview_questions,
        )
        emit_run_log(run_id=run_id, step="interview_prep", status="ok", n=len(questions))
        return {"questions": questions}

    g = StateGraph(RunState)
    g.add_node("intake", intake)
    g.add_node("cv_rewrite", cv_rewrite)
    g.add_node("job_match", job_match)
    g.add_node("interview_prep", interview_prep)
    g.add_edge(START, "intake")
    g.add_edge("intake", "cv_rewrite")
    g.add_edge("cv_rewrite", "job_match")
    g.add_edge("job_match", "interview_prep")
    g.add_edge("interview_prep", END)
    return g.compile()
