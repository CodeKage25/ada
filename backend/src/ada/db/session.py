"""Async engine, session dependency, and dev-only schema bootstrap.

Production schema is managed by Alembic (`make migrate`); `init_db` is a convenience
for local dev and tests only and is never called on the prod boot path.
"""
from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from ada.config import get_settings

_settings = get_settings()
engine = create_async_engine(
    _settings.database_url,
    pool_pre_ping=True,           # drop dead connections (Cloud SQL idle-kills them)
    pool_size=_settings.db_pool_size,
    max_overflow=_settings.db_max_overflow,
    pool_recycle=_settings.db_pool_recycle_seconds,
)
_session_factory = async_sessionmaker(engine, expire_on_commit=False)


async def get_session() -> AsyncIterator[AsyncSession]:
    async with _session_factory() as session:
        yield session


async def init_db() -> None:
    """Create the pgvector extension + all tables. Local/test bootstrap only."""
    from sqlalchemy import text

    from ada.db.models import Base
    async with engine.begin() as conn:
        # pgvector must exist before create_all builds the Vector column / jobs table.
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        await conn.run_sync(Base.metadata.create_all)


async def ping() -> None:
    """Readiness check: prove the pool can reach Postgres."""
    from sqlalchemy import text

    async with engine.connect() as conn:
        await conn.execute(text("SELECT 1"))
