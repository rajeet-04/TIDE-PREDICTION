import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import tideRoutes from "./routes/tideRoutes.ts";
import { cacheStats } from "./database/cache.ts";

const app = new Hono();

// ── CORS ────────────────────────────────────────────
app.use("/*", cors());

// ── Health check ────────────────────────────────────
app.get("/api/health", async (c) => {
    return c.json({
        status: "ok",
        service: "TIDE Backend",
        version: "1.0.0",
        layers: ["harmonic (neaps)", "meteorological (Open-Meteo)"],
        cache: await cacheStats(),
        timestamp: new Date().toISOString(),
    });
});

// ── API Routes ──────────────────────────────────────
app.route("/api", tideRoutes);

// ── 404 handler ─────────────────────────────────────
app.notFound((c) => {
    return c.json({
        error: "NOT_FOUND",
        message: `Route ${c.req.method} ${c.req.path} not found.`,
        available: [
            "GET /api/health",
            "GET /api/tide/current?lat=&lon=",
            "GET /api/tide/extremes?lat=&lon=&start=&end=",
            "GET /api/tide/timeline?lat=&lon=&start=&end=",
            "GET /api/stations/nearby?lat=&lon=",
            "GET /api/stations/lookup?id=",
        ],
    }, 404);
});

// ── Global error handler ────────────────────────────
// Unwrap Hono errors to see original error details
app.onError((err, c) => {
    throw err;
});

export default { fetch: app.fetch };
