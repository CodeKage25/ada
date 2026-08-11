from ada.services import search
from ada.services.search import SearchService


class _FakeJob:
    def __init__(self, title: str, company: str, location: str, job_id: int = 1) -> None:
        self.title, self.company, self.location = title, company, location
        self.id = job_id
        self.url = f"https://example.com/job/{job_id}"


class _FakeJobs:
    def __init__(self, rows, *, embedded=10_000, total=10_000, keyword_jobs=None) -> None:
        self._rows = rows
        self._embedded = embedded
        self._total = total
        self._keyword_jobs = keyword_jobs or []
        self.knn_asked: list[int] = []

    async def knn(self, vector, k):
        self.knn_asked.append(k)
        return self._rows[:k]

    async def embedded_count(self):
        return self._embedded

    async def count(self):
        return self._total

    async def by_keywords(self, role, k, *, exclude_ids=None):
        exclude = exclude_ids or set()
        return [j for j in self._keyword_jobs if j.id not in exclude][:k]


def test_fit_label_bands():
    assert "Strong" in search._fit_label(0.80)
    assert "Good" in search._fit_label(0.60)
    assert "Stretch" in search._fit_label(0.30)


async def test_match_shapes_and_scores(monkeypatch):
    monkeypatch.setattr(search, "vertex_client", lambda: object())
    svc = SearchService()

    async def fake_embed(_):
        return [0.0] * 768

    svc.embed = fake_embed  # type: ignore[method-assign]
    jobs = _FakeJobs(
        [
            (_FakeJob("Backend Engineer", "Paystack", "Lagos"), 0.10),
            (_FakeJob("Data Engineer", "Jumia", "Remote"), 0.50),
        ]
    )
    out = await svc.match(jobs=jobs, target_role="Backend", cv_text="cv", k=2)
    assert [m.title for m in out] == ["Backend Engineer", "Data Engineer"]
    assert out[0].match == 90 and out[0].score_type == "semantic"
    assert out[1].match == 50 and out[1].confidence == "low"
    assert out[0].company == "Paystack" and out[0].confidence == "high" and out[0].reason


async def test_match_skips_sparse_vector_index_and_uses_keywords(monkeypatch):
    """Below the coverage floor, KNN over a near-empty index is noise — keywords win."""
    monkeypatch.setattr(search, "vertex_client", lambda: object())
    svc = SearchService()

    async def boom(_):
        raise AssertionError("embed must not be called when coverage is too low")

    svc.embed = boom  # type: ignore[method-assign]
    jobs = _FakeJobs(
        [(_FakeJob("Wrong Nearest Neighbour", "X", "Y", 9), 0.1)],
        embedded=49,
        keyword_jobs=[_FakeJob("QA Engineer", "Acme", "Lagos", 2)],
    )
    out = await svc.match(jobs=jobs, target_role="QA Engineer", cv_text="cv", k=5)
    assert [m.title for m in out] == ["QA Engineer"]
    assert out[0].match is None and out[0].score_type == "keyword"
    assert "keyword" in out[0].reason.lower() and out[0].confidence == "low"


async def test_match_degrades_to_keywords_when_embedding_unavailable(monkeypatch):
    """A 429/quota failure on the embed call must not fail the run — keywords instead."""
    monkeypatch.setattr(search, "vertex_client", lambda: object())
    svc = SearchService()

    async def quota(_):
        raise RuntimeError("429 RESOURCE_EXHAUSTED")

    svc.embed = quota  # type: ignore[method-assign]
    jobs = _FakeJobs([], keyword_jobs=[_FakeJob("Backend Engineer", "Acme", "Lagos", 3)])
    out = await svc.match(jobs=jobs, target_role="Backend Engineer", cv_text="cv", k=5)
    assert [m.title for m in out] == ["Backend Engineer"]


async def test_match_tops_up_vector_results_with_keywords_deduped(monkeypatch):
    """Thin vector results are topped up by keywords, never duplicating a job."""
    monkeypatch.setattr(search, "vertex_client", lambda: object())
    svc = SearchService()

    async def fake_embed(_):
        return [0.0] * 768

    svc.embed = fake_embed  # type: ignore[method-assign]
    vector_hit = _FakeJob("Backend Engineer", "Paystack", "Lagos", 1)
    jobs = _FakeJobs(
        [(vector_hit, 0.10)],
        keyword_jobs=[vector_hit, _FakeJob("Platform Engineer", "Jumia", "Remote", 2)],
    )
    out = await svc.match(jobs=jobs, target_role="Engineer", cv_text="cv", k=3)
    assert [m.job_id for m in out] == [1, 2]
    assert {m.score_type for m in out} == {"semantic", "keyword"}


def test_normalize_match_backfills_legacy_and_null_scores():
    """Legacy stored matches (pre score_type) and keyword nulls both serialize honestly."""
    from ada.services.search import normalize_match

    legacy = normalize_match({"job_id": 1, "title": "PM", "match": 82.4, "reason": "Strong"})
    assert legacy["match"] == 82
    assert legacy["score_type"] == "semantic"
    assert legacy["confidence"] == "high"

    keyword = normalize_match({"job_id": 2, "title": "QA", "match": None})
    assert keyword["match"] is None
    assert keyword["score_type"] == "keyword"
    assert keyword["confidence"] == "low"

    junk = normalize_match({"job_id": 3, "title": "X", "match": "NaN"})
    assert junk["match"] is None                      # a non-numeric score can't render as %


async def test_match_halves_semantic_quota_at_partial_coverage(monkeypatch):
    """A partially embedded corpus mustn't monopolize the slots — keywords cover the rest."""
    monkeypatch.setattr(search, "vertex_client", lambda: object())
    svc = SearchService()

    async def fake_embed(_):
        return [0.0] * 768

    svc.embed = fake_embed  # type: ignore[method-assign]
    rows = [(_FakeJob("Engineer", "Acme", "Lagos", i), 0.3) for i in range(1, 21)]
    keyword_jobs = [_FakeJob("Platform Engineer", "Jumia", "Remote", i) for i in range(100, 140)]

    # 10% coverage: semantic gets ceil(k/2), keywords fill the rest from the whole corpus.
    sparse = _FakeJobs(rows, embedded=600, total=6_000, keyword_jobs=keyword_jobs)
    got = await svc.match(jobs=sparse, target_role="engineer", cv_text="cv", k=9)
    assert sparse.knn_asked == [5]
    assert sum(1 for m in got if m.score_type == "semantic") == 5
    assert sum(1 for m in got if m.score_type == "keyword") == 4
    assert len(got) == 9

    # Full coverage: semantic keeps every slot.
    dense = _FakeJobs(rows, embedded=6_000, total=6_000, keyword_jobs=keyword_jobs)
    got = await svc.match(jobs=dense, target_role="engineer", cv_text="cv", k=9)
    assert dense.knn_asked == [9]
    assert all(m.score_type == "semantic" for m in got)
