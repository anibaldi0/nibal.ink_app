from app.settings import settings


def build_asset_url(key: str) -> str:
    base = settings.STORAGE_PUBLIC_URL.rstrip("/")
    clean = key.lstrip("/")
    return f"{base}/{clean}"


def build_public_url(token: str) -> str:
    base = settings.APP_BASE_URL.rstrip("/")
    return f"{base}/t/{token}"


def build_share_url(share_token: str) -> str:
    base = settings.APP_BASE_URL.rstrip("/")
    return f"{base}/s/{share_token}"
