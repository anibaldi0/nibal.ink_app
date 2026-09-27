from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class TazaCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nombre: str = Field(min_length=1, max_length=200)
    mensaje: str | None = Field(default=None, max_length=500)
    glb_key: str = Field(min_length=1, max_length=500)
    texture_key: str = Field(min_length=1, max_length=500)
    thumb_key: str = Field(min_length=1, max_length=500)
    decal_offset: list[float] = Field(default_factory=lambda: [0.0, 0.5, 0.0])
    decal_rotation: list[float] = Field(default_factory=lambda: [0.0, 0.0, 0.0])
    decal_scale: list[float] = Field(default_factory=lambda: [1.0, 1.0, 1.0])


class TazaCreateResponse(BaseModel):
    taza_id: UUID
    token_publico: str
    url_publica: str
    qr_png_base64: str


class QRGenerateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    url: str = Field(min_length=1, max_length=2000)


class QRResponse(BaseModel):
    qr_png_base64: str


class ModeloInfo(BaseModel):
    glb_url: str
    thumbnail_url: str


class DecalInfo(BaseModel):
    textura_url: str
    offset: list[float]
    rotation: list[float]
    scale: list[float]


class TazaPublicResponse(BaseModel):
    nombre: str
    mensaje: str | None
    modelo: ModeloInfo
    decal: DecalInfo
    compartido_por: str | None
    creado_en: datetime


class ShareCreateResponse(BaseModel):
    share_url: str
    share_token: str
    expira_en: datetime | None


class HealthResponse(BaseModel):
    status: str
