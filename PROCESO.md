# PROCESO - Como crear una taza nueva

Manual de operacion del dia a dia. Todo lo que hay que hacer desde
que un cliente pide una taza hasta que la taza esta sublimada y
funcionando con su QR.

---

## Arquitectura rapida

Hay dos maquinas:

- **Laptop** (donde estas): se preparan las imagenes, se generan
  los slugs, se corre el script de creacion.
- **VPS** (`ubuntu@webserver`): donde corre el sitio en produccion.
  Tiene los contenedores Docker, la DB, el backend, el frontend.

Cuando decis "esta en produccion" significa que el contenedor
`nibal_backend` y la DB `nibal_db` estan corriendo en la VPS, y
`nibal.ink` apunta a ellos a traves de Cloudflare Tunnel.

---

## Estructura de carpetas

### En la LAPTOP

~/Documentos/proyectos/nibal.ink_app/
├── tazas/
│ ├── input/ # imagenes en crudo, ANTES de procesar
│ │ └── procesados/ # imagenes ya procesadas (las mueve el script)
│ └── output/ # QR + info de cada taza creada
│ └── <slug>/
│ ├── qr.png
│ ├── original.webp
│ └── info.txt
├── assets/tazas/ # assets locales (mismo contenido que la VPS)
│ └── <slug>/
│ ├── diseno.webp
│ └── thumb.webp
└── infra/scripts/
└── crear-taza.sh
text


### En la VPS

~/dockerized_websites/nibal.ink_app/
├── assets/tazas/ # assets servidos por assets.nibal.ink
│ └── <slug>/
│ ├── diseno.webp
│ └── thumb.webp
├── backend/
├── frontend/
├── infra/
├── docker-compose.prod.yml
└── .env
text


---

## Flujo completo para una taza nueva

### PASO 1 - Preparar la imagen en GIMP

1. Abrir GIMP en la laptop.
2. Crear la imagen del diseno (o recibirla del cliente).
3. Tamano final: 22 cm x 8 cm (el area del diseno en la taza).
4. Agregar un **frame blanco** a los costados, para el gap del asa:
   - 1.56 cm a cada lado (aprox 196 px a 125 dpi).
   - El frame blanco tiene que ser del mismo color que la taza
     (blanco puro `#ffffff` si la taza es blanca).
5. Exportar como `.webp`, `.png` o `.jpg`.
6. Guardar en: `~/Documentos/proyectos/nibal.ink_app/tazas/input/`
   con el nombre del slug. Ejemplo: `juan-2026-04-28.webp`.

**Tip sobre el slug:** minusculas, sin espacios, sin tildes.
Formato recomendado: `<nombre>-<ano>-<mes>-<dia>`. Ej: `juan-2026-04-28`.

### PASO 2 - Crear la taza (correr el script)

Desde la laptop:

