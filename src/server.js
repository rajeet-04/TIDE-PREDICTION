// ──────────────────────────────────────────────────
// TIDE Backend — Cloudflare Worker Entry Point (Hono)
// ──────────────────────────────────────────────────
import { Hono } from "hono";
import { cors } from "hono/cors";
import { dashboardHtml } from "./public/index.js";
import tideRoutes from "./routes/tideRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = new Hono();

// ── CORS ────────────────────────────────────────────
app.use("/*", cors());

// ── Root Dashboard ──────────────────────────────────
app.get("/", (c) => c.html(dashboardHtml));

// ── Health check ────────────────────────────────────
app.get("/api/health", (c) => {
    return c.json({
        status: "ok",
        service: "TIDE Backend",
        version: "1.0.0",
        layers: ["harmonic (neaps)", "meteorological (Open-Meteo)"],
        timestamp: new Date().toISOString(),
    });
});

// ── API Routes ──────────────────────────────────────
app.route("/api", tideRoutes);

// ── Global error handler ────────────────────────────
app.onError(errorHandler);

// ── 404 handler ─────────────────────────────────────
app.notFound((c) => {
    return c.json(
        {
            error: "NOT_FOUND",
            message: `Route ${c.req.method} ${c.req.path} not found.`,
            available: [
                "GET /api/health",
                "GET /api/tide/current?lat=&lon=",
                "GET /api/tide/extremes?lat=&lon=&start=&end=",
                "GET /api/tide/timeline?lat=&lon=&start=&end=",
                "GET /api/stations/nearby?lat=&lon=",
                "GET /api/stations/lookup?id=noaa/8723214",
                "DELETE /api/cache?key="
            ],
        },
        404
    );
});

export default app;
