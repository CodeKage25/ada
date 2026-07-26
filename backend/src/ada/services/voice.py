"""Voice conversation via the Gemini Live API (native audio).

connect opens a Live session grounded in what Ada already knows about the caller;
extract turns the resulting transcript into the {target_role, cv_text} the typed
form also produces. Requires live Vertex credentials.
"""
import json

from google.genai import types

from ada.config import get_settings
from ada.vertex import vertex_client

_BASE_PERSONA = """You are Ada, a warm and genuinely curious career coach having a real \
spoken phone conversation with someone about their working life. This is a conversation, \
not a form. React like a person — brief acknowledgements, the occasional reflection back \
("that sounds like…"). Ask ONE question at a time, keep your turns short, and let them \
talk. Don't give long advice; this is about hearing their story. Naturally, over the \
conversation, come to understand their experience, skills, education, and the role they \
want next — but let it surface, never interrogate."""

_COLD_OPEN = """Open naturally: greet them, then ask what they do and what they enjoy most \
about it."""

_GROUNDED_RULES = """You ALREADY KNOW this person from their profile and CV (below). Use it.

- NEVER ask something the context already answers ("what do you do?", "tell me about your \
experience", "what are your skills?"). You know these.
- OPEN by greeting them by name and naming something specific you see — e.g. "I can see \
you're a {{role}} — {{specific detail}}. …". Make them feel recognised in the first breath.
- Ask questions that only make sense for THIS person: probe the work they're proud of, a \
gap or a pivot you notice, what they want next. Reference their actual roles and companies.
- Treat the context as known truth; confirm or go deeper, don't re-collect it.

WHAT YOU KNOW ABOUT THIS PERSON:
{context}"""

_EXTRACT_SYSTEM = """From this conversation transcript between Ada and a candidate, extract \
the candidate's target role and a plain-text CV draft built ONLY from what the candidate \
actually said or confirmed (experience, skills, education, dates). Never invent facts. \
Return JSON of the exact shape: {"target_role": str, "cv_text": str}."""

_MAX_CONTEXT_CHARS = 6_000


def format_candidate_context(
    *,
    full_name: str | None,
    profile_text: str | None,
    cv_text: str | None,
    memories: list[str] | None,
) -> str | None:
    """A single grounding block from everything Ada knows, or None if nothing is known."""
    parts: list[str] = []
    if full_name and full_name.strip():
        parts.append(f"Name: {full_name.strip()}")
    if profile_text and profile_text.strip():
        parts.append(f"Profile (from LinkedIn / their own words):\n{profile_text.strip()}")
    if cv_text and cv_text.strip():
        parts.append(f"Most recent CV:\n{cv_text.strip()}")
    if memories:
        remembered = "\n".join(f"- {m}" for m in memories)
        parts.append(f"Remembered from past conversations:\n{remembered}")
    if not parts:
        return None
    return "\n\n".join(parts)[:_MAX_CONTEXT_CHARS]


def _system_instruction(context: str | None) -> str:
    if context:
        return f"{_BASE_PERSONA}\n\n{_GROUNDED_RULES.format(context=context)}"
    return f"{_BASE_PERSONA}\n\n{_COLD_OPEN}"


class VoiceIntake:
    def __init__(self) -> None:
        s = get_settings()
        self._client = vertex_client()
        self._live_model = s.live_model
        self._model = s.vertex_model

    def connect(self, context: str | None = None):
        """Async context manager yielding a Live session grounded in `context` when the
        caller is known. Emits native audio plus input/output transcription."""
        config = types.LiveConnectConfig(
            response_modalities=[types.Modality.AUDIO],
            system_instruction=_system_instruction(context),
            input_audio_transcription=types.AudioTranscriptionConfig(),
            output_audio_transcription=types.AudioTranscriptionConfig(),
        )
        return self._client.aio.live.connect(model=self._live_model, config=config)

    async def extract(self, transcript: str) -> dict:
        resp = await self._client.aio.models.generate_content(
            model=self._model,
            contents=transcript,
            config=types.GenerateContentConfig(
                system_instruction=_EXTRACT_SYSTEM,
                temperature=0.2,
                response_mime_type="application/json",
            ),
        )
        return json.loads(resp.text or "{}")
