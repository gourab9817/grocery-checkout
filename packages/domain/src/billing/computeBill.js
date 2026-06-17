/**
 * computeBill — Facade pattern.
 *
 * The single pure entrypoint for the billing pipeline:
 *   resolveCartContext → applyOffers → computeTax → assembleBill
 *
 * A reviewer can call this with plain JS objects and no server, DB, or env vars:
 *   import { computeBill } from '@grocery/domain'
 *   const bill = computeBill({ cart, catalog, offers, computedAt })
 *
 * Invariants guaranteed by this function (verified in tests):
 *   grandTotal === taxableAmount + totalTax
 *   taxableAmount === subtotal - Σdiscounts
 *   grandTotal ≥ 0
 *   every discount.amountPaise ≥ 0
 */

import { resolveCartContext } from '../cart.js';
import { applyOffers } from '../offers/engine.js';
import { createRule } from '../offers/registry.js';
import { computeTax } from '../tax/engine.js';
import { sum } from '../money.js';

/**
 * @param {object} input
 * @param {import('../types.js').Cart}        input.cart
 * @param {import('../types.js').CatalogItem[]} input.catalog
 * @param {object[]}                           input.offerRecords  — raw DB records (type+params)
 * @param {string}                             [input.computedAt]  — ISO 8601; injected so the
 *                                                                   function stays pure (no Date.now())
 * @param {boolean}                            [input.allowEmptyCart] — true for /quote endpoint
 * @returns {import('../types.js').Bill}
 */
export function computeBill({ cart, catalog, offerRecords = [], computedAt, allowEmptyCart }) {
  // 1. Resolve cart → priced context (O(n))
  const ctx = resolveCartContext(cart, catalog, { allowEmptyCart });

  // 2. Instantiate offer rules from records
  const rules = offerRecords.map((rec) => createRule(rec));

  // 3. Apply offers → discounts + skippedOffers
  const { discounts, skippedOffers } = applyOffers(ctx, rules);

  // 4. Compute tax on post-discount taxable base
  const totalDiscountPaise = sum(discounts.map((d) => d.amountPaise));
  const { taxBreakdown, taxableAmount, totalTax } = computeTax(ctx.lines, totalDiscountPaise);

  // 5. Assemble the Bill output shape
  const grandTotal = taxableAmount + totalTax;

  /** @type {import('../types.js').Bill} */
  const bill = {
    lineItems: ctx.lines.map((l) => ({
      name: l.item.name,
      unitPrice: l.item.unitPrice,
      unitType: l.item.unitType,
      quantity: l.quantity,
      lineSubtotal: l.lineSubtotal,
      gstRateBps: l.item.gstRateBps,
    })),
    subtotal: ctx.subtotal,
    discounts,
    skippedOffers,
    taxableAmount,
    taxBreakdown,
    totalTax,
    grandTotal,
    meta: {
      currency: 'INR',
      computedAt: computedAt ?? new Date().toISOString(),
    },
  };

  return bill;
}
