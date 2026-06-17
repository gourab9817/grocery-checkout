/**
 * Domain validators — pure functions, zero I/O.
 *
 * These are called both:
 *   (a) from the API boundary (zod schemas delegate to these for business rules), and
 *   (b) from inside the domain itself (defense-in-depth).
 *
 * All throw DomainError with a precise code and field path.
 */

import { DomainError, ERROR_CODES } from '../errors.js';

const WEIGHT_PRECISION = 3; // maximum decimal places for kg quantities
const WEIGHT_PRECISION_FACTOR = 10 ** WEIGHT_PRECISION; // 1000

/**
 * Validate that a quantity is legal for the given item's unitType.
 *   - 'unit'   → positive integer ≥ 1
 *   - 'weight' → positive decimal, ≤ 3 decimal places, > 0
 *
 * @param {{ unitType: 'unit'|'weight' }} item
 * @param {*} quantity  — the raw value to validate
 * @param {string} [field]  — field path for error (e.g. 'lines[2].quantity')
 * @throws {DomainError}
 */
export function validateQuantity(item, quantity, field = 'quantity') {
  if (typeof quantity !== 'number' || !isFinite(quantity)) {
    throw new DomainError(ERROR_CODES.INVALID_QUANTITY, 'Quantity must be a number.', { field });
  }

  if (quantity <= 0) {
    throw new DomainError(ERROR_CODES.INVALID_QUANTITY, 'Quantity must be greater than zero.', {
      field,
    });
  }

  if (item.unitType === 'unit') {
    if (!Number.isInteger(quantity)) {
      throw new DomainError(
        ERROR_CODES.INVALID_QUANTITY,
        `Quantity for "${item.name}" must be a positive integer (it is sold per unit).`,
        { field }
      );
    }
  } else {
    // weight — allow decimal but restrict to 3 dp
    const scaled = quantity * WEIGHT_PRECISION_FACTOR;
    if (Math.abs(scaled - Math.round(scaled)) > 1e-9) {
      throw new DomainError(
        ERROR_CODES.INVALID_QUANTITY,
        `Quantity for "${item.name}" may have at most ${WEIGHT_PRECISION} decimal places (precision: grams).`,
        { field }
      );
    }
  }
}

/**
 * Validate that a unit price in paise is valid.
 * @param {*} paise
 * @param {string} [field]
 * @throws {DomainError}
 */
export function validateUnitPrice(paise, field = 'unitPrice') {
  if (typeof paise !== 'number' || !isFinite(paise)) {
    throw new DomainError(ERROR_CODES.NEGATIVE_PRICE, 'Unit price must be a number.', { field });
  }
  if (!Number.isInteger(paise)) {
    throw new DomainError(
      ERROR_CODES.NEGATIVE_PRICE,
      'Unit price must be an integer (paise). Use money.fromRupees() to convert.',
      { field }
    );
  }
  if (paise <= 0) {
    throw new DomainError(ERROR_CODES.NEGATIVE_PRICE, 'Unit price must be greater than zero.', {
      field,
    });
  }
}

/**
 * Validate that a name is a non-empty string after trim.
 * @param {*} name
 * @param {string} [field]
 * @throws {DomainError}
 */
export function validateNonEmptyName(name, field = 'name') {
  if (typeof name !== 'string' || name.trim().length === 0) {
    throw new DomainError(ERROR_CODES.INVALID_ITEM_NAME, 'Name must be a non-empty string.', {
      field,
    });
  }
}

/**
 * Assert that the cart has at least one line.
 * @param {{ lines: unknown[] }} cart
 * @throws {DomainError}
 */
export function assertNonEmptyCart(cart) {
  if (!cart.lines || cart.lines.length === 0) {
    throw new DomainError(
      ERROR_CODES.EMPTY_CART,
      'Cannot checkout an empty cart. Add at least one item.'
    );
  }
}

/**
 * Validate a GST rate in basis points is one of the accepted slabs.
 * @param {*} bps
 * @param {string} [field]
 * @throws {DomainError}
 */
export function validateGstRateBps(bps, field = 'gstRateBps') {
  const VALID_SLABS = [0, 500, 1200, 1800];
  if (!VALID_SLABS.includes(bps)) {
    throw new DomainError(
      ERROR_CODES.VALIDATION_ERROR,
      `GST rate must be one of ${VALID_SLABS.join(', ')} bps.`,
      { field }
    );
  }
}
