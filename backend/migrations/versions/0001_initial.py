"""initial schema: processed_events, runs, jobs (+ pgvector)

Revision ID: 0001_initial
Revises:
Create Date: 2026-07-23
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects import postgresql

revision: str = "0001_initial"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

EMBED_DIM = 768


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "processed_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("provider", sa.String(length=32), nullable=False),
        sa.Column("reference", sa.String(length=128), nullable=False),
        sa.UniqueConstraint("provider", "reference", name="uq_event"),
    )

    op.create_table(
        "runs",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("reference", sa.String(length=128), nullable=False),
        sa.Column("provider", sa.String(length=32), nullable=False),
        sa.Column("amount", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(length=8), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("target_role", sa.String(length=256), nullable=False),
        sa.Column("cv_text", sa.Text(), nullable=False),
        sa.Column("transcript", sa.Text(), nullable=True),
        sa.Column("rewritten_cv", sa.Text(), nullable=True),
        sa.Column("matches_json", postgresql.JSONB(), nullable=True),
        sa.Column("questions_json", postgresql.JSONB(), nullable=True),
        sa.Column("interview_json", postgresql.JSONB(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_runs_reference", "runs", ["reference"], unique=True)
    op.create_index("ix_runs_status", "runs", ["status"])

    op.create_table(
        "jobs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(length=256), nullable=False),
        sa.Column("company", sa.String(length=256), nullable=False),
        sa.Column("location", sa.String(length=256), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("embedding", Vector(EMBED_DIM), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("jobs")
    op.drop_index("ix_runs_status", table_name="runs")
    op.drop_index("ix_runs_reference", table_name="runs")
    op.drop_table("runs")
    op.drop_table("processed_events")
