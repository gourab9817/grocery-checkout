import { describe, it, expect, afterEach } from 'vitest';
import { PercentageCategoryOffer } from '../src/offers/PercentageCategoryOffer.js';
import { FlatCartThresholdOffer } from '../src/offers/FlatCartThresholdOffer.js';
import { BuyXGetYFreeOffer } from '../src/offers/BuyXGetYFreeOffer.js';
import { CouponOffer } from '../src/offers/CouponOffer.js';
import { OfferRule } from '../src/offers/OfferRule.js';
import {
  createRule,
  registerOfferType,
  unregisterOfferType,
  OFFER_REGISTRY,
} from '../src/offers/registry.js';
import { applyOffers } from '../src/offers/engine.js';
import { ERROR_CODES } from '../src/errors.js';

// ─── Fixtures ──────────────────────────────────────────────────────────────────

function makeItem(overrides) {
  return {
    id: 'item1',
    name: 'Test Item',
    category: 'snacks',
    unitType: 'unit',
    unitPrice: 2000, // ₹20
    gstRateBps: 1800,
    active: true,
    ...overrides,
  };
}

function makeCtx(overrides) {
  const lines = overrides.lines ?? [];
  const categorySubtotals = new Map();
  for (const l of lines) {
    const cat = l.item.category;
    categorySubtotals.set(cat, (categorySubtotals.get(cat) ?? 0) + l.lineSubtotal);
  }
  const subtotal = lines.reduce((s, l) => s + l.lineSubtotal, 0);
  return { lines, categorySubtotals, subtotal, ...overrides };
}

// ─── PercentageCategoryOffer ──────────────────────────────────────────────────

describe('PercentageCategoryOffer', () => {
  const record = {
    id: 'veg-10pct',
    name: '10% off Vegetables',
    type: 'percentage_category',
    priority: 1,
    exclusive: false,
    active: true,
    params: { category: 'vegetables', percentBps: 1000, minCategorySubtotal: 30000 },
  };
  const offer = new PercentageCategoryOffer(record);

  it('is eligible when category subtotal meets threshold', () => {
    const ctx = makeCtx({
      lines: [{ item: makeItem({ category: 'vegetables' }), quantity: 2, lineSubtotal: 40000 }],
    });
    expect(offer.isEligible(ctx).eligible).toBe(true);
  });

  it('is eligible at exactly the threshold (boundary)', () => {
    const ctx = makeCtx({
      lines: [{ item: makeItem({ category: 'vegetables' }), quantity: 1, lineSubtotal: 30000 }],
    });
    expect(offer.isEligible(ctx).eligible).toBe(true);
  });

  it('is NOT eligible when below threshold', () => {
    const ctx = makeCtx({
      lines: [{ item: makeItem({ category: 'vegetables' }), quantity: 1, lineSubtotal: 20000 }],
    });
    const result = offer.isEligible(ctx);
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain('₹100.00'); // ₹300 - ₹200 = ₹100 shortfall
  });

  it('computes 10% discount on category subtotal', () => {
    const ctx = makeCtx({
      lines: [{ item: makeItem({ category: 'vegetables' }), quantity: 1, lineSubtotal: 30000 }],
    });
    const [discount] = offer.apply(ctx);
    expect(discount.amountPaise).toBe(3000); // 10% of ₹300
    expect(discount.offerId).toBe('veg-10pct');
  });

  it('targets multiple categories via params.categories array', () => {
    const multi = new PercentageCategoryOffer({
      ...record,
      id: 'veg-fruit-10',
      params: {
        categories: ['vegetables', 'fruits'],
        percentBps: 1000,
        minCategorySubtotal: 30000,
      },
    });
    const ctx = makeCtx({
      lines: [
        { item: makeItem({ category: 'vegetables' }), quantity: 1, lineSubtotal: 15000 },
        { item: makeItem({ id: 'banana', category: 'fruits' }), quantity: 1, lineSubtotal: 15000 },
      ],
    });
    expect(multi.isEligible(ctx).eligible).toBe(true);
    const [d] = multi.apply(ctx);
    expect(d.amountPaise).toBe(3000); // 10% of ₹300 combined
  });
});

// ─── FlatCartThresholdOffer ───────────────────────────────────────────────────

