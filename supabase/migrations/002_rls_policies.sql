-- ============================================================
-- Migration 002: Row Level Security (RLS) policies
--
-- Intent (documented per plan.md §7):
--   - Public (anon): READ active catalog items and active offers.
--   - Admin: WRITE to catalog, offers, coupons (requires auth role = 'admin').
--   - Service role: INSERT orders + order_lines (server-side only, bypasses RLS).
--   - Coupon usage increment: handled via a single RPC (atomic, service role).
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE catalog_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons        ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders         ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_lines    ENABLE ROW LEVEL SECURITY;

-- ─── catalog_items ─────────────────────────────────────────────────────────────

-- Anyone can read active catalog items
CREATE POLICY "catalog_items: public read active"
  ON catalog_items FOR SELECT
  USING (active = TRUE);

-- Admins can read ALL (including inactive)
CREATE POLICY "catalog_items: admin read all"
  ON catalog_items FOR SELECT
  USING (auth.jwt() ->> 'role' = 'admin');

-- Only admins can insert / update / delete
CREATE POLICY "catalog_items: admin write"
  ON catalog_items FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- ─── offers ────────────────────────────────────────────────────────────────────

CREATE POLICY "offers: public read active"
  ON offers FOR SELECT
  USING (active = TRUE);

CREATE POLICY "offers: admin read all"
  ON offers FOR SELECT
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "offers: admin write"
  ON offers FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- ─── coupons ───────────────────────────────────────────────────────────────────

-- Public can read active coupons (to validate at checkout — code check is in service)
CREATE POLICY "coupons: public read active"
  ON coupons FOR SELECT
  USING (active = TRUE);

CREATE POLICY "coupons: admin write"
  ON coupons FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- ─── orders + order_lines ──────────────────────────────────────────────────────
-- Written by the server (service-role key) which bypasses RLS.
-- Public/anon cannot access order data directly (no policy = deny).
-- Admins can read orders for reporting.

CREATE POLICY "orders: admin read"
  ON orders FOR SELECT
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "order_lines: admin read"
  ON order_lines FOR SELECT
  USING (auth.jwt() ->> 'role' = 'admin');

-- ─── Coupon usage increment RPC ────────────────────────────────────────────────
-- Atomic increment done in a single function call to prevent race conditions.
-- Called by the server with the service-role key.

CREATE OR REPLACE FUNCTION increment_coupon_usage(coupon_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE coupons
  SET uses_count = uses_count + 1
  WHERE id = coupon_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
