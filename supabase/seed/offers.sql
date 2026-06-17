-- ============================================================
-- Seed: Offers + Coupon
-- Offers are DATA rows, not code. Adding a new offer = new row.
-- ============================================================

INSERT INTO offers (name, type, priority, exclusive, active, params) VALUES

-- Offer 1: 10% off Vegetables & Fruits when combined subtotal ≥ ₹300
(
  '10% off Vegetables & Fruits (min ₹300)',
  'percentage_category',
  1,
  FALSE,
  TRUE,
  '{
    "categories": ["vegetables", "fruits"],
    "percentBps": 1000,
    "minCategorySubtotal": 30000
  }'::jsonb
),

-- Offer 2: Buy 2 Get 1 Free on Snacks
(
  'Buy 2 Get 1 Free on Snacks',
  'buy_x_get_y',
  2,
  FALSE,
  TRUE,
  '{
    "category": "snacks",
    "buyQty": 2,
    "freeQty": 1
  }'::jsonb
),

-- Offer 3: Flat ₹50 off when cart total ≥ ₹1000
(
  'Flat ₹50 off on orders above ₹1000',
  'flat_cart_threshold',
  5,
  FALSE,
  TRUE,
  '{
    "amountPaise": 5000,
    "minCartTotal": 100000
  }'::jsonb
);

-- ─── Coupon (Phase 2) ──────────────────────────────────────────────────────────
-- FIRSTBUY10: 10% off, capped at ₹100, 500 total uses, no expiry
INSERT INTO coupons (code, name, percent_bps, max_discount_paise, valid_from, valid_until, max_uses, active)
VALUES (
  'FIRSTBUY10',
  'First Buy — 10% off up to ₹100',
  1000,      -- 10%
  10000,     -- ₹100 cap
  NOW(),
  NULL,      -- no expiry
  500,       -- 500 total uses
  TRUE
);
