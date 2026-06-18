import { assertEnv, env } from './config/env.js';
assertEnv();

import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import { getRedis } from './config/redis.js';
import { globalErrorHandler } from './middleware/errorHandler.js';
import { BillingService } from './services/BillingService.js';
import { OrderService } from './services/OrderService.js';
import { AuthService } from './services/AuthService.js';
import { UserService } from './services/UserService.js';
import { catalogRoutes } from './routes/catalog.js';
import { billingRoutes } from './routes/billing.js';
import { adminRoutes } from './routes/admin.js';
import { authRoutes } from './routes/auth.js';
import { userRoutes } from './routes/users.js';
import { metricsRoutes } from './routes/metrics.js';
import { requireAuth, optionalAuth } from './middleware/auth.js';
import { addressRoutes } from './routes/addresses.js';
import { NotificationService } from './services/NotificationService.js';

/**
 * Build and return the Fastify app.
 * @param {{ logger?: any, repos?: object }} opts
 *   Pass `repos` to inject in-memory repositories (for tests).
 *   Omit `repos` to use Postgres-backed repositories (production).
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
    bodyLimit: 100_000,
    trustProxy: true,
  });

  // Plugin order matters: helmet → cors → cookie → rate-limit
  // (gzip/brotli compression is handled by nginx at the edge — see apps/web/Dockerfile)
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, {
    origin: [env.WEB_ORIGIN],
    credentials: true,
  });
  await app.register(cookie);

  const redis = getRedis();
  await app.register(rateLimit, {
    redis: redis ?? undefined,
    global: false,
  });

  app.setErrorHandler(globalErrorHandler);

  // ─── Dependency injection ──────────────────────────────────────────────────
  // Tests pass in-memory repos; production lazy-imports the Postgres impls.
  let repos = opts.repos;
  let pool = null;

  if (!repos) {
    const { getPool } = await import('./config/db.js');
    pool = await getPool();

    const { PostgresCatalogRepository } = await import('./repositories/postgres/PostgresCatalogRepository.js');
    const { PostgresOfferRepository }   = await import('./repositories/postgres/PostgresOfferRepository.js');
    const { PostgresCouponRepository }  = await import('./repositories/postgres/PostgresCouponRepository.js');
    const { PostgresOrderRepository }   = await import('./repositories/postgres/PostgresOrderRepository.js');
    const { CachedCatalogRepository }          = await import('./repositories/cache/CachedCatalogRepository.js');
    const { CachedOfferRepository }            = await import('./repositories/cache/CachedOfferRepository.js');
    const { PostgresRefreshTokenRepository }   = await import('./repositories/postgres/PostgresRefreshTokenRepository.js');
    const { PostgresAddressRepository }        = await import('./repositories/postgres/PostgresAddressRepository.js');

    const r = getRedis();
    repos = {
      catalog:      new CachedCatalogRepository(new PostgresCatalogRepository(pool), r),
      offer:        new CachedOfferRepository(new PostgresOfferRepository(pool), r),
      coupon:       new PostgresCouponRepository(pool),
      order:        new PostgresOrderRepository(pool),
      refreshToken: new PostgresRefreshTokenRepository(pool),
      address:      new PostgresAddressRepository(pool),
    };
  }

  const notificationService = new NotificationService();
  const billingService = new BillingService(repos.catalog, repos.offer, repos.coupon);
  const orderService   = new OrderService(billingService, repos.order, repos.coupon, notificationService);
  const authService    = new AuthService(pool ?? opts.pool ?? null);
  const userService    = new UserService(pool ?? opts.pool ?? null, repos?.refreshToken ?? null);

  // ─── Routes ────────────────────────────────────────────────────────────────
  await app.register(metricsRoutes);
  await app.register(authRoutes,    { prefix: '/auth',    authService });
  await app.register(userRoutes,    { prefix: '/users',   userService, authenticate: requireAuth });
  await app.register(catalogRoutes, { prefix: '/catalog', catalogRepo: repos.catalog });
  await app.register(billingRoutes, { prefix: '/',        billingService, orderService, requireAuth, optionalAuth });
  await app.register(adminRoutes,   {
    prefix: '/admin',
    catalogRepo: repos.catalog,
    offerRepo:   repos.offer,
    couponRepo:  repos.coupon,
  });
  await app.register(addressRoutes, { prefix: '/addresses', addressRepo: repos.address ?? null, requireAuth });

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
