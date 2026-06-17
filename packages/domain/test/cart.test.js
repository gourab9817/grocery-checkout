import { describe, it, expect } from 'vitest';
import { resolveCartContext } from '../src/cart.js';
import { ERROR_CODES } from '../src/errors.js';

// ─── Fixtures ──────────────────────────────────────────────────────────────────

const tomato = {
  id: 'tomato',
  name: 'Tomato',
  category: 'vegetables',
  unitType: 'weight',
  unitPrice: 4000, // ₹40/kg
  gstRateBps: 0,
  active: true,
};

const lays = {
  id: 'lays',
  name: "Lay's Chips 52g",
  category: 'snacks',
  unitType: 'unit',
  unitPrice: 2000, // ₹20
  gstRateBps: 1800,
  active: true,
};

const butter = {
  id: 'butter',
  name: 'Amul Butter 500g',
  category: 'dairy',
  unitType: 'unit',
  unitPrice: 25000, // ₹250
  gstRateBps: 1200,
  active: true,
};

const inactiveItem = {
  id: 'inactive',
  name: 'Discontinued',
  category: 'snacks',
  unitType: 'unit',
  unitPrice: 100,
  gstRateBps: 1800,
  active: false,
};

const catalog = [tomato, lays, butter, inactiveItem];

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('resolveCartContext — basic resolution', () => {
  it('resolves a simple unit-item cart', () => {
    const cart = { lines: [{ itemId: 'lays', quantity: 2 }] };
    const ctx = resolveCartContext(cart, catalog);
    expect(ctx.lines).toHaveLength(1);
    expect(ctx.lines[0].lineSubtotal).toBe(4000); // ₹20 × 2
    expect(ctx.subtotal).toBe(4000);
  });

  it('resolves a weight-item cart', () => {
    const cart = { lines: [{ itemId: 'tomato', quantity: 0.5 }] };
    const ctx = resolveCartContext(cart, catalog);
    expect(ctx.lines[0].lineSubtotal).toBe(2000); // ₹40/kg × 0.5 kg = ₹20
  });

  it('computes category subtotals', () => {
    const cart = {
      lines: [
        { itemId: 'lays', quantity: 3 },
        { itemId: 'butter', quantity: 1 },
      ],
    };
    const ctx = resolveCartContext(cart, catalog);
    expect(ctx.categorySubtotals.get('snacks')).toBe(6000); // ₹20 × 3
    expect(ctx.categorySubtotals.get('dairy')).toBe(25000); // ₹250 × 1
  });

  it('computes correct subtotal across multiple categories', () => {
    const cart = {
      lines: [
        { itemId: 'tomato', quantity: 1 },
        { itemId: 'lays', quantity: 2 },
        { itemId: 'butter', quantity: 1 },
      ],
    };
    const ctx = resolveCartContext(cart, catalog);
    expect(ctx.subtotal).toBe(4000 + 4000 + 25000); // 33000
  });
});

describe('resolveCartContext — duplicate merging', () => {
  it('merges duplicate itemIds by summing quantities', () => {
    const cart = {
      lines: [
        { itemId: 'lays', quantity: 2 },
        { itemId: 'lays', quantity: 3 },
      ],
    };
    const ctx = resolveCartContext(cart, catalog);
    expect(ctx.lines).toHaveLength(1);
    expect(ctx.lines[0].quantity).toBe(5);
    expect(ctx.lines[0].lineSubtotal).toBe(10000); // ₹20 × 5
  });
});

describe('resolveCartContext — empty cart', () => {
  it('throws EMPTY_CART on checkout (default)', () => {
    const cart = { lines: [] };
    expect(() => resolveCartContext(cart, catalog)).toThrow(
      expect.objectContaining({ code: ERROR_CODES.EMPTY_CART })
    );
  });

  it('allows empty cart when allowEmptyCart is set (quote path)', () => {
    const cart = { lines: [] };
    const ctx = resolveCartContext(cart, catalog, { allowEmptyCart: true });
    expect(ctx.lines).toHaveLength(0);
    expect(ctx.subtotal).toBe(0);
  });
});

describe('resolveCartContext — unknown / inactive items', () => {
  it('throws UNKNOWN_ITEM for an itemId not in catalog', () => {
    const cart = { lines: [{ itemId: 'nonexistent', quantity: 1 }] };
    expect(() => resolveCartContext(cart, catalog)).toThrow(
      expect.objectContaining({ code: ERROR_CODES.UNKNOWN_ITEM })
    );
  });

  it('throws UNKNOWN_ITEM for an inactive item', () => {
    const cart = { lines: [{ itemId: 'inactive', quantity: 1 }] };
    expect(() => resolveCartContext(cart, catalog)).toThrow(
      expect.objectContaining({ code: ERROR_CODES.UNKNOWN_ITEM })
    );
  });
});

describe('resolveCartContext — quantity validation', () => {
  it('throws INVALID_QUANTITY for non-integer on unit item', () => {
    const cart = { lines: [{ itemId: 'lays', quantity: 1.5 }] };
    expect(() => resolveCartContext(cart, catalog)).toThrow(
      expect.objectContaining({ code: ERROR_CODES.INVALID_QUANTITY })
    );
  });

  it('throws INVALID_QUANTITY for zero quantity', () => {
    const cart = { lines: [{ itemId: 'lays', quantity: 0 }] };
    expect(() => resolveCartContext(cart, catalog)).toThrow(
      expect.objectContaining({ code: ERROR_CODES.INVALID_QUANTITY })
    );
  });

  it('throws INVALID_QUANTITY for negative quantity', () => {
    const cart = { lines: [{ itemId: 'lays', quantity: -1 }] };
    expect(() => resolveCartContext(cart, catalog)).toThrow(
      expect.objectContaining({ code: ERROR_CODES.INVALID_QUANTITY })
    );
  });

  it('throws INVALID_QUANTITY for weight item with >3dp', () => {
    const cart = { lines: [{ itemId: 'tomato', quantity: 0.1234 }] };
    expect(() => resolveCartContext(cart, catalog)).toThrow(
      expect.objectContaining({ code: ERROR_CODES.INVALID_QUANTITY })
    );
  });

  it('accepts 3dp weight quantity', () => {
    const cart = { lines: [{ itemId: 'tomato', quantity: 0.333 }] };
    const ctx = resolveCartContext(cart, catalog);
    expect(ctx.lines[0].quantity).toBe(0.333);
  });
});
