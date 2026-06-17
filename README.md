# AnsrMart — Grocery Checkout Billing System

A full-stack grocery checkout system with category-based multi-rate GST, a pluggable offer
engine (strategy pattern), and a Botanical-design React storefront.

---

## Quick start

### Prerequisites
- Node ≥ 20
- A [Supabase](https://supabase.com) project (free tier is sufficient)

### 1 — Clone & install
```bash
git clone <repo-url> ansrmart && cd ansrmart/grocery-checkout
npm install
```

### 2 — Configure environment
```bash
cp .env.example .env
# Fill in SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
```

### 3 — Run Supabase migrations
In your Supabase dashboard → SQL Editor, run these files in order:
```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_rls_policies.sql
```

### 4 — Seed the database
```bash
npm run seed
# Seeds 28 catalog items + 3 offers + 1 FIRSTBUY10 coupon
```

### 5 — Run (development)
```bash
npm run dev
# API → http://localhost:3000
# Web → http://localhost:5173
```

### Or run with Docker
```bash
docker compose up --build
# API → http://localhost:3000
# Web → http://localhost:8080
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Browser  ←→  React/Vite (apps/web)  ←→  /api proxy                   │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │  HTTP/JSON
┌──────────────────────────────▼──────────────────────────────────────────┐
│  Fastify API  (apps/api)                                                │
│  ┌────────────┐  ┌──────────────┐  ┌────────────────────────────────┐  │
│  │ Zod schemas│  │  Services    │  │  Repository adapters (Supabase)│  │
│  │ (boundary) │  │  Billing     │  │  SupabaseCatalogRepository     │  │
│  │            │  │  Order       │  │  SupabaseOfferRepository       │  │
│  │ globalError│  │              │  │  SupabaseCouponRepository      │  │
│  │ Handler    │  │              │  │  SupabaseOrderRepository       │  │
│  └────────────┘  └──────┬───────┘  └────────────────────────────────┘  │
└─────────────────────────┼───────────────────────────────────────────────┘
                          │  domain types only (no HTTP, no SQL)
┌─────────────────────────▼───────────────────────────────────────────────┐
│  Domain package  (packages/domain)  — zero runtime dependencies         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │ money.js     │  │ offers/      │  │ tax/         │  │ billing/   │  │
│  │ (Value Obj.) │  │ engine.js    │  │ engine.js    │  │ computeBill│  │
│  │              │  │ registry.js  │  │ (pro-rata    │  │ (Facade)   │  │
│  │              │  │ Strategy ×4  │  │  LR method)  │  │            │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────────────┐
│  Supabase (managed Postgres + Auth + RLS)                               │
│  catalog_items · offers · coupons · orders · order_lines                │
└─────────────────────────────────────────────────────────────────────────┘
```

### Dependency rule
The arrow points **inward only**: `web → api → domain`. The domain package imports nothing from
`api` or `web` — enforced structurally (its `package.json` has empty `dependencies`). No layer
reaches "through" another.

---

## Design patterns used

| Pattern | Where | Why |
|---|---|---|
| **Strategy** | `PercentageCategoryOffer`, `FlatCartThresholdOffer`, `BuyXGetYFreeOffer`, `CouponOffer` | Each offer is an interchangeable algorithm behind one `{isEligible, apply}` interface. Adding a new offer type = a new Strategy class, zero engine edits (OCP). |
| **Factory / Registry** | `offers/registry.js` | Maps a `type` string from a DB row → the right constructor. No `switch (type)`, ever. |
| **Repository** | `repositories/interfaces/` + `repositories/memory/` + `repositories/supabase/` | Hides persistence behind an interface. Services depend on the interface (DIP). Tests use in-memory impls, production uses Supabase adapters. |
| **Adapter** | `repositories/supabase/*` | The *only* place that knows DB column names and performs snake_case ↔ camelCase mapping. |
| **Facade** | `billing/computeBill.js` | Single pure entrypoint hiding the cart → offer → tax → bill pipeline. |
| **Template Method** | `OfferRule` base class | Shared eligibility/clamping skeleton; subclasses fill in `isEligible` and `apply`. |
| **Value Object** | `money.js` | Immutable integer-paise arithmetic with a single rounding boundary. |

---

## Adding a new offer type in ~15 lines

The Strategy + Registry pattern means adding a 4th offer type touches **no existing code**:

```js
// 1. Create packages/domain/src/offers/BundleOffer.js
export class BundleOffer extends OfferRule {
  isEligible(ctx) {
    const ok = ctx.lines.some(l => this.params.itemIds.includes(l.item.id));
    return { eligible: ok, reason: ok ? '' : 'Bundle item not in cart' };
  }
  apply(ctx) {
    return [this._discount(this.params.amountPaise, 'cart')];
  }
}

// 2. Register in offers/registry.js — one line:
import { BundleOffer } from './BundleOffer.js';
OFFER_REGISTRY['bundle'] = BundleOffer;

// 3. Insert an offer row with type='bundle' into the DB.
// Done. The engine picks it up automatically.
```

No switch statements. No engine edits. This is the OCP seam.

---

## Stacking & precedence policy

Offers are applied in three deterministic phases:

```
Phase A — Category & BOGO offers  (against pre-discount subtotals)
Phase B — Flat-cart-threshold     (against post-Phase-A total)
Phase C — Coupons                 (against post-Phase-B total)
```

Within each phase, offers are sorted by `priority` asc, then by `id` lexicographically
(fully deterministic — no non-determinism in the engine).

**Exclusive offers:** if two rules have `exclusive: true`, only the lowest-priority-number
wins; the other is moved to `skippedOffers` with `reason: "Exclusive offer superseded…"`.

**Non-exclusive offers** always stack additively.

**Floor invariant:** every discount is `max(0, computed)`. No bill total can go negative.
A discount clamped to 0 still appears in `skippedOffers` (so the UI can say "offer had no
effect" rather than silently dropping it).

---

## Category-based GST (multi-rate)

GST is computed per item category, not flat across the cart. Items in the same GST slab are
grouped; the total discount is allocated across lines using the **largest-remainder method**
to ensure integers always sum exactly to `taxableAmount`.

Tax rates used (illustrative — **not authoritative tax law**):

| Category | Rate |
|---|---|
| Vegetables, fruits | 0% |
| Staples (rice, dal) | 5% |
| Dairy | 12% |
| Snacks, beverages | 18% |

The key invariant: `grandTotal === taxableAmount + totalTax` — asserted in integration tests.

---

## Money precision

All monetary values are **integer paise** throughout the codebase. `₹1 = 100 paise`.

- Float drift is structurally impossible in calculation paths.
- The single rounding boundary is `money.format(paise)` — called only when producing a
  display string, never mid-computation.
- `money.mulQuantity(unitPricePaise, quantity)` handles fractional-kg weights by scaling
  up, doing integer math, and rounding half-up once.
- `money.percentage(paise, bps)` uses basis points (1800 bps = 18%) to stay integer.

Weight quantity precision: 3 decimal places (gram resolution). Validated in `validateQuantity`.

---

## API endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | none | Liveness probe |
| GET | `/metrics` | none | Process vitals |
| GET | `/catalog` | none | List active items (`?category=...`) |
| POST | `/quote` | none | Live bill preview (no persistence) |
| POST | `/checkout` | none | Place order → returns bill + orderId |
| GET | `/orders/:id` | none | Fetch order receipt |
| GET | `/admin/catalog` | admin JWT | List all catalog items |
| POST | `/admin/catalog` | admin JWT | Create catalog item |
| PATCH | `/admin/catalog/:id` | admin JWT | Update catalog item |
| GET | `/admin/offers` | admin JWT | List offers |
| POST | `/admin/offers` | admin JWT | Create offer |
| PATCH | `/admin/offers/:id` | admin JWT | Update offer |
| POST | `/admin/coupons` | admin JWT | Create coupon |

### Error envelope (every error response)
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

## Key assumptions & decisions

1. **Integer paise**: all money is stored and computed as integer paise. No floats in any
   calculation path. This is a hard invariant, not a soft convention.

2. **GST slabs are illustrative**: the rates (0/5/12/18%) reflect approximate Indian GST
   categories but are **not authoritative tax law**. A production system must integrate with
   a certified tax computation engine.

3. **Duplicate cart lines are merged**: if the same `itemId` appears twice, quantities are
   summed before processing. This is documented in CONTRACT.md.

4. **BuyXGetYFree gives the cheapest units free**: when multiple eligible units exist, the
   cheapest are made free (sort by unitPrice asc, take cheapest as free).

5. **Weight items excluded from BOGO**: `BuyXGetYFreeOffer` only applies to `unitType='unit'`
   items. Weight-priced items are excluded (you can't meaningfully "get 1 free" for 0.333 kg).

6. **Coupon usage is atomic**: `increment_coupon_usage(coupon_id)` is a Supabase RPC that
   increments `uses_count` inside a transaction to prevent race conditions.

7. **Pro-rata tax allocation**: discount is distributed across lines proportionally to their
   subtotal, using the largest-remainder method to ensure the integer pieces sum exactly to
   `taxableAmount`.

8. **Number precision**: paise values fit safely in JavaScript Number (IEEE 754 double) up
   to ₹9 quadrillion per line (far above any realistic cart). No BigInt needed.

9. **Order persistence is best-effort**: the Supabase JS client lacks explicit transaction
   support; order insertion + line insertion are two sequential writes. A production system
   should use a Postgres function/RPC to wrap both in a single transaction.

10. **Admin auth requires a Supabase JWT with `app_metadata.role = "admin"`**: set via
    Supabase Dashboard → Auth → Users → User → app_metadata.

---

## Performance

- **O(n) cart resolution**: `resolveCartContext` builds a Map index of the catalog in one
  pass. There are no nested loops. Proven with a 500-item test (runs in 0ms).
- **No N+1 queries**: `findByIds` uses `.in('id', ids)` — one query for all items, not one
  per line.
- **Indexed hot paths**: `catalog_items(category)`, `catalog_items(active)`,
  `offers(active, priority)`, `coupons(code)` unique, `order_lines(order_id)`.

### Production scaling seams (not built, documented here)
- **Catalog/offer cache**: wrap `findAllActive()` with a 30–60s in-process TTL cache.
  Invalidate on admin PATCH. No domain changes needed — pure adapter-layer concern.
- **Rate limiting**: add `@fastify/rate-limit` after CORS in `buildApp()`.
- **CI/CD**: `npm run verify` is the gate. Add `.github/workflows/ci.yml`:
  push → verify → docker build → push → deploy (Railway / fly.io).
- **API key rotation**: `SUPABASE_SERVICE_ROLE_KEY` lives in env; rotation = redeploy.
  Store in Vault/AWS SSM in production.

---

## Test coverage

```
packages/domain
  money.test.js        22 tests — arithmetic, rounding, edge cases
  cart.test.js         14 tests — resolution, merging, unknown items
  offers.test.js       28 tests — all 4 strategies + stacking + OCP seam proof
  tax.test.js          10 tests — multi-rate breakdown, largest-remainder
  computeBill.test.js  13 tests — worked examples, invariants, 500-item linearity

apps/api
  billing.test.js      17 tests — full HTTP round-trips with in-memory repos

Total: 104 tests, all green. Run:  npm run verify
```

---

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start API + web concurrently (development) |
| `npm run verify` | Lint + test (the CI gate) |
| `npm run test` | Run all tests |
| `npm run lint` | ESLint across all workspaces |
| `npm run seed` | Seed the Supabase database |
| `npm run build -w apps/web` | Production build of the React app |
| `docker compose up --build` | One-command full stack (needs .env) |
