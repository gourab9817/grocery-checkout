/**
 * Offer Registry — Factory pattern.
 *
 * Maps offer type strings (stored in the DB) to their Strategy constructors.
 * The engine calls createRule(record) and never knows the concrete class.
 *
 * HOW TO ADD A NEW OFFER TYPE (15 lines):
 * ─────────────────────────────────────────
 * 1. Create MyNewOffer.js extending OfferRule (implement isEligible + apply).
 * 2. Import it below and add one line to OFFER_REGISTRY:
 *      'my_new_type': MyNewOffer,
 * 3. Insert a DB row: { type: 'my_new_type', params: {...}, priority: N }.
 * 4. Done. The engine picks it up on the next request. Zero engine edits.
 *
 * This is the OCP (Open/Closed Principle) proof-point for this codebase.
 */

import { DomainError, ERROR_CODES } from '../errors.js';
import { PercentageCategoryOffer } from './PercentageCategoryOffer.js';
import { FlatCartThresholdOffer } from './FlatCartThresholdOffer.js';
import { BuyXGetYFreeOffer } from './BuyXGetYFreeOffer.js';
import { CouponOffer } from './CouponOffer.js';

/**
 * The registry: type string → constructor.
 * The engine iterates this — it never contains a switch(type).
 * @type {Record<string, typeof import('./OfferRule.js').OfferRule>}
 */
export const OFFER_REGISTRY = {
  percentage_category: PercentageCategoryOffer,
  flat_cart_threshold: FlatCartThresholdOffer,
  buy_x_get_y: BuyXGetYFreeOffer,
  coupon: CouponOffer,
};

/**
 * Instantiate an OfferRule from a DB record.
 * @param {object} record  — must have at least { id, name, type, params }
 * @returns {import('./OfferRule.js').OfferRule}
 * @throws {DomainError} if the type is not registered
 */
export function createRule(record) {
  const Constructor = OFFER_REGISTRY[record.type];
  if (!Constructor) {
    throw new DomainError(
      ERROR_CODES.UNKNOWN_OFFER_TYPE,
      `Unknown offer type "${record.type}". Register it in offers/registry.js.`,
      { field: 'type' }
    );
  }
  return new Constructor(record);
}

/**
 * Register a new offer type at runtime (useful for tests proving the OCP seam).
 * @param {string} type
 * @param {typeof import('./OfferRule.js').OfferRule} Constructor
 */
export function registerOfferType(type, Constructor) {
  OFFER_REGISTRY[type] = Constructor;
}

/**
 * Remove a registered type (test cleanup).
 * @param {string} type
 */
export function unregisterOfferType(type) {
  delete OFFER_REGISTRY[type];
}
