from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models import Share, Taza
from app.schemas import (
    DecalInfo,
    ModeloInfo,
    ShareCreateResponse,
    TazaPublicResponse,
)
from app.security import generate_opaque_token, hash_token
from app.storage import build_asset_url, build_share_url


router = APIRouter(tags=["public"])


def _not_found() -> HTTPException:
    # mismo mensaje para "no existe", "revocado" y "expirado"
    return HTTPException(status_code=404, detail="No encontrado")


def _serialize_taza(taza: Taza, compartido_por: str | None) -> TazaPublicResponse:
    return TazaPublicResponse(
        nombre=taza.nombre,
        mensaje=taza.mensaje,
        modelo=ModeloInfo(
            glb_url=build_asset_url(taza.glb_key),
            thumbnail_url=build_asset_url(taza.thumb_key),
        ),
        decal=DecalInfo(
            textura_url=build_asset_url(taza.texture_key),
            offset=taza.decal_offset,
            rotation=taza.decal_rotation,
            scale=taza.decal_scale,
        ),
        compartido_por=compartido_por,
        creado_en=taza.created_at,
    )


async def _find_taza_by_token(db: AsyncSession, token: str) -> Taza | None:
    result = await db.execute(
        select(Taza).where(
            Taza.token_hash == hash_token(token),
            Taza.revoked_at.is_(None),
        )
    )
    return result.scalar_one_or_none()


async def _find_share_by_token(db: AsyncSession, token: str) -> Share | None:
    result = await db.execute(
        select(Share).where(
            Share.token_hash == hash_token(token),
            Share.revoked_at.is_(None),
        )
    )
    return result.scalar_one_or_none()


@router.get("/taza/{token}", response_model=TazaPublicResponse)
async def get_taza(
    token: str,
    db: AsyncSession = Depends(get_db),
) -> TazaPublicResponse:
    taza = await _find_taza_by_token(db, token)
    if taza is None:
        raise _not_found()
    return _serialize_taza(taza, compartido_por=None)


@router.post(
    "/taza/{token}/share",
    response_model=ShareCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_share(
    token: str,
    db: AsyncSession = Depends(get_db),
) -> ShareCreateResponse:
    taza = await _find_taza_by_token(db, token)
    if taza is None:
        raise _not_found()

    share_token = generate_opaque_token()
    share = Share(
        taza_id=taza.id,
        token_hash=hash_token(share_token),
    )
    db.add(share)
    await db.commit()

    return ShareCreateResponse(
        share_url=build_share_url(share_token),
        share_token=share_token,
        expira_en=None,
    )


@router.get("/share/{share_token}", response_model=TazaPublicResponse)
async def get_share(
    share_token: str,
    db: AsyncSession = Depends(get_db),
) -> TazaPublicResponse:
    share = await _find_share_by_token(db, share_token)
    if share is None:
        raise _not_found()

    result = await db.execute(
        select(Taza).where(
            Taza.id == share.taza_id,
            Taza.revoked_at.is_(None),
        )
    )
    taza = result.scalar_one_or_none()
    if taza is None:
        raise _not_found()

    return _serialize_taza(taza, compartido_por=taza.nombre)
