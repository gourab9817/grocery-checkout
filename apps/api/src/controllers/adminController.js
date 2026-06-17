/**
 * AdminController — catalog, offers, and coupon management.
 * All routes require admin auth (enforced at the route level as preHandler).
 */

import { validate } from '../middleware/validate.js';
import {
  CreateCatalogItemSchema,
  UpdateCatalogItemSchema,
  CreateOfferSchema,
  UpdateOfferSchema,
  CreateCouponSchema,
} from '../schemas/adminSchema.js';

export class AdminController {
  constructor(catalogRepo, offerRepo, couponRepo) {
    this._catalog = catalogRepo;
    this._offers = offerRepo;
    this._coupons = couponRepo;
  }

  // ─── Catalog ───────────────────────────────────────────────────────────────
  listAllItems = async (request, reply) => {
    // Admin can see inactive items too — use findAll() when full admin view is needed
    const items = await this._catalog.findAllActive();
    reply.send({ data: items });
  };

  createItem = async (request, reply) => {
    const data = validate(CreateCatalogItemSchema, request.body);
    const item = await this._catalog.create({
      name: data.name,
      category: data.category,
      unitType: data.unitType,
      unitPrice: data.unitPrice,
      gstRateBps: data.gstRateBps,
      active: data.active,
    });
    reply.status(201).send({ data: item });
  };

  updateItem = async (request, reply) => {
    const data = validate(UpdateCatalogItemSchema, request.body);
    const item = await this._catalog.update(request.params.id, {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.unitType !== undefined && { unitType: data.unitType }),
      ...(data.unitPrice !== undefined && { unitPrice: data.unitPrice }),
      ...(data.gstRateBps !== undefined && { gstRateBps: data.gstRateBps }),
      ...(data.active !== undefined && { active: data.active }),
    });
    reply.send({ data: item });
  };

  // ─── Offers ────────────────────────────────────────────────────────────────
  listOffers = async (request, reply) => {
    const offers = await this._offers.findAllActive();
    reply.send({ data: offers });
  };

  createOffer = async (request, reply) => {
    const data = validate(CreateOfferSchema, request.body);
    const offer = await this._offers.create(data);
    reply.status(201).send({ data: offer });
  };

  updateOffer = async (request, reply) => {
    const data = validate(UpdateOfferSchema, request.body);
    const offer = await this._offers.update(request.params.id, data);
    reply.send({ data: offer });
  };

  // ─── Coupons ───────────────────────────────────────────────────────────────
  createCoupon = async (request, reply) => {
    const data = validate(CreateCouponSchema, request.body);
    const coupon = await this._coupons.create(data);
    reply.status(201).send({ data: coupon });
  };
}
