import { describe, it, expect } from 'vitest';
import { computeTax } from '../src/tax/engine.js';

function makeLine(category, unitPrice, quantity, gstRateBps) {
  return {
    item: { id: category, name: category, category, unitType: 'unit', unitPrice, gstRateBps, active: true },
    quantity,
    lineSubtotal: unitPrice * quantity,
  };
}

describe('computeTax — single rate', () => {
  it('computes 18% GST on a single line with no discount', () => {
    const lines = [makeLine('snacks', 2000, 1, 1800)]; // ₹20
    const { taxBreakdown, taxableAmount, totalTax } = computeTax(lines, 0);
    expect(taxBreakdown).toHaveLength(1);
    expect(taxBreakdown[0].rateBps).toBe(1800);
    expect(taxBreakdown[0].taxableBase).toBe(2000);
    expect(taxBreakdown[0].taxAmount).toBe(360); // 18% of ₹20 = ₹3.60
    expect(taxableAmount).toBe(2000);
    expect(totalTax).toBe(360);
  });

  it('computes 0% GST on fresh produce', () => {
    const lines = [makeLine('vegetables', 4000, 1, 0)]; // ₹40
    const { taxBreakdown, totalTax } = computeTax(lines, 0);
    expect(taxBreakdown[0].rateBps).toBe(0);
    expect(taxBreakdown[0].taxAmount).toBe(0);
    expect(totalTax).toBe(0);
  });

  it('computes 12% GST on dairy', () => {
    const lines = [makeLine('dairy', 25000, 1, 1200)]; // ₹250
    const { taxBreakdown } = computeTax(lines, 0);
    expect(taxBreakdown[0].taxAmount).toBe(3000); // 12% of ₹250 = ₹30
  });
});

describe('computeTax — multi-rate breakdown (the key differentiator)', () => {
  it('produces separate rows for each GST rate on a mixed cart', () => {
    const lines = [
      makeLine('vegetables', 4000, 1, 0),    // ₹40 @ 0%
      makeLine('dairy', 25000, 1, 1200),     // ₹250 @ 12%
      makeLine('snacks', 2000, 2, 1800),     // ₹40 @ 18%
    ];
    const { taxBreakdown, taxableAmount, totalTax } = computeTax(lines, 0);

    expect(taxBreakdown).toHaveLength(3);

    const zeroRate = taxBreakdown.find((r) => r.rateBps === 0);
    const twelveRate = taxBreakdown.find((r) => r.rateBps === 1200);
    const eighteenRate = taxBreakdown.find((r) => r.rateBps === 1800);

    expect(zeroRate.taxAmount).toBe(0);
    expect(twelveRate.taxAmount).toBe(3000);   // 12% of ₹250 = ₹30
    expect(eighteenRate.taxAmount).toBe(720);  // 18% of ₹40 = ₹7.20

    expect(taxableAmount).toBe(33000); // ₹40 + ₹250 + ₹40 = ₹330
    expect(totalTax).toBe(3720);       // ₹0 + ₹30 + ₹7.20
  });

  it('returns rows sorted by rate ascending', () => {
    const lines = [
      makeLine('snacks', 2000, 1, 1800),
      makeLine('dairy', 10000, 1, 1200),
      makeLine('vegetables', 5000, 1, 0),
    ];
    const { taxBreakdown } = computeTax(lines, 0);
    const rates = taxBreakdown.map((r) => r.rateBps);
    expect(rates).toEqual([0, 1200, 1800]);
  });
});

describe('computeTax — with discounts', () => {
  it('applies discount to taxable base before computing tax', () => {
    // ₹100 snacks @ 18%, ₹50 discount → taxable = ₹50 → tax = ₹9
    const lines = [makeLine('snacks', 10000, 1, 1800)];
    const { taxableAmount, totalTax } = computeTax(lines, 5000);
    expect(taxableAmount).toBe(5000);
    expect(totalTax).toBe(900); // 18% of ₹50 = ₹9
  });

  it('pro-rata allocates discount across lines with different rates', () => {
    // ₹200 snacks@18% + ₹200 dairy@12% = ₹400 subtotal
    // ₹100 discount → pro-rata: ₹50 to each
    // tax = 18% of ₹150 + 12% of ₹150 = 27 + 18 = 45
    const lines = [
      makeLine('snacks', 20000, 1, 1800),
      makeLine('dairy', 20000, 1, 1200),
    ];
    const { taxBreakdown, taxableAmount } = computeTax(lines, 10000);
    expect(taxableAmount).toBe(30000); // ₹400 - ₹100
    const snackTax = taxBreakdown.find((r) => r.rateBps === 1800);
    const dairyTax = taxBreakdown.find((r) => r.rateBps === 1200);
    expect(snackTax.taxableBase).toBe(15000); // ₹150
    expect(dairyTax.taxableBase).toBe(15000);
    expect(snackTax.taxAmount).toBe(2700);    // 18% of ₹150 = ₹27
    expect(dairyTax.taxAmount).toBe(1800);    // 12% of ₹150 = ₹18
  });

  it('taxableAmount = 0 when discount equals subtotal', () => {
    const lines = [makeLine('snacks', 5000, 1, 1800)];
    const { taxableAmount, totalTax } = computeTax(lines, 5000);
    expect(taxableAmount).toBe(0);
    expect(totalTax).toBe(0);
  });

  it('tax never goes negative even when discount exceeds subtotal', () => {
    const lines = [makeLine('snacks', 5000, 1, 1800)];
    const { taxableAmount, totalTax } = computeTax(lines, 9999);
    expect(taxableAmount).toBeGreaterThanOrEqual(0);
    expect(totalTax).toBeGreaterThanOrEqual(0);
  });
});

describe('computeTax — empty cart / edge cases', () => {
  it('handles empty lines array', () => {
    const { taxBreakdown, taxableAmount, totalTax } = computeTax([], 0);
    expect(taxBreakdown).toHaveLength(0);
    expect(taxableAmount).toBe(0);
    expect(totalTax).toBe(0);
  });
});
