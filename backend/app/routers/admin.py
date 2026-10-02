from datetime import datetime

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models import Taza
from app.qr import generate_qr_png_base64
from app.schemas import (
    QRGenerateRequest,
    QRResponse,
    TazaCreateRequest,
    TazaCreateResponse,
    TazaPorSlugResponse,
)
from app.security import generate_opaque_token, hash_token, verify_admin_token
from app.storage import build_public_url


router = APIRouter(prefix="/admin", tags=["admin"])


def require_admin(x_admin_token: str | None = Header(default=None)) -> None:
    if not verify_admin_token(x_admin_token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No autorizado",
        )


@router.get(
    "/taza-por-slug/{slug}",
    response_model=TazaPorSlugResponse,
    dependencies=[Depends(require_admin)],
)
async def get_taza_por_slug(
    slug: str,
    db: AsyncSession = Depends(get_db),
) -> TazaPorSlugResponse:
    result = await db.execute(select(Taza).where(Taza.slug == slug))
    taza = result.scalar_one_or_none()
    if taza is None:
        raise HTTPException(status_code=404, detail="No encontrada")

    return TazaPorSlugResponse(
        taza_id=taza.id,
        slug=taza.slug,
        nombre=taza.nombre,
        creada_en=taza.created_at,
        revocada=taza.revoked_at is not None,
    )


@router.post(
    "/taza",
    response_model=TazaCreateResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_admin)],
)
async def crear_o_actualizar_taza(
    payload: TazaCreateRequest,
    db: AsyncSession = Depends(get_db),
) -> TazaCreateResponse:
    # normalizo strings vacios a None
    nombre = payload.nombre if payload.nombre else None
    mensaje = payload.mensaje if payload.mensaje else None

    existing: Taza | None = None
    if payload.slug:
        result = await db.execute(
            select(Taza).where(Taza.slug == payload.slug)
        )
        existing = result.scalar_one_or_none()

    if existing is not None:
        # actualizar fila existente: mantengo token y slug originales
        token_publico = existing.token
        if not token_publico:
            # caso borde: fila sin token (migracion vieja).
            # no deberia pasar, pero por si acaso, generamos uno nuevo.
            token_publico = generate_opaque_token()
            existing.token = token_publico
            existing.token_hash = hash_token(token_publico)

        existing.nombre = nombre
        existing.mensaje = mensaje
        existing.glb_key = payload.glb_key
        existing.texture_key = payload.texture_key
        existing.thumb_key = payload.thumb_key
        existing.decal_offset = payload.decal_offset
        existing.decal_rotation = payload.decal_rotation
        existing.decal_scale = payload.decal_scale

        await db.commit()
        await db.refresh(existing)
        taza = existing
    else:
        # crear fila nueva
        token_publico = generate_opaque_token()
        taza = Taza(
            token=token_publico,
            token_hash=hash_token(token_publico),
            slug=payload.slug,
            nombre=nombre,
            mensaje=mensaje,
            glb_key=payload.glb_key,
            texture_key=payload.texture_key,
            thumb_key=payload.thumb_key,
            decal_offset=payload.decal_offset,
            decal_rotation=payload.decal_rotation,
            decal_scale=payload.decal_scale,
        )
        db.add(taza)
        await db.commit()
        await db.refresh(taza)

    url_publica = build_public_url(token_publico)
    qr_b64 = generate_qr_png_base64(url_publica)

    return TazaCreateResponse(
        taza_id=taza.id,
        token_publico=token_publico,
        url_publica=url_publica,
        qr_png_base64=qr_b64,
    )


@router.post(
    "/qr",
    response_model=QRResponse,
    dependencies=[Depends(require_admin)],
)
async def generar_qr(payload: QRGenerateRequest) -> QRResponse:
    return QRResponse(qr_png_base64=generate_qr_png_base64(payload.url))
