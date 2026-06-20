// VIPOR Service — minimal API client.
// Set EXPO_PUBLIC_API_URL to your machine's LAN IP when testing on a physical
// phone. Example: EXPO_PUBLIC_API_URL=http://192.168.1.20:3001/api

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001/api';

let authToken = null;
let onUnauthorized = null;

export function setAuthToken(token) { authToken = token; }
// Auth layer registers a callback so an expired/invalid token logs the user out.
export function setUnauthorizedHandler(fn) { onUnauthorized = fn; }

async function request(method, path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && onUnauthorized) onUnauthorized();

  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }

  if (!res.ok) {
    // Carry the HTTP status so screens can react (e.g. 402 → garage subscription
    // inactive → show the "temporarily unavailable" state instead of a raw error).
    const err = new Error(data?.error ?? `Request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  patch: (path, body) => request('PATCH', path, body),
};
