import { CatalogRepository } from '../interfaces/CatalogRepository.js';

/**
 * In-memory CatalogRepository — used in unit/integration tests and offline dev.
 * Accepts a fixture array at construction; no external dependencies.
 */
export class MemoryCatalogRepository extends CatalogRepository {
  /** @param {import('@grocery/domain').CatalogItem[]} items */
  constructor(items = []) {
    super();
    this._items = items.map((i) => ({ ...i })); // defensive copy
  }

  async findAllActive() {
    return this._items.filter((i) => i.active);
  }

  async findByIds(ids) {
    const set = new Set(ids);
    return this._items.filter((i) => set.has(i.id));
  }

  async findById(id) {
    return this._items.find((i) => i.id === id) ?? null;
  }

  async create(data) {
    const item = { id: crypto.randomUUID(), ...data };
    this._items.push(item);
    return { ...item };
  }

  async update(id, data) {
    const idx = this._items.findIndex((i) => i.id === id);
    if (idx === -1) return null;
    this._items[idx] = { ...this._items[idx], ...data };
    return { ...this._items[idx] };
  }
}
