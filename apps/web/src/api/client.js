/**
 * Thin API client — all requests go through /api proxy → Fastify.
 * Returns parsed JSON or throws { status, error: { code, message } }.
 */

const BASE = import.meta.env.VITE_API_URL ?? '/api';

const ADMIN_TOKEN_KEY = 'ansrmart_admin_token';
const USER_TOKEN_KEY  = 'ansrmart_user_token';

// Admin token helpers (used by AdminPage)
export function getAuthToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}
export function setAuthToken(token) {
  if (token) localStorage.setItem(ADMIN_TOKEN_KEY, token);
  else localStorage.removeItem(ADMIN_TOKEN_KEY);
}

// Customer token helpers (used throughout the shop)
export function getUserToken() {
  return localStorage.getItem(USER_TOKEN_KEY);
}
export function setUserToken(token) {
  if (token) localStorage.setItem(USER_TOKEN_KEY, token);
  else localStorage.removeItem(USER_TOKEN_KEY);
}
export function getSavedUser() {
  try { return JSON.parse(localStorage.getItem('ansrmart_user') ?? 'null'); } catch { return null; }
}
export function setSavedUser(user) {
  if (user) localStorage.setItem('ansrmart_user', JSON.stringify(user));
  else localStorage.removeItem('ansrmart_user');
}

// Single in-flight refresh promise to dedup concurrent 401s
let _refreshPromise = null;

async function refreshAccessToken() {
  if (_refreshPromise) return _refreshPromise;
  _refreshPromise = fetch(`${BASE}/users/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  })
    .then(async (res) => {
      if (!res.ok) throw new Error('refresh failed');
      const json = await res.json();
      const { accessToken, ...userFields } = json.data;
      setUserToken(accessToken);
      setSavedUser(userFields);
      return accessToken;
    })
    .finally(() => { _refreshPromise = null; });
  return _refreshPromise;
}

async function request(method, path, body, { useUserToken = false, _retrying = false } = {}) {
  const token = useUserToken ? getUserToken() : getAuthToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    credentials: 'include',
    // TanStack Query is our client cache. Tell the browser not to do its own
    // conditional revalidation, which would leak a bodyless 304 to fetch().
    // The server still emits ETag/Cache-Control for CDNs and non-SPA clients.
    cache: 'no-store',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Auto-refresh on 401 for customer requests (once)
  if (res.status === 401 && useUserToken && !_retrying) {
    try {
      await refreshAccessToken();
      return request(method, path, body, { useUserToken, _retrying: true });
    } catch {
      // Refresh failed — let the 401 bubble up so UserContext can open auth modal
    }
  }

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    const err = new Error(json?.error?.message ?? `HTTP ${res.status}`);
    err.status = res.status;
    err.code   = json?.error?.code ?? 'UNKNOWN';
    err.field  = json?.error?.field;
    throw err;
  }

  return json;
}

export const api = {
  auth: {
    login:    (creds) => request('POST', '/auth/login',    creds),
    register: (creds) => request('POST', '/auth/register', creds),
  },

  users: {
    signup:    (data) => request('POST', '/users/signup', data),
    login:     (data) => request('POST', '/users/login',  data),
    refresh:   ()     => request('POST', '/users/refresh', undefined, { useUserToken: true }),
    logout:    ()     => request('POST', '/users/logout',  undefined, { useUserToken: true }),
    me:        ()     => request('GET',  '/users/me', undefined, { useUserToken: true }),
    myOrders:  ()     => request('GET',  '/orders/mine',  undefined, { useUserToken: true }),
  },

  addresses: {
    list:   ()        => request('GET',    '/addresses',     undefined, { useUserToken: true }),
    create: (data)    => request('POST',   '/addresses',     data,      { useUserToken: true }),
    update: (id, d)   => request('PATCH',  `/addresses/${id}`, d,       { useUserToken: true }),
    remove: (id)      => request('DELETE', `/addresses/${id}`, undefined, { useUserToken: true }),
  },

  catalog: {
    list: (category) =>
      request('GET', `/catalog${category ? `?category=${category}` : ''}`),
  },

  billing: {
    quote:    (cart)  => request('POST', '/quote', cart),
    checkout: (cart)  => request('POST', '/checkout', cart, { useUserToken: true }),
    getOrder: (id)    => request('GET',  `/orders/${id}`),
  },

  admin: {
    catalog: {
      list:   ()       => request('GET',   '/admin/catalog'),
      create: (data)   => request('POST',  '/admin/catalog', data),
      update: (id, d)  => request('PATCH', `/admin/catalog/${id}`, d),
    },
    offers: {
      list:   ()       => request('GET',   '/admin/offers'),
      create: (data)   => request('POST',  '/admin/offers', data),
      update: (id, d)  => request('PATCH', `/admin/offers/${id}`, d),
    },
    coupons: {
      list:   ()        => request('GET',   '/admin/coupons'),
      create: (data)    => request('POST',  '/admin/coupons', data),
      update: (id, d)   => request('PATCH', `/admin/coupons/${id}`, d),
    },
  },
};
