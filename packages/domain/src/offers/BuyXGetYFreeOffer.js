/**
 * BuyXGetYFreeOffer — Strategy
 *
 * For every (buyQty + freeQty) units of a category, freeQty units are free
 * (specifically: the cheapest qualifying units in that category are made free).
 *
 * params: { category: string, buyQty: number, freeQty: number }
 *
 * Example: "Buy 2 Get 1 Free on Snacks"
 *   → { category: 'snacks', buyQty: 2, freeQty: 1 }
 *
 * Applies to UNIT-type items only (documented assumption: BOGO on weight-sold
 * items is undefined behaviour — e.g. "buy 2kg get 1kg free" is not a real
 * supermarket offer type in this catalog).
 *
 * Algorithm:
 *   1. Collect all unit-type lines in the target category.
 *   2. Count total qualifying units.
 *   3. Compute how many free units: floor(totalUnits / (buyQty + freeQty)) * freeQty
 *   4. Give cheapest units for free (sort lines by unitPrice asc, allocate free units).
 */

import { OfferRule } from './OfferRule.js';
import { sum } from '../money.js';

export class BuyXGetYFreeOffer extends OfferRule {
  constructor(record) {
    super(record);
    this._category = record.params.category;
    this._buyQty = record.params.buyQty;
    this._freeQty = record.params.freeQty;
  }

  isEligible(ctx) {
    const eligibleLines = this._getEligibleLines(ctx);
    const totalUnits = eligibleLines.reduce((acc, l) => acc + l.quantity, 0);
    const required = this._buyQty + this._freeQty;

    if (totalUnits >= required) {
      return { eligible: true, reason: '' };
    }

    const shortfall = required - totalUnits;
    return {
      eligible: false,
      reason: `Add ${shortfall} more ${this._category} item(s) to qualify for Buy ${this._buyQty} Get ${this._freeQty} Free.`,
    };
  }

  apply(ctx) {
    const eligibleLines = this._getEligibleLines(ctx);
    const totalUnits = eligibleLines.reduce((acc, l) => acc + l.quantity, 0);
    const cycleSize = this._buyQty + this._freeQty;
    const freeUnits = Math.floor(totalUnits / cycleSize) * this._freeQty;

    if (freeUnits === 0) return [];

    // Sort by unit price ascending — cheapest items are free
    const sorted = [...eligibleLines].sort((a, b) => a.item.unitPrice - b.item.unitPrice);

    let remainingFree = freeUnits;
    const freeAmounts = [];

    for (const line of sorted) {
      if (remainingFree <= 0) break;
      const freeFromLine = Math.min(remainingFree, line.quantity);
      freeAmounts.push(freeFromLine * line.item.unitPrice);
      remainingFree -= freeFromLine;
    }

    const totalDiscount = sum(freeAmounts);
    return [this._discount(totalDiscount, `category:${this._category}`)];
  }

  _getEligibleLines(ctx) {
    return ctx.lines.filter(
      (l) => l.item.category === this._category && l.item.unitType === 'unit'
    );
  }
}
