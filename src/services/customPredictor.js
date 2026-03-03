// ──────────────────────────────────────────────────────────────────
// Custom Harmonic Predictor
// ──────────────────────────────────────────────────────────────────
// Implements the core tidal prediction formula:
//
//   h(t) = Z₀ + Σ fᵢ·Hᵢ·cos(aᵢ·t + (V₀+u)ᵢ − Gᵢ)
//
// Where:
//   Z₀  = Mean sea level above chart datum
//   fᵢ  = Nodal factor (18.6-year lunar node cycle correction)
//   Hᵢ  = Amplitude of constituent i (meters)
//   aᵢ  = Angular speed of constituent i (degrees/hour)
//   t   = Hours since the start of the year
//   V₀+u = Equilibrium argument at epoch
//   Gᵢ  = Phase lag (degrees)
//
// Nodal factors and equilibrium arguments are calculated using
// astronomical algorithms based on the year.
// ──────────────────────────────────────────────────────────────────

const DEG_TO_RAD = Math.PI / 180;

/**
 * Calculate the tide height at a specific time using harmonic constants.
 *
 * @param {Object} station — Custom station with Z0 and harmonics[]
 * @param {Date} time — The target time
 * @returns {number} — Tide height in meters above chart datum
 */
export function predictTideHeight(station, time) {
    const year = time.getUTCFullYear();
    const epochStart = new Date(Date.UTC(year, 0, 1, 0, 0, 0)); // Jan 1 00:00 UTC
    const t = (time.getTime() - epochStart.getTime()) / (1000 * 3600); // hours since epoch

    const astro = computeAstronomicalParams(time);

    let height = station.Z0;

    for (const constituent of station.harmonics) {
        const f = getNodalFactor(constituent.name, astro);
        const V0u = getEquilibriumArgument(constituent.name, astro, t);

        const argument =
            constituent.speed * t + V0u - constituent.phase_lag;

        height +=
            f * constituent.amplitude * Math.cos(argument * DEG_TO_RAD);
    }

    return height;
}

/**
 * Predict tide extremes (highs and lows) in a date range.
 *
 * Uses a scan-and-refine approach:
 * 1. Scan at 6-minute intervals to find approximate extremes
 * 2. Refine with bisection to find precise turning points
 */
export function predictTideExtremes(station, start, end) {
    const SCAN_INTERVAL_MS = 6 * 60 * 1000; // 6 minutes
    const extremes = [];

    let prevLevel = predictTideHeight(station, start);
    let prevPrevLevel = prevLevel;
    let prevTime = start.getTime();

    for (
        let t = start.getTime() + SCAN_INTERVAL_MS;
        t <= end.getTime();
        t += SCAN_INTERVAL_MS
    ) {
        const time = new Date(t);
        const level = predictTideHeight(station, time);

        // Check if previous point was a local extremum
        if (
            (prevLevel > prevPrevLevel && prevLevel > level) ||
            (prevLevel < prevPrevLevel && prevLevel < level)
        ) {
            // Refine using golden section search
            const refined = refineExtreme(
                station,
                new Date(prevTime - SCAN_INTERVAL_MS),
                new Date(prevTime + SCAN_INTERVAL_MS),
                prevLevel > level // isHigh
            );

            extremes.push({
                time: refined.time,
                level: Math.round(refined.level * 1e6) / 1e6,
                high: refined.isHigh,
                low: !refined.isHigh,
                label: refined.isHigh ? "High" : "Low",
            });
        }

        prevPrevLevel = prevLevel;
        prevLevel = level;
        prevTime = t;
    }

    return extremes;
}

/**
 * Generate a timeline of water levels for graphing.
 */
export function predictTideTimeline(station, start, end, intervalSec = 600) {
    const timeline = [];
    const intervalMs = intervalSec * 1000;

    for (
        let t = start.getTime();
        t <= end.getTime();
        t += intervalMs
    ) {
        const time = new Date(t);
        const level = predictTideHeight(station, time);
        timeline.push({
            time: time.toISOString(),
            level: Math.round(level * 1e6) / 1e6,
        });
    }

    return timeline;
}

// ── Astronomical Parameters ─────────────────────────────────

/**
 * Compute astronomical parameters needed for nodal factors
 * and equilibrium arguments.
 *
 * Based on Schureman (1958) formulations.
 */
function computeAstronomicalParams(time) {
    const year = time.getUTCFullYear();
    const startOfYear = new Date(Date.UTC(year, 0, 1));
    const dayOfYear =
        (time.getTime() - startOfYear.getTime()) / (1000 * 86400);

    // Julian century from J2000.0
    const jd =
        2451545.0 +
        (Date.UTC(year, 0, 1) - Date.UTC(2000, 0, 1, 12)) / 86400000 +
        dayOfYear;
    const T = (jd - 2451545.0) / 36525.0;

    // Mean longitude of the Moon
    const s = mod360(
        218.3164477 +
        481267.88123421 * T -
        0.0015786 * T * T +
        (T * T * T) / 538841 -
        (T * T * T * T) / 65194000
    );

    // Mean longitude of the Sun
    const h = mod360(
        280.46646 + 36000.76983 * T + 0.0003032 * T * T
    );

    // Mean longitude of the lunar perigee
    const p = mod360(
        83.3532465 +
        4069.0137287 * T -
        0.0103200 * T * T -
        (T * T * T) / 80053 +
        (T * T * T * T) / 18999000
    );

    // Mean longitude of the ascending lunar node
    const N = mod360(
        125.0445479 -
        1934.1362891 * T +
        0.0020754 * T * T +
        (T * T * T) / 467441 -
        (T * T * T * T) / 60616000
    );

    // Mean longitude of solar perigee
    const pp = mod360(282.9373 + 1.7195 * T);

    const NRad = N * DEG_TO_RAD;

    return { s, h, p, N, NRad, pp, T, year, dayOfYear };
}

