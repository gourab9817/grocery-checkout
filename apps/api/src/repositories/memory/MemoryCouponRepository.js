import { CouponRepository } from '../interfaces/CouponRepository.js';

export class MemoryCouponRepository extends CouponRepository {
  constructor(coupons = []) {
    super();
    this._coupons = coupons.map((c) => ({ ...c }));
  }

  async findByCode(code) {
    return this._coupons.find((c) => c.code.toUpperCase() === code.toUpperCase()) ?? null;
  }

  async incrementUsage(id) {
    const c = this._coupons.find((c) => c.id === id);
    if (c) c.uses_count = (c.uses_count ?? 0) + 1;
  }

  async create(data) {
    const coupon = { id: crypto.randomUUID(), uses_count: 0, ...data };
    this._coupons.push(coupon);
    return { ...coupon };
  }
}
