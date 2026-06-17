export class OrderRepository {
  /**
   * Persist an order + its lines atomically (single transaction — no partial writes).
   * @param {{ order: object, lines: object[] }} data
   * @returns {Promise<{ id: string }>}
   */
  // eslint-disable-next-line no-unused-vars
  async createWithLines(data) {
    throw new Error('OrderRepository.createWithLines() not implemented');
  }

  /**
   * Find an order by ID (includes its lines).
   * @param {string} id
   * @returns {Promise<object | null>}
   */
  // eslint-disable-next-line no-unused-vars
  async findById(id) {
    throw new Error('OrderRepository.findById() not implemented');
  }

  /**
   * List recent orders (admin).
   * @param {{ limit?: number, offset?: number }} opts
   * @returns {Promise<object[]>}
   */
  // eslint-disable-next-line no-unused-vars
  async findAll(opts = {}) {
    throw new Error('OrderRepository.findAll() not implemented');
  }
}
