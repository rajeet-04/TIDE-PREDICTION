// ──────────────────────────────────────────
// Cache Service — Cloudflare KV implementation
// ──────────────────────────────────────────

/**
 * Generate a cache key from request parameters.
 */
export function makeCacheKey(prefix, params) {
    const sorted = Object.entries(params)
        .filter(([, v]) => v != null)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v}`)
        .join("&");
    return `${prefix}:${sorted}`;
}

/**
 * Get a value from cache.
 * Cloudflare KV limits are asynchronous.
 * @param {import("@cloudflare/workers-types").KVNamespace} kv
 */
export async function cacheGet(kv, key) {
    if (!kv) return null; // Fallback if no KV binding
    try {
        return await kv.get(key, "json");
    } catch (e) {
        console.error("KV GET Error", e);
        return null;
    }
}

/**
 * Store a value in cache.
 * @param {import("@cloudflare/workers-types").KVNamespace} kv
 */
export async function cacheSet(kv, key, value, ttl = 900) {
    if (!kv) return;
    try {
        await kv.put(key, JSON.stringify(value), { expirationTtl: ttl });
    } catch (e) {
        console.error("KV PUT Error", e);
    }
}

/**
 * Delete a value from cache
 * @param {import("@cloudflare/workers-types").KVNamespace} kv
 */
export async function cacheDelete(kv, key) {
    if (!kv) return;
    try {
        await kv.delete(key);
    } catch (e) {
        console.error("KV DELETE Error", e);
    }
}

export function cacheStats() {
    return { status: "Cloudflare KV doesn't provide synchronous runtime stats." };
}
