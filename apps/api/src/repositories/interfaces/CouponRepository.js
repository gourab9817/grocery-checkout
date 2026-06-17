export class CouponRepository {
  /**
   * Find a coupon by code (case-insensitive).
   * @param {string} code
   * @returns {Promise<object | null>}
   */
  // eslint-disable-next-line no-unused-vars
  async findByCode(code) {
    throw new Error('CouponRepository.findByCode() not implemented');
  }

  /**
   * Atomically increment usage count. Must be done inside the checkout transaction.
   * @param {string} id
   * @returns {Promise<void>}
   */
  // eslint-disable-next-line no-unused-vars
  async incrementUsage(id) {
    throw new Error('CouponRepository.incrementUsage() not implemented');
  }

  /** @param {object} data  @returns {Promise<object>} */
  // eslint-disable-next-line no-unused-vars
  async create(data) {
    throw new Error('CouponRepository.create() not implemented');
  }
}
