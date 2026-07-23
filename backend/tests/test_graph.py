from ada.services import graph as graphmod


class _FakeCV:
    async def rewrite(self, *, cv_text: str, target_role: str) -> str:
        return "REWRITTEN"


class _FakeSearch:
    async def match(self, *, jobs, target_role: str, cv_text: str, k: int):
        return [{"title": "Backend Engineer", "match": 90}]


class _FakeInterview:
    async def questions(self, *, target_role: str, cv_text: str, n: int):
        return ["Q1", "Q2"]


async def test_graph_runs_all_nodes_in_order(monkeypatch):
    monkeypatch.setattr(graphmod, "CVService", _FakeCV)
    monkeypatch.setattr(graphmod, "SearchService", _FakeSearch)
    monkeypatch.setattr(graphmod, "InterviewService", _FakeInterview)

    stages: list[str] = []

    async def on_stage(stage: str) -> None:
        stages.append(stage)

    graph = graphmod.build_graph(session=object(), run_id="r1", on_stage=on_stage)
    final = await graph.ainvoke(
        {"run_id": "r1", "email": "a@b.c", "target_role": "Engineer", "cv_text": "cv"}
    )
    assert final["rewritten_cv"] == "REWRITTEN"
    assert final["matches"] == [{"title": "Backend Engineer", "match": 90}]
    assert final["questions"] == ["Q1", "Q2"]
    # Every node reported itself, in execution order.
    assert stages == ["intake", "cv_rewrite", "job_match", "interview_prep"]


async def test_graph_stage_callback_is_optional(monkeypatch):
    monkeypatch.setattr(graphmod, "CVService", _FakeCV)
    monkeypatch.setattr(graphmod, "SearchService", _FakeSearch)
    monkeypatch.setattr(graphmod, "InterviewService", _FakeInterview)

    graph = graphmod.build_graph(session=object(), run_id="r1")
    final = await graph.ainvoke(
        {"run_id": "r1", "email": "a@b.c", "target_role": "Engineer", "cv_text": "cv"}
    )
    assert final["rewritten_cv"] == "REWRITTEN"
