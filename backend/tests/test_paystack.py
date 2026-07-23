import hashlib
import hmac

from ada.config import get_settings
from ada.payments.paystack import verify_signature


def _sign(body: bytes, secret: str) -> str:
    return hmac.new(secret.encode(), body, hashlib.sha512).hexdigest()


def _secret() -> str:
    # Sign with whatever key the app is configured with — conftest sets a default,
    # but CI exports its own value, and hardcoding it here breaks there.
    return get_settings().paystack_secret_key


def test_accepts_valid_signature():
    body = b'{"event":"charge.success"}'
    assert verify_signature(body, _sign(body, _secret())) is True


def test_rejects_tampered_body():
    sig = _sign(b'{"event":"charge.success"}', _secret())
    assert verify_signature(b'{"event":"tampered"}', sig) is False


def test_rejects_missing_signature():
    assert verify_signature(b"{}", None) is False
