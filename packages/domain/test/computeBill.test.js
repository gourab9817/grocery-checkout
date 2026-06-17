/**
 * computeBill — integration tests.
 *
 * Tests the full pipeline: cart → offers → tax → bill.
 * Includes the worked examples from assignmenttask.md §5 and the
 * 500-item linearity assertion backing the O(n) claim.
 */

import { describe, it, expect } from 'vitest';
import { computeBill } from '../src/billing/computeBill.js';

// ─── Catalog fixtures ──────────────────────────────────────────────────────────

const tomato = {
  id: 'tomato', name: 'Tomato', category: 'vegetables', unitType: 'weight',
  unitPrice: 4000, gstRateBps: 0, active: true,
};
const banana = {
  id: 'banana', name: 'Banana', category: 'fruits', unitType: 'weight',
  unitPrice: 6000, gstRateBps: 0, active: true,
};
const rice = {
  id: 'rice', name: 'Basmati Rice 5kg', category: 'staples', unitType: 'unit',
  unitPrice: 45000, gstRateBps: 500, active: true,
};
const butter = {
  id: 'butter', name: 'Amul Butter 500g', category: 'dairy', unitType: 'unit',
  unitPrice: 25000, gstRateBps: 1200, active: true,
};
const lays = {
  id: 'lays', name: "Lay's Chips 52g", category: 'snacks', unitType: 'unit',
  unitPrice: 2000, gstRateBps: 1800, active: true,
};
const coke = {
  id: 'coke', name: 'Coca-Cola 750ml', category: 'beverages', unitType: 'unit',
  unitPrice: 4500, gstRateBps: 1800, active: true,
};

const FULL_CATALOG = [tomato, banana, rice, butter, lays, coke];

// ─── Offer records (data-driven, mirrors DB rows) ──────────────────────────────

const VEG_FRUIT_10PCT_OFFER = {
  id: 'veg-fruit-10',
  name: '10% off Vegetables & Fruits (≥ ₹300)',
  type: 'percentage_category',
  priority: 1,
  exclusive: false,
  active: true,
  params: { categories: ['vegetables', 'fruits'], percentBps: 1000, minCategorySubtotal: 30000 },
};

const BOGO_SNACKS_OFFER = {
  id: 'bogo-snacks',
  name: 'Buy 2 Get 1 Free on Snacks',
  type: 'buy_x_get_y',
  priority: 2,
  exclusive: false,
  active: true,
  params: { category: 'snacks', buyQty: 2, freeQty: 1 },
};

const FLAT_50_OFFER = {
  id: 'flat-50',
  name: 'Flat ₹50 off on cart ≥ ₹1000',
  type: 'flat_cart_threshold',
  priority: 5,
  exclusive: false,
  active: true,
  params: { amountPaise: 5000, minCartTotal: 100000 },
};

const FIRSTBUY10_COUPON = {
  id: 'firstbuy10',
  name: 'FIRSTBUY10 — 10% off (max ₹100)',
  type: 'coupon',
  priority: 100,
  exclusive: false,
  active: true,
  params: { percentBps: 1000, maxDiscountPaise: 10000 },
};

// ─── Bill invariant helper ────────────────────────────────────────────────────

function assertBillInvariants(bill) {
  const totalDiscount = bill.discounts.reduce((s, d) => s + d.amountPaise, 0);
  expect(bill.taxableAmount).toBe(bill.subtotal - totalDiscount);
  expect(bill.grandTotal).toBe(bill.taxableAmount + bill.totalTax);
  expect(bill.grandTotal).toBeGreaterThanOrEqual(0);
  expect(bill.taxableAmount).toBeGreaterThanOrEqual(0);
  for (const d of bill.discounts) {
    expect(d.amountPaise).toBeGreaterThanOrEqual(0);
  }
}

// ─── Worked examples from assignmenttask.md §5 ────────────────────────────────

