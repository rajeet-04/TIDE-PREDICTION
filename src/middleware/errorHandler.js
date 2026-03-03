// ──────────────────────────────────────────
// Global Error Handler
// ──────────────────────────────────────────

/**
 * Express error-handling middleware.
 * Catches all errors and returns a consistent JSON response.
 */
export function errorHandler(err, req, res, _next) {
    console.error(`[Error] ${err.message}`);
    if (process.env.NODE_ENV !== "production") {
        console.error(err.stack);
    }

    // Handle known error types
    if (err.message?.includes("No station found") || err.message?.includes("no station")) {
        return res.status(404).json({
            error: "NO_STATION_FOUND",
            message:
                "No tide station found near the given coordinates. The location may be too far inland or in an unsupported region.",
        });
    }

    if (err.message?.includes("Open-Meteo")) {
        return res.status(502).json({
            error: "WEATHER_SERVICE_ERROR",
            message: "Failed to fetch weather data from Open-Meteo. The tide prediction will use harmonic data only.",
        });
    }

    // Generic server error
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        error: "INTERNAL_ERROR",
        message:
            process.env.NODE_ENV === "production"
                ? "An unexpected error occurred."
                : err.message,
    });
}
