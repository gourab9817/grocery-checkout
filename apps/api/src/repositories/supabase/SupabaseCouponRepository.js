import { CouponRepository } from '../interfaces/CouponRepository.js';

function toRecord(row) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    percentBps: row.percent_bps,
    amountPaise: row.amount_paise,
    maxDiscountPaise: row.max_discount_paise,
    validFrom: row.valid_from,
    validUntil: row.valid_until,
    maxUses: row.max_uses,
    usesCount: row.uses_count,
    active: row.active,
  };
}

export class SupabaseCouponRepository extends CouponRepository {
  constructor(client) {
    super();
    this._db = client;
  }

  async findByCode(code) {
    const { data, error } = await this._db
      .from('coupons')
      .select('id, code, name, percent_bps, amount_paise, max_discount_paise, valid_from, valid_until, max_uses, uses_count, active')
      .ilike('code', code) // case-insensitive
      .eq('active', true)
      .maybeSingle();
    if (error) throw new Error(`CouponRepo.findByCode: ${error.message}`);
    return data ? toRecord(data) : null;
  }

  async incrementUsage(id) {
    // Atomic RPC (defined in migration 002) prevents race conditions
    const { error } = await this._db.rpc('increment_coupon_usage', { coupon_id: id });
    if (error) throw new Error(`CouponRepo.incrementUsage: ${error.message}`);
  }

  async create(data) {
    const { data: row, error } = await this._db
      .from('coupons')
      .insert({
        code: data.code.toUpperCase(),
        name: data.name,
        percent_bps: data.percentBps ?? null,
        amount_paise: data.amountPaise ?? null,
        max_discount_paise: data.maxDiscountPaise ?? null,
        valid_from: data.validFrom ?? new Date().toISOString(),
        valid_until: data.validUntil ?? null,
        max_uses: data.maxUses ?? null,
        active: data.active ?? true,
      })
      .select()
      .single();
    if (error) throw new Error(`CouponRepo.create: ${error.message}`);
    return toRecord(row);
  }
}
