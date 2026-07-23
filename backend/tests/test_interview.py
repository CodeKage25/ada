from ada.services import interview
from ada.services.interview import InterviewService


class _Resp:
    def __init__(self, text: str) -> None:
        self.text = text


class _Models:
    def __init__(self, text: str) -> None:
        self._text = text

    async def generate_content(self, **_):
        return _Resp(self._text)


class _Client:
    def __init__(self, text: str) -> None:
        self.aio = type("Aio", (), {"models": _Models(text)})()


def _service(monkeypatch, text: str) -> InterviewService:
    monkeypatch.setattr(interview, "vertex_client", lambda: _Client(text))
    return InterviewService()


def test_prompts_guard_against_fabrication():
    assert "never fabricate" in interview._Q_SYSTEM.lower()
    assert "never invent" in interview._SCORE_SYSTEM.lower()


async def test_questions_parses_and_truncates(monkeypatch):
    svc = _service(monkeypatch, '["Q1","Q2","Q3"]')
    assert await svc.questions(target_role="Engineer", cv_text="cv", n=2) == ["Q1", "Q2"]


async def test_questions_safe_on_malformed_json(monkeypatch):
    svc = _service(monkeypatch, "not json at all")
    assert await svc.questions(target_role="Engineer", cv_text="cv") == []


async def test_score_returns_structured_dict(monkeypatch):
    svc = _service(monkeypatch, '{"scores":[],"overall_score":7,"summary":"ok"}')
    out = await svc.score(target_role="Engineer", questions=["Q1"], answers=["A1"])
    assert out["overall_score"] == 7 and out["summary"] == "ok"


async def test_score_safe_on_malformed_json(monkeypatch):
    svc = _service(monkeypatch, "")
    assert await svc.score(target_role="Engineer", questions=["Q1"], answers=["A1"]) == {}
