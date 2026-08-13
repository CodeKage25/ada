"""Memory is best-effort: recall/remember must never raise into the chat path.

Provider failure is forced explicitly rather than relying on absent credentials, so the
contract holds whether or not the environment can reach the model.
"""


class _FakeMemRepo:
    def __init__(self) -> None:
        self.added: list = []

    async def list_for_user(self, user_id: str) -> list:
        return []

    async def recall(self, user_id: str, vector: list, k: int) -> list:
        return []

    async def add_many(self, user_id: str, pairs: list) -> int:
        self.added.extend(pairs)
        return len(pairs)


async def test_recall_returns_empty_when_the_provider_fails(monkeypatch):
    from ada.services.memory import MemoryService
    from ada.services.search import SearchService

    async def boom(self, text):
        raise RuntimeError("429 RESOURCE_EXHAUSTED")

    monkeypatch.setattr(SearchService, "embed", boom)
    assert await MemoryService().recall(_FakeMemRepo(), "user-1", "career background") == []


async def test_remember_returns_zero_when_extraction_fails(monkeypatch):
    from ada.services.memory import MemoryService

    async def boom(self, existing, exchange):
        raise RuntimeError("model unavailable")

    monkeypatch.setattr(MemoryService, "_extract", boom)
    repo = _FakeMemRepo()
    assert await MemoryService().remember(repo, "user-1", "You: I lead a team.") == 0
    assert repo.added == []


async def test_remember_stores_extracted_facts(monkeypatch):
    """The success path: extracted facts are embedded and persisted."""
    from ada.services.memory import MemoryService
    from ada.services.search import SearchService

    async def facts(self, existing, exchange):
        return ["Leads a team of 5.", "8 years in fintech."]

    async def vectors(self, texts):
        return [[0.1] * 768 for _ in texts]

    monkeypatch.setattr(MemoryService, "_extract", facts)
    monkeypatch.setattr(SearchService, "embed_many", vectors)
    repo = _FakeMemRepo()
    assert await MemoryService().remember(repo, "user-1", "You: I lead a team.") == 2
    assert [content for content, _ in repo.added] == ["Leads a team of 5.", "8 years in fintech."]
