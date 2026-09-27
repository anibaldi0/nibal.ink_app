# =====================================================================
# Stage 1: builder
# Instala las dependencias en un virtualenv separado. Lo que quede
# instalado aca no viaja a la imagen final.
# =====================================================================
FROM python:3.12-slim AS builder

WORKDIR /build

ENV PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# dependencias del sistema para compilar asyncpg y similares
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# creo el venv y lo dejo aislado
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# copio solo lo necesario para instalar el paquete
COPY pyproject.toml ./
COPY app ./app

RUN pip install --upgrade pip && \
    pip install .

# =====================================================================
# Stage 2: runtime
# Imagen final. Sin compiladores, sin cache, sin archivos de build.
# =====================================================================
FROM python:3.12-slim AS runtime

WORKDIR /app

# usuario no-root
RUN groupadd --system --gid 1001 app && \
    useradd --system --uid 1001 --gid app --create-home app

# copio el venv del builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# copio el codigo de la app y las migraciones
COPY --chown=app:app app ./app
COPY --chown=app:app alembic ./alembic
COPY --chown=app:app alembic.ini ./

USER app

EXPOSE 8000

# health check para Docker
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health').read()" || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
