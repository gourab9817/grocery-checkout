import { OrderRepository } from '../interfaces/OrderRepository.js';

export class MemoryOrderRepository extends OrderRepository {
  constructor() {
    super();
    this._orders = [];
    this._lines = [];
  }

  async createWithLines({ order, lines }) {
    const id = crypto.randomUUID();
    const saved = { ...order, id, created_at: new Date().toISOString() };
    const savedLines = lines.map((l) => ({ ...l, id: crypto.randomUUID(), order_id: id }));
    this._orders.push(saved);
    this._lines.push(...savedLines);
    return { id };
  }

  async findById(id) {
    const order = this._orders.find((o) => o.id === id);
    if (!order) return null;
    const lines = this._lines.filter((l) => l.order_id === id);
    return { ...order, lines };
  }

  async findAll({ limit = 50, offset = 0 } = {}) {
    return this._orders
      .slice()
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(offset, offset + limit);
  }
}
