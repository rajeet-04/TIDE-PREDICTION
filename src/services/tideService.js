// ─────────────────────────────────────────────────────────────────
// Tide Service — Layer 1: Harmonic Prediction
// ─────────────────────────────────────────────────────────────────
// Hybrid approach:
//   1. First checks custom stations (like Diamond Harbour)
//   2. Falls back to the neaps library for all other locations
// ─────────────────────────────────────────────────────────────────
import {
  getWaterLevelAtTime,
  getExtremesPrediction,
  getTimelinePrediction,
  nearestStation,
  stationsNear,
  findStation,
} from "neaps";
import {
  findNearestCustomStation,
  customStations,
  getCustomStationList,
} from "../data/customStations.js";
import {
  predictTideHeight,
  predictTideExtremes,
  predictTideTimeline,
} from "./customPredictor.js";

// Maximum distance (km) within which a custom station is preferred
const CUSTOM_STATION_MAX_DISTANCE_KM = 50;

/**
 * Format a station object for consistent API response.
 */
function formatStation(station, distance) {
  return {
    id: station.id || station.source?.id,
    name: station.name,
    latitude: station.lat || station.latitude,
    longitude: station.lon || station.longitude,
    distance: distance,
    source: station.source?.name || "neaps",
  };
}

/**
 * Get the current astronomical water level at coordinates.
 *
 * Priority: custom station → neaps database
 */
export function getCurrentWaterLevel(lat, lon, options = {}) {
  const { datum, units = "meters" } = options;
  const latF = parseFloat(lat);
  const lonF = parseFloat(lon);

  // ── Check custom stations first ──────────────────────
  const custom = findNearestCustomStation(
    latF,
    lonF,
    CUSTOM_STATION_MAX_DISTANCE_KM
  );

  if (custom) {
    const now = new Date();
    const level = predictTideHeight(custom, now);
    return {
      level,
      time: now.toISOString(),
      units: units || "meters",
      datum: custom.chart_datum || datum || "MLLW",
      station: formatStation(custom, custom.distance),
      engine: "custom-harmonic",
    };
  }

  // ── Fallback to neaps ────────────────────────────────
  const params = { lat: latF, lon: lonF, time: new Date(), units };
  if (datum) params.datum = datum;

  const result = getWaterLevelAtTime(params);
  return {
    level: result.level,
    time: result.time,
    units: result.units,
    datum: result.datum,
    station: result.station
      ? formatStation(result.station, result.distance)
      : null,
    engine: "neaps",
  };
}

/**
 * Get tide extremes (highs and lows) for a date range.
 */
export function getTideExtremes(lat, lon, start, end, options = {}) {
  const { datum, units = "meters" } = options;
  const latF = parseFloat(lat);
  const lonF = parseFloat(lon);

  // ── Check custom stations first ──────────────────────
  const custom = findNearestCustomStation(
    latF,
    lonF,
    CUSTOM_STATION_MAX_DISTANCE_KM
  );

  if (custom) {
    const extremes = predictTideExtremes(
      custom,
      new Date(start),
      new Date(end)
    );
    return {
      extremes,
      units: units || "meters",
      datum: custom.chart_datum || datum || "MLLW",
      station: formatStation(custom, custom.distance),
      engine: "custom-harmonic",
    };
  }

  // ── Fallback to neaps ────────────────────────────────
  const params = {
    lat: latF,
    lon: lonF,
    start: new Date(start),
    end: new Date(end),
    units,
  };
  if (datum) params.datum = datum;

  const result = getExtremesPrediction(params);
  return {
    extremes: result.extremes,
    units: result.units,
    datum: result.datum,
    station: result.station
      ? formatStation(result.station, result.distance)
      : null,
    engine: "neaps",
  };
}

/**
 * Get a timeline of water levels for graphing.
 */
export function getTideTimeline(lat, lon, start, end, options = {}) {
  const { datum, units = "meters", interval = 600 } = options;
  const latF = parseFloat(lat);
  const lonF = parseFloat(lon);

  // ── Check custom stations first ──────────────────────
  const custom = findNearestCustomStation(
    latF,
    lonF,
    CUSTOM_STATION_MAX_DISTANCE_KM
  );

  if (custom) {
    const timeline = predictTideTimeline(
      custom,
      new Date(start),
      new Date(end),
      parseInt(interval)
    );
    return {
      timeline,
      units: units || "meters",
      datum: custom.chart_datum || datum || "MLLW",
      station: formatStation(custom, custom.distance),
      engine: "custom-harmonic",
    };
  }

  // ── Fallback to neaps ────────────────────────────────
  const params = {
    lat: latF,
    lon: lonF,
    start: new Date(start),
    end: new Date(end),
    timeFidelity: parseInt(interval),
    units,
  };
  if (datum) params.datum = datum;

  const result = getTimelinePrediction(params);
  return {
    timeline: result.timeline,
    units: result.units,
    datum: result.datum,
    station: result.station
      ? formatStation(result.station, result.distance)
      : null,
    engine: "neaps",
  };
}

/**
 * Find nearby tide stations (includes custom stations).
 */
export function getNearbyStations(lat, lon, count = 5) {
  const latF = parseFloat(lat);
  const lonF = parseFloat(lon);

  // Get neaps stations
  const neapsStations = stationsNear(
    { lat: latF, lon: lonF },
    parseInt(count)
  ).map((s) => ({
    id: s.id || s.source?.id,
    name: s.name,
    latitude: s.lat || s.latitude,
    longitude: s.lon || s.longitude,
    distance: s.distance,
    distanceKm: s.distance ? +(s.distance / 1000).toFixed(2) : null,
    source: "neaps",
  }));

  // Get custom stations
  const customList = getCustomStationList().map((s) => {
    const dist = haversineKm(latF, lonF, s.latitude, s.longitude);
    return {
      ...s,
      distance: dist * 1000, // meters
      distanceKm: +dist.toFixed(2),
      source: "custom",
    };
  });

  // Merge and sort by distance
  const all = [...neapsStations, ...customList]
    .sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity))
    .slice(0, parseInt(count));

  return all;
}

/**
 * Find a station by its ID (checks custom first, then neaps).
 */
export function getStationById(id) {
  // Check custom stations
  for (const station of Object.values(customStations)) {
    if (station.id === id) {
      return {
        id: station.id,
        name: station.name,
        latitude: station.latitude,
        longitude: station.longitude,
        country: station.country,
        region: station.region,
        source: "custom",
        chart_datum: station.chart_datum,
        harmonics_count: station.harmonics.length,
      };
    }
  }

  // Fall back to neaps
  const station = findStation(id);
  if (!station) return null;

  return {
    id: station.id || station.source?.id,
    name: station.name,
    latitude: station.lat || station.latitude,
    longitude: station.lon || station.longitude,
    source: "neaps",
  };
}

/**
 * Haversine distance in km.
 */
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}
