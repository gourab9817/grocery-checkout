/**
 * Seed — loads real product data from data/catalog-data.json.
 * Run: node db/seed.js  (with DB env vars set)
 * Idempotent: clears existing rows first.
 */

import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));

const pool = new pg.Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME     || 'ansrmart',
  user:     process.env.DB_USER     || 'ansrmart',
  password: process.env.DB_PASSWORD || '',
});

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
    name: 'Buy 2 Get 1 Free on Dairy',
    type: 'buy_x_get_y',
    priority: 2,
    exclusive: false,
    active: true,
    params: { category: 'dairy', buyQty: 2, freeQty: 1 },
  },
  {
    name: 'Flat ₹50 off on orders above ₹500',
    type: 'flat_cart_threshold',
    priority: 5,
    exclusive: false,
    active: true,
    params: { amountPaise: 5000, minCartTotal: 50000 },
  },
];

async function seed() {
  const catalog = JSON.parse(
    await readFile(join(__dirname, '../data/catalog-data.json'), 'utf8')
  );

  const client = await pool.connect();
  try {
    process.stdout.write('Seeding...\n');

    await client.query('DELETE FROM order_lines');
    await client.query('DELETE FROM orders');
    await client.query('DELETE FROM coupons');
    await client.query('DELETE FROM offers');
    await client.query('DELETE FROM catalog_items');

    for (const item of catalog) {
      await client.query(
        `INSERT INTO catalog_items
           (name, category, unit_type, unit_price, gst_rate_bps, active, image_slug, description)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [item.name, item.category, item.unitType, item.unitPrice,
         item.gstRateBps, item.active, item.imageSlug, item.description]
      );
    }
    process.stdout.write(`  ✓ ${catalog.length} catalog items\n`);

    for (const offer of OFFERS) {
      await client.query(
        `INSERT INTO offers (name, type, priority, exclusive, active, params)
         VALUES ($1,$2,$3,$4,$5,$6::jsonb)`,
        [offer.name, offer.type, offer.priority, offer.exclusive, offer.active,
         JSON.stringify(offer.params)]
      );
    }
    process.stdout.write(`  ✓ ${OFFERS.length} offers\n`);

    await client.query(
      `INSERT INTO coupons (code, name, percent_bps, max_discount_paise, max_uses, active)
       VALUES ($1,$2,$3,$4,$5,true)`,
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
