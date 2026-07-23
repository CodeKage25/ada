import hashlib
import hmac

from ada.payments.paystack import verify_signature


def _sign(body: bytes, secret: str) -> str:
    return hmac.new(secret.encode(), body, hashlib.sha512).hexdigest()


def test_accepts_valid_signature():
    body = b'{"event":"charge.success"}'
    assert verify_signature(body, _sign(body, "sk_test_secret")) is True


def test_rejects_tampered_body():
    sig = _sign(b'{"event":"charge.success"}', "sk_test_secret")
    assert verify_signature(b'{"event":"tampered"}', sig) is False


def test_rejects_missing_signature():
    assert verify_signature(b"{}", None) is False
