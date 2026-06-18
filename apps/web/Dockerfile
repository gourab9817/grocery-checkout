# ─── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json     ./
COPY packages/domain/package.json       ./packages/domain/
COPY apps/web/package.json              ./apps/web/

RUN npm ci --ignore-scripts --legacy-peer-deps

COPY packages/domain ./packages/domain
COPY apps/web        ./apps/web

# VITE_API_URL is baked into the static bundle at build time.
# In the container, nginx proxies /api → the api service, so use a relative path.
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build -w apps/web

# ─── Serve stage ──────────────────────────────────────────────────────────────
FROM nginx:alpine AS production

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# SPA fallback + reverse proxy /api → api:3000 + gzip + cookie passthrough
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s CMD wget -qO- http://127.0.0.1/ || exit 1
