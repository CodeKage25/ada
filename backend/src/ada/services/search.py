"""Job matching node: embed the candidate + role, KNN over seeded jobs via pgvector.

Deliberately model-light in the hot path — one embedding call, then a vector
search. The human-readable "why this matched" label is derived from the cosine
similarity, not a second Gemini round-trip.
"""
from typing import Literal

from google.genai import types
from pydantic import BaseModel

from ada.config import get_settings
from ada.db.models import EMBED_DIM, Job
from ada.db.repositories import JobRepository
from ada.observability import log
from ada.resilience import retry_async
from ada.vertex import vertex_client


def _fit_label(similarity: float) -> str:
    if similarity >= 0.75:
        return "Strong fit for your background"
    if similarity >= 0.55:
        return "Good fit — worth a tailored application"
    return "Stretch role — highlight transferable skills"


class MatchResult(BaseModel):
    """One job match. `match` is a bounded percentage only for semantic results;
    keyword results carry match=None so a relevance filter can't impersonate a score."""

    job_id: int
    title: str
    company: str
    location: str
    url: str | None
    match: int | None
    score_type: Literal["semantic", "keyword"]
    confidence: Literal["high", "medium", "low"]
    reason: str


def _confidence(similarity: float) -> Literal["high", "medium", "low"]:
    if similarity >= 0.75:
        return "high"
    if similarity >= 0.55:
        return "medium"
    return "low"


def normalize_match(raw: dict) -> dict:
    """Backfill contract fields on legacy stored matches (pre score_type era) so no
    consumer ever renders an unqualified or null score as a percentage."""
    m = dict(raw)
    if isinstance(m.get("match"), (int, float)):
        m.setdefault("score_type", "semantic")
        m.setdefault("confidence", _confidence(m["match"] / 100))
        m["match"] = round(m["match"])
    else:
        m["match"] = None
        m.setdefault("score_type", "keyword")
        m.setdefault("confidence", "low")
    m.setdefault("reason", "")
    return m


class SearchService:
    def __init__(self) -> None:
        s = get_settings()
        self._client = vertex_client()
        self._attempts = s.llm_max_attempts
        # AI Studio ships gemini-embedding-001 (native 3072-dim); reduce to our column
        # width. Vertex keeps text-embedding-004. Cosine distance is scale-invariant,
        # so truncated vectors rank consistently as long as every vector uses one model.
        if s.gemini_api_key:
            self._model = s.gemini_embedding_model
            self._config: types.EmbedContentConfig | None = types.EmbedContentConfig(
                output_dimensionality=EMBED_DIM
            )
        else:
            self._model = s.embedding_model
            self._config = None

    async def embed(self, text: str) -> list[float]:
        return (await self.embed_many([text]))[0]

    async def embed_many(self, texts: list[str]) -> list[list[float]]:
        resp = await retry_async(
            lambda: self._client.aio.models.embed_content(
                model=self._model, contents=texts, config=self._config
            ),
            attempts=self._attempts,
        )
        if not resp.embeddings:
            raise RuntimeError("embedding API returned no vectors")
        vectors: list[list[float]] = []
        for e in resp.embeddings:
            if e.values is None:
                raise RuntimeError("embedding API returned an empty vector")
            vectors.append(list(e.values))
        return vectors

    async def match(
        self, *, jobs: JobRepository, target_role: str, cv_text: str, k: int = 5
    ) -> list[MatchResult]:
        """Semantic matches when the vector index is trustworthy, keyword matches otherwise.

        KNN over a sparsely embedded corpus returns confident-looking nonsense — the
        nearest neighbour of a QA engineer among 49 vectors may be a sales manager. Below
        the coverage floor, or when embedding is unavailable (quota), role keywords are the
        honest signal. Coverage rises as the backfill runs, so this self-heals.
        """
        matches: list[MatchResult] = []
        embedded = await jobs.embedded_count()
        if embedded >= get_settings().min_embedded_for_vector:
            try:
                vector = await self.embed(f"{target_role}\n\n{cv_text}")
                rows = await jobs.knn(vector, k)
                matches = [self._to_match(job, distance) for job, distance in rows]
            except Exception as exc:  # noqa: BLE001 — degrade to keywords, never fail the run
                log.warning("match_embedding_unavailable", error=str(exc))
        else:
            log.info("match_vector_skipped_low_coverage", embedded=embedded)

        if len(matches) < k:
            seen = {m.job_id for m in matches}
            extra = await jobs.by_keywords(target_role, k - len(matches), exclude_ids=seen)
            matches.extend(self._keyword_match(job) for job in extra)
        return matches

    @staticmethod
    def _keyword_match(job: Job) -> MatchResult:
        return MatchResult(
            job_id=job.id, title=job.title, company=job.company, location=job.location,
            url=job.url, match=None, score_type="keyword", confidence="low",
            reason="Matched on role keywords — not a fit score",
        )

    @staticmethod
    def _to_match(job: Job, distance: float) -> MatchResult:
        similarity = max(0.0, 1.0 - distance)
        return MatchResult(
            job_id=job.id, title=job.title, company=job.company, location=job.location,
            url=job.url, match=round(similarity * 100), score_type="semantic",
            confidence=_confidence(similarity), reason=_fit_label(similarity),
        )
