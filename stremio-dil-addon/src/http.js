const TIMEOUT_MS = Number(process.env.HTTP_TIMEOUT_MS) || 15000;
const USER_AGENT = 'stremio-dil-addon/0.1';

export async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json', ...(options.headers || {}) },
    signal: AbortSignal.timeout(options.timeout || TIMEOUT_MS),
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }
  if (!res.ok) {
    const detail = body?.detail || body?.error?.message || body?.error || res.statusText;
    const err = new Error(`HTTP ${res.status} ${url.split('?')[0]}: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

/** Basit TTL'li bellek önbelleği. */
export class TtlCache {
  constructor(ttlMs, max = 2000) {
    this.ttl = ttlMs;
    this.max = max;
    this.map = new Map();
  }
  get(key) {
    const hit = this.map.get(key);
    if (!hit) return undefined;
    if (hit.exp < Date.now()) {
      this.map.delete(key);
      return undefined;
    }
    return hit.value;
  }
  set(key, value) {
    if (this.map.size >= this.max) this.map.delete(this.map.keys().next().value);
    this.map.set(key, { value, exp: Date.now() + this.ttl });
    return value;
  }
}
