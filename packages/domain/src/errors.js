/**
 * Shared error vocabulary for the domain and API layers.
 *
 * Rule: the domain throws only DomainError. The API's setErrorHandler
 * maps DomainError codes → HTTP status codes. No layer builds error
 * response shapes by hand.
 */

export const ERROR_CODES = /** @type {const} */ ({
  // Cart & item errors
  EMPTY_CART: 'EMPTY_CART',
  UNKNOWN_ITEM: 'UNKNOWN_ITEM',
  INVALID_QUANTITY: 'INVALID_QUANTITY',
  NEGATIVE_PRICE: 'NEGATIVE_PRICE',
  INVALID_ITEM_NAME: 'INVALID_ITEM_NAME',

  // Offer / coupon errors
  UNKNOWN_OFFER_TYPE: 'UNKNOWN_OFFER_TYPE',
  COUPON_NOT_FOUND: 'COUPON_NOT_FOUND',
  COUPON_EXPIRED: 'COUPON_EXPIRED',
  COUPON_LIMIT_REACHED: 'COUPON_LIMIT_REACHED',
  COUPON_NOT_YET_ACTIVE: 'COUPON_NOT_YET_ACTIVE',

  // General
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
});

/**
 * The one error type the domain throws.
 * The API error handler reads `.code` to produce the HTTP response.
 */
export class DomainError extends Error {
  /**
   * @param {keyof typeof ERROR_CODES} code
   * @param {string} message
   * @param {Object} [meta]
   * @param {string} [meta.field]  - path into the request body (e.g. "lines[2].quantity")
   */
  constructor(code, message, meta = {}) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.field = meta.field ?? null;
  }
}

/** Map domain error codes → HTTP status codes (used by the API error handler). */
export const HTTP_STATUS_FOR = {
  [ERROR_CODES.EMPTY_CART]: 400,
  [ERROR_CODES.UNKNOWN_ITEM]: 400,
  [ERROR_CODES.INVALID_QUANTITY]: 400,
  [ERROR_CODES.NEGATIVE_PRICE]: 400,
  [ERROR_CODES.INVALID_ITEM_NAME]: 400,
  [ERROR_CODES.UNKNOWN_OFFER_TYPE]: 400,
  [ERROR_CODES.COUPON_NOT_FOUND]: 400,
  [ERROR_CODES.COUPON_EXPIRED]: 400,
  [ERROR_CODES.COUPON_LIMIT_REACHED]: 400,
  [ERROR_CODES.COUPON_NOT_YET_ACTIVE]: 400,
  [ERROR_CODES.VALIDATION_ERROR]: 400,
  [ERROR_CODES.NOT_FOUND]: 404,
  [ERROR_CODES.UNAUTHORIZED]: 401,
  [ERROR_CODES.INTERNAL_ERROR]: 500,
};
