export class OfferRepository {
  /** @returns {Promise<object[]>} raw offer records (type+params, not yet instantiated) */
  async findAllActive() {
    throw new Error('OfferRepository.findAllActive() not implemented');
  }

  /** @param {object} data  @returns {Promise<object>} */
  // eslint-disable-next-line no-unused-vars
  async create(data) {
    throw new Error('OfferRepository.create() not implemented');
  }

  /** @param {string} id  @param {object} data  @returns {Promise<object>} */
  // eslint-disable-next-line no-unused-vars
  async update(id, data) {
    throw new Error('OfferRepository.update() not implemented');
  }
}
