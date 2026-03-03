// ──────────────────────────────────────────
// Validation Middleware
// ──────────────────────────────────────────

/**
 * Validate that lat and lon query params are present and valid.
 */
export function validateCoordinates(req, res, next) {
    const { lat, lon } = req.query;

    if (lat == null || lon == null) {
        return res.status(400).json({
            error: "MISSING_COORDINATES",
            message: "Both 'lat' and 'lon' query parameters are required.",
        });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (isNaN(latitude) || isNaN(longitude)) {
        return res.status(400).json({
            error: "INVALID_COORDINATES",
            message: "'lat' and 'lon' must be valid numbers.",
        });
    }

    if (latitude < -90 || latitude > 90) {
        return res.status(400).json({
            error: "INVALID_LATITUDE",
            message: "'lat' must be between -90 and 90.",
        });
    }

    if (longitude < -180 || longitude > 180) {
        return res.status(400).json({
            error: "INVALID_LONGITUDE",
            message: "'lon' must be between -180 and 180.",
        });
    }

    // Attach parsed values for downstream use
    req.coords = { lat: latitude, lon: longitude };
    next();
}

/**
 * Validate that start and end date params are provided and valid.
 */
export function validateDateRange(req, res, next) {
    const { start, end } = req.query;

    if (!start || !end) {
        return res.status(400).json({
            error: "MISSING_DATE_RANGE",
            message: "Both 'start' and 'end' query parameters are required.",
        });
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (isNaN(startDate.getTime())) {
        return res.status(400).json({
            error: "INVALID_START_DATE",
            message: "'start' must be a valid ISO date string (e.g., 2026-03-03).",
        });
    }

    if (isNaN(endDate.getTime())) {
        return res.status(400).json({
            error: "INVALID_END_DATE",
            message: "'end' must be a valid ISO date string (e.g., 2026-03-04).",
        });
    }

    if (endDate <= startDate) {
        return res.status(400).json({
            error: "INVALID_DATE_RANGE",
            message: "'end' must be after 'start'.",
        });
    }

    req.dateRange = { start: startDate, end: endDate };
    next();
}
