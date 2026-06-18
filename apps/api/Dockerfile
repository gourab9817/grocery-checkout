# ─── Deps stage ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/domain/package.json   ./packages/domain/
COPY apps/api/package.json          ./apps/api/

RUN npm ci --ignore-scripts --legacy-peer-deps

# ─── Production image ─────────────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0

COPY --from=deps /app/node_modules          ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY package.json package-lock.json         ./
COPY packages/domain                        ./packages/domain
COPY apps/api                               ./apps/api
COPY db                                     ./db
COPY data                                   ./data

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=5 \
  CMD wget -q --spider http://127.0.0.1:3000/health || exit 1

# Run migrations then start the API server
CMD ["sh", "-c", "node db/migrate.js && node apps/api/src/server.js"]
