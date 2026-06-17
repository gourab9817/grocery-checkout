/**
 * @grocery/domain — public API.
 *
 * ZERO runtime dependencies. Framework-independent. Import from anywhere
 * (API, tests, scripts) with no server, database, or env vars required.
 */

export * from './errors.js';
export * from './money.js';
export * from './cart.js';
export * from './validation/index.js';
export * from './offers/OfferRule.js';
export * from './offers/PercentageCategoryOffer.js';
export * from './offers/FlatCartThresholdOffer.js';
export * from './offers/BuyXGetYFreeOffer.js';
export * from './offers/CouponOffer.js';
export * from './offers/registry.js';
export * from './offers/engine.js';
export * from './tax/engine.js';
export * from './billing/computeBill.js';
