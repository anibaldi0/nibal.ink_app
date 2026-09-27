from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.routers import admin, public
from app.schemas import HealthResponse
from app.settings import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(
    title="Nibal.ink API",
    version="0.1.0",
    lifespan=lifespan,
)


# CORS solo en local, en prod Nginx sirve todo en el mismo origen
if settings.APP_ENV == "local":
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


@app.get("/api/health", response_model=HealthResponse, tags=["meta"])
async def health() -> HealthResponse:
    return HealthResponse(status="ok")


app.include_router(admin.router, prefix="/api")
app.include_router(public.router, prefix="/api")


# En local servimos los assets desde el backend. En prod Nginx los sirve
# desde nibal_assets. El mount no existe en prod a proposito.
if settings.APP_ENV == "local":
    assets_path = Path(settings.STORAGE_LOCAL_PATH)
    if assets_path.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_path)), name="assets")
