"""application failure classification (permanent vs retriable)

Revision ID: 0026_application_failure_code
Revises: 0025_identity_levels
Create Date: 2026-08-12
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0026_application_failure_code"
down_revision: str | None = "0025_identity_levels"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("applications", sa.Column("failure_code", sa.String(32), nullable=True))


def downgrade() -> None:
    op.drop_column("applications", "failure_code")
