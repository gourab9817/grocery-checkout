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

# SPA fallback + reverse proxy /api → api:3000
RUN printf '\
server {\n\
  listen 80;\n\
  root /usr/share/nginx/html;\n\
  index index.html;\n\
\n\
  # Proxy API calls to the api container\n\
  location /api/ {\n\
    proxy_pass http://api:3000/;\n\
    proxy_set_header Host $host;\n\
    proxy_set_header X-Real-IP $remote_addr;\n\
  }\n\
\n\
  # SPA fallback\n\
  location / {\n\
    try_files $uri $uri/ /index.html;\n\
  }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s CMD wget -qO- http://localhost/ || exit 1