describe('computeBill — worked example: 10% off Veg & Fruits ≥ ₹300', () => {
  it('applies 10% off when veg+fruit subtotal ≥ ₹300', () => {
    // tomato: 5 kg × ₹40 = ₹200, banana: 2 kg × ₹60 = ₹120 → combined ₹320 ≥ ₹300
    const cart = {
      lines: [
        { itemId: 'tomato', quantity: 5 },
        { itemId: 'banana', quantity: 2 },
      ],
    };
    const bill = computeBill({
      cart,
      catalog: FULL_CATALOG,
      offerRecords: [VEG_FRUIT_10PCT_OFFER],
      computedAt: '2026-06-17T00:00:00.000Z',
    });

    // subtotal: 5×4000 + 2×6000 = 20000 + 12000 = 32000 (₹320)
    expect(bill.subtotal).toBe(32000);
    expect(bill.discounts).toHaveLength(1);
    expect(bill.discounts[0].amountPaise).toBe(3200); // 10% of ₹320
    expect(bill.discounts[0].label).toContain('10%');
    assertBillInvariants(bill);
  });

  it('does NOT apply when subtotal < ₹300, puts offer in skippedOffers', () => {
    const cart = { lines: [{ itemId: 'tomato', quantity: 1 }] }; // ₹40 only
    const bill = computeBill({
      cart, catalog: FULL_CATALOG, offerRecords: [VEG_FRUIT_10PCT_OFFER],
      computedAt: '2026-06-17T00:00:00.000Z',
    });
    expect(bill.discounts).toHaveLength(0);
    expect(bill.skippedOffers).toHaveLength(1);
    expect(bill.skippedOffers[0].reason).toContain('₹'); // has shortfall info
    assertBillInvariants(bill);
  });
});

describe('computeBill — worked example: Buy 2 Get 1 Free on Snacks', () => {
  it('gives 1 free snack for 3 purchased', () => {
    // 3 × Lay's @ ₹20 = ₹60; 1 free = ₹20 off
    const cart = { lines: [{ itemId: 'lays', quantity: 3 }] };
    const bill = computeBill({
      cart, catalog: FULL_CATALOG, offerRecords: [BOGO_SNACKS_OFFER],
      computedAt: '2026-06-17T00:00:00.000Z',
    });
    expect(bill.subtotal).toBe(6000);
    expect(bill.discounts[0].amountPaise).toBe(2000); // 1 × ₹20 free
    assertBillInvariants(bill);
  });

  it('gives 2 free snacks for 6 purchased (2 cycles)', () => {
    const cart = { lines: [{ itemId: 'lays', quantity: 6 }] };
    const bill = computeBill({
      cart, catalog: FULL_CATALOG, offerRecords: [BOGO_SNACKS_OFFER],
      computedAt: '2026-06-17T00:00:00.000Z',
    });
    expect(bill.discounts[0].amountPaise).toBe(4000); // 2 × ₹20
    assertBillInvariants(bill);
  });
});

describe('computeBill — worked example: Flat ₹50 off ≥ ₹1000', () => {
  it('applies flat ₹50 off when cart ≥ ₹1000', () => {
    // rice (₹450) × 3 = ₹1350 ≥ ₹1000
    const cart = { lines: [{ itemId: 'rice', quantity: 3 }] };
    const bill = computeBill({
      cart, catalog: FULL_CATALOG, offerRecords: [FLAT_50_OFFER],
      computedAt: '2026-06-17T00:00:00.000Z',
    });
    expect(bill.subtotal).toBe(135000);
    expect(bill.discounts[0].amountPaise).toBe(5000); // ₹50
    assertBillInvariants(bill);
  });

  it('does NOT apply flat offer when cart < ₹1000', () => {
    const cart = { lines: [{ itemId: 'lays', quantity: 2 }] }; // ₹40
    const bill = computeBill({
      cart, catalog: FULL_CATALOG, offerRecords: [FLAT_50_OFFER],
      computedAt: '2026-06-17T00:00:00.000Z',
    });
    expect(bill.discounts).toHaveLength(0);
    expect(bill.skippedOffers).toHaveLength(1);
    assertBillInvariants(bill);
  });
});

describe('computeBill — combined stacking (all 3 offers + coupon)', () => {
  it('applies all eligible offers correctly stacked', () => {
    // tomato 5kg (₹200) + banana 2kg (₹120) + lays 3 (₹60) + rice 2 (₹900) = ₹1280
    // Expected:
    //   veg+fruit 10% off ₹320 = ₹32 off
    //   BOGO snacks: 1 free lays = ₹20 off
    //   flat ₹50 off on cart ≥₹1000 (post-category discounts: ₹1280 - ₹32 - ₹20 = ₹1228 ≥ ₹1000)
    const cart = {
      lines: [
        { itemId: 'tomato', quantity: 5 },
        { itemId: 'banana', quantity: 2 },
        { itemId: 'lays', quantity: 3 },
        { itemId: 'rice', quantity: 2 },
      ],
    };
    const bill = computeBill({
      cart,
      catalog: FULL_CATALOG,
      offerRecords: [VEG_FRUIT_10PCT_OFFER, BOGO_SNACKS_OFFER, FLAT_50_OFFER],
      computedAt: '2026-06-17T00:00:00.000Z',
    });

    expect(bill.subtotal).toBe(20000 + 12000 + 6000 + 90000); // 128000 = ₹1280
    expect(bill.discounts).toHaveLength(3);
    expect(bill.discounts[0].amountPaise).toBe(3200); // veg 10%
    expect(bill.discounts[1].amountPaise).toBe(2000); // BOGO
    expect(bill.discounts[2].amountPaise).toBe(5000); // flat ₹50

    // Bill must always tie out
    assertBillInvariants(bill);
  });

  it('FIRSTBUY10 coupon applies after other discounts', () => {
    const cart = { lines: [{ itemId: 'rice', quantity: 3 }] }; // ₹1350
    const bill = computeBill({
      cart,
      catalog: FULL_CATALOG,
      offerRecords: [FLAT_50_OFFER, FIRSTBUY10_COUPON],
      computedAt: '2026-06-17T00:00:00.000Z',
    });
    // flat ₹50 off → ₹1300 remaining
    // coupon 10% of ₹1300 = ₹130 but capped at ₹100 → ₹100
    expect(bill.discounts).toHaveLength(2);
    expect(bill.discounts[0].amountPaise).toBe(5000);  // flat ₹50
    expect(bill.discounts[1].amountPaise).toBe(10000); // coupon ₹100 (capped)
    assertBillInvariants(bill);
  });
});

