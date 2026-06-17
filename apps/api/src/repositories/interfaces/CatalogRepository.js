/**
 * CatalogRepository interface.
 *
 * Concrete implementations:
 *   - repositories/memory/MemoryCatalogRepository  (tests, offline dev)
 *   - repositories/supabase/SupabaseCatalogRepository (production)
 *
 * Services depend on THIS interface, never on a concrete class (DIP).
 */

export class CatalogRepository {
  /**
   * Fetch all active catalog items.
   * @returns {Promise<import('@grocery/domain').CatalogItem[]>}
   */
  async findAllActive() {
    throw new Error('CatalogRepository.findAllActive() not implemented');
  }

  /**
   * Fetch catalog items by an array of IDs in a SINGLE query (no N+1).
   * @param {string[]} ids
   * @returns {Promise<import('@grocery/domain').CatalogItem[]>}
   */
  // eslint-disable-next-line no-unused-vars
  async findByIds(ids) {
    throw new Error('CatalogRepository.findByIds() not implemented');
  }

  /**
   * Fetch a single item by ID (including inactive, for admin).
   * @param {string} id
   * @returns {Promise<import('@grocery/domain').CatalogItem | null>}
   */
  // eslint-disable-next-line no-unused-vars
  async findById(id) {
    throw new Error('CatalogRepository.findById() not implemented');
  }

  /**
   * Create a new catalog item. Returns the created item with its generated ID.
   * @param {Omit<import('@grocery/domain').CatalogItem, 'id'>} data
   * @returns {Promise<import('@grocery/domain').CatalogItem>}
   */
  // eslint-disable-next-line no-unused-vars
  async create(data) {
    throw new Error('CatalogRepository.create() not implemented');
  }

  /**
   * Update an existing catalog item.
   * @param {string} id
   * @param {Partial<import('@grocery/domain').CatalogItem>} data
   * @returns {Promise<import('@grocery/domain').CatalogItem>}
   */
  // eslint-disable-next-line no-unused-vars
  async update(id, data) {
    throw new Error('CatalogRepository.update() not implemented');
  }
}
