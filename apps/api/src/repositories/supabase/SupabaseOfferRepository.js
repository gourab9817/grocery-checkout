import { OfferRepository } from '../interfaces/OfferRepository.js';

function toRecord(row) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    priority: row.priority,
    exclusive: row.exclusive,
    active: row.active,
    params: row.params,
  };
}

export class SupabaseOfferRepository extends OfferRepository {
  constructor(client) {
    super();
    this._db = client;
  }

  async findAllActive() {
    const { data, error } = await this._db
      .from('offers')
      .select('id, name, type, priority, exclusive, active, params')
      .eq('active', true)
      .order('priority');
    if (error) throw new Error(`OfferRepo.findAllActive: ${error.message}`);
    return data.map(toRecord);
  }

  async create(offerData) {
    const { data, error } = await this._db
      .from('offers')
      .insert({
        name: offerData.name,
        type: offerData.type,
        priority: offerData.priority ?? 10,
        exclusive: offerData.exclusive ?? false,
        active: offerData.active ?? true,
        params: offerData.params ?? {},
      })
      .select()
      .single();
    if (error) throw new Error(`OfferRepo.create: ${error.message}`);
    return toRecord(data);
  }

  async update(id, offerData) {
    const patch = {};
    if (offerData.name !== undefined) patch.name = offerData.name;
    if (offerData.type !== undefined) patch.type = offerData.type;
    if (offerData.priority !== undefined) patch.priority = offerData.priority;
    if (offerData.exclusive !== undefined) patch.exclusive = offerData.exclusive;
    if (offerData.active !== undefined) patch.active = offerData.active;
    if (offerData.params !== undefined) patch.params = offerData.params;

    const { data, error } = await this._db
      .from('offers')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(`OfferRepo.update: ${error.message}`);
    return toRecord(data);
  }
}
