// ──────────────────────────────────────────
// Cache Service — In-memory TTL cache
// ──────────────────────────────────────────
import NodeCache from "node-cache";

const ttl = parseInt(process.env.CACHE_TTL) || 900; // 15 min default

const cache = new NodeCache({
    stdTTL: ttl,
    checkperiod: Math.floor(ttl / 2),
    useClones: false,
});

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
 */
export function cacheGet(key) {
    return cache.get(key);
}

/**
 * Store a value in cache.
 */
export function cacheSet(key, value, customTtl) {
    cache.set(key, value, customTtl);
}

/**
 * Cache stats for health checks.
 */
export function cacheStats() {
    return cache.getStats();
}

export default cache;
