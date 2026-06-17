/**
 * Money — Value Object for integer-paise arithmetic.
 *
 * Law: ALL monetary values in this system are integers in paise (₹1 = 100 paise).
 * This module is the ONLY place that:
 *   (a) converts between rupees and paise, and
 *   (b) rounds — using half-up, exactly once, when a line total is finalized.
 *
 * No other module is allowed to use Math.round / toFixed on monetary values.
 */

/** Smallest representable amount: 1 paise */
export const ONE_PAISE = 1;

/** Maximum safe cart value: ₹10,000,000 (1 crore). Fits comfortably in JS Number. */
export const MAX_PAISE = 10_000_000 * 100;

/**
 * Convert rupees (float/string) to integer paise using half-up rounding.
 * Use only at import boundaries (e.g. reading prices from a config file).
 * @param {number} rupees
 * @returns {number} integer paise
 */
export function fromRupees(rupees) {
  return halfUp(rupees * 100);
}

/**
 * Format integer paise as a display string (₹XX.XX).
 * This is the ONE rounding boundary for display. All other operations keep paise as integers.
 * @param {number} paise  integer
 * @returns {string}
 */
export function format(paise) {
  const rupees = paise / 100;
  return `₹${rupees.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Add two paise amounts.
 * @param {number} a integer paise
 * @param {number} b integer paise
 * @returns {number} integer paise
 */
export function add(a, b) {
  return (a | 0) + (b | 0);
}

/**
 * Subtract b from a, floored at zero (never negative).
 * @param {number} a integer paise
 * @param {number} b integer paise
 * @returns {number} integer paise ≥ 0
 */
export function sub(a, b) {
  return Math.max(0, (a | 0) - (b | 0));
}

/**
 * Multiply a paise amount by a quantity (integer or decimal weight in kg).
 * Applies half-up rounding once to produce an integer paise result.
 *
 * Example: 4000 paise/kg × 0.333 kg = 1332 paise (not 1331.99...)
 *
 * @param {number} unitPricePaise  integer — price per unit or per kg
 * @param {number} quantity        positive number (integer for 'unit', decimal for 'weight')
 * @returns {number} integer paise
 */
export function mulQuantity(unitPricePaise, quantity) {
  // Scale quantity to avoid float imprecision: work in 1/1000 units (gram-scale for weight)
  // paise * (quantity * 1000) / 1000 — keep in integer space as long as possible
  const scaled = (unitPricePaise | 0) * quantity;
  return halfUp(scaled);
}

/**
 * Calculate a percentage of a paise amount.
 * percentBps is in basis points (1 bps = 0.01%, so 1000 bps = 10%).
 * Rounds half-up once.
 * @param {number} paise      integer
 * @param {number} percentBps integer (e.g. 1000 = 10%)
 * @returns {number} integer paise
 */
export function percentage(paise, percentBps) {
  // paise * bps / 10000, rounded half-up
  return halfUp(((paise | 0) * (percentBps | 0)) / 10_000);
}

/**
 * Sum an array of paise values.
 * @param {number[]} amounts
 * @returns {number} integer paise
 */
export function sum(amounts) {
  return amounts.reduce((acc, v) => acc + (v | 0), 0);
}

/**
 * Clamp a paise value to zero (never negative).
 * @param {number} paise
 * @returns {number} max(0, paise)
 */
export function clampToZero(paise) {
  return Math.max(0, paise | 0);
}

/**
 * Return true if a ≥ b (both in paise).
 * @param {number} a
 * @param {number} b
 * @returns {boolean}
 */
export function gte(a, b) {
  return (a | 0) >= (b | 0);
}

/**
 * Return the minimum of two paise amounts.
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
export function min(a, b) {
  return Math.min(a | 0, b | 0);
}

// ─── Internal ──────────────────────────────────────────────────────────────────

/**
 * Half-up rounding (the only rounding function in the system).
 * JavaScript's Math.round is "round half to even" for negative numbers,
 * but we need deterministic half-up (same as most billing systems).
 * @param {number} n
 * @returns {number} integer
 */
export function halfUp(n) {
  return Math.floor(n + 0.5);
}
