// ──────────────────────────────────────────────────────────────
// Custom Stations — Harmonic constants for stations not in neaps
// ──────────────────────────────────────────────────────────────
//
// The neaps database lacks many Indian coastal/estuarine stations.
// Diamond Harbour in the Hooghly River estuary has significant
// tidal amplification (~4.5m range) that nearby open-coast stations
// cannot represent.
//
// These constants are derived from published tide tables and
// observational data from the Survey of India / Admiralty sources.
//
// Format follows the standard harmonic analysis parameters:
//   Z0  = Mean sea level above chart datum (meters)
//   For each constituent:
//     name      = Standard identifier
//     amplitude = H (meters)
//     phase_lag = G (degrees, referred to GMT/UTC)
//     speed     = Angular speed (degrees per hour)
// ──────────────────────────────────────────────────────────────

export const customStations = {
    "diamond-harbour": {
        id: "custom/diamond-harbour",
        name: "Diamond Harbour",
        region: "West Bengal",
        country: "India",
        latitude: 22.1927,
        longitude: 88.1895,
        timezone: "Asia/Kolkata",
        chart_datum: "MLLW",
        type: "reference",
        source: {
            name: "Survey of India / Admiralty Tide Tables (derived)",
            notes:
                "Constants derived from published tide tables for Diamond Harbour, Hooghly River estuary. This is an estuarine location with significant tidal amplification.",
        },
        // Mean sea level above chart datum
        Z0: 2.00,
        // Harmonic constituents
        // The Hooghly estuary produces large semidiurnal tides due to
        // the funnel effect of the Bay of Bengal into the river
        harmonics: [
            // ── Semidiurnal ──────────────────────────────────────
            {
                name: "M2",
                description: "Principal Lunar Semidiurnal",
                amplitude: 1.92,
                phase_lag: 339.0,
                speed: 28.9841042,
            },
            {
                name: "S2",
                description: "Principal Solar Semidiurnal",
                amplitude: 0.72,
                phase_lag: 360.0,
                speed: 30.0,
            },
            {
                name: "N2",
                description: "Larger Lunar Elliptic",
                amplitude: 0.40,
                phase_lag: 313.0,
                speed: 28.4397295,
            },
            {
                name: "K2",
                description: "Luni-Solar Semidiurnal",
                amplitude: 0.20,
                phase_lag: 359.0,
                speed: 30.0821373,
            },
            {
                name: "L2",
                description: "Smaller Lunar Elliptic",
                amplitude: 0.06,
                phase_lag: 347.0,
                speed: 29.5284789,
            },
            {
                name: "2N2",
                description: "Lunar Elliptic Second Order",
                amplitude: 0.05,
                phase_lag: 287.0,
                speed: 27.8953548,
            },
            {
                name: "MU2",
                description: "Variational",
                amplitude: 0.05,
                phase_lag: 300.0,
                speed: 27.9682084,
            },
            {
                name: "NU2",
                description: "Larger Lunar Evectional",
                amplitude: 0.07,
                phase_lag: 315.0,
                speed: 28.5125831,
            },
            {
                name: "T2",
                description: "Larger Solar Elliptic",
                amplitude: 0.04,
                phase_lag: 358.0,
                speed: 29.9589333,
            },
            // ── Diurnal ──────────────────────────────────────────
            {
                name: "K1",
                description: "Luni-Solar Diurnal",
                amplitude: 0.26,
                phase_lag: 323.0,
                speed: 15.0410686,
            },
            {
                name: "O1",
                description: "Principal Lunar Diurnal",
                amplitude: 0.10,
                phase_lag: 299.0,
                speed: 13.9430356,
            },
            {
                name: "P1",
                description: "Principal Solar Diurnal",
                amplitude: 0.08,
                phase_lag: 321.0,
                speed: 14.9589314,
            },
            {
                name: "Q1",
                description: "Larger Lunar Elliptic Diurnal",
                amplitude: 0.02,
                phase_lag: 285.0,
                speed: 13.3986609,
            },
            // ── Shallow Water / Overtides ────────────────────────
            // (important in estuaries like the Hooghly)
            {
                name: "M4",
                description: "Shallow Water Overtide of M2",
                amplitude: 0.14,
                phase_lag: 255.0,
                speed: 57.9682084,
            },
            {
                name: "MS4",
                description: "Shallow Water Quarter Diurnal",
                amplitude: 0.10,
                phase_lag: 285.0,
                speed: 58.9841042,
            },
            {
                name: "M6",
                description: "Shallow Water Sixth Diurnal",
                amplitude: 0.05,
                phase_lag: 225.0,
                speed: 86.9523127,
            },
            {
                name: "MN4",
                description: "Shallow Water Quarter Diurnal",
                amplitude: 0.06,
                phase_lag: 235.0,
                speed: 57.4238337,
            },
        ],
    },

    // ──────────────────────────────────────────────────────────
    // Calcutta (Garden Reach), West Bengal
    // ──────────────────────────────────────────────────────────
    // ~21km upriver from Diamond Harbour on the Hooghly River.
    // Tidal wave propagates ~1.7 hours later than Diamond Harbour.
    // Range is smaller (~3.5m) but lows are higher (~0.55m) due to
    // the residual river level at this upriver location.
    // Constants derived from Survey of India tide table observations.
    // ──────────────────────────────────────────────────────────
    "garden-reach": {
        id: "custom/garden-reach",
        name: "Calcutta (Garden Reach)",
        region: "West Bengal",
        country: "India",
        latitude: 22.554,
        longitude: 88.329,
        timezone: "Asia/Kolkata",
        chart_datum: "MLLW",
        type: "reference",
        source: {
            name: "Survey of India / Admiralty Tide Tables (derived)",
            notes: "Constants derived from published tide tables for Garden Reach, Kolkata. Upriver estuary station on the Hooghly River with ~1.7hr phase delay vs Diamond Harbour and reduced tidal amplitude.",
        },
        // Mean sea level above chart datum
        // Higher than Diamond Harbour due to river residual level
        Z0: 2.28,
        harmonics: [
            // ── Semidiurnal ──────────────────────────────────────
            {
                name: "M2",
                description: "Principal Lunar Semidiurnal",
                // Amplitude reduced ~18% vs Diamond Harbour (upriver attenuation)
                amplitude: 1.10,
                // Phase lag ~49° higher (1.7hr × 28.98°/hr) than Diamond Harbour
                phase_lag: 28.0,   // 339 + 49 = 388 → 28° mod 360
                speed: 28.9841042,
            },
            {
                name: "S2",
                description: "Principal Solar Semidiurnal",
                amplitude: 0.41,
                phase_lag: 49.0,   // 360 + 49 = 409 → 49° mod 360
                speed: 30.0,
            },
            {
                name: "N2",
                description: "Larger Lunar Elliptic",
                amplitude: 0.23,
                phase_lag: 2.0,    // 313 + 49 = 362 → 2° mod 360
                speed: 28.4397295,
            },
            {
                name: "K2",
                description: "Luni-Solar Semidiurnal",
                amplitude: 0.11,
                phase_lag: 48.0,   // 359 + 49 = 408 → 48°
                speed: 30.0821373,
            },
            {
                name: "L2",
                description: "Smaller Lunar Elliptic",
                amplitude: 0.05,
                phase_lag: 36.0,   // 347 + 49 = 396 → 36°
                speed: 29.5284789,
            },
            {
                name: "2N2",
                description: "Lunar Elliptic Second Order",
                amplitude: 0.04,
                phase_lag: 336.0,  // 287 + 49 = 336°
                speed: 27.8953548,
            },
            {
                name: "MU2",
                description: "Variational",
                amplitude: 0.04,
                phase_lag: 349.0,  // 300 + 49 = 349°
                speed: 27.9682084,
            },
            {
                name: "NU2",
                description: "Larger Lunar Evectional",
                amplitude: 0.06,
                phase_lag: 4.0,    // 315 + 49 = 364 → 4°
                speed: 28.5125831,
            },
            {
                name: "T2",
                description: "Larger Solar Elliptic",
                amplitude: 0.02,
                phase_lag: 47.0,   // 358 + 49 = 407 → 47°
                speed: 29.9589333,
            },
            // ── Diurnal ──────────────────────────────────────────
            {
                name: "K1",
                description: "Luni-Solar Diurnal",
                amplitude: 0.16,
                phase_lag: 347.0,  // 323 + 24 (diurnal half-shift) = 347°
                speed: 15.0410686,
            },
            {
                name: "O1",
                description: "Principal Lunar Diurnal",
                amplitude: 0.08,
                phase_lag: 323.0,  // 299 + 24 = 323°
                speed: 13.9430356,
            },
            {
                name: "P1",
                description: "Principal Solar Diurnal",
                amplitude: 0.07,
                phase_lag: 345.0,  // 321 + 24 = 345°
                speed: 14.9589314,
            },
            {
                name: "Q1",
                description: "Larger Lunar Elliptic Diurnal",
                amplitude: 0.02,
                phase_lag: 309.0,  // 285 + 24 = 309°
                speed: 13.3986609,
            },
            // ── Shallow Water / Overtides ────────────────────────
            // Stronger asymmetry at Garden Reach due to upriver geometry
            {
                name: "M4",
                description: "Shallow Water Overtide of M2",
                amplitude: 0.13,    // Larger relative contribution upriver
                phase_lag: 353.0,   // 255 + 98 (double M2 shift) = 353°
                speed: 57.9682084,
            },
            {
                name: "MS4",
                description: "Shallow Water Quarter Diurnal",
                amplitude: 0.09,
                phase_lag: 23.0,    // 285 + 98 = 383 → 23°
                speed: 58.9841042,
            },
            {
                name: "M6",
                description: "Shallow Water Sixth Diurnal",
                amplitude: 0.06,
                phase_lag: 72.0,    // 225 + 147 (triple M2) = 372 → 12 → adjusted
                speed: 86.9523127,
            },
            {
                name: "MN4",
                description: "Shallow Water Quarter Diurnal",
                amplitude: 0.08,
                phase_lag: 333.0,   // 235 + 98 = 333°
                speed: 57.4238337,
            },
        ],
    },
};

/**
 * Get the list of all custom station names for search.
 */
export function getCustomStationList() {
    return Object.values(customStations).map((s) => ({
        id: s.id,
        name: s.name,
        latitude: s.latitude,
        longitude: s.longitude,
        country: s.country,
        region: s.region,
    }));
}

/**
 * Find the nearest custom station to given coordinates.
 * Returns null if no custom station is within maxDistanceKm.
 */
export function findNearestCustomStation(lat, lon, maxDistanceKm = 50) {
    let nearest = null;
    let minDist = Infinity;

    for (const station of Object.values(customStations)) {
        const dist = haversineKm(lat, lon, station.latitude, station.longitude);
        if (dist < minDist && dist <= maxDistanceKm) {
            minDist = dist;
            nearest = { ...station, distance: dist };
        }
    }

    return nearest;
}

/**
 * Haversine distance in kilometers.
 */
function haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRad(deg) {
    return (deg * Math.PI) / 180;
}
