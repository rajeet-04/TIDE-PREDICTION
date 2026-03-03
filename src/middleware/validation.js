// ──────────────────────────────────────────
// Validation Middleware
// ──────────────────────────────────────────

/**
 * Validate that lat and lon query params are present and valid.
 */
export async function validateCoordinates(c, next) {
    const lat = c.req.query("lat");
    const lon = c.req.query("lon");

    if (lat == null || lon == null) {
        return c.json({
            error: "MISSING_COORDINATES",
            message: "Both 'lat' and 'lon' query parameters are required.",
        }, 400);
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (isNaN(latitude) || isNaN(longitude)) {
        return c.json({
            error: "INVALID_COORDINATES",
            message: "'lat' and 'lon' must be valid numbers.",
        }, 400);
    }

    if (latitude < -90 || latitude > 90) {
        return c.json({
            error: "INVALID_LATITUDE",
            message: "'lat' must be between -90 and 90.",
        }, 400);
    }

    if (longitude < -180 || longitude > 180) {
        return c.json({
            error: "INVALID_LONGITUDE",
            message: "'lon' must be between -180 and 180.",
        }, 400);
    }

    // Attach parsed values for downstream use (via Hono state variables)
    c.set("coords", { lat: latitude, lon: longitude });
    await next();
}

/**
 * Validate that start and end date params are provided and valid.
 */
export async function validateDateRange(c, next) {
    const start = c.req.query("start");
    const end = c.req.query("end");

    if (!start || !end) {
        return c.json({
            error: "MISSING_DATE_RANGE",
            message: "Both 'start' and 'end' query parameters are required.",
        }, 400);
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (isNaN(startDate.getTime())) {
        return c.json({
            error: "INVALID_START_DATE",
            message: "'start' must be a valid ISO date string (e.g., 2026-03-03).",
        }, 400);
    }

    if (isNaN(endDate.getTime())) {
        return c.json({
            error: "INVALID_END_DATE",
            message: "'end' must be a valid ISO date string (e.g., 2026-03-04).",
        }, 400);
    }

    if (endDate <= startDate) {
        return c.json({
            error: "INVALID_DATE_RANGE",
            message: "'end' must be after 'start'.",
        }, 400);
    }

    c.set("dateRange", { start: startDate, end: endDate });
    await next();
}
