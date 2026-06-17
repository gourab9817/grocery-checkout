/**
 * Seed script — populates a fresh Supabase project with catalog, offers, coupon.
 * Usage: npm run seed -w apps/api
 *
 * Reads env from .env at root or process.env. Idempotent: clears existing rows first.
 */

import { assertEnv } from './env.js';
assertEnv();

import { supabaseAdmin } from './supabase.js';

// ─── Catalog ──────────────────────────────────────────────────────────────────
const CATALOG = [
  // Vegetables — weight, 0% GST
  { name: 'Tomato',          category: 'vegetables', unit_type: 'weight', unit_price: 4000,  gst_rate_bps: 0,    active: true },
  { name: 'Onion',           category: 'vegetables', unit_type: 'weight', unit_price: 3500,  gst_rate_bps: 0,    active: true },
  { name: 'Potato',          category: 'vegetables', unit_type: 'weight', unit_price: 3000,  gst_rate_bps: 0,    active: true },
  { name: 'Spinach',         category: 'vegetables', unit_type: 'weight', unit_price: 6000,  gst_rate_bps: 0,    active: true },
  { name: 'Capsicum',        category: 'vegetables', unit_type: 'weight', unit_price: 8000,  gst_rate_bps: 0,    active: true },
  // Fruits — weight, 0% GST
  { name: 'Banana',          category: 'fruits',     unit_type: 'weight', unit_price: 6000,  gst_rate_bps: 0,    active: true },
  { name: 'Apple (Shimla)',  category: 'fruits',     unit_type: 'weight', unit_price: 18000, gst_rate_bps: 0,    active: true },
  { name: 'Mango (Alphonso)',category: 'fruits',     unit_type: 'weight', unit_price: 60000, gst_rate_bps: 0,    active: true },
  { name: 'Grapes (Green)',  category: 'fruits',     unit_type: 'weight', unit_price: 12000, gst_rate_bps: 0,    active: true },
  { name: 'Orange',          category: 'fruits',     unit_type: 'weight', unit_price: 9000,  gst_rate_bps: 0,    active: true },
  // Staples — unit, 5% GST
  { name: 'Basmati Rice 5kg (India Gate)', category: 'staples', unit_type: 'unit', unit_price: 45000, gst_rate_bps: 500, active: true },
  { name: 'Toor Dal 1kg (Fortune)',        category: 'staples', unit_type: 'unit', unit_price: 9500,  gst_rate_bps: 500, active: true },
  { name: 'Wheat Flour 5kg (Aashirvaad)', category: 'staples', unit_type: 'unit', unit_price: 28000, gst_rate_bps: 500, active: true },
  { name: 'Sunflower Oil 1L (Saffola)',   category: 'staples', unit_type: 'unit', unit_price: 18000, gst_rate_bps: 500, active: true },
  { name: 'Sugar 1kg',                    category: 'staples', unit_type: 'unit', unit_price: 4500,  gst_rate_bps: 500, active: true },
  // Dairy — unit, 12% GST
  { name: 'Amul Butter 500g',          category: 'dairy', unit_type: 'unit', unit_price: 25000, gst_rate_bps: 1200, active: true },
  { name: 'Amul Full Cream Milk 1L',   category: 'dairy', unit_type: 'unit', unit_price: 7200,  gst_rate_bps: 1200, active: true },
  { name: 'Britannia Paneer 200g',     category: 'dairy', unit_type: 'unit', unit_price: 10500, gst_rate_bps: 1200, active: true },
  { name: 'Nestle Yogurt 400g',        category: 'dairy', unit_type: 'unit', unit_price: 6000,  gst_rate_bps: 1200, active: true },
  { name: 'Amul Cheese Slices 200g',   category: 'dairy', unit_type: 'unit', unit_price: 11500, gst_rate_bps: 1200, active: true },
  // Snacks — unit, 18% GST
  { name: "Lay's Chips 52g (Classic)", category: 'snacks', unit_type: 'unit', unit_price: 2000, gst_rate_bps: 1800, active: true },
  { name: 'Kurkure Masala 90g',        category: 'snacks', unit_type: 'unit', unit_price: 2000, gst_rate_bps: 1800, active: true },
  { name: 'Bingo Mad Angles 70g',      category: 'snacks', unit_type: 'unit', unit_price: 2000, gst_rate_bps: 1800, active: true },
  { name: 'Parle-G Biscuits 250g',     category: 'snacks', unit_type: 'unit', unit_price: 1600, gst_rate_bps: 1800, active: true },
  // Beverages — unit, 18% GST
  { name: 'Coca-Cola 750ml',              category: 'beverages', unit_type: 'unit', unit_price: 4500,  gst_rate_bps: 1800, active: true },
  { name: 'Sprite 750ml',                 category: 'beverages', unit_type: 'unit', unit_price: 4500,  gst_rate_bps: 1800, active: true },
  { name: 'Tropicana Orange Juice 1L',    category: 'beverages', unit_type: 'unit', unit_price: 11000, gst_rate_bps: 1800, active: true },
  { name: 'Red Bull 250ml',               category: 'beverages', unit_type: 'unit', unit_price: 11500, gst_rate_bps: 1800, active: true },
];

const OFFERS = [
  {
    name: '10% off Vegetables & Fruits (min ₹300)',
    type: 'percentage_category',
    priority: 1,
    exclusive: false,
    active: true,
    params: { categories: ['vegetables', 'fruits'], percentBps: 1000, minCategorySubtotal: 30000 },
  },
  {
    name: 'Buy 2 Get 1 Free on Snacks',
    type: 'buy_x_get_y',
    priority: 2,
    exclusive: false,
    active: true,
    params: { category: 'snacks', buyQty: 2, freeQty: 1 },
  },
  {
    name: 'Flat ₹50 off on orders above ₹1000',
    type: 'flat_cart_threshold',
    priority: 5,
    exclusive: false,
    active: true,
    params: { amountPaise: 5000, minCartTotal: 100000 },
  },
];

const COUPONS = [
  {
    code: 'FIRSTBUY10',
    name: 'First Buy — 10% off up to ₹100',
    percent_bps: 1000,
    max_discount_paise: 10000,
    max_uses: 500,
    active: true,
  },
];

async function seed() {
  process.stdout.write('Seeding catalog...\n');

  // Clear in reverse-dependency order
  await supabaseAdmin.from('order_lines').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabaseAdmin.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabaseAdmin.from('coupons').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabaseAdmin.from('offers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabaseAdmin.from('catalog_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  const { error: catErr } = await supabaseAdmin.from('catalog_items').insert(CATALOG);
  if (catErr) throw new Error(`Catalog seed failed: ${catErr.message}`);
  process.stdout.write(`  ✓ ${CATALOG.length} catalog items\n`);

  const { error: offErr } = await supabaseAdmin.from('offers').insert(OFFERS);
  if (offErr) throw new Error(`Offers seed failed: ${offErr.message}`);
  process.stdout.write(`  ✓ ${OFFERS.length} offers\n`);

  const { error: cpnErr } = await supabaseAdmin.from('coupons').insert(COUPONS);
  if (cpnErr) throw new Error(`Coupons seed failed: ${cpnErr.message}`);
  process.stdout.write(`  ✓ ${COUPONS.length} coupons\n`);

  process.stdout.write('Seed complete.\n');
}

seed().catch((err) => {
  process.stderr.write(`Seed failed: ${err.message}\n`);
  process.exit(1);
});
