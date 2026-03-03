// ──────────────────────────────────────────
// Tide API Routes
// ──────────────────────────────────────────
import { Router } from "express";
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
} from "../services/cacheService.js";

const router = Router();

// ── GET /api/tide/current ───────────────────────────────
// Returns the current corrected water level (Layer 1 + 2)
router.get("/tide/current", validateCoordinates, async (req, res, next) => {
    try {
        const { lat, lon } = req.coords;
        const { datum, units } = req.query;

        const cacheKey = makeCacheKey("current", { lat, lon, datum, units });
        const cached = cacheGet(cacheKey);
        if (cached) return res.json({ ...cached, cached: true });

        const result = await getCorrectedWaterLevel(lat, lon, { datum, units });

        cacheSet(cacheKey, result);
        res.json(result);
    } catch (err) {
        next(err);
    }
});

// ── GET /api/tide/extremes ──────────────────────────────
// Returns high/low tides in a date range (Layer 1 only)
router.get(
    "/tide/extremes",
    validateCoordinates,
    validateDateRange,
    async (req, res, next) => {
        try {
            const { lat, lon } = req.coords;
            const { start, end } = req.dateRange;
            const { datum, units } = req.query;

            const cacheKey = makeCacheKey("extremes", {
                lat,
                lon,
                start: start.toISOString(),
                end: end.toISOString(),
                datum,
                units,
            });
            const cached = cacheGet(cacheKey);
            if (cached) return res.json({ ...cached, cached: true });

            const result = getTideExtremes(lat, lon, start, end, { datum, units });

            cacheSet(cacheKey, result);
            res.json(result);
        } catch (err) {
            next(err);
        }
    }
);

// ── GET /api/tide/timeline ──────────────────────────────
// Returns corrected water level timeline for graphing
router.get(
    "/tide/timeline",
    validateCoordinates,
    validateDateRange,
    async (req, res, next) => {
        try {
            const { lat, lon } = req.coords;
            const { start, end } = req.dateRange;
            const { datum, units, interval } = req.query;

            const cacheKey = makeCacheKey("timeline", {
                lat,
                lon,
                start: start.toISOString(),
                end: end.toISOString(),
                datum,
                units,
                interval,
            });
            const cached = cacheGet(cacheKey);
            if (cached) return res.json({ ...cached, cached: true });

            const result = await getCorrectedTimeline(lat, lon, start, end, {
                datum,
                units,
                interval: interval ? parseInt(interval) : 600,
            });

            cacheSet(cacheKey, result);
            res.json(result);
        } catch (err) {
            next(err);
        }
    }
);

// ── GET /api/stations/nearby ────────────────────────────
// Returns nearby tide stations
router.get("/stations/nearby", validateCoordinates, async (req, res, next) => {
    try {
        const { lat, lon } = req.coords;
        const count = req.query.count || 5;

        const cacheKey = makeCacheKey("stations-nearby", { lat, lon, count });
        const cached = cacheGet(cacheKey);
        if (cached) return res.json({ ...cached, cached: true });

        const stations = getNearbyStations(lat, lon, count);

        const result = { stations, count: stations.length };
        cacheSet(cacheKey, result);
        res.json(result);
    } catch (err) {
        next(err);
    }
});

// ── GET /api/stations/lookup?id=noaa/8723214 ────────────
// Returns a specific tide station by ID (supports slashes in ID)
router.get("/stations/lookup", async (req, res, next) => {
    try {
        const { id } = req.query;

        if (!id) {
            return res.status(400).json({
                error: "MISSING_STATION_ID",
                message: "'id' query parameter is required.",
            });
        }

        const cacheKey = makeCacheKey("station", { id });
        const cached = cacheGet(cacheKey);
        if (cached) return res.json({ ...cached, cached: true });

        const station = getStationById(id);

        if (!station) {
            return res.status(404).json({
                error: "STATION_NOT_FOUND",
                message: `No station found with ID '${id}'.`,
            });
        }

        cacheSet(cacheKey, { station });
        res.json({ station });
    } catch (err) {
        next(err);
    }
});

export default router;
