// ──────────────────────────────────────────
// Tide API Routes (Hono)
// ──────────────────────────────────────────
import { Hono } from "hono";
import {
    validateCoordinates,
    validateDateRange,
} from "../middleware/validation.js";
import {
    getCorrectedWaterLevel,
    getCorrectedTimeline,
} from "../services/correctionEngine.js";
import {
    getTideExtremes,
    getNearbyStations,
    getStationById,
} from "../services/tideService.js";
import {
    makeCacheKey,
    cacheGet,
    cacheSet,
    cacheDelete,
} from "../services/cacheService.js";

const api = new Hono();

// ── GET /api/tide/current ───────────────────────────────
// Returns the current corrected water level (Layer 1 + 2)
api.get("/tide/current", validateCoordinates, async (c) => {
    try {
        const { lat, lon } = c.get("coords");
        const datum = c.req.query("datum");
        const units = c.req.query("units");

        const cacheKey = makeCacheKey("current", { lat, lon, datum, units });
        const cached = await cacheGet(c.env.TIDE_CACHE, cacheKey);
        if (cached) return c.json({ ...cached, cached: true });

        const result = await getCorrectedWaterLevel(c.env, lat, lon, { datum, units });

        await cacheSet(c.env.TIDE_CACHE, cacheKey, result);
        return c.json(result);
    } catch (err) {
        throw err; // Caught by global error handler
    }
});

// ── GET /api/tide/extremes ──────────────────────────────
// Returns high/low tides in a date range (Layer 1 only)
api.get(
    "/tide/extremes",
    validateCoordinates,
    validateDateRange,
    async (c) => {
        try {
            const { lat, lon } = c.get("coords");
            const { start, end } = c.get("dateRange");
            const datum = c.req.query("datum");
            const units = c.req.query("units");

            const cacheKey = makeCacheKey("extremes", {
                lat,
                lon,
                start: start.toISOString(),
                end: end.toISOString(),
                datum,
                units,
            });
            const cached = await cacheGet(c.env.TIDE_CACHE, cacheKey);
            if (cached) return c.json({ ...cached, cached: true });

            const result = getTideExtremes(lat, lon, start, end, { datum, units });

            await cacheSet(c.env.TIDE_CACHE, cacheKey, result);
            return c.json(result);
        } catch (err) {
            throw err;
        }
    }
);

// ── GET /api/tide/timeline ──────────────────────────────
// Returns corrected water level timeline for graphing
api.get(
    "/tide/timeline",
    validateCoordinates,
    validateDateRange,
    async (c) => {
        try {
            const { lat, lon } = c.get("coords");
            const { start, end } = c.get("dateRange");
            const datum = c.req.query("datum");
            const units = c.req.query("units");
            const interval = c.req.query("interval");

            const cacheKey = makeCacheKey("timeline", {
                lat,
                lon,
                start: start.toISOString(),
                end: end.toISOString(),
                datum,
                units,
                interval,
            });
            const cached = await cacheGet(c.env.TIDE_CACHE, cacheKey);
            if (cached) return c.json({ ...cached, cached: true });

            const result = await getCorrectedTimeline(c.env, lat, lon, start, end, {
                datum,
                units,
                interval: interval ? parseInt(interval) : 600,
            });

            await cacheSet(c.env.TIDE_CACHE, cacheKey, result);
            return c.json(result);
        } catch (err) {
            throw err;
        }
    }
);

// ── GET /api/stations/nearby ────────────────────────────
// Returns nearby tide stations
api.get("/stations/nearby", validateCoordinates, async (c) => {
    try {
        const { lat, lon } = c.get("coords");
        const count = c.req.query("count") || 5;

        const cacheKey = makeCacheKey("stations-nearby", { lat, lon, count });
        const cached = await cacheGet(c.env.TIDE_CACHE, cacheKey);
        if (cached) return c.json({ ...cached, cached: true });

        const stations = getNearbyStations(lat, lon, count);

        const result = { stations, count: stations.length };
        await cacheSet(c.env.TIDE_CACHE, cacheKey, result);
        return c.json(result);
    } catch (err) {
        throw err;
    }
});

// ── GET /api/stations/lookup?id=noaa/8723214 ────────────
// Returns a specific tide station by ID (supports slashes in ID)
api.get("/stations/lookup", async (c) => {
    try {
        const id = c.req.query("id");

        if (!id) {
            return c.json({
                error: "MISSING_STATION_ID",
                message: "'id' query parameter is required.",
            }, 400);
        }

        const cacheKey = makeCacheKey("station", { id });
        const cached = await cacheGet(c.env.TIDE_CACHE, cacheKey);
        if (cached) return c.json({ ...cached, cached: true });

        const station = getStationById(id);

        if (!station) {
            return c.json({
                error: "STATION_NOT_FOUND",
                message: `No station found with ID '${id}'.`,
            }, 404);
        }

        await cacheSet(c.env.TIDE_CACHE, cacheKey, { station });
        return c.json({ station });
    } catch (err) {
        throw err;
    }
});

// ── DELETE /api/cache ──────────────────────────────────
// Deletes a specific cache key (Custom requested feature)
api.delete("/cache", async (c) => {
    try {
        const key = c.req.query("key");
        if (!key) {
            return c.json({ error: "MISSING_KEY", message: "Cache key is required" }, 400);
        }
        await cacheDelete(c.env.TIDE_CACHE, key);
        return c.json({ success: true, message: `Deleted cache key: ${key}` });
    } catch (err) {
        throw err;
    }
});

export default api;
