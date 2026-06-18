# AnsrMart Grocery Checkout

A production-grade grocery checkout system built as an npm monorepo. It implements multi-rate GST billing, a pluggable offer engine (Strategy pattern), customer accounts with session management, Redis-backed caching, S3 image storage, SMS order notifications, and a Botanical-design React storefront — all runnable locally in a single `docker compose up`.

---

## Table of contents

- [Stack](#stack)
- [Architecture](#architecture)
- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [Database](#database)
- [Image pipeline](#image-pipeline)
- [API reference](#api-reference)
- [Domain design](#domain-design)
- [Design patterns](#design-patterns)
- [Tests](#tests)
- [Scripts](#scripts)
- [Production deployment](#production-deployment)
- [AI usage](#ai-usage)

---

## Stack

| Layer | Technology |
|---|---|
| **Monorepo** | npm workspaces |
| **API** | Fastify 4, Node 20, ESM |
| **Database** | PostgreSQL 16 (pg pool, raw SQL) |
| **Cache** | Redis 7 (ioredis) |
| **Auth** | JWT (15 min access token) + httpOnly refresh token cookie (30 days) |
| **Secrets** | AWS Secrets Manager (local: Floci emulator) |
| **Object storage** | AWS S3 (local: Floci emulator) |
| **Notifications** | AWS SNS (local: Floci emulator, or stdout log) |
| **Frontend** | React 18, Vite 5, Tailwind CSS 3, TanStack Query 5 |
| **Reverse proxy** | nginx (gzip, `/api` proxy, `/images` S3 proxy, SPA fallback) |
| **Local AWS** | [Floci](https://floci.io) — drop-in LocalStack-compatible emulator |
| **Container** | Docker Compose (5 services: postgres, redis, floci, api, web) |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Browser                                                                 │
│  React 18 + TanStack Query (60s stale, no refetch-on-focus)             │
│  └─ /api/* proxy  └─ /images/* proxy (same-origin → S3)                │
└───────────────────────────┬──────────────────────────────────────────────┘
                            │ HTTP / nginx reverse proxy
┌───────────────────────────▼──────────────────────────────────────────────┐
│  nginx                                                                   │
│  gzip · /api/ → api:3000 · /images/ → floci:4566/ansrmart-images/       │
│  /assets/ (immutable) · SPA fallback                                     │
└───────────────────────────┬──────────────────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────────────────┐
│  Fastify 4 API  (apps/api)                                               │
│                                                                          │
│  Plugins (in order): helmet → cors → cookie → rate-limit                │
│                                                                          │
│  Routes          Services             Repositories                       │
│  /auth      ──▶  AuthService     ──▶  PostgresUserRepository            │
│  /users     ──▶  UserService     ──▶  PostgresRefreshTokenRepository    │
│  /catalog   ──▶  (direct repo)   ──▶  CachedCatalogRepository ──▶ Redis │
│  /quote     ──▶  BillingService  ──▶  CachedOfferRepository   ──▶ Redis │
│  /checkout  ──▶  OrderService    ──▶  PostgresOrderRepository            │
│  /addresses ──▶  (direct repo)   ──▶  PostgresAddressRepository         │
│  /admin     ──▶  AdminController ──▶  (Postgres repos, direct)          │
└───────────────────────────┬──────────────────────────────────────────────┘
                            │ domain types only — no HTTP, no SQL
┌───────────────────────────▼──────────────────────────────────────────────┐
│  Domain  (packages/domain)  — zero runtime dependencies                  │
│  money.js · cart.js · offers/ · tax/engine.js · billing/computeBill.js  │
└───────────────────────────┬──────────────────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────────────────┐
│  PostgreSQL 16             Redis 7            S3 / Floci                  │
│  6 migrations applied      catalog:active     ansrmart-images bucket      │
│  at container start        offers:active      81 product images           │
│                            60 s TTL           nginx-proxied same-origin   │
└──────────────────────────────────────────────────────────────────────────┘
```

**Dependency rule**: the arrow points inward only — `web → api → domain`. The domain package imports nothing from `api` or `web`. Its `package.json` has zero runtime dependencies. No layer reaches "through" another.

---

## Quick start

### Prerequisites

- Docker ≥ 24 and Docker Compose v2 (`docker compose version`)
- Node 20+ (only needed if running outside Docker)

### One-command start

```bash
git clone <repo-url> ansrmart
cd ansrmart/grocery-checkout

cp .env.example .env        # defaults work for local Docker

docker compose up --build   # builds api + web, starts all 5 services
```

Services come up in dependency order. The API runs migrations automatically on first start.

```
Web   → http://localhost:8080
API   → http://localhost:3000
DB    → localhost:5433  (ansrmart / localdevpassword)
Redis → localhost:6379
Floci → http://localhost:4566  (S3, SNS, Secrets Manager)
```

### Seed the database

After containers are healthy (first run only):

```bash
docker compose exec api node db/seed.js
# Seeds 81 catalog items + offers + coupons + 1 admin account
```

### Upload product images to S3

Also first run only — extracts the product image library and pushes it to the local Floci S3 bucket:

```bash
node scripts/extract-images.js          # iconic-images-and-descriptions/ → data/image/
AWS_ENDPOINT_URL=http://localhost:4566 \
  node scripts/upload-images-to-s3.js  # data/image/ → s3://ansrmart-images/images/
```

Images are then served via nginx at `/images/{slug}.jpg` (same-origin, no CORS).

### Running outside Docker (development)

```bash
npm install

# Start postgres + redis + floci via Docker, then:
npm run dev          # api on :3000 + web on :5173, concurrently
```

---

## Environment variables

Copy `.env.example` to `.env`. All variables have sane local-dev defaults.

| Variable | Default | Description |
|---|---|---|
| `NODE_ENV` | `development` | `production` inside Docker |
| `PORT` | `3000` | API listen port |
| `DB_HOST` | `localhost` | Postgres host |
| `DB_PORT` | `5432` | Postgres port |
| `DB_NAME` | `ansrmart` | Database name |
| `DB_USER` | `ansrmart` | Database user |
| `DB_PASSWORD` | _(required)_ | DB password; ignored if `DB_SECRET_NAME` is set |
| `DB_SSL` | `false` | Set `true` for AWS RDS (enables TLS, `rejectUnauthorized: false`) |
| `DB_SECRET_NAME` | — | AWS Secrets Manager secret name → `{ "password": "..." }` |
| `JWT_SECRET` | _(required)_ | JWT signing secret; ignored if `JWT_SECRET_NAME` is set |
| `JWT_SECRET_NAME` | — | AWS Secrets Manager secret name → `{ "secret": "..." }` |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string |
| `WEB_ORIGIN` | `http://localhost:8080` | CORS allowlist origin |
| `IMAGE_BASE_URL` | `/images` | Product image base URL (API-side, informational) |
| `NOTIFICATIONS_ENABLED` | `false` | Set `true` to fire order SMS/events |
| `NOTIFICATIONS_PROVIDER` | `log` | `log` (stdout) or `sns` (AWS SNS) |
| `SNS_ORDER_TOPIC_ARN` | — | SNS topic ARN for order events |
| `AWS_ENDPOINT_URL` | — | Override for Floci (`http://localhost:4566`); blank = real AWS |
| `AWS_DEFAULT_REGION` | `us-east-1` | AWS region |
| `AWS_ACCESS_KEY_ID` | `test` | Floci uses `test`; real AWS uses IAM credentials |
| `AWS_SECRET_ACCESS_KEY` | `test` | Same |

**Frontend build-time variable** (baked into the Vite bundle):

| Variable | Default | Description |
|---|---|---|
| `VITE_IMAGE_BASE_URL` | `/images` | Image base URL; set to CDN URL in production |

---

## Database

### Migrations

Migrations live in `db/migrations/` and are applied automatically by the API container at startup (`node db/migrate.js && node apps/api/src/server.js` in the Dockerfile CMD). They are also safe to run manually.

| File | Contents |
|---|---|
| `001_initial_schema.sql` | users, catalog_items, offers, coupons, orders, order_lines |
| `002_product_images.sql` | `image_slug`, `description` columns on catalog_items |
| `003_customer_users.sql` | Customer accounts; links orders to users |
| `004_indexes.sql` | Hot-path indexes: users(email), order_lines(item_id), orders(user_id, created_at) |
| `005_refresh_tokens.sql` | refresh_tokens table: hash, expiry, revocation flag |
| `006_addresses_and_delivery.sql` | addresses table; delivery_address JSONB + phone on orders |

The migration runner (`db/migrate.js`) tracks applied migrations in a `schema_migrations` table. Each migration is applied in a transaction; a failure rolls back and exits with code 1.

### Seed

```bash
docker compose exec api node db/seed.js
```

Creates: 81 active catalog items across multiple categories, a set of offers (percentage, threshold, BOGO), one `FIRSTBUY10` coupon, and one admin user.

---

## Image pipeline

81 product images live in `data/image/{slug}.jpg` — this is the canonical store. On a fresh environment, upload them to S3 once:

```bash
AWS_ENDPOINT_URL=http://localhost:4566 \
  node scripts/upload-images-to-s3.js   # data/image/ → s3://ansrmart-images/images/
```

nginx proxies `/images/{slug}.jpg` → S3 internally, so the browser stays same-origin and no CORS configuration is needed.

```
data/image/{slug}.jpg
        │
        ▼  node scripts/upload-images-to-s3.js
s3://ansrmart-images/images/{slug}.jpg
        │
        ▼  nginx /images/ proxy
http://localhost:8080/images/{slug}.jpg   (same-origin)
```

**Adding new images**: drop `{slug}.jpg` files into `data/image/` and re-run the upload script. The slug must match the `image_slug` column in the `catalog_items` table.

In production, point the upload script at your real S3 bucket (remove `AWS_ENDPOINT_URL`) and set `VITE_IMAGE_BASE_URL=https://cdn.yourdomain.com/images` at Docker build time. No code changes required.

---

## API reference

### Auth (admin)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | none | Create first admin account (blocked if any admin exists) |
| POST | `/auth/login` | none | Admin login → returns JWT (8h, rate-limited 5/min) |

### Users (customers)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/users/signup` | none | Customer registration → access token + httpOnly refresh cookie (rate-limited 5/min) |
| POST | `/users/login` | none | Customer login (rate-limited 5/min) |
| POST | `/users/refresh` | cookie `rt` | Rotate refresh token → new access token + new cookie |
| POST | `/users/logout` | cookie `rt` | Revoke refresh token, clear cookie |
| GET | `/users/me` | bearer | Current user profile |

### Catalog

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/catalog` | none | Active items (`?category=…`); ETag + `Cache-Control: public, max-age=60` |

### Billing

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/quote` | none | Live bill preview — no persistence (rate-limited 100/min) |
| POST | `/checkout` | optional bearer | Place order → bill + orderId; fires SMS notification (rate-limited 10/min) |
| GET | `/orders/mine` | bearer | Customer's order history |
| GET | `/orders/:id` | none | Fetch order receipt |

### Addresses

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/addresses` | bearer | List saved addresses |
| POST | `/addresses` | bearer | Add address |
| PATCH | `/addresses/:id` | bearer | Update address |
| DELETE | `/addresses/:id` | bearer | Delete address |

### Admin

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/admin/catalog` | admin JWT | List all catalog items |
| POST | `/admin/catalog` | admin JWT | Create item (invalidates Redis cache) |
| PATCH | `/admin/catalog/:id` | admin JWT | Update item (invalidates Redis cache) |
| GET | `/admin/offers` | admin JWT | List offers |
| POST | `/admin/offers` | admin JWT | Create offer |
| PATCH | `/admin/offers/:id` | admin JWT | Update offer |
| POST | `/admin/coupons` | admin JWT | Create coupon |

### System

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | none | Liveness probe |
| GET | `/metrics` | none | Process vitals |

### Error envelope

Every error response uses this shape:

```json
{
  "error": {
    "code": "UNKNOWN_ITEM",
    "message": "Item abc123 not found in catalog.",
    "field": "lines[2].itemId",
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

---

## Domain design

The `packages/domain` package is the billing core. It has zero runtime dependencies and is framework-agnostic — it can be imported by the API, a CLI tool, or a test runner without any side effects.

### Money: integer paise

All monetary values are **integer paise** throughout. `₹1 = 100 paise`.

- Float drift is structurally impossible in any calculation path.
- The single rounding boundary is `money.format(paise)` — called only when producing a display string, never mid-computation.
- `money.mulQuantity(paise, qty)` handles fractional-kg weights: scales up, does integer math, rounds half-up once.
- `money.percentage(paise, bps)` uses basis points (`1800 bps = 18%`) to stay integer throughout.

### Offer engine: three-phase stacking

```
Phase A — Category & BOGO offers    (applied against pre-discount subtotals)
Phase B — Flat cart-threshold       (applied against post-Phase-A total)
Phase C — Coupons                   (applied against post-Phase-B total)
```

Within each phase, offers are sorted by `priority` asc, then `id` lexicographically — fully deterministic.

**Exclusive offers**: if two rules share `exclusive: true`, only the lowest priority number wins. The other moves to `skippedOffers` with a reason string.

**Floor invariant**: every discount is `max(0, computed)`. No bill total can go negative. A clamped-to-zero discount still appears in `skippedOffers`.

### GST: multi-rate, pro-rata allocation

GST is computed per item category. The total discount is distributed across lines using the **largest-remainder method** — integer pieces always sum exactly to `taxableAmount`.

Tax rates (illustrative — **not authoritative tax law**):

| Category | Rate |
|---|---|
| Vegetables, fruits | 0% |
| Staples (rice, dal) | 5% |
| Dairy | 12% |
| Snacks, beverages | 18% |

Key invariant: `grandTotal === taxableAmount + totalTax` — asserted in the integration test suite.

### Key decisions

| Decision | Rationale |
|---|---|
| Integer paise, no floats | Eliminates an entire class of rounding bugs by construction |
| BuyXGetYFree gives cheapest units free | Explicit product decision; hand-specified and tested |
| Weight items excluded from BOGO | You can't meaningfully "get 1 free" for 0.333 kg |
| Duplicate cart lines merged | Same itemId appears → quantities summed before processing |
| Coupon usage incremented atomically in DB | Prevents race conditions under concurrent checkouts |
| GST slabs are illustrative | A production system must integrate with a certified tax engine |

---

## Design patterns

| Pattern | Location | Why |
|---|---|---|
| **Strategy** | `offers/`: PercentageCategoryOffer, FlatCartThresholdOffer, BuyXGetYFreeOffer, CouponOffer | Each offer is an interchangeable algorithm behind one `{isEligible, apply}` interface. Adding a type = new class, zero engine edits (OCP). |
| **Factory / Registry** | `offers/registry.js` | Maps a `type` string from a DB row to the right constructor. No `switch(type)`. |
| **Repository** | `repositories/interfaces/` + `repositories/memory/` + `repositories/postgres/` | Hides persistence behind an interface. Services depend on the interface (DIP). Tests inject in-memory repos. |
| **Decorator** | `repositories/cache/CachedCatalogRepository`, `CachedOfferRepository` | Wraps Postgres repos with a Redis TTL layer. Neither the service nor the domain knows caching exists. Gracefully degrades if Redis is unavailable. |
| **Adapter** | `repositories/postgres/*` | The only place that knows column names and performs snake_case ↔ camelCase mapping. |
| **Facade** | `billing/computeBill.js` | Single pure entrypoint hiding the cart → offer → tax → bill pipeline. |
| **Template Method** | `OfferRule` base class | Shared eligibility/clamping skeleton; subclasses fill in `isEligible` and `apply`. |
| **Value Object** | `money.js` | Immutable integer-paise arithmetic with a single rounding boundary. |

### Adding a new offer type (~15 lines, zero engine edits)

```js
// 1. packages/domain/src/offers/BundleOffer.js
export class BundleOffer extends OfferRule {
  isEligible(ctx) {
    const ok = ctx.lines.some(l => this.params.itemIds.includes(l.item.id));
    return { eligible: ok, reason: ok ? '' : 'Bundle item not in cart' };
  }
  apply(ctx) {
    return [this._discount(this.params.amountPaise, 'cart')];
  }
}

// 2. offers/registry.js — one line:
OFFER_REGISTRY['bundle'] = BundleOffer;

// 3. INSERT an offer row with type='bundle'. Done.
```

---

## Tests

```
packages/domain
  money.test.js          22 tests  — arithmetic, rounding, edge cases
  cart.test.js           14 tests  — resolution, merging, unknown items
  offers.test.js         28 tests  — all 4 strategies, stacking, OCP seam
  tax.test.js            10 tests  — multi-rate breakdown, largest-remainder
  computeBill.test.js    13 tests  — worked examples, invariants, 500-item linearity

apps/api
  billing.test.js        17 tests  — full HTTP round-trips with in-memory repos

Total: 104 tests
```

```bash
npm run verify        # lint + all tests (CI gate)
npm run test          # tests only
npm run test:domain   # domain package only
npm run test:api      # API package only
```

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start API (port 3000) + web (port 5173) concurrently |
| `npm run verify` | Lint + test — the CI gate |
| `npm run test` | Run all tests |
| `npm run lint` | ESLint across all workspaces |
| `npm run seed` | Seed the database (run inside Docker or with local Postgres) |
| `npm run build -w apps/web` | Production build of the React app |
| `docker compose up --build` | Full local stack (all 5 services) |
| `docker compose exec api node db/migrate.js` | Run migrations manually |
| `AWS_ENDPOINT_URL=http://localhost:4566 node scripts/upload-images-to-s3.js` | Upload `data/image/` → S3 (run once on fresh environment) |

---

## Production deployment

### Checklist

- [ ] Set `DB_SSL=true` — required by AWS RDS
- [ ] Create `DB_SECRET_NAME` in AWS Secrets Manager → `{ "password": "..." }`
- [ ] Create `JWT_SECRET_NAME` in AWS Secrets Manager → `{ "secret": "..." }`
- [ ] Remove `AWS_ENDPOINT_URL` from env (or leave blank) — blank = real AWS
- [ ] Set `WEB_ORIGIN` to your production frontend domain
- [ ] Set `NOTIFICATIONS_ENABLED=true`, `NOTIFICATIONS_PROVIDER=sns`, `SNS_ORDER_TOPIC_ARN=arn:aws:sns:...`
- [ ] Set `VITE_IMAGE_BASE_URL=https://cdn.yourdomain.com/images` at Docker build time
- [ ] Run image pipeline once against real S3: `node scripts/extract-images.js && node scripts/upload-images-to-s3.js`
- [ ] Run `docker compose exec api node db/seed.js` (first deploy only)

### What does NOT change for production

Everything else — migrations, API code, nginx config, Docker builds — is identical between local and production. The local Floci emulator is a 1:1 wire-compatible replacement for real AWS; switching to production is purely an environment variable change.

### Scaling notes

- **Catalog cache**: Redis-backed with 60s TTL; admin writes invalidate immediately. Scales horizontally without cache-stampede risk.
- **Rate limiting**: Uses Redis as the shared store (`@fastify/rate-limit`), so limits apply correctly across multiple API replicas.
- **Image CDN**: Set `VITE_IMAGE_BASE_URL` to a CloudFront distribution URL. nginx `/images/` fallback is only needed locally.
- **Read replicas**: `getPool()` creates a single pool; add a read-only pool for `GET` routes if read throughput demands it.

---

## AI usage

See [AI_USAGE.md](AI_USAGE.md) for a full account of what was generated by AI, what was hand-authored, and what was independently verified.

The short version: the billing domain logic (`packages/domain`) was the most carefully supervised section — every rounding mode, stacking rule, and tax allocation was traced manually or proven via invariant tests. API scaffolding, repository adapters, and React components were AI-generated and then inspected. Architecture decisions, the domain contract (`CONTRACT.md`), and module boundaries were human-authored first and used as specs for code generation.
