#!/usr/bin/env bash
# crear-taza.sh - Crea una taza nueva en Nibal.ink
#
# Uso:
#   ./crear-taza.sh <slug> "<Nombre Display>" [<ruta-imagen>]
#
# Ejemplos:
#   ./crear-taza.sh juan-2026-04-28 "Juan Perez"
#   ./crear-taza.sh maria-cumple "Maria Lopez" ~/Downloads/taza-maria.png
#
# Si no pasas la ruta, busca en tazas/input/<slug>.<ext>

set -euo pipefail

PROYECTO_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
INPUT_DIR="$PROYECTO_DIR/tazas/input"
OUTPUT_DIR="$PROYECTO_DIR/tazas/output"
PROCESADOS_DIR="$INPUT_DIR/procesados"
LOCAL_ASSETS_DIR="$PROYECTO_DIR/assets/tazas"

VPS_USER="ubuntu"
VPS_HOST="webserver"
VPS_ASSETS="~/dockerized_websites/nibal.ink_app/assets/tazas"

GLB_KEY="tazas/prueba/model.glb"
DECAL_OFFSET='[0, 0, 0]'
DECAL_SCALE='[0.88, 1, 0]'

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[+]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[x]${NC} $1" >&2; }

if [ $# -lt 2 ]; then
  echo "Uso: $0 <slug> \"<Nombre Display>\" [<ruta-imagen>]"
  exit 1
fi

SLUG="$1"
NOMBRE="$2"
IMG_PATH="${3:-}"

if ! [[ "$SLUG" =~ ^[a-z0-9][a-z0-9._-]*$ ]]; then
  err "El slug debe estar en minusculas, sin espacios, solo [a-z0-9._-]"
  exit 1
fi

if [ -z "$IMG_PATH" ]; then
  for ext in webp png jpg jpeg; do
    if [ -f "$INPUT_DIR/$SLUG.$ext" ]; then
      IMG_PATH="$INPUT_DIR/$SLUG.$ext"
      break
    fi
  done
fi

if [ -z "$IMG_PATH" ] || [ ! -f "$IMG_PATH" ]; then
  err "No encuentro la imagen en $INPUT_DIR/$SLUG.{webp,png,jpg,jpeg}"
  exit 1
fi

IMG_EXT_LOWER=$(echo "${IMG_PATH##*.}" | tr '[:upper:]' '[:lower:]')

log "Slug:    $SLUG"
log "Nombre:  $NOMBRE"
log "Imagen:  $IMG_PATH"

API_URL="${NIBAL_API_URL:-}"
if [ -z "$API_URL" ]; then
  if curl -s -o /dev/null --max-time 2 http://localhost:8001/api/health; then
    API_URL="http://localhost:8001"
    MODE="local"
  else
    API_URL="https://nibal.ink"
    MODE="prod"
  fi
else
  if [[ "$API_URL" == *"localhost"* ]]; then
    MODE="local"
  else
    MODE="prod"
  fi
fi

log "Modo:    $MODE"
log "API:     $API_URL"

if [ -z "${ADMIN_TOKEN:-}" ]; then
  if [ -f "$PROYECTO_DIR/backend/.env" ]; then
    ADMIN_TOKEN=$(grep '^ADMIN_TOKEN' "$PROYECTO_DIR/backend/.env" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")
  fi
  if [ -z "${ADMIN_TOKEN:-}" ] && [ -f "$PROYECTO_DIR/.env" ]; then
    ADMIN_TOKEN=$(grep '^ADMIN_TOKEN' "$PROYECTO_DIR/.env" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")
  fi
fi

if [ -z "${ADMIN_TOKEN:-}" ]; then
  err "No encuentro ADMIN_TOKEN. Exportalo o ponelo en backend/.env"
  exit 1
fi

mkdir -p "$LOCAL_ASSETS_DIR/$SLUG" "$OUTPUT_DIR/$SLUG"

DISENO_NAME="diseno.$IMG_EXT_LOWER"
cp "$IMG_PATH" "$LOCAL_ASSETS_DIR/$SLUG/$DISENO_NAME"
cp "$IMG_PATH" "$LOCAL_ASSETS_DIR/$SLUG/thumb.$IMG_EXT_LOWER"

log "Assets locales en: $LOCAL_ASSETS_DIR/$SLUG"

if [ "$MODE" = "prod" ]; then
  log "Subiendo assets a la VPS con rsync..."
  rsync -avz "$LOCAL_ASSETS_DIR/$SLUG/" "$VPS_USER@$VPS_HOST:$VPS_ASSETS/$SLUG/"
  log "Assets subidos"
fi

TEXTURE_KEY="tazas/$SLUG/$DISENO_NAME"
THUMB_KEY="tazas/$SLUG/thumb.$IMG_EXT_LOWER"

log "Creando taza en el backend..."

BODY=$(cat <<JSON
{
  "nombre": "$NOMBRE",
  "glb_key": "$GLB_KEY",
  "texture_key": "$TEXTURE_KEY",
  "thumb_key": "$THUMB_KEY",
  "decal_offset": $DECAL_OFFSET,
  "decal_scale": $DECAL_SCALE
}
JSON
)

RESP=$(curl -s -X POST "$API_URL/api/admin/taza" \
  -H "X-Admin-Token: $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$BODY")

if ! echo "$RESP" | python3 -c "import sys, json; json.load(sys.stdin)" 2>/dev/null; then
  err "Respuesta invalida del backend:"
  echo "$RESP"
  exit 1
fi

TOKEN=$(echo "$RESP" | python3 -c "import sys, json; print(json.load(sys.stdin)['token_publico'])")
URL=$(echo "$RESP" | python3 -c "import sys, json; print(json.load(sys.stdin)['url_publica'])")
QR_B64=$(echo "$RESP" | python3 -c "import sys, json; print(json.load(sys.stdin)['qr_png_base64'])")
TAZA_ID=$(echo "$RESP" | python3 -c "import sys, json; print(json.load(sys.stdin)['taza_id'])")

echo "$QR_B64" | sed 's/^data:image\/png;base64,//' | base64 -d > "$OUTPUT_DIR/$SLUG/qr.png"
cp "$IMG_PATH" "$OUTPUT_DIR/$SLUG/original.$IMG_EXT_LOWER"

IMG_SHA=$(sha256sum "$IMG_PATH" | cut -d' ' -f1)
FECHA=$(date +"%Y-%m-%d %H:%M:%S")

cat > "$OUTPUT_DIR/$SLUG/info.txt" <<INFO
NOMBRE:      $NOMBRE
SLUG:        $SLUG
TAZA_ID:     $TAZA_ID
TOKEN:       $TOKEN
URL:         $URL
IMAGEN:      $DISENO_NAME
IMAGEN_SHA:  $IMG_SHA
FECHA:       $FECHA
INFO

if [ "$(dirname "$IMG_PATH")" = "$INPUT_DIR" ]; then
  mkdir -p "$PROCESADOS_DIR"
  mv "$IMG_PATH" "$PROCESADOS_DIR/"
fi

echo ""
log "=========================================="
log "Taza creada: $NOMBRE"
log "=========================================="
echo "  Token:   $TOKEN"
echo "  URL:     $URL"
echo "  Output:  $OUTPUT_DIR/$SLUG/"
