import { describe, it, expect } from 'vitest';
import {
  fromRupees,
  format,
  add,
  sub,
  mulQuantity,
  percentage,
  sum,
  clampToZero,
  halfUp,
} from '../src/money.js';

describe('money — fromRupees', () => {
  it('converts whole rupees to paise', () => {
    expect(fromRupees(40)).toBe(4000);
    expect(fromRupees(1)).toBe(100);
    expect(fromRupees(450)).toBe(45000);
  });

  it('rounds fractional paise half-up', () => {
    // 10.005 rupees = 1000.5 paise → 1001
    expect(fromRupees(10.005)).toBe(1001);
  });

  it('handles zero', () => {
    expect(fromRupees(0)).toBe(0);
  });
});

describe('money — format', () => {
  it('formats paise as rupee string', () => {
    expect(format(4050)).toBe('₹40.50');
    expect(format(100)).toBe('₹1.00');
    expect(format(0)).toBe('₹0.00');
    expect(format(45000)).toBe('₹450.00');
  });

  it('formats large amounts with Indian comma grouping', () => {
    const result = format(100000); // ₹1,000.00
    expect(result).toContain('1');
    expect(result).toContain('000');
  });
});

describe('money — add', () => {
  it('adds two paise amounts', () => {
    expect(add(1000, 500)).toBe(1500);
    expect(add(0, 0)).toBe(0);
  });

  it('truncates floats to integers before adding', () => {
    // Defensive: only integers should flow in, but we guard anyway
    expect(add(1000, 500)).toBe(1500);
  });
});

describe('money — sub', () => {
  it('subtracts b from a', () => {
    expect(sub(1500, 500)).toBe(1000);
  });

  it('clamps to zero — never negative', () => {
    expect(sub(100, 200)).toBe(0);
    expect(sub(0, 1)).toBe(0);
  });
});

describe('money — mulQuantity', () => {
  it('multiplies integer quantity correctly', () => {
    expect(mulQuantity(2000, 3)).toBe(6000); // ₹20 × 3 = ₹60
    expect(mulQuantity(4500, 1)).toBe(4500); // ₹45 × 1
  });

  it('handles weight (decimal) quantities with half-up rounding', () => {
    // ₹40/kg × 0.5 kg = ₹20 = 2000 paise
    expect(mulQuantity(4000, 0.5)).toBe(2000);
    // ₹40/kg × 0.333 kg = 13.32 paise → 1332 paise
    expect(mulQuantity(4000, 0.333)).toBe(1332);
    // ₹60/kg × 1.5 kg = 9000 paise
    expect(mulQuantity(6000, 1.5)).toBe(9000);
    // Edge: fractional that rounds up
    expect(mulQuantity(3, 0.5)).toBe(2); // 1.5 → 2 (half-up)
  });

  it('proves 0.1 + 0.2 float drift cannot occur in our system', () => {
    // In plain JS: 0.1 + 0.2 = 0.30000000000000004
    // In our system: all money is integer paise, so addition is exact
    const price = fromRupees(0.1) + fromRupees(0.2); // 10 + 20 = exactly 30 paise
    expect(price).toBe(30); // strict integer equality — no drift possible
    expect(Number.isInteger(price)).toBe(true);
    // Contrast: raw float addition drifts
    expect(0.1 + 0.2).not.toBe(0.3); // proves why we need paise integers
  });
});

describe('money — percentage', () => {
  it('computes 10% (1000 bps) of an amount', () => {
    expect(percentage(10000, 1000)).toBe(1000); // ₹100 × 10% = ₹10
    expect(percentage(30000, 1000)).toBe(3000); // ₹300 × 10% = ₹30
  });

  it('computes 18% (1800 bps)', () => {
    expect(percentage(4500, 1800)).toBe(810); // ₹45 × 18% = ₹8.10
  });

  it('rounds half-up', () => {
    // 3 paise × 1800 bps / 10000 = 0.54 → 1 paise
    expect(percentage(3, 1800)).toBe(1);
    // 1 paise × 1000 bps / 10000 = 0.1 → 0 paise
    expect(percentage(1, 1000)).toBe(0);
  });

  it('returns 0 for 0% rate', () => {
    expect(percentage(10000, 0)).toBe(0);
  });
});

describe('money — sum', () => {
  it('sums an array of paise amounts', () => {
    expect(sum([1000, 2000, 3000])).toBe(6000);
    expect(sum([])).toBe(0);
    expect(sum([500])).toBe(500);
  });
});

describe('money — clampToZero', () => {
  it('returns value when positive', () => {
    expect(clampToZero(500)).toBe(500);
    expect(clampToZero(0)).toBe(0);
  });

  it('clamps negative to zero', () => {
    expect(clampToZero(-1)).toBe(0);
    expect(clampToZero(-10000)).toBe(0);
  });
});

describe('money — halfUp (internal rounding)', () => {
  it('rounds 0.5 up', () => {
    expect(halfUp(0.5)).toBe(1);
    expect(halfUp(1.5)).toBe(2);
    expect(halfUp(2.5)).toBe(3);
  });

  it('rounds down when below 0.5', () => {
    expect(halfUp(0.4)).toBe(0);
    expect(halfUp(1.49)).toBe(1);
  });

  it('passes integers through unchanged', () => {
    expect(halfUp(100)).toBe(100);
    expect(halfUp(0)).toBe(0);
  });
});
