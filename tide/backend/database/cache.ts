// ──────────────────────────────────────────
// Cache Service — SQLite based cache for Val Town
// ──────────────────────────────────────────
import { sqlite } from "https://esm.town/v/stevekrouse/sqlite";

const ttl = parseInt(process.env.CACHE_TTL || "900"); // 15 min default

// Initialize SQLite table once
let initialized = false;
async function initDb() {
    if (initialized) return;
    await sqlite.execute(`
        CREATE TABLE IF NOT EXISTS tide_cache_2 (
            key TEXT PRIMARY KEY,
            value TEXT,
            expires_at INTEGER
        )
    `);
    initialized = true;
}

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
export async function cacheGet(key) {
    await initDb();
    if (!initialized) return undefined;

    const result = await sqlite.execute({
        sql: "SELECT value, expires_at FROM tide_cache_2 WHERE key = ?",
        args: [key]
    });

    if (result.rows.length === 0) return undefined;

    const row = result.rows[0];
    const expiresAt = row[1];
    if (Date.now() > expiresAt) {
        // Expired
        await sqlite.execute({
            sql: "DELETE FROM tide_cache_2 WHERE key = ?",
            args: [key]
        });
        return undefined;
    }

    return JSON.parse(row[0]);
}

/**
 * Store a value in cache.
 */
export async function cacheSet(key, value, customTtl) {
    await initDb();
    if (!initialized) return;

    const duration = customTtl || ttl;
    const expiresAt = Date.now() + duration * 1000;

    await sqlite.execute({
        sql: "INSERT OR REPLACE INTO tide_cache_2 (key, value, expires_at) VALUES (?, ?, ?)",
        args: [key, JSON.stringify(value), expiresAt]
    });
}

/**
 * Cache stats for health checks.
 */
export async function cacheStats() {
    await initDb();
    const result = await sqlite.execute("SELECT COUNT(*) FROM tide_cache_2");
    const count = result.rows[0]?.[0] || 0;
    return { keys: count };
}
