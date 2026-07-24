"""Password hashing with bcrypt.

Only the bcrypt hash is ever stored. bcrypt truncates input at 72 bytes, so we cap
the encoded password there before hashing to keep hash and verify consistent (a longer
password would otherwise silently ignore its tail on both sides).
"""
import bcrypt

_MAX_BYTES = 72


def _encode(password: str) -> bytes:
    return password.encode("utf-8")[:_MAX_BYTES]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(_encode(password), bcrypt.gensalt()).decode("ascii")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(_encode(password), password_hash.encode("ascii"))
    except ValueError:
        # Malformed/legacy hash on the row — treat as a failed match, never raise.
        return False
