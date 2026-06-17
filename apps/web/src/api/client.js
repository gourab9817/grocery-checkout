/**
 * Thin API client — all requests go through /api proxy → Fastify.
 * Returns parsed JSON or throws { status, error: { code, message } }.
 */

const BASE = import.meta.env.VITE_API_URL ?? '/api';

const TOKEN_KEY = 'ansrmart_admin_token';

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function request(method, path, body) {
  const token = getAuthToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

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

  catalog: {
    list: (category) =>
      request('GET', `/catalog${category ? `?category=${category}` : ''}`),
  },

  billing: {
    quote:    (cart)  => request('POST', '/quote', cart),
    checkout: (cart)  => request('POST', '/checkout', cart),
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
      create: (data)   => request('POST',  '/admin/coupons', data),
    },
  },
};
