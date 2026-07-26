from ada.services.voice import _system_instruction, format_candidate_context


def test_context_is_none_when_nothing_known():
    assert format_candidate_context(
        full_name=None, profile_text=None, cv_text=None, memories=None
    ) is None
    assert format_candidate_context(
        full_name="  ", profile_text="", cv_text="  ", memories=[]
    ) is None


def test_context_assembles_known_fields():
    context = format_candidate_context(
        full_name="Jane Doe",
        profile_text="Senior backend engineer, 8 years, fintech.",
        cv_text="Led the payments platform at Acme.",
        memories=["Wants to move into management", "Prefers remote"],
    )
    assert context is not None
    assert "Jane Doe" in context
    assert "backend engineer" in context
    assert "payments platform" in context
    assert "move into management" in context


def test_context_truncates():
    context = format_candidate_context(
        full_name="Jane", profile_text="x" * 10_000, cv_text=None, memories=None
    )
    assert context is not None
    assert len(context) <= 6_000


def test_grounded_instruction_forbids_generic_questions():
    context = format_candidate_context(
        full_name="Jane Doe", profile_text="Product manager at Acme.",
        cv_text=None, memories=None,
    )
    grounded = _system_instruction(context)
    assert "NEVER ask" in grounded
    assert "greeting them by name" in grounded
    assert "Product manager at Acme." in grounded


def test_cold_instruction_when_no_context():
    cold = _system_instruction(None)
    assert "Open naturally" in cold
    assert "NEVER ask" not in cold
    assert "WHAT YOU KNOW" not in cold


async def test_load_context_none_without_cookie():
    from ada.api.routes.voice import _load_context

    class _WS:
        cookies: dict[str, str] = {}

    assert await _load_context(_WS()) is None
