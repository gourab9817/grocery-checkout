-- ============================================================
-- Migration 001: Initial schema
-- Money stored as BIGINT paise (₹1 = 100 paise). Never FLOAT.
-- Rates stored as INT basis-points (1 bps = 0.01%).
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Catalog Items ─────────────────────────────────────────────────────────────
CREATE TABLE catalog_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL CHECK (trim(name) <> ''),
  category      TEXT        NOT NULL CHECK (category IN ('vegetables','fruits','dairy','staples','snacks','beverages')),
  unit_type     TEXT        NOT NULL CHECK (unit_type IN ('unit','weight')),
  unit_price    BIGINT      NOT NULL CHECK (unit_price > 0),  -- paise
  gst_rate_bps  INT         NOT NULL CHECK (gst_rate_bps IN (0, 500, 1200, 1800)),
  active        BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for hot read paths
CREATE INDEX idx_catalog_items_category ON catalog_items (category);
CREATE INDEX idx_catalog_items_active   ON catalog_items (active);

-- ─── Offers ────────────────────────────────────────────────────────────────────
-- Offers are DATA, not code. Adding a new offer = inserting a row.
CREATE TABLE offers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL CHECK (trim(name) <> ''),
  type        TEXT        NOT NULL,  -- matches OFFER_REGISTRY key
  priority    INT         NOT NULL DEFAULT 10,
  exclusive   BOOLEAN     NOT NULL DEFAULT FALSE,
  active      BOOLEAN     NOT NULL DEFAULT TRUE,
  params      JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient active-offer loading sorted by priority
CREATE INDEX idx_offers_active_priority ON offers (active, priority);

-- ─── Coupons (Phase 2) ─────────────────────────────────────────────────────────
CREATE TABLE coupons (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code             TEXT        NOT NULL,
  name             TEXT        NOT NULL,
  -- Offer params embedded (mirrors offer params shape for CouponOffer strategy)
  percent_bps      INT,         -- e.g. 1000 = 10%
  amount_paise     BIGINT,      -- flat amount in paise
  max_discount_paise BIGINT,    -- cap for percentage coupons
  -- Validity
  valid_from       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until      TIMESTAMPTZ,  -- NULL = no expiry
  max_uses         INT,          -- NULL = unlimited
  uses_count       INT          NOT NULL DEFAULT 0,
  active           BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT coupons_code_unique UNIQUE (code),
  CONSTRAINT coupons_has_discount CHECK (
    percent_bps IS NOT NULL OR amount_paise IS NOT NULL
  )
);

CREATE UNIQUE INDEX idx_coupons_code ON coupons (code);

-- ─── Orders ────────────────────────────────────────────────────────────────────
CREATE TABLE orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Snapshot of the computed bill (frozen at checkout time)
  subtotal        BIGINT      NOT NULL,   -- paise
  total_discount  BIGINT      NOT NULL DEFAULT 0,
  taxable_amount  BIGINT      NOT NULL,
  total_tax       BIGINT      NOT NULL,
  grand_total     BIGINT      NOT NULL,
  -- Applied offers / coupons (denormalized snapshot so orders are immutable)
  discounts       JSONB       NOT NULL DEFAULT '[]',
  skipped_offers  JSONB       NOT NULL DEFAULT '[]',
  tax_breakdown   JSONB       NOT NULL DEFAULT '[]',
  coupon_id       UUID        REFERENCES coupons(id),
  currency        TEXT        NOT NULL DEFAULT 'INR',
  computed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_created_at ON orders (created_at DESC);

-- ─── Order Lines ───────────────────────────────────────────────────────────────
CREATE TABLE order_lines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  item_id         UUID        NOT NULL REFERENCES catalog_items(id),
  -- Snapshot of item details at checkout (prices may change later)
  item_name       TEXT        NOT NULL,
  unit_price      BIGINT      NOT NULL,   -- paise (snapshot)
  unit_type       TEXT        NOT NULL,
  quantity        NUMERIC(10,3) NOT NULL CHECK (quantity > 0),
  line_subtotal   BIGINT      NOT NULL,   -- paise
  gst_rate_bps    INT         NOT NULL
);

-- Critical index: all lines for an order in one query (no N+1)
CREATE INDEX idx_order_lines_order_id ON order_lines (order_id);

-- ─── Updated-at trigger ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER catalog_items_updated_at
  BEFORE UPDATE ON catalog_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER offers_updated_at
  BEFORE UPDATE ON offers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER coupons_updated_at
  BEFORE UPDATE ON coupons
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
