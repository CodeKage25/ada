"""run attempt counter + human-readable failure reason

Revision ID: 0023_run_retry_state
Revises: 0022_run_access_token
Create Date: 2026-08-03
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0023_run_retry_state"
down_revision: str | None = "0022_run_access_token"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "runs",
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column("runs", sa.Column("failure_reason", sa.String(200), nullable=True))


def downgrade() -> None:
    op.drop_column("runs", "failure_reason")
    op.drop_column("runs", "attempts")
