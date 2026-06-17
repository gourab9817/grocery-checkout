/**
 * Seed script — populates a fresh Postgres DB with catalog, offers, coupon.
 * Usage: node db/seed.js
 * Idempotent: clears existing rows first (reverse dependency order).
 */

import pg from 'pg';

const pool = new pg.Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME     || 'ansrmart',
  user:     process.env.DB_USER     || 'ansrmart',
  password: process.env.DB_PASSWORD || '',
});

const CATALOG = [
  // Vegetables — weight, 0% GST
  { name: 'Tomato',           category: 'vegetables', unit_type: 'weight', unit_price: 4000,  gst_rate_bps: 0 },
  { name: 'Onion',            category: 'vegetables', unit_type: 'weight', unit_price: 3500,  gst_rate_bps: 0 },
  { name: 'Potato',           category: 'vegetables', unit_type: 'weight', unit_price: 3000,  gst_rate_bps: 0 },
  { name: 'Spinach',          category: 'vegetables', unit_type: 'weight', unit_price: 6000,  gst_rate_bps: 0 },
  { name: 'Capsicum',         category: 'vegetables', unit_type: 'weight', unit_price: 8000,  gst_rate_bps: 0 },
  // Fruits — weight, 0% GST
  { name: 'Banana',           category: 'fruits', unit_type: 'weight', unit_price: 6000,  gst_rate_bps: 0 },
  { name: 'Apple (Shimla)',   category: 'fruits', unit_type: 'weight', unit_price: 18000, gst_rate_bps: 0 },
  { name: 'Mango (Alphonso)', category: 'fruits', unit_type: 'weight', unit_price: 60000, gst_rate_bps: 0 },
  { name: 'Grapes (Green)',   category: 'fruits', unit_type: 'weight', unit_price: 12000, gst_rate_bps: 0 },
  { name: 'Orange',           category: 'fruits', unit_type: 'weight', unit_price: 9000,  gst_rate_bps: 0 },
  // Staples — unit, 5% GST
  { name: 'Basmati Rice 5kg (India Gate)', category: 'staples', unit_type: 'unit', unit_price: 45000, gst_rate_bps: 500 },
  { name: 'Toor Dal 1kg (Fortune)',        category: 'staples', unit_type: 'unit', unit_price: 9500,  gst_rate_bps: 500 },
  { name: 'Wheat Flour 5kg (Aashirvaad)', category: 'staples', unit_type: 'unit', unit_price: 28000, gst_rate_bps: 500 },
  { name: 'Sunflower Oil 1L (Saffola)',   category: 'staples', unit_type: 'unit', unit_price: 18000, gst_rate_bps: 500 },
  { name: 'Sugar 1kg',                    category: 'staples', unit_type: 'unit', unit_price: 4500,  gst_rate_bps: 500 },
  // Dairy — unit, 12% GST
  { name: 'Amul Butter 500g',        category: 'dairy', unit_type: 'unit', unit_price: 25000, gst_rate_bps: 1200 },
  { name: 'Amul Full Cream Milk 1L', category: 'dairy', unit_type: 'unit', unit_price: 7200,  gst_rate_bps: 1200 },
  { name: 'Britannia Paneer 200g',   category: 'dairy', unit_type: 'unit', unit_price: 10500, gst_rate_bps: 1200 },
  { name: 'Nestle Yogurt 400g',      category: 'dairy', unit_type: 'unit', unit_price: 6000,  gst_rate_bps: 1200 },
  { name: 'Amul Cheese Slices 200g', category: 'dairy', unit_type: 'unit', unit_price: 11500, gst_rate_bps: 1200 },
  // Snacks — unit, 18% GST
  { name: "Lay's Chips 52g (Classic)", category: 'snacks', unit_type: 'unit', unit_price: 2000, gst_rate_bps: 1800 },
  { name: 'Kurkure Masala 90g',        category: 'snacks', unit_type: 'unit', unit_price: 2000, gst_rate_bps: 1800 },
  { name: 'Bingo Mad Angles 70g',      category: 'snacks', unit_type: 'unit', unit_price: 2000, gst_rate_bps: 1800 },
  { name: 'Parle-G Biscuits 250g',     category: 'snacks', unit_type: 'unit', unit_price: 1600, gst_rate_bps: 1800 },
  // Beverages — unit, 18% GST
  { name: 'Coca-Cola 750ml',           category: 'beverages', unit_type: 'unit', unit_price: 4500,  gst_rate_bps: 1800 },
  { name: 'Sprite 750ml',              category: 'beverages', unit_type: 'unit', unit_price: 4500,  gst_rate_bps: 1800 },
  { name: 'Tropicana Orange Juice 1L', category: 'beverages', unit_type: 'unit', unit_price: 11000, gst_rate_bps: 1800 },
  { name: 'Red Bull 250ml',            category: 'beverages', unit_type: 'unit', unit_price: 11500, gst_rate_bps: 1800 },
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

async function seed() {
  const client = await pool.connect();
  try {
    process.stdout.write('Seeding...\n');

    // Clear in reverse-dependency order
    await client.query('DELETE FROM order_lines');
    await client.query('DELETE FROM orders');
    await client.query('DELETE FROM coupons');
    await client.query('DELETE FROM offers');
    await client.query('DELETE FROM catalog_items');

    // Catalog
    for (const item of CATALOG) {
      await client.query(
        `INSERT INTO catalog_items (name, category, unit_type, unit_price, gst_rate_bps, active)
         VALUES ($1, $2, $3, $4, $5, true)`,
        [item.name, item.category, item.unit_type, item.unit_price, item.gst_rate_bps]
      );
    }
    process.stdout.write(`  ✓ ${CATALOG.length} catalog items\n`);

    // Offers
    for (const offer of OFFERS) {
      await client.query(
        `INSERT INTO offers (name, type, priority, exclusive, active, params)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
        [offer.name, offer.type, offer.priority, offer.exclusive, offer.active, JSON.stringify(offer.params)]
      );
    }
    process.stdout.write(`  ✓ ${OFFERS.length} offers\n`);

    // Coupon
    await client.query(
      `INSERT INTO coupons (code, name, percent_bps, max_discount_paise, max_uses, active)
       VALUES ($1, $2, $3, $4, $5, true)`,
      ['FIRSTBUY10', 'First Buy — 10% off up to ₹100', 1000, 10000, 500]
    );
    process.stdout.write('  ✓ 1 coupon\n');

    process.stdout.write('Seed complete.\n');
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  process.stderr.write(`Seed failed: ${err.message}\n`);
  process.exit(1);
});
