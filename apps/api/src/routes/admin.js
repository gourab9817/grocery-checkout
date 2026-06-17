import { AdminController } from '../controllers/adminController.js';
import { requireAdmin } from '../middleware/auth.js';

/**
 * @param {import('fastify').FastifyInstance} app
 * @param {{ catalogRepo, offerRepo, couponRepo }} opts
 */
export async function adminRoutes(app, { catalogRepo, offerRepo, couponRepo }) {
  const ctrl = new AdminController(catalogRepo, offerRepo, couponRepo);

  // All admin routes require authentication
  app.addHook('preHandler', requireAdmin);

  // ─── Catalog admin ─────────────────────────────────────────────────────────
  app.get('/catalog', { schema: { tags: ['Admin'] } }, ctrl.listAllItems);
  app.post('/catalog', { schema: { tags: ['Admin'] } }, ctrl.createItem);
  app.patch('/catalog/:id', { schema: { tags: ['Admin'] } }, ctrl.updateItem);

  // ─── Offer admin ───────────────────────────────────────────────────────────
  app.get('/offers', { schema: { tags: ['Admin'] } }, ctrl.listOffers);
  app.post('/offers', { schema: { tags: ['Admin'] } }, ctrl.createOffer);
  app.patch('/offers/:id', { schema: { tags: ['Admin'] } }, ctrl.updateOffer);

  // ─── Coupon admin ──────────────────────────────────────────────────────────
  app.post('/coupons', { schema: { tags: ['Admin'] } }, ctrl.createCoupon);
}
