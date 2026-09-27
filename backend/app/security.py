import hashlib
import secrets

from app.settings import settings


def generate_opaque_token(nbytes: int = 32) -> str:
    # token_urlsafe(32) -> ~43 chars, 256 bits de entropia
    return secrets.token_urlsafe(nbytes)


def hash_token(token: str) -> bytes:
    # SHA256 es suficiente: el token tiene 256 bits de entropia, no hay
    # diccionario ni fuerza bruta posible. Argon2 no aporta nada aca y
    # haria el lookup inviable (no se puede indexar por hash lento).
    return hashlib.sha256(token.encode("ascii")).digest()


def verify_admin_token(provided: str | None) -> bool:
    if not provided:
        return False
    return secrets.compare_digest(provided, settings.ADMIN_TOKEN)
