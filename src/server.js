// ──────────────────────────────────────────────────
// TIDE Backend — Server Entry Point
// ──────────────────────────────────────────────────
import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import tideRoutes from "./routes/tideRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { cacheStats } from "./services/cacheService.js";

const app = express();
const PORT = process.env.PORT || 3001;

// ── CORS ────────────────────────────────────────────
app.use(cors());

// ── JSON parsing ────────────────────────────────────
app.use(express.json());

// ── Rate limiting ───────────────────────────────────
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: "RATE_LIMIT_EXCEEDED",
        message: "Too many requests. Please try again later.",
    },
});
app.use(limiter);

// ── Health check ────────────────────────────────────
app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        service: "TIDE Backend",
        version: "1.0.0",
        layers: ["harmonic (neaps)", "meteorological (Open-Meteo)"],
        uptime: process.uptime(),
        cache: cacheStats(),
        timestamp: new Date().toISOString(),
    });
});

// ── API Routes ──────────────────────────────────────
app.use("/api", tideRoutes);

// ── 404 handler ─────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({
        error: "NOT_FOUND",
        message: `Route ${req.method} ${req.path} not found.`,
        available: [
            "GET /api/health",
            "GET /api/tide/current?lat=&lon=",
            "GET /api/tide/extremes?lat=&lon=&start=&end=",
            "GET /api/tide/timeline?lat=&lon=&start=&end=",
            "GET /api/stations/nearby?lat=&lon=",
            "GET /api/stations/:id",
        ],
    });
});

// ── Global error handler ────────────────────────────
app.use(errorHandler);

// ── Start server ────────────────────────────────────
app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════╗
║          🌊  TIDE Backend v1.0.0  🌊            ║
╠══════════════════════════════════════════════════╣
║  Layer 1: Harmonic prediction (neaps)           ║
║  Layer 2: Meteorological correction (Open-Meteo)║
╠══════════════════════════════════════════════════╣
║  Server:  http://localhost:${PORT}                 ║
║  Health:  http://localhost:${PORT}/api/health       ║
╚══════════════════════════════════════════════════╝
  `);
});

export default app;
