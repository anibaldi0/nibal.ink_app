"""init

Revision ID: 0001_init
Revises:
Create Date: 2026-04-27 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "0001_init"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "tazas",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("token_hash", sa.LargeBinary(), nullable=False),
        sa.Column("nombre", sa.Text(), nullable=False),
        sa.Column("mensaje", sa.Text(), nullable=True),
        sa.Column("glb_key", sa.Text(), nullable=False),
        sa.Column("texture_key", sa.Text(), nullable=False),
        sa.Column("thumb_key", sa.Text(), nullable=False),
        sa.Column(
            "decal_offset",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[0, 0.5, 0]'::jsonb"),
            nullable=False,
        ),
        sa.Column(
            "decal_rotation",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[0, 0, 0]'::jsonb"),
            nullable=False,
        ),
        sa.Column(
            "decal_scale",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[1, 1, 1]'::jsonb"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash"),
    )

    op.create_table(
        "shares",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("taza_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("token_hash", sa.LargeBinary(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["taza_id"], ["tazas.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash"),
    )
    op.create_index("ix_shares_taza_id", "shares", ["taza_id"])


def downgrade() -> None:
    op.drop_index("ix_shares_taza_id", table_name="shares")
    op.drop_table("shares")
    op.drop_table("tazas")
