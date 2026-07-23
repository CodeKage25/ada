"""Test config.

Some modules read settings at import time (e.g. ada.db.session builds the engine), so
the required env must exist before test modules are collected — hence module-level
setdefault rather than only a fixture.
"""
import os

os.environ.setdefault("APP_ENV", "local")
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://u:p@localhost/ada")
os.environ.setdefault("PAYSTACK_SECRET_KEY", "sk_test_secret")
os.environ.setdefault("PAYSTACK_PUBLIC_KEY", "pk_test_public")
os.environ.setdefault("STRIPE_SECRET_KEY", "sk_test_stripe")
os.environ.setdefault("STRIPE_WEBHOOK_SECRET", "whsec_test")
os.environ.setdefault("GCP_PROJECT", "test-project")
