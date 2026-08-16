import asyncio
import re
import tempfile
from collections.abc import Awaitable, Callable
from pathlib import Path
from typing import TYPE_CHECKING

from ada.services.ats import (
    ApplicantAnswers,
    FormAction,
    FormPlan,
    SubmitOutcome,
    looks_blocked,
    note,
)

Progress = Callable[[str], Awaitable[None]] | None

BLOCKED_DETAIL = (
    "The employer's site blocks automated applications — apply manually in one click; "
    "your tailored CV is ready."
)

if TYPE_CHECKING:
    from playwright.async_api import Page

TOTAL_TIMEOUT_S = 120
STEP_TIMEOUT_MS = 8_000
CONFIRMATION_PATTERN = re.compile(
    r"thank you|application (received|submitted|sent)|successfully (applied|submitted)", re.I
)
ERROR_SELECTORS = ('[role="alert"]', ".field-error", ".error-message", ".application-error")


async def execute_plan(
    plan: FormPlan, answers: ApplicantAnswers, on_progress: Progress = None
) -> SubmitOutcome:
    try:
        return await asyncio.wait_for(_run(plan, answers, on_progress), timeout=TOTAL_TIMEOUT_S)
    except TimeoutError:
        return SubmitOutcome(
            status="needs_attention",
            detail="The employer's form took too long to respond — try again shortly.",
            code="timeout",
        )


async def _run(
    plan: FormPlan, answers: ApplicantAnswers, on_progress: Progress = None
) -> SubmitOutcome:
    from playwright.async_api import async_playwright

    missing: list[str] = []
    async with async_playwright() as pw:
        browser = await pw.chromium.launch()
        try:
            await note(on_progress, "Opening the employer's application form…")
            page = await browser.new_page()
            await page.goto(plan.apply_url, wait_until="domcontentloaded")
            if looks_blocked(await page.title(), await page.content()):
                return SubmitOutcome(
                    status="needs_attention", detail=BLOCKED_DETAIL, code="blocked"
                )
            await note(on_progress, "Filling in your details and uploading your CV…")
            with tempfile.TemporaryDirectory() as tmp:
                cv_path = Path(tmp) / answers.cv_filename
                cv_path.write_bytes(answers.cv_bytes)
                for action in plan.actions:
                    ok = await _perform(page, action, str(cv_path))
                    if not ok and action.required:
                        missing.append(action.label)
                if missing:
                    return SubmitOutcome(
                        status="needs_attention",
                        detail="Couldn't locate required fields: " + ", ".join(missing),
                        missing=missing,
                        code="fields_missing",
                    )
                await note(on_progress, "Submitting your application…")
                if not await _click_first(page, plan.submit_selectors):
                    return SubmitOutcome(
                        status="needs_attention",
                        detail="Couldn't find the submit button on the employer's form.",
                        code="no_submit",
                    )
                await note(on_progress, "Waiting for the employer's confirmation…")
                await page.wait_for_load_state("networkidle", timeout=30_000)
            if await _any_visible(page, plan.confirmation_markers) or await confirmed(page):
                return SubmitOutcome(status="submitted")
            errors = await _collect_errors(page)
            if errors:
                return SubmitOutcome(
                    status="needs_attention",
                    detail="The form needs answers only you can give: " + "; ".join(errors[:5]),
                    code="manual_questions",
                )
            return SubmitOutcome(
                status="needs_attention",
                detail="Ada filled and submitted the form but the employer showed no "
                       "confirmation — it may have extra steps. Open it to check and "
                       "finish; don't resubmit blindly.",
                code="no_confirmation",
            )
        finally:
            await browser.close()


async def _attempt(operation: Awaitable[object]) -> bool:
    try:
        await operation
        return True
    except Exception:
        return False


async def _perform(page: "Page", action: FormAction, cv_path: str) -> bool:
    for selector in action.selectors:
        locator = page.locator(selector).first
        if action.kind == "upload":
            done = await _attempt(locator.set_input_files(cv_path, timeout=STEP_TIMEOUT_MS))
        elif not action.value:
            return True
        else:
            done = await _attempt(locator.fill(action.value, timeout=STEP_TIMEOUT_MS))
        if done:
            return True
    return False


async def _click_first(page: "Page", selectors: tuple[str, ...]) -> bool:
    for selector in selectors:
        if await _attempt(page.locator(selector).first.click(timeout=STEP_TIMEOUT_MS)):
            return True
    return False


async def _is_visible(page: "Page", marker: str) -> bool:
    try:
        return await page.locator(marker).first.is_visible(timeout=4_000)
    except Exception:
        return False


async def _any_visible(page: "Page", markers: tuple[str, ...]) -> bool:
    for marker in markers:
        if await _is_visible(page, marker):
            return True
    return False


async def _texts_for(page: "Page", selector: str) -> list[str]:
    try:
        return await page.locator(selector).all_inner_texts()
    except Exception:
        return []


async def _collect_errors(page: "Page") -> list[str]:
    texts: list[str] = []
    for selector in ERROR_SELECTORS:
        for text in await _texts_for(page, selector):
            cleaned = " ".join(text.split())
            if cleaned and cleaned not in texts:
                texts.append(cleaned)
    return texts


async def confirmed(page: "Page") -> bool:
    """Did the employer actually acknowledge the submission?

    A stray "thank you" banner never removes the form, so a phrase alone is not enough:
    the form must be gone too. Shared by the deterministic and agentic paths so a narrow
    per-ATS marker list can't produce a false "no confirmation".
    """
    if await _any_visible(
        page,
        ("text=Thank you for applying", "text=Application submitted",
         "text=Application received", '[role="status"]:has-text("submitted")'),
    ):
        return True
    if not await _form_gone(page):
        return False
    for region in ("h1", "h2", "main", '[role="status"]', ".confirmation"):
        for text in await _texts_for(page, region):
            if CONFIRMATION_PATTERN.search(text):
                return True
    return False


async def _form_gone(page: "Page") -> bool:
    selector = (
        "input:visible:not([type=hidden]):not([type=submit]):not([type=button]), "
        "textarea:visible"
    )
    try:
        return await page.locator(selector).count() == 0
    except Exception:
        return False
