"""users.password_hash: email+password authentication

Revision ID: 0005_password
Revises: 0004_run_stage
Create Date: 2026-07-24
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0005_password"
down_revision: str | None = "0004_run_stage"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Nullable: existing rows (if any) keep working until they set a password via reset.
    op.add_column("users", sa.Column("password_hash", sa.String(length=100), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "password_hash")
