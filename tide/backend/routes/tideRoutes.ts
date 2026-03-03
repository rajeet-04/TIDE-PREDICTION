// ──────────────────────────────────────────
// Tide API Routes
// ──────────────────────────────────────────
import { Hono } from "npm:hono";
import {
    validateCoordinates,
    validateDateRange,
} from "../../shared/utils.ts";
import {
    getCorrectedWaterLevel,
    getCorrectedTimeline,
} from "../services/correctionEngine.ts";
import {
    getTideExtremes,
    getNearbyStations,
    getStationById,
} from "../services/tideService.ts";
import {
    makeCacheKey,
    cacheGet,
    cacheSet,
} from "../database/cache.ts";

const router = new Hono();

// ── GET /api/tide/current ───────────────────────────────
// Returns the current corrected water level (Layer 1 + 2)
router.get("/tide/current", validateCoordinates, async (c) => {
    try {
        const { lat, lon } = c.get("coords");
        const datum = c.req.query("datum");
        const units = c.req.query("units");

        const cacheKey = makeCacheKey("current", { lat, lon, datum, units });
        const cached = await cacheGet(cacheKey);
        if (cached) return c.json({ ...cached, cached: true });

        const result = await getCorrectedWaterLevel(lat, lon, { datum, units });

        await cacheSet(cacheKey, result);
        return c.json(result);
    } catch (err) {
        throw err;
    }
});

// ── GET /api/tide/extremes ──────────────────────────────
// Returns high/low tides in a date range (Layer 1 only)
router.get(
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
            const cached = await cacheGet(cacheKey);
            if (cached) return c.json({ ...cached, cached: true });

            const result = getTideExtremes(lat, lon, start, end, { datum, units });

            await cacheSet(cacheKey, result);
            return c.json(result);
        } catch (err) {
            throw err;
        }
    }
);

// ── GET /api/tide/timeline ──────────────────────────────
// Returns corrected water level timeline for graphing
router.get(
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
            const cached = await cacheGet(cacheKey);
            if (cached) return c.json({ ...cached, cached: true });

            const result = await getCorrectedTimeline(lat, lon, start, end, {
                datum,
                units,
                interval: interval ? parseInt(interval) : 600,
            });

            await cacheSet(cacheKey, result);
            return c.json(result);
        } catch (err) {
            throw err;
        }
    }
);

// ── GET /api/stations/nearby ────────────────────────────
// Returns nearby tide stations
router.get("/stations/nearby", validateCoordinates, async (c) => {
    try {
        const { lat, lon } = c.get("coords");
        const count = c.req.query("count") || 5;

        const cacheKey = makeCacheKey("stations-nearby", { lat, lon, count });
        const cached = await cacheGet(cacheKey);
        if (cached) return c.json({ ...cached, cached: true });

        const stations = getNearbyStations(lat, lon, count);

        const result = { stations, count: stations.length };
        await cacheSet(cacheKey, result);
        return c.json(result);
    } catch (err) {
        throw err;
    }
});

// ── GET /api/stations/lookup?id=noaa/8723214 ────────────
// Returns a specific tide station by ID (supports slashes in ID)
router.get("/stations/lookup", async (c) => {
    try {
        const id = c.req.query("id");

        if (!id) {
            return c.json({
                error: "MISSING_STATION_ID",
                message: "'id' query parameter is required.",
            }, 400);
        }

        const cacheKey = makeCacheKey("station", { id });
        const cached = await cacheGet(cacheKey);
        if (cached) return c.json({ ...cached, cached: true });

        const station = getStationById(id);

        if (!station) {
            return c.json({
                error: "STATION_NOT_FOUND",
                message: `No station found with ID '${id}'.`,
            }, 404);
        }

        await cacheSet(cacheKey, { station });
        return c.json({ station });
    } catch (err) {
        throw err;
    }
});

export default router;
