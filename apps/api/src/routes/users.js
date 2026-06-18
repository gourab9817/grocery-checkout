const COOKIE_NAME = 'rt';
const COOKIE_MAX_AGE = 30 * 24 * 3600;
const IS_PROD = process.env.NODE_ENV === 'production';
const AUTH_RATE_LIMIT = { max: 5, timeWindow: '1 minute' };

function setRefreshCookie(reply, token) {
  reply.setCookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: IS_PROD,
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
}

function clearRefreshCookie(reply) {
  reply.clearCookie(COOKIE_NAME, { path: '/' });
}

export async function userRoutes(app, opts) {
  const { userService, authenticate } = opts;

  app.post('/signup', { config: { rateLimit: AUTH_RATE_LIMIT } }, async (request, reply) => {
    const { email, password, name } = request.body ?? {};
    if (!email || !password) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'email and password required.' } });
    }
    if (password.length < 8) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'password must be at least 8 characters.' } });
    }
    try {
      const result = await userService.signup({ email, password, name });
      if (result.refreshToken) setRefreshCookie(reply, result.refreshToken);
      reply.status(201).send({
        data: {
          accessToken: result.accessToken,
          userId: result.userId,
          email: result.email,
          name: result.name,
          role: result.role,
        },
      });
    } catch (err) {
      reply.status(err.status ?? 400).send({ error: { code: 'AUTH_ERROR', message: err.message } });
    }
  });

  app.post('/login', { config: { rateLimit: AUTH_RATE_LIMIT } }, async (request, reply) => {
    const { email, password } = request.body ?? {};
    if (!email || !password) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'email and password required.' } });
    }
    try {
      const result = await userService.login({ email, password });
      if (result.refreshToken) setRefreshCookie(reply, result.refreshToken);
      reply.send({
        data: {
          accessToken: result.accessToken,
          userId: result.userId,
          email: result.email,
          name: result.name,
          role: result.role,
        },
      });
    } catch (err) {
      reply.status(err.status ?? 401).send({ error: { code: 'UNAUTHORIZED', message: err.message } });
    }
  });

  app.post('/refresh', async (request, reply) => {
    const rawToken = request.cookies?.[COOKIE_NAME];
    if (!rawToken) {
      return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'No refresh token.' } });
    }
    try {
      const result = await userService.refresh(rawToken);
      if (result.refreshToken) setRefreshCookie(reply, result.refreshToken);
      reply.send({
        data: {
          accessToken: result.accessToken,
          userId: result.userId,
          email: result.email,
          name: result.name,
          role: result.role,
        },
      });
    } catch (err) {
      clearRefreshCookie(reply);
      reply.status(err.status ?? 401).send({ error: { code: 'UNAUTHORIZED', message: err.message } });
    }
  });

  app.post('/logout', async (request, reply) => {
    const rawToken = request.cookies?.[COOKIE_NAME];
    await userService.logout(rawToken).catch(() => {});
    clearRefreshCookie(reply);
    reply.send({ data: { ok: true } });
  });

  app.get('/me', { preHandler: authenticate }, async (request, reply) => {
    reply.send({
      data: {
        userId: request.user.userId,
        email: request.user.email,
        name: request.user.name,
        role: request.user.role,
      },
    });
  });
}
