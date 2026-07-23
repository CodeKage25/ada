import pytest
import stripe as stripe_sdk

from ada.payments import stripe as pay


def test_verify_and_parse_delegates(monkeypatch):
    monkeypatch.setattr(
        stripe_sdk.Webhook, "construct_event",
        staticmethod(lambda payload, sig, secret: {"type": "checkout.session.completed"}),
    )
    assert pay.verify_and_parse(b"{}", "sig")["type"] == "checkout.session.completed"


def test_verify_and_parse_raises_on_bad_signature(monkeypatch):
    def boom(payload, sig, secret):
        raise ValueError("bad signature")

    monkeypatch.setattr(stripe_sdk.Webhook, "construct_event", staticmethod(boom))
    with pytest.raises(ValueError):
        pay.verify_and_parse(b"{}", "sig")
