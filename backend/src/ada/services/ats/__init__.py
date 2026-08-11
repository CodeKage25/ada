"""ATS application submission: pure per-source form plans + one browser executor."""
from dataclasses import dataclass, field


@dataclass(frozen=True)
class ApplicantAnswers:
    full_name: str
    first_name: str
    last_name: str
    email: str
    phone: str | None
    linkedin_url: str | None
    cv_filename: str
    cv_bytes: bytes


@dataclass(frozen=True)
class FormAction:
    kind: str
    selectors: tuple[str, ...]
    value: str | None = None
    required: bool = True
    label: str = ""


@dataclass(frozen=True)
class FormPlan:
    apply_url: str
    actions: tuple[FormAction, ...]
    submit_selectors: tuple[str, ...]
    confirmation_markers: tuple[str, ...]


@dataclass
class SubmitOutcome:
    status: str
    detail: str | None = None
    missing: list[str] = field(default_factory=list)
    code: str | None = None


# Failure codes that retrying cannot fix — the site actively resists automation or needs
# information only the candidate has. These flip the UI to the manual-apply handoff.
PERMANENT_CODES = frozenset(
    {"blocked", "no_form", "login_walled", "fields_missing", "manual_questions"}
)


def can_retry(code: str | None) -> bool:
    return code not in PERMANENT_CODES


_BLOCKED_MARKERS = (
    "just a moment",
    "attention required",
    "verify you are human",
    "verifying you are human",
    "access denied",
    "cf-chl",
    "cf-turnstile",
    "captcha",
    "unusual traffic",
)


async def note(on_progress: object, text: str) -> None:
    """Report a live submit stage ("Filling in your details…") to the application row so
    the candidate watches real progress, not a spinner. Cosmetic by contract: a failed
    write must never break the submit itself."""
    if on_progress is None or not callable(on_progress):
        return
    try:
        await on_progress(text)
    except Exception:  # noqa: BLE001 — progress is cosmetic, never breaks a submit
        return


def looks_blocked(title: str, html: str) -> bool:
    """Bot-wall sniff: challenge pages (Cloudflare et al.) have no real form, so failing
    fast with an honest 'blocked' beats reporting missing fields on a page that never
    contained them."""
    haystack = f"{title}\n{html[:4000]}".lower()
    return any(marker in haystack for marker in _BLOCKED_MARKERS)


def split_name(full_name: str) -> tuple[str, str]:
    parts = full_name.strip().split()
    if len(parts) == 1:
        return parts[0], parts[0]
    return parts[0], " ".join(parts[1:])
