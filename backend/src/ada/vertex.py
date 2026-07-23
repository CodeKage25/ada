"""Single place that constructs the Vertex/Gemini client, with a request timeout.

Every model call in Ada goes through a client built here, so timeout and endpoint
config are set once. Pair with `resilience.retry_async` at call sites for transient
failures.
"""
from google import genai
from google.genai import types

from ada.config import get_settings


def vertex_client() -> genai.Client:
    s = get_settings()
    return genai.Client(
        vertexai=True,
        project=s.gcp_project,
        location=s.gcp_location,
        http_options=types.HttpOptions(timeout=s.llm_timeout_ms),
    )
