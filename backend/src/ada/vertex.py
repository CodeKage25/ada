"""Single place that constructs the Vertex/Gemini client, with a request timeout.

Every model call in Ada goes through a client built here, so timeout and endpoint
config are set once. Pair with `resilience.retry_async` at call sites for transient
failures.
"""
from functools import lru_cache

from google import genai
from google.genai import types

from ada.config import get_settings


@lru_cache(maxsize=1)
def vertex_client() -> genai.Client:
    """One process-lifetime client.

    Cached deliberately: a per-call client is only referenced by the expression that
    builds the coroutine, so the garbage collector can close its HTTP transport before
    the coroutine is awaited — surfacing as "Cannot send a request, as the client has
    been closed" and silently degrading every AI feature to its fallback. Reusing one
    client also keeps the connection pool warm.
    """
    s = get_settings()
    http = types.HttpOptions(timeout=s.llm_timeout_ms)
    # AI Studio key takes precedence: the whole Gemini stack runs without GCP creds.
    if s.gemini_api_key:
        return genai.Client(api_key=s.gemini_api_key, http_options=http)
    return genai.Client(
        vertexai=True,
        project=s.gcp_project,
        location=s.gcp_location,
        http_options=http,
    )
