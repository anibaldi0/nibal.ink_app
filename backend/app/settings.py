from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    DATABASE_URL: str
    ADMIN_TOKEN: str

    STORAGE_PUBLIC_URL: str = "http://localhost:8001/assets"
    STORAGE_LOCAL_PATH: str = "assets"

    APP_ENV: str = "local"
    APP_BASE_URL: str = "http://localhost:5173"

    QR_FILL_COLOR: str = "black"
    QR_BACK_COLOR: str = "white"


settings = Settings()
