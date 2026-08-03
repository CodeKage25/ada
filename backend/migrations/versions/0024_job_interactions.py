"""candidate job-feed triage (tracked / dismissed)

Revision ID: 0024_job_interactions
Revises: 0023_run_retry_state
Create Date: 2026-08-03
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0024_job_interactions"
down_revision: str | None = "0023_run_retry_state"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "job_interactions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.String(64), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("job_id", sa.Integer(), sa.ForeignKey("jobs.id"), nullable=False),
        sa.Column("action", sa.String(16), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.UniqueConstraint("user_id", "job_id", name="uq_job_interaction"),
    )
    op.create_index("ix_job_interactions_user_id", "job_interactions", ["user_id"])
    op.create_index("ix_job_interactions_job_id", "job_interactions", ["job_id"])


def downgrade() -> None:
    op.drop_table("job_interactions")
