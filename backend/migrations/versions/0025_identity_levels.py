"""explicit identity assurance levels + deterministic backfill

Revision ID: 0025_identity_levels
Revises: 0024_job_interactions
Create Date: 2026-08-03
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0025_identity_levels"
down_revision: str | None = "0024_job_interactions"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "profiles",
        sa.Column("identity_level", sa.String(32), nullable=False, server_default="unverified"),
    )
    op.add_column(
        "profiles", sa.Column("identity_checked_at", sa.DateTime(timezone=True), nullable=True)
    )
    op.create_index("ix_profiles_identity_level", "profiles", ["identity_level"])
    # Deterministic mapping mirroring services.identity.level_from_method.
    op.execute(
        "UPDATE profiles SET identity_level = 'government_id_verified', "
        "identity_checked_at = updated_at WHERE identity_method LIKE 'smile:%'"
    )
    op.execute(
        "UPDATE profiles SET identity_level = 'self_attested', "
        "identity_checked_at = updated_at WHERE identity_method = 'attested'"
    )


def downgrade() -> None:
    op.drop_index("ix_profiles_identity_level", table_name="profiles")
    op.drop_column("profiles", "identity_checked_at")
    op.drop_column("profiles", "identity_level")
