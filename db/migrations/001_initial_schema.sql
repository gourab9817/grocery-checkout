-- ============================================================
-- Migration 001: Initial schema (v2 — plain Postgres, no RLS)
-- Money stored as BIGINT paise (₹1 = 100 paise). Never FLOAT.
-- Rates stored as INT basis-points (1 bps = 0.01%).
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Migration tracking ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS schema_migrations (
  filename   TEXT        PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Admin users ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT        UNIQUE NOT NULL,
  password_hash TEXT        NOT NULL,
  role          TEXT        NOT NULL DEFAULT 'admin',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Catalog Items ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS catalog_items (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT        NOT NULL CHECK (trim(name) <> ''),
  category     TEXT        NOT NULL CHECK (category IN ('vegetables','fruits','dairy','staples','snacks','beverages')),
  unit_type    TEXT        NOT NULL CHECK (unit_type IN ('unit','weight')),
  unit_price   BIGINT      NOT NULL CHECK (unit_price > 0),
  gst_rate_bps INT         NOT NULL CHECK (gst_rate_bps IN (0, 500, 1200, 1800)),
  active       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_catalog_items_category ON catalog_items (category);
CREATE INDEX IF NOT EXISTS idx_catalog_items_active   ON catalog_items (active);

-- ─── Offers ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS offers (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL CHECK (trim(name) <> ''),
  type       TEXT        NOT NULL,
  priority   INT         NOT NULL DEFAULT 10,
  exclusive  BOOLEAN     NOT NULL DEFAULT FALSE,
  active     BOOLEAN     NOT NULL DEFAULT TRUE,
  params     JSONB       NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offers_active_priority ON offers (active, priority);

-- ─── Coupons ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coupons (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code               TEXT        NOT NULL,
  name               TEXT        NOT NULL,
  percent_bps        INT,
  amount_paise       BIGINT,
  max_discount_paise BIGINT,
  valid_from         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until        TIMESTAMPTZ,
  max_uses           INT,
  uses_count         INT         NOT NULL DEFAULT 0,
  active             BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT coupons_code_unique UNIQUE (code),
  CONSTRAINT coupons_has_discount CHECK (percent_bps IS NOT NULL OR amount_paise IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_coupons_code ON coupons (code);

-- ─── Orders ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  subtotal       BIGINT      NOT NULL,
  total_discount BIGINT      NOT NULL DEFAULT 0,
  taxable_amount BIGINT      NOT NULL,
  total_tax      BIGINT      NOT NULL,
  grand_total    BIGINT      NOT NULL,
  discounts      JSONB       NOT NULL DEFAULT '[]',
  skipped_offers JSONB       NOT NULL DEFAULT '[]',
  tax_breakdown  JSONB       NOT NULL DEFAULT '[]',
  coupon_id      UUID        REFERENCES coupons(id),
  currency       TEXT        NOT NULL DEFAULT 'INR',
  computed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC);

-- ─── Order Lines ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_lines (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID          NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  item_id       UUID          NOT NULL REFERENCES catalog_items(id),
  item_name     TEXT          NOT NULL,
  unit_price    BIGINT        NOT NULL,
  unit_type     TEXT          NOT NULL,
  quantity      NUMERIC(10,3) NOT NULL CHECK (quantity > 0),
  line_subtotal BIGINT        NOT NULL,
  gst_rate_bps  INT           NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_order_lines_order_id ON order_lines (order_id);

-- ─── Updated-at trigger ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER catalog_items_updated_at
  BEFORE UPDATE ON catalog_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER offers_updated_at
  BEFORE UPDATE ON offers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER coupons_updated_at
  BEFORE UPDATE ON coupons
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
