/**
 * Offer Engine — orchestration layer.
 *
 * Applies all active offer rules to a CartContext according to the stacking
 * and precedence policy documented in CONTRACT.md §"Stacking & Precedence Policy".
 *
 * Policy (verbatim from CONTRACT.md):
 *   1. Sort by priority asc, tiebreak id lexicographic.
 *   2. percentage_category and buy_x_get_y evaluate against PRE-DISCOUNT category subtotals.
 *   3. flat_cart_threshold evaluates against the RUNNING cart total AFTER item/category discounts.
 *   4. Coupons apply LAST (highest priority number).
 *   5. If two exclusive rules both qualify, the lower-priority (earlier) one wins; the other
 *      goes to skippedOffers.
 *   6. Non-exclusive rules always stack additively.
 *   7. Every discount is floored ≥ 0. A discount clamped to 0 goes to skippedOffers.
 *
 * Returns: { discounts: Discount[], skippedOffers: SkippedOffer[] }
 */

import { clampToZero } from '../money.js';

const CATEGORY_RULE_TYPES = new Set(['percentage_category', 'buy_x_get_y']);
const COUPON_TYPE = 'coupon';

/**
 * @param {import('../types.js').CartContext} ctx
 * @param {import('./OfferRule.js').OfferRule[]} rules  — already instantiated via createRule()
 * @returns {{ discounts: import('../types.js').Discount[], skippedOffers: import('../types.js').SkippedOffer[] }}
 */
export function applyOffers(ctx, rules) {
  /** @type {import('../types.js').Discount[]} */
  const discounts = [];
  /** @type {import('../types.js').SkippedOffer[]} */
  const skippedOffers = [];

  if (!rules || rules.length === 0) {
    return { discounts, skippedOffers };
  }

  // 1. Sort: priority asc, id lex tiebreak
  const sorted = [...rules]
    .filter((r) => r.active)
    .sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));

  // Separate category rules, flat-cart rules, and coupons
  const categoryRules = sorted.filter((r) => CATEGORY_RULE_TYPES.has(r.type));
  const flatCartRules = sorted.filter(
    (r) => !CATEGORY_RULE_TYPES.has(r.type) && r.type !== COUPON_TYPE
  );
  const couponRules = sorted.filter((r) => r.type === COUPON_TYPE);

  // Track running cart total (starts at subtotal, decremented as discounts apply)
  let runningTotal = ctx.subtotal;

  // ── Phase A: category / BOGO discounts (on pre-discount category subtotals) ──
  const appliedExclusiveIds = new Set();
  let exclusiveWinnerId = null;

  for (const rule of categoryRules) {
    // Exclusive logic: first exclusive wins
    if (rule.exclusive) {
      if (exclusiveWinnerId === null) {
        exclusiveWinnerId = rule.id;
      } else {
        skippedOffers.push({
          offerId: rule.id,
          name: rule.name,
          reason: 'Exclusive offer superseded by a higher-priority exclusive offer.',
        });
        continue;
      }
    }

    const { eligible, reason } = rule.isEligible(ctx);
    if (!eligible) {
      skippedOffers.push({ offerId: rule.id, name: rule.name, reason });
      continue;
    }

    const produced = rule.apply(ctx);
    for (const d of produced) {
      const clamped = clampToZero(d.amountPaise);
      if (clamped === 0 && d.amountPaise <= 0) {
        skippedOffers.push({
          offerId: rule.id,
          name: rule.name,
          reason: 'Discount would be ₹0 — cart value in this category is zero.',
        });
      } else {
        discounts.push({ ...d, amountPaise: clamped });
        runningTotal = clampToZero(runningTotal - clamped);
        if (rule.exclusive) appliedExclusiveIds.add(rule.id);
      }
    }
  }

  // ── Phase B: flat-cart threshold discounts (on post-category-discount total) ──
  for (const rule of flatCartRules) {
    const ctxWithRunning = { ...ctx, currentCartTotal: runningTotal };
    const { eligible, reason } = rule.isEligible(ctxWithRunning);

    if (!eligible) {
      skippedOffers.push({ offerId: rule.id, name: rule.name, reason });
      continue;
    }

    const produced = rule.apply(ctxWithRunning);
    for (const d of produced) {
      const clamped = clampToZero(d.amountPaise);
      if (clamped === 0) {
        skippedOffers.push({
          offerId: rule.id,
          name: rule.name,
          reason: 'Discount would be ₹0 — cart total is already zero.',
        });
      } else {
        discounts.push({ ...d, amountPaise: clamped });
        runningTotal = clampToZero(runningTotal - clamped);
      }
    }
  }

  // ── Phase C: coupons (always last) ──
  for (const rule of couponRules) {
    const ctxWithRunning = { ...ctx, currentCartTotal: runningTotal };
    const { eligible, reason } = rule.isEligible(ctxWithRunning);

    if (!eligible) {
      skippedOffers.push({ offerId: rule.id, name: rule.name, reason });
      continue;
    }

    const produced = rule.apply(ctxWithRunning);
    for (const d of produced) {
      const clamped = clampToZero(d.amountPaise);
      if (clamped === 0) {
        skippedOffers.push({
          offerId: rule.id,
          name: rule.name,
          reason: 'Coupon discount is ₹0 — cart total is already zero.',
        });
      } else {
        discounts.push({ ...d, amountPaise: clamped });
        runningTotal = clampToZero(runningTotal - clamped);
      }
    }
  }

  return { discounts, skippedOffers };
}
