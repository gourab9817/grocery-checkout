/**
 * SupabaseCatalogRepository — Adapter pattern.
 *
 * The ONLY place in the codebase that:
 *   (a) imports supabase-js, and
 *   (b) knows the DB column names (snake_case ↔ camelCase mapping).
 *
 * Query discipline (§0.5):
 *   - findByIds uses `in` with the full ID array — ONE query, no N+1.
 *   - SELECT only the columns the domain needs, never SELECT *.
 *   - Indexes on category, active are relied on for hot paths.
 */

import { CatalogRepository } from '../interfaces/CatalogRepository.js';

const COLUMNS = 'id, name, category, unit_type, unit_price, gst_rate_bps, active';

/** @param {object} row  DB row  @returns {import('@grocery/domain').CatalogItem} */
function toItem(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    unitType: row.unit_type,
    unitPrice: row.unit_price,
    gstRateBps: row.gst_rate_bps,
    active: row.active,
  };
}

/** @param {import('@grocery/domain').CatalogItem} item  @returns {object} DB row */
function toRow(item) {
  const row = {};
  if (item.name !== undefined) row.name = item.name;
  if (item.category !== undefined) row.category = item.category;
  if (item.unitType !== undefined) row.unit_type = item.unitType;
  if (item.unitPrice !== undefined) row.unit_price = item.unitPrice;
  if (item.gstRateBps !== undefined) row.gst_rate_bps = item.gstRateBps;
  if (item.active !== undefined) row.active = item.active;
  return row;
}

export class SupabaseCatalogRepository extends CatalogRepository {
  /** @param {import('@supabase/supabase-js').SupabaseClient} client */
  constructor(client) {
    super();
    this._db = client;
  }

  async findAllActive() {
    const { data, error } = await this._db
      .from('catalog_items')
      .select(COLUMNS)
      .eq('active', true)
      .order('category')
      .order('name');
    if (error) throw new Error(`CatalogRepo.findAllActive: ${error.message}`);
    return data.map(toItem);
  }

  async findByIds(ids) {
    if (ids.length === 0) return [];
    const { data, error } = await this._db
      .from('catalog_items')
      .select(COLUMNS)
      .in('id', ids); // ONE query for all IDs — no N+1
    if (error) throw new Error(`CatalogRepo.findByIds: ${error.message}`);
    return data.map(toItem);
  }

  async findById(id) {
    const { data, error } = await this._db
      .from('catalog_items')
      .select(COLUMNS)
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(`CatalogRepo.findById: ${error.message}`);
    return data ? toItem(data) : null;
  }

  async create(itemData) {
    const { data, error } = await this._db
      .from('catalog_items')
      .insert(toRow(itemData))
      .select(COLUMNS)
      .single();
    if (error) throw new Error(`CatalogRepo.create: ${error.message}`);
    return toItem(data);
  }

  async update(id, itemData) {
    const { data, error } = await this._db
      .from('catalog_items')
      .update(toRow(itemData))
      .eq('id', id)
      .select(COLUMNS)
      .single();
    if (error) throw new Error(`CatalogRepo.update: ${error.message}`);
    return toItem(data);
  }
}
