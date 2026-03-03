// ─────────────────────────────────────────────────────────────────
// Correction Engine — Combines Layer 1 (harmonic) + Layer 2 (meteo)
// ─────────────────────────────────────────────────────────────────
import { getCurrentWaterLevel } from "./tideService.js";
import { getCurrentWeather } from "./weatherService.js";

// ── Physical Constants ──────────────────────────────────────────
const STANDARD_PRESSURE_HPA = 1013.25; // standard atmospheric pressure
const SEAWATER_DENSITY = 1025; // kg/m³
const GRAVITY = 9.81; // m/s²

// Empirical wind setup drag coefficient (simplified)
// Typical range: 1e-6 to 3e-6 for open coast
const WIND_DRAG_COEFFICIENT = 2e-6;

// Assumed average coastal shelf depth for wind setup calculation (meters)
const ASSUMED_DEPTH = 20;

/**
 * Inverse Barometer Effect
 * ────────────────────────
 * Δh = (P_standard - P_actual) / (ρ × g)
 *
 * Lower pressure → higher water (storms)
 * Higher pressure → lower water (fair weather)
 *
 * ≈ −1 cm per +1 hPa above standard
 *
 * @param {number} pressureMsl — pressure at mean sea level in hPa
 * @returns {number} — height correction in meters
 */
function inverseBarometerCorrection(pressureMsl) {
    const deltaPressure = STANDARD_PRESSURE_HPA - pressureMsl; // hPa
    // Convert hPa to Pa (×100), then divide by ρg
    return (deltaPressure * 100) / (SEAWATER_DENSITY * GRAVITY);
}

/**
 * Wind Setup (simplified coastal model)
 * ──────────────────────────────────────
 * Δh = C_d × (W²) / (g × D)
 *
 * Uses only the onshore component of wind (cos of direction).
 * Direction convention: 0°=N, 90°=E, 180°=S, 270°=W
 *
 * For simplicity, we assume the worst case where wind blows
 * directly onshore. In a production system, you'd want the actual
 * coastline orientation at the station.
 *
 * @param {number} windSpeedKmh — wind speed in km/h
 * @param {number} windDirection — wind direction in degrees (meteorological)
 * @returns {number} — height correction in meters
 */
function windSetupCorrection(windSpeedKmh, windDirection) {
    // Convert km/h to m/s
    const windSpeedMs = windSpeedKmh / 3.6;

    // Simplified: we take the full wind speed magnitude
    // A more advanced model would project onto the shore-normal vector
    const windSetup =
        (WIND_DRAG_COEFFICIENT * windSpeedMs * windSpeedMs) /
        (GRAVITY * ASSUMED_DEPTH);

    return windSetup;
}

/**
 * Get the fully corrected water level at coordinates.
 *
 * Combines:
 *  - Layer 1: Astronomical (harmonic) prediction via neaps
 *  - Layer 2: Meteorological corrections (pressure + wind) via Open-Meteo
 *
 * @returns Full prediction breakdown
 */
export async function getCorrectedWaterLevel(lat, lon, options = {}) {
    // ── Layer 1: Harmonic prediction ──────────────────────
    const harmonic = getCurrentWaterLevel(lat, lon, options);

    // ── Layer 2: Weather data ─────────────────────────────
    let weather = null;
    let pressureCorrection = 0;
    let windCorrection = 0;

    try {
        weather = await getCurrentWeather(lat, lon);

        // Inverse barometer effect
        if (weather.pressure_msl != null) {
            pressureCorrection = inverseBarometerCorrection(weather.pressure_msl);
        }

        // Wind setup
        if (weather.wind_speed != null && weather.wind_direction != null) {
            windCorrection = windSetupCorrection(
                weather.wind_speed,
                weather.wind_direction
            );
        }
    } catch (err) {
        // If weather API fails, fall back to harmonic-only
        console.warn(
            `[CorrectionEngine] Weather fetch failed, using harmonic only: ${err.message}`
        );
    }

    // ── Combined result ───────────────────────────────────
    const totalCorrection = pressureCorrection + windCorrection;
    const correctedLevel = harmonic.level + totalCorrection;

    return {
        station: harmonic.station,
        time: harmonic.time,
        prediction: {
            astronomical: round6(harmonic.level),
            corrections: {
                pressure: round6(pressureCorrection),
                wind: round6(windCorrection),
                total: round6(totalCorrection),
            },
            corrected: round6(correctedLevel),
            units: harmonic.units,
            datum: harmonic.datum,
        },
        weather: weather
            ? {
                pressure_msl: weather.pressure_msl,
                wind_speed: weather.wind_speed,
                wind_direction: weather.wind_direction,
                temperature: weather.temperature,
            }
            : null,
        meta: {
            layers: weather ? ["harmonic", "meteorological"] : ["harmonic"],
            note: weather
                ? "Corrected with inverse barometer effect and wind setup"
                : "Weather data unavailable; harmonic prediction only",
        },
    };
}

/**
 * Apply meteorological corrections to a full timeline.
 * Uses a single weather snapshot (conditions don't change fast enough
 * to warrant per-point fetching for hourly timelines).
 */
export async function getCorrectedTimeline(
    lat,
    lon,
    start,
    end,
    options = {}
) {
    // Import dynamically to avoid circular at module level
    const { getTideTimeline } = await import("./tideService.js");
    const timeline = getTideTimeline(lat, lon, start, end, options);

    let weather = null;
    let pressureCorrection = 0;
    let windCorrection = 0;

    try {
        weather = await getCurrentWeather(lat, lon);
        if (weather.pressure_msl != null) {
            pressureCorrection = inverseBarometerCorrection(weather.pressure_msl);
        }
        if (weather.wind_speed != null) {
            windCorrection = windSetupCorrection(
                weather.wind_speed,
                weather.wind_direction
            );
        }
    } catch (err) {
        console.warn(
            `[CorrectionEngine] Weather fetch failed for timeline: ${err.message}`
        );
    }

    const totalCorrection = pressureCorrection + windCorrection;

    return {
        station: timeline.station,
        units: timeline.units,
        datum: timeline.datum,
        corrections: {
            pressure: round6(pressureCorrection),
            wind: round6(windCorrection),
            total: round6(totalCorrection),
        },
        weather: weather
            ? {
                pressure_msl: weather.pressure_msl,
                wind_speed: weather.wind_speed,
                wind_direction: weather.wind_direction,
            }
            : null,
        timeline: timeline.timeline.map((point) => ({
            time: point.time,
            astronomical: round6(point.level),
            corrected: round6(point.level + totalCorrection),
        })),
    };
}

/**
 * Round to 6 decimal places (sub-mm precision for meters).
 */
function round6(n) {
    return Math.round(n * 1e6) / 1e6;
}