describe('FlatCartThresholdOffer', () => {
  const record = {
    id: 'flat-50',
    name: 'Flat ₹50 off on ₹1000+',
    type: 'flat_cart_threshold',
    priority: 5,
    exclusive: false,
    active: true,
    params: { amountPaise: 5000, minCartTotal: 100000 },
  };
  const offer = new FlatCartThresholdOffer(record);

  it('is eligible when cart total meets threshold', () => {
    const ctx = makeCtx({ lines: [], subtotal: 100000, currentCartTotal: 100000 });
    expect(offer.isEligible(ctx).eligible).toBe(true);
  });

  it('is NOT eligible below threshold', () => {
    const ctx = makeCtx({ lines: [], subtotal: 90000, currentCartTotal: 90000 });
    const result = offer.isEligible(ctx);
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain('₹100.00'); // ₹1000 - ₹900 = ₹100
  });

  it('applies flat ₹50 discount', () => {
    const ctx = makeCtx({ lines: [], subtotal: 150000, currentCartTotal: 150000 });
    const [d] = offer.apply(ctx);
    expect(d.amountPaise).toBe(5000);
    expect(d.scope).toBe('cart');
  });

  it('caps discount at current cart total (cannot exceed cart value)', () => {
    const tiny = new FlatCartThresholdOffer({
      ...record,
      params: { amountPaise: 100000, minCartTotal: 1 },
    });
    const ctx = makeCtx({ lines: [], subtotal: 5000, currentCartTotal: 5000 });
    const [d] = tiny.apply(ctx);
    expect(d.amountPaise).toBe(5000); // capped at cart total
  });
});

// ─── BuyXGetYFreeOffer ────────────────────────────────────────────────────────

describe('BuyXGetYFreeOffer', () => {
  const record = {
    id: 'bogo-snacks',
    name: 'Buy 2 Get 1 Free on Snacks',
    type: 'buy_x_get_y',
    priority: 2,
    exclusive: false,
    active: true,
    params: { category: 'snacks', buyQty: 2, freeQty: 1 },
  };
  const offer = new BuyXGetYFreeOffer(record);

  const lays = makeItem({ id: 'lays', unitPrice: 2000 });
  const chips = makeItem({ id: 'chips', unitPrice: 1500 });

  it('is eligible with 3 snack units (buy 2 get 1)', () => {
    const ctx = makeCtx({
      lines: [{ item: lays, quantity: 3, lineSubtotal: 6000 }],
    });
    expect(offer.isEligible(ctx).eligible).toBe(true);
  });

  it('is NOT eligible with only 2 units (need 3 for buy2get1)', () => {
    const ctx = makeCtx({
      lines: [{ item: lays, quantity: 2, lineSubtotal: 4000 }],
    });
    const result = offer.isEligible(ctx);
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain('1 more'); // need 1 more
  });

  it('gives 1 free unit for 3 items', () => {
    const ctx = makeCtx({
      lines: [{ item: lays, quantity: 3, lineSubtotal: 6000 }],
    });
    const [d] = offer.apply(ctx);
    expect(d.amountPaise).toBe(2000); // 1 × ₹20
  });

  it('gives 2 free units for 6 items (2 cycles)', () => {
    const ctx = makeCtx({
      lines: [{ item: lays, quantity: 6, lineSubtotal: 12000 }],
    });
    const [d] = offer.apply(ctx);
    expect(d.amountPaise).toBe(4000); // 2 × ₹20
  });

  it('gives cheapest items free in a mixed-price scenario', () => {
    // 2 lays (₹20 each) + 1 chips (₹15) = 3 items, 1 free = cheapest (chips ₹15)
    const ctx = makeCtx({
      lines: [
        { item: lays, quantity: 2, lineSubtotal: 4000 },
        { item: chips, quantity: 1, lineSubtotal: 1500 },
      ],
    });
    const [d] = offer.apply(ctx);
    expect(d.amountPaise).toBe(1500); // chips (₹15) is cheapest
  });

  it('excludes weight-type items from BOGO', () => {
    const weightSnack = makeItem({
      id: 'bulk-nuts',
      category: 'snacks',
      unitType: 'weight',
      unitPrice: 50000,
    });
    const ctx = makeCtx({
      lines: [{ item: weightSnack, quantity: 3, lineSubtotal: 150000 }],
    });
    // weight items are excluded — so 0 qualifying units
    const result = offer.isEligible(ctx);
    expect(result.eligible).toBe(false);
  });
});

// ─── CouponOffer ──────────────────────────────────────────────────────────────

