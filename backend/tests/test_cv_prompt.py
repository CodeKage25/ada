from ada.services import cv


def test_system_prompt_demands_no_fabrication():
    # guardrail: the rewrite prompt must forbid inventing facts
    assert "never invent" in cv._SYSTEM.lower()
    assert "markdown" in cv._SYSTEM.lower()
