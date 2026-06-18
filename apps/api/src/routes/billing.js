import { BillingController } from '../controllers/billingController.js';

/**
 * @param {import('fastify').FastifyInstance} app
 * @param {{ billingService, orderService, optionalAuth, requireAuth }} opts
 */
export async function billingRoutes(app, { billingService, orderService, optionalAuth, requireAuth }) {
  const ctrl = new BillingController(billingService, orderService);

  // POST /quote — compute a bill without persisting (powers live preview)
  app.post('/quote', {
    config: { rateLimit: { max: 100, timeWindow: '1 minute' } },
    schema: {
      tags: ['Billing'],
      summary: 'Compute a live bill preview (no persistence)',
      body: {
        type: 'object',
        properties: {
          lines: { type: 'array', items: { type: 'object', properties: { itemId: { type: 'string' }, quantity: { type: 'number' } }, required: ['itemId', 'quantity'] } },
          couponCode: { type: 'string' },
        },
        required: ['lines'],
      },
    },
  }, ctrl.quote);

  // POST /checkout — compute and persist the order (optional auth attaches userId)
  app.post('/checkout', {
    preHandler: optionalAuth,
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    schema: {
      tags: ['Billing'],
      summary: 'Checkout: compute bill and persist order',
    },
  }, ctrl.checkout);

  // GET /orders/mine — fetch current user's order history (requires auth)
  app.get('/orders/mine', {
    preHandler: requireAuth,
    schema: {
      tags: ['Orders'],
      summary: "Fetch the authenticated user's order history",
    },
  }, ctrl.getMyOrders);

  // GET /orders/:id — fetch a persisted order receipt
  app.get('/orders/:id', {
    schema: {
      tags: ['Orders'],
      summary: 'Fetch a persisted order by ID',
      params: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } }, required: ['id'] },
    },
  }, ctrl.getOrder);
}