describe('CouponOffer', () => {
  it('applies percentage coupon with cap', () => {
    const offer = new CouponOffer({
      id: 'firstbuy10',
      name: 'FIRSTBUY10 — 10% off up to ₹100',
      type: 'coupon',
      priority: 100,
      exclusive: false,
      active: true,
      params: { percentBps: 1000, maxDiscountPaise: 10000 },
    });
    // Cart total ₹200 → 10% = ₹20 (under cap)
    const ctx = makeCtx({ lines: [], subtotal: 20000, currentCartTotal: 20000 });
    const [d] = offer.apply(ctx);
    expect(d.amountPaise).toBe(2000);

    // Cart total ₹2000 → 10% = ₹200 → capped at ₹100
    const ctx2 = makeCtx({ lines: [], subtotal: 200000, currentCartTotal: 200000 });
    const [d2] = offer.apply(ctx2);
    expect(d2.amountPaise).toBe(10000); // ₹100 cap
  });

  it('applies flat coupon', () => {
    const offer = new CouponOffer({
      id: 'flat200',
      name: 'FLAT200 — ₹200 off',
      type: 'coupon',
      priority: 100,
      exclusive: false,
      active: true,
      params: { amountPaise: 20000 },
    });
    const ctx = makeCtx({ lines: [], subtotal: 50000, currentCartTotal: 50000 });
    const [d] = offer.apply(ctx);
    expect(d.amountPaise).toBe(20000);
  });
});

// ─── Registry (OCP seam proof) ───────────────────────────────────────────────

describe('offer registry — OCP seam', () => {
  afterEach(() => {
    unregisterOfferType('test_custom_type');
  });

  it('creates rules from registered types', () => {
    const rule = createRule({
      id: 'r1',
      name: 'Test',
      type: 'flat_cart_threshold',
      priority: 1,
      exclusive: false,
      active: true,
      params: { amountPaise: 5000, minCartTotal: 10000 },
    });
    expect(rule).toBeInstanceOf(FlatCartThresholdOffer);
  });

  it('throws UNKNOWN_OFFER_TYPE for unregistered type', () => {
    expect(() => createRule({ type: 'not_real', params: {} })).toThrow(
      expect.objectContaining({ code: ERROR_CODES.UNKNOWN_OFFER_TYPE })
    );
  });

  it('OCP: a new offer type can be registered without changing the engine', () => {
    // This test proves the seam: a new 4th offer type, registered at runtime,
    // is picked up by createRule() and applyOffers() with zero engine changes.
    class FixedFreeItemOffer extends OfferRule {
      isEligible(_ctx) {
        return { eligible: true, reason: '' };
      }
      apply(_ctx) {
        return [this._discount(999, 'cart')];
      }
    }

    registerOfferType('test_custom_type', FixedFreeItemOffer);
    expect(OFFER_REGISTRY['test_custom_type']).toBe(FixedFreeItemOffer);

    const rule = createRule({
      id: 'custom1',
      name: 'Custom Offer',
      type: 'test_custom_type',
      priority: 1,
      exclusive: false,
      active: true,
      params: {},
    });
    expect(rule).toBeInstanceOf(FixedFreeItemOffer);

    // Engine picks it up unmodified
    const ctx = makeCtx({ lines: [], subtotal: 10000 });
    const { discounts } = applyOffers(ctx, [rule]);
    expect(discounts).toHaveLength(1);
    expect(discounts[0].amountPaise).toBe(999);
  });
});

// ─── Engine: stacking, precedence, floor-at-zero ─────────────────────────────

