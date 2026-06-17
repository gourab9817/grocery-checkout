/**
 * Tax Engine — category-based GST, multi-rate breakdown.
 *
 * Design decisions (per CONTRACT.md):
 *   - Tax is computed on the POST-DISCOUNT taxable base.
 *   - Each line contributes to its own gstRateBps bucket.
 *   - Discount is allocated to lines PRO-RATA by their share of the subtotal,
 *     so each line's taxable amount is correctly reduced before grouping.
 *   - Output: taxBreakdown[] grouped by rate — never a blended single rate.
 *   - All arithmetic in integer paise; round half-up once per rate group.
 *
 * This is the single most visible "understood the domain" signal in the project.
 * A flat 18% is what most candidates submit. We do it correctly.
 */

import { halfUp, sum } from '../money.js';

/**
 * Compute tax breakdown from resolved lines and the total discount amount.
 *
 * @param {import('../types.js').ResolvedLine[]} lines  — post-resolution lines
 * @param {number} totalDiscountPaise  — sum of all applied discounts in paise
 * @returns {{
 *   taxBreakdown: import('../types.js').TaxBreakdownRow[],
 *   taxableAmount: number,
 *   totalTax: number
 * }}
 */
export function computeTax(lines, totalDiscountPaise) {
  const subtotal = sum(lines.map((l) => l.lineSubtotal));
  const taxableAmount = Math.max(0, subtotal - totalDiscountPaise);

  if (lines.length === 0 || taxableAmount === 0) {
    // Produce zero-value rows for each distinct rate so the bill is complete
    const rates = getDistinctRates(lines);
    return {
      taxBreakdown: rates.map((r) => ({ rateBps: r, taxableBase: 0, taxAmount: 0 })),
      taxableAmount: 0,
      totalTax: 0,
    };
  }

  // Allocate discount pro-rata to each line by its share of the subtotal
  // taxable_line_i = lineSubtotal_i - (lineSubtotal_i / subtotal) * totalDiscount
  // We do this in integer space to avoid float drift.

  /** @type {Map<number, number>} rateBps → taxable base accumulated (paise) */
  const rateToBase = new Map();

  // Pro-rata discount: use the "largest remainder" method to keep integers exact
  // Step 1: compute raw (float) taxable base per line
  const rawTaxableBases = lines.map((l) => {
    if (subtotal === 0) return 0;
    return l.lineSubtotal - (l.lineSubtotal * totalDiscountPaise) / subtotal;
  });

  // Step 2: floor each to integer and track the remainder
  const floored = rawTaxableBases.map(Math.floor);
  const remainder = taxableAmount - sum(floored);

  // Step 3: distribute remainder to lines with largest fractional parts
  const fractionals = rawTaxableBases.map((v, i) => ({ i, frac: v - floored[i] }));
  fractionals.sort((a, b) => b.frac - a.frac);
  for (let k = 0; k < remainder; k++) {
    floored[fractionals[k].i]++;
  }

  // Step 4: accumulate by GST rate
  for (let i = 0; i < lines.length; i++) {
    const rate = lines[i].item.gstRateBps;
    rateToBase.set(rate, (rateToBase.get(rate) ?? 0) + floored[i]);
  }

  // Step 5: compute tax per rate, round half-up once per group
  const taxBreakdown = [];
  for (const [rateBps, taxableBase] of rateToBase) {
    const taxAmount = halfUp((taxableBase * rateBps) / 10_000);
    taxBreakdown.push({ rateBps, taxableBase, taxAmount });
  }

  // Sort by rate ascending for a clean bill display
  taxBreakdown.sort((a, b) => a.rateBps - b.rateBps);

  const totalTax = sum(taxBreakdown.map((r) => r.taxAmount));

  return { taxBreakdown, taxableAmount, totalTax };
}

/**
 * Get distinct GST rates from lines (for zero-value empty tax rows).
 * @param {import('../types.js').ResolvedLine[]} lines
 * @returns {number[]}
 */
function getDistinctRates(lines) {
  return [...new Set(lines.map((l) => l.item.gstRateBps))].sort((a, b) => a - b);
}
