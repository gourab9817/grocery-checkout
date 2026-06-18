# AI Usage

A candid account of how AI tools (Claude Code) were used across all three development phases of the AnsrMart grocery checkout system: what was generated vs hand-authored, and what was independently verified.

---

## Development phases

### v1 — Core billing domain

**Scope**: monorepo scaffold, pure domain package, in-memory repos, basic Fastify API, Vite/React frontend, Supabase Postgres backend, 104-test suite.

**What AI generated**:
- Monorepo structure: package.json files, workspace wiring, ESLint/Prettier/Vitest configs
- All of `packages/domain`: `money.js`, `cart.js`, `offers/` (engine + 4 strategies), `tax/engine.js`, `billing/computeBill.js`
- Repository adapters, service orchestration, Zod schemas, Fastify routing
- All React components, Tailwind design-system config, `useCart` hook
- All 104 tests (domain + API)

**What was hand-verified in every case**:
- `halfUp = floor(n + 0.5)` rounding — confirmed correct vs JavaScript's `Math.round` (round half to even)
- The 3-phase stacking/precedence policy — traced manually through worked examples
- Pro-rata tax allocation — verified that integer pieces always sum to `taxableAmount` (invariant test)
- BuyXGetYFree cheapest-unit selection — traced the sort + slice logic by hand
- `clampToZero` behavior — confirmed `sub(a, b)` never returns negative

**What was NOT AI-generated**:
- `CONTRACT.md` — the domain contract (shapes, invariants, stacking policy) was human-authored first and used as the spec for code generation
- Architecture decisions, module boundaries, and design-pattern choices
- The GST rate validation constraint (`[0, 500, 1200, 1800]`) — intentionally illustrative, documented explicitly
- The "cheapest units free" interpretation of BuyXGetYFree — a deliberate product decision, hand-specified and verified in tests

---

### v2 — Customer accounts, admin panel, Docker

**Scope**: customer user model, JWT auth for both admin and customer tiers, order history, admin CRUD panel, Docker Compose stack.

**What AI generated**:
- Customer user registration/login flow, `AuthService`, `UserService` (v1)
- `requireAuth` middleware, per-tier JWT verification
- Admin panel React components and routes
- Docker Compose configuration, multi-stage Dockerfiles

**What was hand-verified**:
- JWT claims structure (`role`, `userId`) and middleware guard logic
- Admin-first-registration lock (blocks if any admin exists)

---

### v3 — Production hardening

**Scope**: Redis caching, refresh token rotation, delivery addresses, pluggable notifications (SNS), product image pipeline (S3), TanStack Query frontend caching, security hardening (helmet, CORS allowlist, rate-limiting), PDF receipts, AWS RDS SSL.

**What AI generated**:
- Redis cache decorator repos (`CachedCatalogRepository`, `CachedOfferRepository`) and `getRedis()` singleton
- Refresh token system: `PostgresRefreshTokenRepository`, token rotation in `UserService`, httpOnly cookie in `users.js` routes
- `PostgresAddressRepository` and `/addresses` route CRUD
- `NotificationService` with pluggable `LocalLogProvider` / `SnsSmsProvider`
- `scripts/extract-images.js` and `scripts/upload-images-to-s3.js` image pipeline
- `apps/web/nginx.conf` (gzip, `/api` proxy with cookie passthrough, `/images` S3 proxy, SPA fallback)
- TanStack Query integration in `CatalogPage`, `MyOrdersPage`, `OrderReceiptPage`, `AddressBook`
- jspdf + html2canvas PDF receipt generation in `OrderReceiptPage`
- DB migrations 004–006
- `apps/web/src/lib/imageUrl.js` helper
- `apps/web/src/api/client.js` rewrite (credentials:include, cache:no-store, auto-refresh 401 interceptor)

**What was diagnosed and fixed during production testing**:
- `FST_ERR_PLUGIN_VERSION_MISMATCH` — @fastify/helmet@13 requires Fastify 5; downgraded to Fastify-4-compatible versions
- Docker layer caching serving stale `node_modules` — root cause: npm workspaces installs some packages in `apps/api/node_modules/`; fix: copy both in Dockerfile
- `@fastify/compress` producing `Content-Encoding: gzip` + 0-byte body for large responses — removed app-level compression, delegated to nginx
- Browser 304 response leaking null to `res.json()` crashing the SPA — fixed with `cache: 'no-store'` on all fetch calls
- nginx healthcheck `localhost` resolving to IPv6 while nginx binds IPv4 — fixed with `127.0.0.1`

**What was hand-verified**:
- Refresh token rotation: old token revoked, new token issued, both verified against `refresh_tokens` DB table
- Redis graceful fallback: confirmed API continues serving from Postgres when Redis is unreachable
- Image pipeline 1:1 mapping: 81 source files = 81 catalog slugs, zero gaps (verified by cross-referencing `find` output with seeded imageSlug values)
- nginx S3 proxy byte equality: `curl /images/Watermelon.jpg` returned identical byte count to direct S3 URL
- Container startup order: all 5 services (postgres, redis, floci, api, web) reach `healthy` state via dependency chain

---

## Trust levels

| Area | Trust | Verification method |
|---|---|---|
| Integer paise arithmetic | High | 22 unit tests; manual trace of rounding cases |
| Stacking/precedence policy | High | 28 offer tests; worked-example integration tests |
| Pro-rata tax allocation | High | 10 tax tests; invariant assertion (sum check) |
| Refresh token rotation | High | Verified against DB (`SELECT revoked FROM refresh_tokens`) |
| Redis cache invalidation | High | Verified via `redis-cli KEYS 'catalog:*'` before/after admin write |
| Rate-limit enforcement | Medium | Tested 6× POST to /users/login → confirmed 429 on 6th |
| Docker build layer order | Medium | Verified running containers; not in CI |
| AWS SNS integration | Low — Floci only | Works against Floci emulator; real SNS not integration-tested |
| PDF generation (html2canvas) | Low | Manually downloaded one PDF; canvas CORS requires `crossOrigin="anonymous"` |
