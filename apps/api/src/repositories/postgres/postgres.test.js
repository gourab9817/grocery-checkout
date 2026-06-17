/**
 * Postgres repository integration tests.
 * Requires a running Postgres DB — run via:
 *   docker compose up postgres -d
 *   DB_HOST=localhost DB_PORT=5432 DB_NAME=ansrmart DB_USER=ansrmart DB_PASSWORD=localdevpassword \
 *     node --test apps/api/src/repositories/postgres/postgres.test.js
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { PostgresCatalogRepository } from './PostgresCatalogRepository.js';
import { PostgresOfferRepository }   from './PostgresOfferRepository.js';
import { PostgresCouponRepository }  from './PostgresCouponRepository.js';
import { PostgresOrderRepository }   from './PostgresOrderRepository.js';

const pool = new pg.Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME     || 'ansrmart',
  user:     process.env.DB_USER     || 'ansrmart',
  password: process.env.DB_PASSWORD || '',
});

before(async () => {
  // Ensure tables exist (run migrations first)
  await pool.query('SELECT 1');
});

after(async () => {
  await pool.end();
});

describe('PostgresCatalogRepository', () => {
  const repo = new PostgresCatalogRepository(pool);
  let createdId;

  it('creates a catalog item', async () => {
    const item = await repo.create({
      name: '__test_tomato__',
      category: 'vegetables',
      unitType: 'weight',
      unitPrice: 4000,
      gstRateBps: 0,
      active: true,
    });
    assert.equal(item.name, '__test_tomato__');
    assert.equal(item.category, 'vegetables');
    assert.equal(typeof item.id, 'string');
    createdId = item.id;
  });

  it('finds item by id', async () => {
    const item = await repo.findById(createdId);
    assert.ok(item);
    assert.equal(item.unitPrice, 4000);
  });

  it('finds by ids array', async () => {
    const items = await repo.findByIds([createdId]);
    assert.equal(items.length, 1);
  });

  it('updates active flag', async () => {
    const updated = await repo.update(createdId, { active: false });
    assert.equal(updated.active, false);
  });

  it('findAllActive excludes inactive items', async () => {
    const active = await repo.findAllActive();
    assert.ok(!active.find((i) => i.id === createdId));
  });

  after(async () => {
    await pool.query('DELETE FROM catalog_items WHERE name = $1', ['__test_tomato__']);
  });
});

describe('PostgresOfferRepository', () => {
  const repo = new PostgresOfferRepository(pool);
  let createdId;

  it('creates an offer', async () => {
    const offer = await repo.create({
      name: '__test_offer__',
      type: 'flat_cart_threshold',
      priority: 99,
      exclusive: false,
      active: true,
      params: { amountPaise: 500, minCartTotal: 10000 },
    });
    assert.equal(offer.name, '__test_offer__');
    createdId = offer.id;
  });

  it('findAllActive includes the new offer', async () => {
    const offers = await repo.findAllActive();
    assert.ok(offers.find((o) => o.id === createdId));
  });

  it('updates offer active flag', async () => {
    const updated = await repo.update(createdId, { active: false });
    assert.equal(updated.active, false);
  });

  after(async () => {
    await pool.query('DELETE FROM offers WHERE name = $1', ['__test_offer__']);
  });
});

describe('PostgresCouponRepository', () => {
  const repo = new PostgresCouponRepository(pool);

  it('creates and finds a coupon by code', async () => {
    await repo.create({
      code: 'TESTONLY99',
      name: '__test coupon__',
      percentBps: 1000,
      maxDiscountPaise: 5000,
      maxUses: 10,
      active: true,
    });
    const found = await repo.findByCode('testonly99');
    assert.ok(found);
    assert.equal(found.percentBps, 1000);
  });

  it('increments usage', async () => {
    const coupon = await repo.findByCode('TESTONLY99');
    await repo.incrementUsage(coupon.id);
    const updated = await repo.findByCode('TESTONLY99');
    assert.equal(updated.usesCount, 1);
  });

  after(async () => {
    await pool.query('DELETE FROM coupons WHERE code = $1', ['TESTONLY99']);
  });
});

describe('PostgresOrderRepository', () => {
  const catalogRepo = new PostgresCatalogRepository(pool);
  const orderRepo   = new PostgresOrderRepository(pool);
  let itemId, orderId;

  before(async () => {
    const item = await catalogRepo.create({
      name: '__test_order_item__',
      category: 'vegetables',
      unitType: 'weight',
      unitPrice: 5000,
      gstRateBps: 0,
      active: true,
    });
    itemId = item.id;
  });

  it('creates an order with lines in a transaction', async () => {
    const result = await orderRepo.createWithLines({
      order: {
        subtotal:       5000,
        totalDiscount:  0,
        taxableAmount:  5000,
        totalTax:       0,
        grandTotal:     5000,
        discounts:      [],
        skippedOffers:  [],
        taxBreakdown:   [],
        currency:       'INR',
      },
      lines: [{
        itemId,
        name:         '__test_order_item__',
        unitPrice:    5000,
        unitType:     'weight',
        quantity:     1,
        lineSubtotal: 5000,
        gstRateBps:   0,
      }],
    });
    assert.ok(result.id);
    orderId = result.id;
  });

  it('finds the order by id', async () => {
    const order = await orderRepo.findById(orderId);
    assert.ok(order);
    assert.equal(order.lines.length, 1);
  });

  after(async () => {
    if (orderId) await pool.query('DELETE FROM orders WHERE id = $1', [orderId]);
    if (itemId)  await pool.query('DELETE FROM catalog_items WHERE id = $1', [itemId]);
  });
});
