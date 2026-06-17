/**
 * M9.1 — Health + lightweight metrics endpoint.
 *
 * GET /health — used by load-balancers, Docker HEALTHCHECK, and uptime monitors.
 * GET /metrics — process-level vitals for ops dashboards (no Prometheus dep needed at this scale).
 *
 * Production roadmap notes (§0.5 seams — documented here, not built):
 *
 *  CACHING:
 *   Catalog and active-offers reads are hot-path (every /quote) but write-rare.
 *   Seam: wrap PostgresCatalogRepository.findAllActive() with an in-process TTL cache
 *   (30s–60s). Invalidate on admin catalog PATCH. Drop-in: no domain/service changes needed.
 *
 *  RATE-LIMITING:
 *   Add @fastify/rate-limit on /quote and /checkout (100 req/min per IP for anon users).
 *   Plug in as a Fastify plugin after CORS registration in buildApp().
 *
 *  JWT SECRET ROTATION:
 *   JWT_SECRET lives in AWS Secrets Manager (ansrmart/jwt) or directly in env.
 *   Rotation = update the secret + rolling redeploy; no code change needed.
 *
 *  CI/CD SEAM:
 *   Add `.github/workflows/ci.yml`:
 *     push → npm run verify → docker build → push to registry → deploy (fly.io / Railway).
 *   The `npm run verify` script already covers the full gate.
 */

const START_TIME = Date.now();

/**
 * @param {import('fastify').FastifyInstance} app
 */
export async function metricsRoutes(app) {
  app.get('/health', {
    schema: {
      tags: ['Ops'],
      summary: 'Liveness + readiness probe',
      response: {
        200: {
          type: 'object',
          properties: {
            status:  { type: 'string' },
            uptime:  { type: 'number' },
            timestamp: { type: 'string' },
          },
        },
      },
    },
  }, async (_req, reply) => {
    reply.send({
      status: 'ok',
      uptime: Math.floor((Date.now() - START_TIME) / 1000),
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/metrics', {
    schema: {
      tags: ['Ops'],
      summary: 'Process-level vitals (memory, uptime, version)',
    },
  }, async (_req, reply) => {
    const mem = process.memoryUsage();
    reply.send({
      uptimeSeconds:    Math.floor((Date.now() - START_TIME) / 1000),
      processUptimeSec: Math.floor(process.uptime()),
      memory: {
        heapUsedMB:  +(mem.heapUsed  / 1024 / 1024).toFixed(1),
        heapTotalMB: +(mem.heapTotal / 1024 / 1024).toFixed(1),
        rssMB:       +(mem.rss       / 1024 / 1024).toFixed(1),
      },
      node: process.version,
      env:  process.env.NODE_ENV ?? 'unknown',
    });
  });
}
