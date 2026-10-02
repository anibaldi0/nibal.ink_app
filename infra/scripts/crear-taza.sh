#!/usr/bin/env bash
# crear-taza.sh - Crea o actualiza una taza en Nibal.ink
#
# Uso:
#   ./crear-taza.sh <slug> "<Nombre>" --mensaje "<Mensaje>" [<ruta-imagen>]
#
# El flag --mensaje es OBLIGATORIO. Ponelo vacio ("") si no lleva mensaje.
# El nombre tambien puede ir vacio ("") si no lleva.
#
# Ejemplos:
#   ./crear-taza.sh juan-2026-04-28 "Juan Perez" --mensaje ""
#   ./crear-taza.sh juan-2026-04-28 "" --mensaje ""
#   ./crear-taza.sh juan-2026-04-28 "" --mensaje "Feliz cumple"
#   ./crear-taza.sh juan-2026-04-28 "Juan" --mensaje "Para vos"
#   ./crear-taza.sh juan-2026-04-28 "Juan" --mensaje "Para vos" ~/ruta/imagen.webp

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

# --- validacion de argumentos ---
if [ $# -lt 4 ]; then
  cat <<USAGE
[x] Faltan argumentos.

Uso:
  $0 <slug> "<Nombre>" --mensaje "<Mensaje>" [<ruta-imagen>]

El flag --mensaje es OBLIGATORIO. Ponelo vacio ("") si no lleva mensaje.
El nombre tambien puede ir vacio ("") si no lleva.

Ejemplos:
  $0 juan-2026-04-28 "Juan Perez" --mensaje ""
  $0 juan-2026-04-28 "" --mensaje ""
  $0 juan-2026-04-28 "" --mensaje "Feliz cumple"
  $0 juan-2026-04-28 "Juan" --mensaje "Para vos"
  $0 juan-2026-04-28 "Juan" --mensaje "Para vos" ~/ruta/imagen.webp
USAGE
  exit 1
fi

SLUG="$1"
NOMBRE="$2"
shift 2

if [ "$1" != "--mensaje" ]; then
  err "Falta el flag --mensaje. Debe venir despues del nombre."
  err "Uso: $0 <slug> \"<Nombre>\" --mensaje \"<Mensaje>\" [<ruta-imagen>]"
  err "Ejemplo: $0 $SLUG \"$NOMBRE\" --mensaje \"\""
  exit 1
fi

MENSAJE="$2"
shift 2

IMG_PATH=""
if [ $# -gt 0 ]; then
  IMG_PATH="$1"
  shift
  if [ $# -gt 0 ]; then
    err "Argumentos sobrantes: $*"
    exit 1
  fi
fi

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
log "Nombre:  ${NOMBRE:-(sin nombre)}"
log "Mensaje: ${MENSAJE:-(random)}"
log "Imagen:  $IMG_PATH"

# --- detectar local o prod ---
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

# --- cargar ADMIN_TOKEN ---
if [ -z "${ADMIN_TOKEN:-}" ]; then
  if [ -f "$PROYECTO_DIR/.env.prod" ]; then
    ADMIN_TOKEN=$(grep '^ADMIN_TOKEN' "$PROYECTO_DIR/.env.prod" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")
    [ -n "$ADMIN_TOKEN" ] && log "Token:   cargado desde .env.prod"
  fi
fi

if [ -z "${ADMIN_TOKEN:-}" ]; then
  if [ -f "$PROYECTO_DIR/backend/.env" ]; then
    ADMIN_TOKEN=$(grep '^ADMIN_TOKEN' "$PROYECTO_DIR/backend/.env" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")
    [ -n "$ADMIN_TOKEN" ] && warn "Token:   cargado desde backend/.env (modo dev)"
  fi
fi

if [ -z "${ADMIN_TOKEN:-}" ]; then
  err "No encuentro ADMIN_TOKEN. Crealo en .env.prod o exportalo."
  exit 1
fi

# --- chequeo de existencia (local, VPS, DB) ---
LOCAL_EXISTS="no"
VPS_EXISTS="no"
DB_EXISTS="no"

if [ -d "$LOCAL_ASSETS_DIR/$SLUG" ]; then
  LOCAL_EXISTS="si"
fi

if [ "$MODE" = "prod" ]; then
  if ssh -o BatchMode=yes -o ConnectTimeout=5 "$VPS_USER@$VPS_HOST" \
       "test -d $VPS_ASSETS/$SLUG" 2>/dev/null; then
    VPS_EXISTS="si"
  fi
fi

RESP_SLUG=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "X-Admin-Token: $ADMIN_TOKEN" \
  "$API_URL/api/admin/taza-por-slug/$SLUG" || echo "000")
if [ "$RESP_SLUG" = "200" ]; then
  DB_EXISTS="si"
fi

if [ "$LOCAL_EXISTS" = "si" ] || [ "$VPS_EXISTS" = "si" ] || [ "$DB_EXISTS" = "si" ]; then
  warn "El slug '$SLUG' ya existe:"
  echo "    - Archivos locales: $LOCAL_EXISTS"
  echo "    - Archivos en la VPS: $VPS_EXISTS"
  echo "    - En la DB: $DB_EXISTS"
  echo ""
  echo "    Si continuas:"
  echo "      1. Se sobreescriben los archivos locales"
  echo "      2. Se sobreescriben los archivos en la VPS"
  echo "      3. Se ACTUALIZA la fila de la DB (mantiene el token original)"
  echo "         => el QR viejo sigue funcionando, muestra el diseno nuevo"
  echo ""
  read -p "    Sobreescribir? (s/N): " RESPUESTA
  case "$RESPUESTA" in
    s|S|si|SI|Si|sI) log "Continuando con sobreescritura..." ;;
    *) log "Cancelado por el usuario."; exit 0 ;;
  esac
fi

# --- copiar y subir assets ---
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

log "Creando/actualizando taza en el backend..."

BODY=$(cat <<JSON
{
  "slug": "$SLUG",
  "nombre": "$NOMBRE",
  "mensaje": "$MENSAJE",
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

if ! echo "$RESP" | python3 -c "import sys, json; sys.exit(0 if 'token_publico' in json.load(sys.stdin) else 1)" 2>/dev/null; then
  err "El backend no devolvio token_publico:"
  echo "$RESP"
  exit 1
fi

TOKEN=$(echo "$RESP" | python3 -c "import sys, json; print(json.load(sys.stdin)['token_publico'])")
URL=$(echo "$RESP" | python3 -c "import sys, json; print(json.load(sys.stdin)['url_publica'])")
QR_B64=$(echo "$RESP" | python3 -c "import sys, json; print(json.load(sys.stdin)['qr_png_base64'])")
TAZA_ID=$(echo "$RESP" | python3 -c "import sys, json; print(json.load(sys.stdin)['taza_id'])")

if [ -f "$OUTPUT_DIR/$SLUG/info.txt" ]; then
  cp "$OUTPUT_DIR/$SLUG/info.txt" "$OUTPUT_DIR/$SLUG/info.txt.bak-$(date +%s)"
fi

echo "$QR_B64" | sed 's/^data:image\/png;base64,//' | base64 -d > "$OUTPUT_DIR/$SLUG/qr.png"
cp "$IMG_PATH" "$OUTPUT_DIR/$SLUG/original.$IMG_EXT_LOWER"

IMG_SHA=$(sha256sum "$IMG_PATH" | cut -d' ' -f1)
FECHA=$(date +"%Y-%m-%d %H:%M:%S")

cat > "$OUTPUT_DIR/$SLUG/info.txt" <<INFO
NOMBRE:      ${NOMBRE:-(sin nombre)}
MENSAJE:     ${MENSAJE:-(random)}
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
log "Taza creada/actualizada: $SLUG"
log "=========================================="
echo "  Nombre:  ${NOMBRE:-(sin nombre)}"
echo "  Mensaje: ${MENSAJE:-(random)}"
echo "  Token:   $TOKEN"
echo "  URL:     $URL"
echo "  Output:  $OUTPUT_DIR/$SLUG/"
