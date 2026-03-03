// ──────────────────────────────────────────
// Global Error Handler
// ──────────────────────────────────────────

/**
 * Hono error-handling middleware.
 * Catches all errors and returns a consistent JSON response.
 */
export function errorHandler(err, c) {
    console.error(`[Error] ${err.message}`);
    const isProduction = c.env?.NODE_ENV === "production";

    if (!isProduction) {
        console.error(err.stack);
    }

    // Handle known error types
    if (err.message?.includes("No station found") || err.message?.includes("no station")) {
        return c.json({
            error: "NO_STATION_FOUND",
            message:
                "No tide station found near the given coordinates. The location may be too far inland or in an unsupported region.",
        }, 404);
    }

    if (err.message?.includes("Open-Meteo")) {
        return c.json({
            error: "WEATHER_SERVICE_ERROR",
            message: "Failed to fetch weather data from Open-Meteo. The tide prediction will use harmonic data only.",
        }, 502);
    }

    // Generic server error
    const statusCode = err.status || err.statusCode || 500;
    return c.json({
        error: "INTERNAL_ERROR",
        message:
            isProduction
                ? "An unexpected error occurred."
                : err.message,
    }, statusCode);
}
