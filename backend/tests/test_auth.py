"""Auth unit tests (no DB) + Postgres-gated integration tests for the token lifecycle."""
import os
import uuid

import pytest

from ada.auth.tokens import hash_token, mint


def test_mint_returns_distinct_raw_and_hash():
    raw, token_hash = mint()
    assert raw != token_hash
    assert hash_token(raw) == token_hash
    assert len(token_hash) == 64  # sha256 hex


def test_mint_is_unique():
    assert mint()[0] != mint()[0]


_db = pytest.mark.skipif(not os.getenv("RUN_DB_TESTS"), reason="requires Postgres")


@_db
async def test_magic_token_single_use():
    from ada.auth.repository import AuthRepository
    from ada.db.session import _session_factory, init_db

    await init_db()
    email = f"{uuid.uuid4().hex}@example.com"
    async with _session_factory() as s:
        repo = AuthRepository(s)
        user = await repo.upsert_user(email)
        raw, token_hash = mint()
        await repo.create_magic_token(user.id, token_hash)
        assert await repo.consume_magic_token(token_hash) == user.id
        assert await repo.consume_magic_token(token_hash) is None  # single-use


@_db
async def test_session_round_trip_and_destroy():
    from ada.auth.repository import AuthRepository
    from ada.db.session import _session_factory, init_db

    await init_db()
    email = f"{uuid.uuid4().hex}@example.com"
    async with _session_factory() as s:
        repo = AuthRepository(s)
        user = await repo.upsert_user(email)
        raw, token_hash = mint()
        await repo.create_session(user.id, token_hash)
        found = await repo.user_for_session(token_hash)
        assert found is not None and found.email == email
        await repo.destroy_session(token_hash)
        assert await repo.user_for_session(token_hash) is None


@_db
async def test_upsert_user_is_idempotent():
    from ada.auth.repository import AuthRepository
    from ada.db.session import _session_factory, init_db

    await init_db()
    email = f"{uuid.uuid4().hex}@example.com"
    async with _session_factory() as s:
        repo = AuthRepository(s)
        first = await repo.upsert_user(email)
        second = await repo.upsert_user(email.upper())  # case-insensitive
        assert first.id == second.id
