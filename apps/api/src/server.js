import { assertEnv, env } from './config/env.js';
assertEnv();

import Fastify from 'fastify';
import cors from '@fastify/cors';
import { globalErrorHandler } from './middleware/errorHandler.js';
import { BillingService } from './services/BillingService.js';
import { OrderService } from './services/OrderService.js';
import { catalogRoutes } from './routes/catalog.js';
import { billingRoutes } from './routes/billing.js';
import { adminRoutes } from './routes/admin.js';

/**
 * Build and return the Fastify app.
 * @param {{ logger?: any, repos?: object }} opts
 *   Pass `repos` to inject in-memory repositories (for tests).
 *   Omit `repos` to use Supabase-backed repositories (production).
 */
export async function buildApp(opts = {}) {
  const app = Fastify({
    logger: opts.logger ?? {
      level: env.LOG_LEVEL,
      transport:
        env.NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
      serializers: {
        req(req) {
          return { method: req.method, url: req.url, requestId: req.id };
        },
      },
    },
    genReqId: () => crypto.randomUUID(),
  });

  await app.register(cors, { origin: true });
  app.setErrorHandler(globalErrorHandler);

  // ─── Dependency injection ─────────────────────────────────────────────────
  // Tests pass in-memory repos; production lazy-imports the Supabase impls
  let repos = opts.repos;
  if (!repos) {
    // Lazy import so supabase-js is never loaded during tests
    const { supabaseAdmin, supabaseAnon } = await import('./config/supabase.js');
    const { SupabaseCatalogRepository } = await import('./repositories/supabase/SupabaseCatalogRepository.js');
    const { SupabaseOfferRepository } = await import('./repositories/supabase/SupabaseOfferRepository.js');
    const { SupabaseCouponRepository } = await import('./repositories/supabase/SupabaseCouponRepository.js');
    const { SupabaseOrderRepository } = await import('./repositories/supabase/SupabaseOrderRepository.js');
    repos = {
      catalog: new SupabaseCatalogRepository(supabaseAnon),
      offer: new SupabaseOfferRepository(supabaseAnon),
      coupon: new SupabaseCouponRepository(supabaseAnon),
      order: new SupabaseOrderRepository(supabaseAdmin),
    };
  }

  const billingService = new BillingService(repos.catalog, repos.offer, repos.coupon);
  const orderService = new OrderService(billingService, repos.order, repos.coupon);

  // ─── Routes ────────────────────────────────────────────────────────────────
  app.get('/health', async (_req, reply) => {
    reply.send({ status: 'ok', timestamp: new Date().toISOString() });
  });

  await app.register(catalogRoutes, { prefix: '/catalog', catalogRepo: repos.catalog });
  await app.register(billingRoutes, { prefix: '/', billingService, orderService });
  await app.register(adminRoutes, {
    prefix: '/admin',
    catalogRepo: repos.catalog,
    offerRepo: repos.offer,
    couponRepo: repos.coupon,
  });

  return app;
}

// ─── Boot (only when run directly, not during tests) ──────────────────────────
if (env.NODE_ENV !== 'test') {
  const app = await buildApp();
  try {
    await app.listen({ port: env.PORT, host: env.HOST });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}