describe('offer engine — stacking and precedence', () => {
  const snack = makeItem({ id: 'chips', category: 'snacks', unitPrice: 5000 });

  function makeFullCtx(subtotal) {
    return {
      lines: [{ item: snack, quantity: 4, lineSubtotal: subtotal }],
      categorySubtotals: new Map([['snacks', subtotal]]),
      subtotal,
    };
  }

  it('applies multiple non-exclusive offers additively', () => {
    const rules = [
      new PercentageCategoryOffer({
        id: 'cat-10',
        name: '10% off Snacks',
        type: 'percentage_category',
        priority: 1,
        exclusive: false,
        active: true,
        params: { category: 'snacks', percentBps: 1000, minCategorySubtotal: 0 },
      }),
      new FlatCartThresholdOffer({
        id: 'flat-50',
        name: '₹50 off',
        type: 'flat_cart_threshold',
        priority: 5,
        exclusive: false,
        active: true,
        params: { amountPaise: 5000, minCartTotal: 0 },
      }),
    ];
    const ctx = makeFullCtx(20000); // ₹200
    const { discounts } = applyOffers(ctx, rules);
    expect(discounts).toHaveLength(2);
    // 10% of ₹200 = ₹20, then flat ₹50
    expect(discounts[0].amountPaise).toBe(2000);
    expect(discounts[1].amountPaise).toBe(5000);
  });

  it('applies offers in priority order (lower priority first)', () => {
    const rules = [
      new FlatCartThresholdOffer({
        id: 'flat-high-priority',
        name: 'High Priority Flat',
        type: 'flat_cart_threshold',
        priority: 10,
        exclusive: false,
        active: true,
        params: { amountPaise: 5000, minCartTotal: 0 },
      }),
      new FlatCartThresholdOffer({
        id: 'flat-low-priority',
        name: 'Low Priority Flat',
        type: 'flat_cart_threshold',
        priority: 1,
        exclusive: false,
        active: true,
        params: { amountPaise: 3000, minCartTotal: 0 },
      }),
    ];
    const ctx = makeFullCtx(20000);
    const { discounts } = applyOffers(ctx, rules);
    // Lower priority number = applied first
    expect(discounts[0].offerId).toBe('flat-low-priority');
    expect(discounts[1].offerId).toBe('flat-high-priority');
  });

  it('exclusive: only highest-priority exclusive offer wins', () => {
    const catRules = [
      new PercentageCategoryOffer({
        id: 'excl-a',
        name: 'Exclusive Cat A',
        type: 'percentage_category',
        priority: 1,
        exclusive: true,
        active: true,
        params: { category: 'snacks', percentBps: 1000, minCategorySubtotal: 0 },
      }),
      new PercentageCategoryOffer({
        id: 'excl-b',
        name: 'Exclusive Cat B',
        type: 'percentage_category',
        priority: 5,
        exclusive: true,
        active: true,
        params: { category: 'snacks', percentBps: 2000, minCategorySubtotal: 0 },
      }),
    ];
    const ctx = makeFullCtx(20000);
    const { discounts, skippedOffers } = applyOffers(ctx, catRules);
    expect(discounts).toHaveLength(1);
    expect(discounts[0].offerId).toBe('excl-a'); // lower priority wins
    expect(skippedOffers.some((s) => s.offerId === 'excl-b')).toBe(true);
  });

  it('threshold not met → skippedOffers with reason', () => {
    const rule = new FlatCartThresholdOffer({
      id: 'flat-1000',
      name: '₹50 off on ₹1000+',
      type: 'flat_cart_threshold',
      priority: 5,
      exclusive: false,
      active: true,
      params: { amountPaise: 5000, minCartTotal: 100000 },
    });
    const ctx = makeFullCtx(50000); // ₹500 — under threshold
    const { discounts, skippedOffers } = applyOffers(ctx, [rule]);
    expect(discounts).toHaveLength(0);
    expect(skippedOffers).toHaveLength(1);
    expect(skippedOffers[0].reason).toContain('₹500.00'); // ₹1000 - ₹500
  });

  it('inactive rules are skipped entirely', () => {
    const rule = new FlatCartThresholdOffer({
      id: 'inactive-rule',
      name: 'Inactive Offer',
      type: 'flat_cart_threshold',
      priority: 1,
      exclusive: false,
      active: false, // inactive
      params: { amountPaise: 5000, minCartTotal: 0 },
    });
    const ctx = makeFullCtx(20000);
    const { discounts } = applyOffers(ctx, [rule]);
    expect(discounts).toHaveLength(0);
  });

  it('discount floored at zero — cannot make cart negative', () => {
    // A flat discount larger than the cart
    const rule = new FlatCartThresholdOffer({
      id: 'huge-discount',
      name: 'Huge Discount',
      type: 'flat_cart_threshold',
      priority: 1,
      exclusive: false,
      active: true,
      params: { amountPaise: 999999, minCartTotal: 0 },
    });
    const ctx = makeFullCtx(5000); // ₹50 cart
    const { discounts } = applyOffers(ctx, [rule]);
    // Discount is capped at cart total by FlatCartThresholdOffer.apply → min(discount, cartTotal)
    expect(discounts[0].amountPaise).toBe(5000);
    expect(discounts[0].amountPaise).toBeGreaterThanOrEqual(0);
  });

  it('coupon applies after all other discounts', () => {
    const coupon = new CouponOffer({
      id: 'coupon1',
      name: 'SAVE10',
      type: 'coupon',
      priority: 100,
      exclusive: false,
      active: true,
      params: { percentBps: 1000 }, // 10% of REMAINING total after other discounts
    });
    const flat = new FlatCartThresholdOffer({
      id: 'flat1',
      name: '₹20 off',
      type: 'flat_cart_threshold',
      priority: 5,
      exclusive: false,
      active: true,
      params: { amountPaise: 2000, minCartTotal: 0 },
    });
    const ctx = makeFullCtx(20000); // ₹200
    const { discounts } = applyOffers(ctx, [flat, coupon]);
    // flat applied first: ₹200 - ₹20 = ₹180 running total
    // coupon: 10% of ₹180 = ₹18
    expect(discounts[0].offerId).toBe('flat1');
    expect(discounts[1].offerId).toBe('coupon1');
    expect(discounts[1].amountPaise).toBe(1800); // 10% of ₹180
  });

  it('empty rules list returns empty results', () => {
    const ctx = makeFullCtx(20000);
    const { discounts, skippedOffers } = applyOffers(ctx, []);
    expect(discounts).toHaveLength(0);
    expect(skippedOffers).toHaveLength(0);
  });
});
