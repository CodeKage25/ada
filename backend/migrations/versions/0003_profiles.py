"""profiles: imported career profile per user

Revision ID: 0003_profiles
Revises: 0002_auth
Create Date: 2026-07-23
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0003_profiles"
down_revision: str | None = "0002_auth"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "profiles",
        sa.Column(
            "user_id", sa.String(length=64), sa.ForeignKey("users.id"), primary_key=True
        ),
        sa.Column("linkedin_url", sa.String(length=512), nullable=True),
        sa.Column("profile_text", sa.Text(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_table("profiles")