// ── Nodal Factors ───────────────────────────────────────────

/**
 * Get the nodal modulation factor f for a given constituent.
 * These approximate the 18.6-year lunar nodal cycle effect.
 */
function getNodalFactor(name, astro) {
    const cosN = Math.cos(astro.NRad);
    const cos2N = Math.cos(2 * astro.NRad);
    const sinN = Math.sin(astro.NRad);

    switch (name) {
        case "M2":
        case "N2":
        case "2N2":
        case "NU2":
        case "MU2":
        case "L2":
            // f = 1 - 0.037·cos(N)
            return 1.0 - 0.037 * cosN;

        case "S2":
        case "T2":
            return 1.0; // No nodal correction

        case "K2":
            return 1.0 + 0.286 * cosN;

        case "K1":
            return 1.006 + 0.115 * cosN;

        case "O1":
        case "Q1":
            return 1.009 + 0.187 * cosN;

        case "P1":
            return 1.0; // No nodal correction

        case "M4":
        case "MN4":
            // f(M4) = f(M2)²
            const fM2 = 1.0 - 0.037 * cosN;
            return fM2 * fM2;

        case "MS4":
            // f(MS4) = f(M2) × f(S2) = f(M2)
            return 1.0 - 0.037 * cosN;

        case "M6":
            const fM2_ = 1.0 - 0.037 * cosN;
            return fM2_ * fM2_ * fM2_;

        default:
            return 1.0;
    }
}

// ── Equilibrium Arguments ───────────────────────────────────

/**
 * Get the equilibrium argument (V₀ + u) for a constituent.
 * This is the theoretical phase at t=0 adjusted for nodal corrections.
 *
 * Based on Schureman (1958) and Foreman (1977).
 */
function getEquilibriumArgument(name, astro, _t) {
    const { s, h, p, N } = astro;
    const NRad = astro.NRad;
    const sinN = Math.sin(NRad);
    const sin2N = Math.sin(2 * NRad);

    // u (nodal angle correction in degrees)
    let u = 0;
    // V0 (equilibrium phase at epoch)
    let V0 = 0;

    switch (name) {
        case "M2":
            V0 = 2 * (h - s);
            u = -2.14 * sinN;
            break;
        case "S2":
            V0 = 0;
            u = 0;
            break;
        case "N2":
            V0 = 2 * h - 3 * s + p;
            u = -2.14 * sinN;
            break;
        case "K2":
            V0 = 2 * h;
            u = -17.74 * sinN;
            break;
        case "L2":
            V0 = 2 * h - s + p;
            u = -2.14 * sinN;
            break;
        case "2N2":
            V0 = 2 * (h - 2 * s + p);
            u = -2.14 * sinN;
            break;
        case "MU2":
            V0 = 2 * (2 * h - 2 * s);
            u = -2.14 * sinN;
            break;
        case "NU2":
            V0 = 2 * h - 3 * s + 4.5 * p - 2.5 * N;
            u = -2.14 * sinN;
            break;
        case "T2":
            V0 = -h + astro.pp;
            u = 0;
            break;
        case "K1":
            V0 = h + 90;
            u = -8.86 * sinN;
            break;
        case "O1":
            V0 = h - 2 * s - 90;
            u = 10.80 * sinN;
            break;
        case "P1":
            V0 = -h + 270;
            u = 0;
            break;
        case "Q1":
            V0 = h - 3 * s + p - 90;
            u = 10.80 * sinN;
            break;
        case "M4":
            V0 = 4 * (h - s);
            u = -4.28 * sinN;
            break;
        case "MS4":
            V0 = 2 * (2 * h - s);
            u = -2.14 * sinN;
            break;
        case "M6":
            V0 = 6 * (h - s);
            u = -6.42 * sinN;
            break;
        case "MN4":
            V0 = 4 * h - 5 * s + p;
            u = -4.28 * sinN;
            break;
        default:
            V0 = 0;
            u = 0;
    }

    return mod360(V0 + u);
}

// ── Refinement ──────────────────────────────────────────────

/**
 * Refine an extreme (high or low) using golden section search.
 */
function refineExtreme(station, startTime, endTime, isHigh) {
    const GOLDEN = 0.618033988749895;
    let a = startTime.getTime();
    let b = endTime.getTime();

    for (let i = 0; i < 30; i++) {
        // ~1-second precision
        const d = GOLDEN * (b - a);
        const t1 = a + d;
        const t2 = b - d;

        const h1 = predictTideHeight(station, new Date(t1));
        const h2 = predictTideHeight(station, new Date(t2));

        if (isHigh) {
            if (h1 > h2) {
                a = t2;
            } else {
                b = t1;
            }
        } else {
            if (h1 < h2) {
                a = t2;
            } else {
                b = t1;
            }
        }
    }

    const midTime = new Date((a + b) / 2);
    const level = predictTideHeight(station, midTime);

    return { time: midTime.toISOString(), level, isHigh };
}

// ── Utilities ───────────────────────────────────────────────

function mod360(angle) {
    return ((angle % 360) + 360) % 360;
}
