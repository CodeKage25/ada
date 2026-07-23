"""runs.stage: live agent progress for the UI

Revision ID: 0004_run_stage
Revises: 0003_profiles
Create Date: 2026-07-23
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0004_run_stage"
down_revision: str | None = "0003_profiles"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("runs", sa.Column("stage", sa.String(length=32), nullable=True))


def downgrade() -> None:
    op.drop_column("runs", "stage")
