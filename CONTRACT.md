# Domain Contract

> **This file is the single source of truth for all domain shapes.**
> Code in every package is written against these. The JSDoc typedefs in
> `packages/domain/src/types.js` mirror this exactly; if they diverge, this file wins.
> Shape changes require a revision note below.

---

## Money

All monetary values are stored and computed as **integer paise** (₹1 = 100 paise).
Raw floats are never used in calculation paths. The only rounding boundary is
`money.format(paise)` in `packages/domain/src/money.js`, which applies **half-up** rounding
once when producing a display string.

```
paise: integer   e.g. 4050 = ₹40.50
```

---

## Rates

Tax and percentage-discount rates are stored as **integer basis points** (bps).
1 bps = 0.01%. So 18% = 1800 bps, 12% = 1200, 5% = 500, 0% = 0.

---

## CatalogItem

```
{
  id:          string        — UUID, primary key
  name:        string        — non-empty display name
  category:    Category      — one of: vegetables | fruits | dairy | staples | snacks | beverages
  unitType:    UnitType      — 'unit' (integer qty) or 'weight' (decimal kg, ≤3dp)
  unitPrice:   integer       — paise per unit or per kg (must be > 0)
  gstRateBps:  integer       — GST rate in bps (0 | 500 | 1200 | 1800)
  active:      boolean
}
```

**Invariants:**
- `unitPrice` > 0
- `gstRateBps` ∈ { 0, 500, 1200, 1800 } (illustrative slabs — not authoritative tax law)
- `name` non-empty after trim

---

## CartLine

```
{
  itemId:    string   — must reference an active CatalogItem
  quantity:  number   — for unitType='unit': positive integer ≥ 1
                        for unitType='weight': positive decimal ≤ 3 decimal places, > 0
}
```

**Invariants:**
- Duplicate `itemId`s are **merged** (quantities summed) before processing — not an error.

---

## Cart

```
{
  lines:       CartLine[]    — at least 1 line required for checkout
  couponCode?: string        — Phase 2; optional; null / undefined = no coupon
}
```

**Invariant:** `lines` must be non-empty at checkout. A quote on an empty cart is allowed.

---

## CartContext (internal — produced by `cart.resolveCartContext`)

```
{
  lines:              ResolvedLine[]
  categorySubtotals:  Map<Category, integer>   — paise
  subtotal:           integer                   — paise (sum of lineSubtotals)
}

ResolvedLine: {
  item:          CatalogItem
  quantity:      number
  lineSubtotal:  integer   — paise (mulQuantity(item.unitPrice, quantity), rounded half-up)
}
```

---

## OfferRule (Strategy interface)

Every offer type implements this interface.

```
{
  id:         string
  name:       string    — display label on the bill
  type:       string    — registry key (e.g. 'percentage_category', 'flat_cart_threshold', 'buy_x_get_y')
  priority:   integer   — lower value = applied first (tiebreak: id lexicographic)
  exclusive:  boolean   — true: this offer suppresses other exclusive offers (only highest-priority exclusive wins)
  active:     boolean
  params:     object    — type-specific config (see below)

  isEligible(context: CartContext) → { eligible: boolean, reason: string }
  apply(context: CartContext)      → Discount[]
}
```

### params by type

| type | params |
|---|---|
| `percentage_category` | `{ category: Category, percentBps: integer, minCategorySubtotal: integer (paise) }` |
| `flat_cart_threshold` | `{ amountPaise: integer, minCartTotal: integer (paise) }` |
| `buy_x_get_y` | `{ category: Category, buyQty: integer, freeQty: integer }` |
| `coupon` | `{ percentBps?: integer, amountPaise?: integer, maxDiscountPaise?: integer }` (resolved via coupon record) |

---

## Discount

```
{
  offerId:     string
  label:       string    — human name shown on bill
  amountPaise: integer   — always ≥ 0 (clamped at zero, never negative)
  scope:       string    — 'cart' | 'category:<name>' | 'line:<itemId>'
}
```

---

## SkippedOffer

```
{
  offerId:  string
  name:     string
  reason:   string   — human-readable (e.g. "Spend ₹40 more to unlock ₹50 off")
}
```

Populated for: threshold-not-met, suppressed-by-exclusive, floored-to-zero.

---

## TaxBreakdownRow

```
{
  rateBps:     integer   — e.g. 1800
  taxableBase: integer   — paise allocated to this rate
  taxAmount:   integer   — paise (computed as floor(taxableBase * rateBps / 10000 + 0.5))
}
```

---

## Bill

The primary output artifact of `computeBill`.

```
{
  lineItems: Array<{
    name:          string
    unitPrice:     integer   — paise
    unitType:      UnitType
    quantity:      number
    lineSubtotal:  integer   — paise
    gstRateBps:    integer
  }>
  subtotal:       integer          — paise (before discounts)
  discounts:      Discount[]       — applied, in order of application
  skippedOffers:  SkippedOffer[]   — not applied, each with reason
  taxableAmount:  integer          — paise (subtotal − totalDiscount)
  taxBreakdown:   TaxBreakdownRow[]
  totalTax:       integer          — paise (sum of taxBreakdown[*].taxAmount)
  grandTotal:     integer          — paise (taxableAmount + totalTax)
  meta: {
    currency:    'INR'
    computedAt:  string   — ISO 8601
  }
}
```

**Invariant (must hold for every bill):**
```
grandTotal === taxableAmount + totalTax
taxableAmount === subtotal − Σ(discounts[*].amountPaise)
grandTotal ≥ 0
taxableAmount ≥ 0
every discount.amountPaise ≥ 0
```

---

## DomainError

```
{
  name:     'DomainError'
  code:     ERROR_CODES   — see packages/domain/src/errors.js
  message:  string
  field?:   string        — JSON path into the request (e.g. "lines[2].quantity")
}
```

---

## Stacking & Precedence Policy

1. Offers sorted by `priority` asc, tiebreak `id` lexicographic (deterministic).
2. Category-percentage (`percentage_category`) and BOGO (`buy_x_get_y`) discounts are computed
   against the **pre-discount** category subtotals.
3. Flat-cart-threshold (`flat_cart_threshold`) evaluates against the cart total **after** item/
   category discounts.
4. Coupons apply **last** (highest priority number).
5. If two rules are both `exclusive: true`, only the one with the lowest `priority` (earliest)
   wins; the other goes to `skippedOffers` with reason `"Exclusive offer superseded by higher-priority offer"`.
6. Non-exclusive offers always stack additively.
7. Every discount is **floored**: `amountPaise = max(0, computed)`. No line and no cart total
   can go negative. If clamping forces a discount to 0, it still appears in `skippedOffers`.

---

## Revision Log

| Date | Change | Reason |
|---|---|---|
| 2026-06-17 | Initial contract | M1.1 |