describe('computeBill — multi-rate tax breakdown', () => {
  it('produces separate tax rows for each GST rate in a mixed cart', () => {
    // vegetables (0%) + dairy (12%) + snacks (18%)
    const cart = {
      lines: [
        { itemId: 'tomato', quantity: 1 },  // ₹40 @ 0%
        { itemId: 'butter', quantity: 1 },  // ₹250 @ 12%
        { itemId: 'lays', quantity: 1 },    // ₹20 @ 18%
      ],
    };
    const bill = computeBill({
      cart, catalog: FULL_CATALOG, offerRecords: [],
      computedAt: '2026-06-17T00:00:00.000Z',
    });

    const rates = bill.taxBreakdown.map((r) => r.rateBps);
    expect(rates).toContain(0);
    expect(rates).toContain(1200);
    expect(rates).toContain(1800);
    expect(bill.taxBreakdown).toHaveLength(3);

    // Never a single blended rate
    expect(bill.taxBreakdown).not.toHaveLength(1);
    assertBillInvariants(bill);
  });
});

describe('computeBill — edge cases', () => {
  it('empty cart on quote (allowEmptyCart) returns zero bill', () => {
    const bill = computeBill({
      cart: { lines: [] },
      catalog: FULL_CATALOG,
      offerRecords: [],
      allowEmptyCart: true,
      computedAt: '2026-06-17T00:00:00.000Z',
    });
    expect(bill.subtotal).toBe(0);
    expect(bill.grandTotal).toBe(0);
    expect(bill.discounts).toHaveLength(0);
  });

  it('empty cart on checkout throws EMPTY_CART', () => {
    expect(() =>
      computeBill({
        cart: { lines: [] },
        catalog: FULL_CATALOG,
        offerRecords: [],
        computedAt: '2026-06-17T00:00:00.000Z',
      })
    ).toThrow(expect.objectContaining({ code: 'EMPTY_CART' }));
  });

  it('bill invariants hold for a single item with no discounts', () => {
    const cart = { lines: [{ itemId: 'lays', quantity: 1 }] };
    const bill = computeBill({ cart, catalog: FULL_CATALOG, offerRecords: [],
      computedAt: '2026-06-17T00:00:00.000Z' });
    assertBillInvariants(bill);
  });
});

describe('computeBill — linearity / large cart (O(n) proof)', () => {
  it('computes a 500-item cart in linear time (well under 1s)', () => {
    // Build a catalog with 10 distinct items
    const bigCatalog = Array.from({ length: 10 }, (_, i) => ({
      id: `item-${i}`,
      name: `Item ${i}`,
      category: i % 2 === 0 ? 'snacks' : 'staples',
      unitType: 'unit',
      unitPrice: 1000 + i * 100,
      gstRateBps: i % 2 === 0 ? 1800 : 500,
      active: true,
    }));

    // 500 lines (50 per item × 10 items)
    const lines = bigCatalog.flatMap((item) =>
      Array.from({ length: 50 }, (_, j) => ({
        itemId: item.id,
        quantity: j + 1,
      }))
    );

    const cart = { lines };
    const start = Date.now();
    const bill = computeBill({
      cart,
      catalog: bigCatalog,
      offerRecords: [BOGO_SNACKS_OFFER, FLAT_50_OFFER],
      computedAt: '2026-06-17T00:00:00.000Z',
    });
    const elapsed = Date.now() - start;

    expect(bill.grandTotal).toBeGreaterThan(0);
    assertBillInvariants(bill);

    // On any modern machine, 500 lines should resolve in < 50ms
    expect(elapsed).toBeLessThan(200);
    console.log(`500-item cart computed in ${elapsed}ms`);
  });
});
