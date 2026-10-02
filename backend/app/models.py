import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Taza(Base):
    __tablename__ = "tazas"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    token_hash: Mapped[bytes] = mapped_column(nullable=False, unique=True)
    token: Mapped[str | None] = mapped_column(nullable=True)
    slug: Mapped[str | None] = mapped_column(nullable=True, unique=True)
    nombre: Mapped[str | None] = mapped_column(nullable=True)
    mensaje: Mapped[str | None] = mapped_column(nullable=True)

    glb_key: Mapped[str] = mapped_column(nullable=False)
    texture_key: Mapped[str] = mapped_column(nullable=False)
    thumb_key: Mapped[str] = mapped_column(nullable=False)

    decal_offset: Mapped[list] = mapped_column(
        JSONB, nullable=False, server_default=text("'[0, 0.5, 0]'::jsonb")
    )
    decal_rotation: Mapped[list] = mapped_column(
        JSONB, nullable=False, server_default=text("'[0, 0, 0]'::jsonb")
    )
    decal_scale: Mapped[list] = mapped_column(
        JSONB, nullable=False, server_default=text("'[1, 1, 1]'::jsonb")
    )

    created_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), nullable=False
    )
    revoked_at: Mapped[datetime | None] = mapped_column(nullable=True)

    shares: Mapped[list["Share"]] = relationship(
        back_populates="taza", cascade="all, delete-orphan"
    )


class Share(Base):
    __tablename__ = "shares"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    taza_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tazas.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    token_hash: Mapped[bytes] = mapped_column(nullable=False, unique=True)
    created_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), nullable=False
    )
    revoked_at: Mapped[datetime | None] = mapped_column(nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(nullable=True)

    taza: Mapped[Taza] = relationship(back_populates="shares")
