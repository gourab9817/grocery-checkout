import { OfferRepository } from '../interfaces/OfferRepository.js';

export class MemoryOfferRepository extends OfferRepository {
  constructor(offers = []) {
    super();
    this._offers = offers.map((o) => ({ ...o }));
  }

  async findAllActive() {
    return this._offers.filter((o) => o.active).map((o) => ({ ...o }));
  }

  async create(data) {
    const offer = { id: crypto.randomUUID(), ...data };
    this._offers.push(offer);
    return { ...offer };
  }

  async update(id, data) {
    const idx = this._offers.findIndex((o) => o.id === id);
    if (idx === -1) return null;
    this._offers[idx] = { ...this._offers[idx], ...data };
    return { ...this._offers[idx] };
  }
}
