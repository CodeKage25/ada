import pytest

from ada.config import Settings


def test_local_skips_validation():
    Settings(app_env="local", database_url="x").validate_runtime()


def test_prod_requires_project_and_payment_provider():
    s = Settings(
        app_env="prod", database_url="x", gcp_project="",
        allowed_origin="https://ada.example", paystack_secret_key="",
        paystack_public_key="", stripe_secret_key="", stripe_webhook_secret="",
    )
    with pytest.raises(RuntimeError):
        s.validate_runtime()


def test_prod_ok_with_stripe_only():
    Settings(
        app_env="prod", database_url="x", gcp_project="p",
        allowed_origin="https://ada.example",
        stripe_secret_key="sk", stripe_webhook_secret="wh",
        smtp_username="auth@x", smtp_password="pw", frontend_origin="https://ada.example",
    ).validate_runtime()


def test_prod_requires_auth_config():
    s = Settings(
        app_env="prod", database_url="x", gcp_project="p",
        allowed_origin="https://ada.example",
        stripe_secret_key="sk", stripe_webhook_secret="wh",
    )
    with pytest.raises(RuntimeError, match="SMTP_USERNAME"):
        s.validate_runtime()


def test_prod_rejects_wildcard_cors():
    s = Settings(
        app_env="prod", database_url="x", gcp_project="p",
        allowed_origin="*", stripe_secret_key="sk", stripe_webhook_secret="wh",
        smtp_username="auth@x", smtp_password="pw", frontend_origin="https://ada.example",
    )
    with pytest.raises(RuntimeError):
        s.validate_runtime()


def test_cors_origins_parsed():
    s = Settings(database_url="x", allowed_origin="https://a, https://b")
    assert s.cors_origins == ["https://a", "https://b"]


def test_vertex_client_is_cached_so_gc_cannot_close_it():
    """A per-call client can be collected (closing its transport) before the coroutine it
    built is awaited — the cache keeps one strong reference for the process lifetime."""
    from ada.vertex import vertex_client

    vertex_client.cache_clear()
    first = vertex_client()
    assert vertex_client() is first
    assert vertex_client.cache_info().currsize == 1


def test_model_name_resolves_per_backend():
    """Vertex and AI Studio don't share a model namespace: an AI Studio rolling alias
    404s on Vertex, so the default must follow the backend actually in use."""
    from ada.config import Settings

    def mk(**kw):
        return Settings(database_url="x", _env_file=None, **kw)

    assert mk().model_name == "gemini-2.5-flash"                       # Vertex
    assert mk(gemini_api_key="k").model_name == "gemini-flash-latest"  # AI Studio
    assert mk(vertex_model="pinned-model").model_name == "pinned-model"
    assert mk(gemini_api_key="k", vertex_model="pinned").model_name == "pinned"
