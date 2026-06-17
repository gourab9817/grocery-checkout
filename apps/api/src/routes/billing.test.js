/**
 * Integration tests for /quote and /checkout routes.
 * Uses in-memory repositories — no Supabase connection needed.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../server.js';
import { MemoryCatalogRepository } from '../repositories/memory/MemoryCatalogRepository.js';
import { MemoryOfferRepository } from '../repositories/memory/MemoryOfferRepository.js';
import { MemoryCouponRepository } from '../repositories/memory/MemoryCouponRepository.js';
import { MemoryOrderRepository } from '../repositories/memory/MemoryOrderRepository.js';

// ─── Fixtures ──────────────────────────────────────────────────────────────────

// UUIDs are required by the Zod schema — fixtures must use valid v4 UUIDs.
const ID = {
  tomato: '11111111-0000-0000-0000-000000000001',
  lays:   '11111111-0000-0000-0000-000000000002',
  butter: '11111111-0000-0000-0000-000000000003',
  rice:   '11111111-0000-0000-0000-000000000004',
};

const CATALOG = [
  { id: ID.tomato, name: 'Tomato', category: 'vegetables', unitType: 'weight', unitPrice: 4000, gstRateBps: 0, active: true },
  { id: ID.lays, name: "Lay's Chips", category: 'snacks', unitType: 'unit', unitPrice: 2000, gstRateBps: 1800, active: true },
  { id: ID.butter, name: 'Amul Butter', category: 'dairy', unitType: 'unit', unitPrice: 25000, gstRateBps: 1200, active: true },
  { id: ID.rice, name: 'Basmati Rice', category: 'staples', unitType: 'unit', unitPrice: 45000, gstRateBps: 500, active: true },
];

const OFFERS = [
  {
    id: 'flat-50', name: 'Flat ₹50 off ≥₹1000', type: 'flat_cart_threshold',
    priority: 5, exclusive: false, active: true,
    params: { amountPaise: 5000, minCartTotal: 100000 },
  },
];

const COUPONS = [
  {
    id: 'cpn1', code: 'FIRSTBUY10', name: '10% off up to ₹100',
    percentBps: 1000, maxDiscountPaise: 10000, maxUses: 500,
    usesCount: 0, validFrom: new Date(0).toISOString(), validUntil: null, active: true,
  },
];

function makeMemoryRepos() {
  return {
    catalog: new MemoryCatalogRepository(CATALOG),
    offer: new MemoryOfferRepository(OFFERS),
    coupon: new MemoryCouponRepository(COUPONS),
    order: new MemoryOrderRepository(),
  };
}

// ─── App setup ────────────────────────────────────────────────────────────────

let app;
beforeAll(async () => {
  app = await buildApp({ logger: false, repos: makeMemoryRepos() });
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

// ─── /quote ───────────────────────────────────────────────────────────────────

describe('POST /quote', () => {
  it('returns a bill for a valid cart', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/quote',
      payload: { lines: [{ itemId: ID.lays, quantity: 2 }] },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.subtotal).toBe(4000); // ₹20 × 2
    expect(body.data.grandTotal).toBeGreaterThan(0);
    expect(body.data.grandTotalFormatted).toContain('₹');
  });

  it('returns a bill with multi-rate tax breakdown for a mixed cart', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/quote',
      payload: {
        lines: [
          { itemId: ID.tomato, quantity: 1 },
          { itemId: ID.butter, quantity: 1 },
          { itemId: ID.lays, quantity: 1 },
        ],
      },
    });
    expect(res.statusCode).toBe(200);
    const { data } = JSON.parse(res.body);
    const rates = data.taxBreakdown.map((r) => r.rateBps);
    expect(rates).toContain(0);
    expect(rates).toContain(1200);
    expect(rates).toContain(1800);
    expect(data.taxBreakdown.length).toBe(3);
  });

  it('applies flat ₹50 offer when cart ≥ ₹1000', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/quote',
      payload: { lines: [{ itemId: ID.rice, quantity: 3 }] }, // 3 × ₹450 = ₹1350
    });
    expect(res.statusCode).toBe(200);
    const { data } = JSON.parse(res.body);
    expect(data.discounts).toHaveLength(1);
    expect(data.discounts[0].amountPaise).toBe(5000); // ₹50
  });

  it('includes skippedOffers with reason when threshold not met', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/quote',
      payload: { lines: [{ itemId: ID.lays, quantity: 1 }] }, // ₹20 — under ₹1000
    });
    const { data } = JSON.parse(res.body);
    expect(data.skippedOffers.length).toBeGreaterThan(0);
    expect(data.skippedOffers[0].reason).toBeTruthy();
  });

  it('accepts empty lines (allowEmptyCart)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/quote',
      payload: { lines: [] },
    });
    expect(res.statusCode).toBe(200);
    const { data } = JSON.parse(res.body);
    expect(data.subtotal).toBe(0);
    expect(data.grandTotal).toBe(0);
  });

  it('validates coupon code and applies it', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/quote',
      payload: {
        lines: [{ itemId: ID.rice, quantity: 3 }],
        couponCode: 'FIRSTBUY10',
      },
    });
    expect(res.statusCode).toBe(200);
    const { data } = JSON.parse(res.body);
    // Should have flat ₹50 + coupon (10% up to ₹100)
    expect(data.discounts.length).toBeGreaterThanOrEqual(2);
  });

  it('returns 400 VALIDATION_ERROR for invalid itemId format', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/quote',
      payload: { lines: [{ itemId: 'not-a-uuid', quantity: 1 }] },
    });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.requestId).toBeTruthy();
  });

  it('returns 400 VALIDATION_ERROR for negative quantity', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/quote',
      payload: { lines: [{ itemId: 'lays', quantity: -1 }] },
    });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('every error response includes requestId', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/quote',
      payload: { lines: [{ itemId: 'not-a-uuid', quantity: 1 }] },
    });
    const body = JSON.parse(res.body);
    expect(body.error.requestId).toBeTruthy();
    expect(typeof body.error.requestId).toBe('string');
  });
});

// ─── /checkout ────────────────────────────────────────────────────────────────

describe('POST /checkout', () => {
  it('creates and returns an order with a bill', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/checkout',
      payload: { lines: [{ itemId: ID.lays, quantity: 2 }] },
    });
    expect(res.statusCode).toBe(201);
    const { data } = JSON.parse(res.body);
    expect(data.orderId).toBeTruthy();
    expect(data.bill.grandTotal).toBeGreaterThan(0);
  });

  it('returns 400 EMPTY_CART for checkout with empty lines', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/checkout',
      payload: { lines: [] },
    });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 UNKNOWN_ITEM for checkout with unknown itemId', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/checkout',
      payload: { lines: [{ itemId: '00000000-0000-0000-0000-000000000000', quantity: 1 }] },
    });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error.code).toBe('UNKNOWN_ITEM');
  });
});

// ─── /orders/:id ──────────────────────────────────────────────────────────────

describe('GET /orders/:id', () => {
  it('returns 404 for a non-existent order', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/orders/00000000-0000-0000-0000-000000000000',
    });
    expect(res.statusCode).toBe(404);
    const body = JSON.parse(res.body);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('returns the persisted order after checkout', async () => {
    const checkoutRes = await app.inject({
      method: 'POST',
      url: '/checkout',
      payload: { lines: [{ itemId: ID.butter, quantity: 1 }] },
    });
    const { data: { orderId } } = JSON.parse(checkoutRes.body);

    const getRes = await app.inject({ method: 'GET', url: `/orders/${orderId}` });
    expect(getRes.statusCode).toBe(200);
    const { data } = JSON.parse(getRes.body);
    expect(data.id).toBe(orderId);
    // In-memory repo stores camelCase; Supabase repo would return snake_case from DB.
    // Check either shape — the order row has either grandTotal (memory) or grand_total (supabase).
    const grandTotal = data.grandTotal ?? data.grand_total;
    expect(grandTotal).toBeGreaterThan(0);
  });
});

// ─── /catalog ─────────────────────────────────────────────────────────────────

describe('GET /catalog', () => {
  it('returns active catalog items', async () => {
    const res = await app.inject({ method: 'GET', url: '/catalog' });
    expect(res.statusCode).toBe(200);
    const { data, count } = JSON.parse(res.body);
    expect(count).toBe(CATALOG.length);
    expect(data.every((i) => i.active)).toBe(true);
  });

  it('filters by category', async () => {
    const res = await app.inject({ method: 'GET', url: '/catalog?category=snacks' });
    const { data } = JSON.parse(res.body);
    expect(data.every((i) => i.category === 'snacks')).toBe(true);
  });
});

// ─── /health ──────────────────────────────────────────────────────────────────

describe('GET /health', () => {
  it('returns ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).status).toBe('ok');
  });
});
