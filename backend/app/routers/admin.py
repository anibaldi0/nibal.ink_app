from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models import Taza
from app.qr import generate_qr_png_base64
from app.schemas import (
    QRGenerateRequest,
    QRResponse,
    TazaCreateRequest,
    TazaCreateResponse,
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


@router.post(
    "/taza",
    response_model=TazaCreateResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_admin)],
)
async def crear_taza(
    payload: TazaCreateRequest,
    db: AsyncSession = Depends(get_db),
) -> TazaCreateResponse:
    token_publico = generate_opaque_token()
    taza = Taza(
        token_hash=hash_token(token_publico),
        nombre=payload.nombre,
        mensaje=payload.mensaje,
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
    # util para regenerar un QR si el admin perdio el PNG original
    return QRResponse(qr_png_base64=generate_qr_png_base64(payload.url))
