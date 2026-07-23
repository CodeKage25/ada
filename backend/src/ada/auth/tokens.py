"""Token primitives for magic links and sessions.

Raw tokens leave the process exactly once (in the email link / Set-Cookie header);
only sha256 hashes are persisted, so a database leak exposes no usable credentials.
"""
import hashlib
import secrets

TOKEN_BYTES = 32  # 256-bit


def mint() -> tuple[str, str]:
    """Return (raw_token, token_hash)."""
    raw = secrets.token_urlsafe(TOKEN_BYTES)
    return raw, hash_token(raw)


def hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()
