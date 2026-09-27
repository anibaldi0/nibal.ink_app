# =====================================================================
# Stage 1: build
# Compila la SPA con Vite. La imagen de Node solo vive aca.
# =====================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# copio manifests primero para aprovechar la cache de capas de Docker
COPY package.json package-lock.json ./

RUN npm ci

# copio el resto del codigo
COPY . .

# variable de entorno para el build (apunta al backend en produccion)
# en prod, el frontend usa rutas relativas porque todo pasa por nginx
ARG VITE_API_BASE=""
ENV VITE_API_BASE=${VITE_API_BASE}

RUN npm run build

# =====================================================================
# Stage 2: runtime
# Nginx sirviendo los estaticos compilados
# =====================================================================
FROM nginx:1.25-alpine AS runtime

# config de nginx para la SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf

# copio el build
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
