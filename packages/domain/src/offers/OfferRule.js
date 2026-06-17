/**
 * OfferRule — base class (Template Method pattern).
 *
 * Every offer strategy extends this. The engine works with this interface only;
 * it never imports a concrete strategy directly. This is the Dependency Inversion
 * point for the offer system.
 *
 * Subclasses MUST override:
 *   - isEligible(ctx)  → { eligible: boolean, reason: string }
 *   - apply(ctx)       → Discount[]
 *
 * Subclasses MUST NOT:
 *   - Mutate the CartContext.
 *   - Do any I/O.
 *   - Call Date.now() (inject computedAt if needed).
 */

import { clampToZero } from '../money.js';

export class OfferRule {
  /**
   * @param {object} record  — the DB row (or in-memory fixture) for this offer
   * @param {string}  record.id
   * @param {string}  record.name
   * @param {string}  record.type
   * @param {number}  record.priority
   * @param {boolean} record.exclusive
   * @param {boolean} record.active
   * @param {object}  record.params
   */
  constructor(record) {
    this.id = record.id;
    this.name = record.name;
    this.type = record.type;
    this.priority = record.priority ?? 0;
    this.exclusive = record.exclusive ?? false;
    this.active = record.active ?? true;
    this.params = record.params ?? {};
  }

  /**
   * Check whether this offer is eligible given the current cart context.
   * @param {import('../types.js').CartContext} _ctx
   * @returns {{ eligible: boolean, reason: string }}
   */
  isEligible(_ctx) {
    throw new Error(`${this.constructor.name} must implement isEligible()`);
  }

  /**
   * Compute the discounts this offer applies.
   * Called only when isEligible() returns true.
   * @param {import('../types.js').CartContext} _ctx
   * @returns {import('../types.js').Discount[]}
   */
  apply(_ctx) {
    throw new Error(`${this.constructor.name} must implement apply()`);
  }

  /**
   * Helper: build a Discount object, always clamped to zero.
   * @param {number} amountPaise
   * @param {string} scope
   * @returns {import('../types.js').Discount}
   */
  _discount(amountPaise, scope = 'cart') {
    return {
      offerId: this.id,
      label: this.name,
      amountPaise: clampToZero(amountPaise),
      scope,
    };
  }
}
