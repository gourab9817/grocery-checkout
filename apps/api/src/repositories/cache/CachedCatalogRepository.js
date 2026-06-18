const KEY = 'catalog:active';
const TTL = 60; // seconds

export class CachedCatalogRepository {
  constructor(pgRepo, redis) {
    this._pg    = pgRepo;
    this._redis = redis;
  }

  async findAllActive() {
    if (this._redis) {
      try {
        const cached = await this._redis.get(KEY);
        if (cached) return JSON.parse(cached);
      } catch { /* fall through */ }
    }
    const items = await this._pg.findAllActive();
    if (this._redis) {
      this._redis.setex(KEY, TTL, JSON.stringify(items)).catch(() => {});
    }
    return items;
  }

  async #invalidate() {
    if (this._redis) {
      this._redis.del(KEY).catch(() => {});
    }
  }

  async findByIds(ids) { return this._pg.findByIds(ids); }
  async findById(id)   { return this._pg.findById(id); }
  async findAll()      { return this._pg.findAll(); }

  async create(data) {
    const result = await this._pg.create(data);
    await this.#invalidate();
    return result;
  }

  async update(id, data) {
    const result = await this._pg.update(id, data);
    await this.#invalidate();
    return result;
  }
}
