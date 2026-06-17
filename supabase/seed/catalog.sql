-- ============================================================
-- Seed: Grocery Catalog (28 items across 6 categories)
-- Prices in paise (₹1 = 100 paise).
-- GST slabs are illustrative for this exercise, not authoritative tax law.
--   0%    → fresh produce (vegetables, fruits)
--   5%    → staples (packaged grains, pulses)
--   12%   → dairy products
--   18%   → snacks, beverages
-- ============================================================

INSERT INTO catalog_items (name, category, unit_type, unit_price, gst_rate_bps, active) VALUES

-- ── Vegetables (per kg, 0% GST) ─────────────────────────────────────────────
('Tomato',          'vegetables', 'weight',  4000,  0, TRUE),
('Onion',           'vegetables', 'weight',  3500,  0, TRUE),
('Potato',          'vegetables', 'weight',  3000,  0, TRUE),
('Spinach',         'vegetables', 'weight',  6000,  0, TRUE),
('Capsicum',        'vegetables', 'weight',  8000,  0, TRUE),

-- ── Fruits (per kg, 0% GST) ─────────────────────────────────────────────────
('Banana',          'fruits',     'weight',  6000,  0, TRUE),
('Apple (Shimla)',  'fruits',     'weight', 18000,  0, TRUE),
('Mango (Alphonso)','fruits',     'weight', 60000,  0, TRUE),
('Grapes (Green)',  'fruits',     'weight', 12000,  0, TRUE),
('Orange',          'fruits',     'weight',  9000,  0, TRUE),

-- ── Staples (per pack/bag, 5% GST) ──────────────────────────────────────────
('Basmati Rice 5kg (India Gate)',  'staples', 'unit', 45000, 500, TRUE),
('Toor Dal 1kg (Fortune)',         'staples', 'unit',  9500, 500, TRUE),
('Wheat Flour 5kg (Aashirvaad)',   'staples', 'unit', 28000, 500, TRUE),
('Sunflower Oil 1L (Saffola)',     'staples', 'unit', 18000, 500, TRUE),
('Sugar 1kg',                      'staples', 'unit',  4500, 500, TRUE),

-- ── Dairy (per pack/bottle, 12% GST) ────────────────────────────────────────
('Amul Butter 500g',               'dairy',   'unit', 25000, 1200, TRUE),
('Amul Full Cream Milk 1L',        'dairy',   'unit',  7200, 1200, TRUE),
('Britannia Paneer 200g',          'dairy',   'unit', 10500, 1200, TRUE),
('Nestle Yogurt 400g',             'dairy',   'unit',  6000, 1200, TRUE),
('Amul Cheese Slices 200g',        'dairy',   'unit', 11500, 1200, TRUE),

-- ── Snacks (per pack, 18% GST) ──────────────────────────────────────────────
('Lay''s Chips 52g (Classic)',     'snacks',  'unit',  2000, 1800, TRUE),
('Kurkure Masala 90g',             'snacks',  'unit',  2000, 1800, TRUE),
('Bingo Mad Angles 70g',           'snacks',  'unit',  2000, 1800, TRUE),
('Parle-G Biscuits 250g',          'snacks',  'unit',  1600, 1800, TRUE),

-- ── Beverages (per bottle/can, 18% GST) ─────────────────────────────────────
('Coca-Cola 750ml',                'beverages','unit',  4500, 1800, TRUE),
('Sprite 750ml',                   'beverages','unit',  4500, 1800, TRUE),
('Tropicana Orange Juice 1L',      'beverages','unit', 11000, 1800, TRUE),
('Red Bull 250ml',                 'beverages','unit', 11500, 1800, TRUE);
