"""slug, token en claro y nombre nullable

Revision ID: 0002_slug_token_nombre_nullable
Revises: 0001_init
Create Date: 2026-10-01 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0002_slug_token_nombre_nullable"
down_revision: Union[str, None] = "0001_init"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # slug: identificador humano de la taza (nombre de carpeta, unico)
    op.add_column("tazas", sa.Column("slug", sa.Text(), nullable=True))
    op.create_unique_constraint("uq_tazas_slug", "tazas", ["slug"])

    # token: el token publico en claro, para poder regenerar el QR
    op.add_column("tazas", sa.Column("token", sa.Text(), nullable=True))

    # nombre: pasa a nullable
    op.alter_column("tazas", "nombre", existing_type=sa.Text(), nullable=True)


def downgrade() -> None:
    op.alter_column("tazas", "nombre", existing_type=sa.Text(), nullable=False)
    op.drop_column("tazas", "token")
    op.drop_constraint("uq_tazas_slug", "tazas", type_="unique")
    op.drop_column("tazas", "slug")