```bash
cd ~/Documentos/proyectos/nibal.ink_app
./infra/scripts/crear-taza.sh juan-2026-04-28 "Juan Perez"

El script hace:

    Copia la imagen a assets/tazas/<slug>/diseno.webp y thumb.webp

    Sube los assets a la VPS con rsync

    Llama al endpoint admin en nibal.ink

    Guarda el QR y la info en tazas/output/<slug>/

    Mueve la imagen de input/ a input/procesados/

Salida esperada:
text

[+] Taza creada: Juan Perez
[+] Token:   FD-XUdddrRGw68V6XGKMFwWtgTpoPLELG-pxObHI7OQ
[+] URL:     https://nibal.ink/t/FD-XUdddrRGw68V6XGKMFwWtgTpoPLELG-pxObHI7OQ
[+] Output:  tazas/output/juan-2026-04-28/

PASO 3 - Pegar el QR en la imagen

    Abrir GIMP.

    Abrir tazas/output/juan-2026-04-28/original.webp.

    Importar tazas/output/juan-2026-04-28/qr.png como capa.

    Posicionar el QR en una esquina (por ejemplo, abajo a la derecha).

    Tamano del QR en la taza: minimo 2.5 x 2.5 cm, ideal 3 x 3 cm.

    Dejar un margen blanco alrededor del QR (para que escanee bien).

    Exportar como print.webp (o el formato que uses para sublimar).

    Guardar en tazas/output/juan-2026-04-28/print.webp para archivo.

PASO 4 - Sublimar

    Imprimir la imagen final (con el QR pegado) en papel de sublimacion.

    Sublimar la taza normalmente.

    Esperar a que enfrie.

PASO 5 - Verificar

    Abrir la camara del celular.

    Apuntar al QR de la taza ya sublimada.

    Tocar el popup.

    Deberia abrir el modal con la taza 3D.

Si el modal no abre:

    El QR esta muy chico -> agrandarlo.

    Contraste bajo -> verificar que el QR sea negro sobre fondo claro.

    El QR esta muy cerca del borde de la taza -> moverlo un poco.

PASO 6 - Archivar

Todo queda en tazas/output/juan-2026-04-28/:

    original.webp (la imagen sin QR)

    qr.png (el QR solo)

    print.webp (la imagen final con QR)

    info.txt (token, URL, fecha)

Si un dia el cliente pide otra taza igual, abris esa carpeta y
tenes todo. Solo hay que volver a sublimar.
Comandos utiles
Ver si el sitio esta funcionando

Desde cualquier lado:
bash

curl https://nibal.ink/api/health
# esperado: {"status":"ok"}

Ver los contenedores en la VPS
bash

ssh ubuntu@webserver
cd ~/dockerized_websites/nibal.ink_app
docker compose -f docker-compose.prod.yml ps

Ver los logs
bash

docker compose -f docker-compose.prod.yml logs -f nibal_backend
docker compose -f docker-compose.prod.yml logs -f nibal_frontend

Ctrl+C para salir.
Reiniciar el backend (si algo anda mal)
bash

docker compose -f docker-compose.prod.yml restart nibal_backend

Actualizar el sitio desde el repo

Cuando hagas cambios en la laptop y los pushees a GitHub:
bash

# en la VPS
cd ~/dockerized_websites/nibal.ink_app
git pull
docker compose -f docker-compose.prod.yml up -d --build

Ver las tazas creadas en la DB
bash

# en la VPS
docker compose -f docker-compose.prod.yml exec nibal_db \
  psql -U nibal_user -d nibal_db \
  -c "SELECT id, nombre, created_at FROM tazas ORDER BY created_at DESC;"

Revocar una taza (si el cliente pide que ya no se vea)
bash

# en la VPS
docker compose -f docker-compose.prod.yml exec nibal_db \
  psql -U nibal_user -d nibal_db \
  -c "UPDATE tazas SET revoked_at = now() WHERE nombre = 'Juan Perez';"

Backup manual de la DB
bash

# en la VPS
docker compose -f docker-compose.prod.yml exec nibal_db \
  pg_dump -U nibal_user nibal_db > ~/backup-nibal-$(date +%Y%m%d).sql

Problemas comunes y soluciones
"No pudimos encontrar tu taza" en el modal

El token no existe en la DB, o la taza esta revocada, o el frontend
no llega al backend.

    Verificar que el token sea correcto.

    Verificar que el backend este corriendo:
    curl https://nibal.ink/api/health

    Verificar que la taza este en la DB (ver comando arriba).

La taza 3D no carga, pantalla blanca

Casi siempre es cache del navegador. Solucion:

    Ctrl+Shift+R (recarga dura).

    Si persiste, purgar cache de Cloudflare:
    Cloudflare -> nibal.ink -> Caching -> Purge Everything.

El QR escanea pero abre una pantalla con error

El token esta bien pero la imagen o el GLB no cargan.

    Verificar que los assets estan en la VPS:
    ls ~/dockerized_websites/nibal.ink_app/assets/tazas/<slug>/

    Verificar que se sirven:
    curl -I https://assets.nibal.ink/tazas/<slug>/diseno.webp

Los cambios no se ven en el sitio

    Purga Cloudflare: Caching -> Purge Everything.

    Fuerza recarga: Ctrl+Shift+R.

    Si es un cambio del backend, reiniciar el contenedor:
    docker compose -f docker-compose.prod.yml restart nibal_backend

Credenciales y accesos

    VPS: ssh ubuntu@webserver

    GitHub: git@github.com:anibaldi0/nibal.ink_app.git

    Cloudflare: dashboard en dash.cloudflare.com, dominio nibal.ink

    ADMIN_TOKEN: en ~/dockerized_websites/nibal.ink_app/.env en la VPS

    DB_PASSWORD: mismo .env en la VPS

Los secretos no van aca. Estan en el .env de la VPS (y en tu
gestor de passwords).
Dominios y URLs

    Landing publica: https://nibal.ink/

    Modal de taza (QR): https://nibal.ink/t/<token>

    Share: https://nibal.ink/s/<share_token>

    Assets: https://assets.nibal.ink/tazas/<slug>/<archivo>

    Health: https://nibal.ink/api/health

    API docs: https://nibal.ink/api/docs
