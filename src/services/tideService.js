// ─────────────────────────────────────────────────────────────────
// Tide Service — Layer 1: Harmonic Prediction
// ─────────────────────────────────────────────────────────────────
// Hybrid approach:
//   1. First checks custom stations (like Diamond Harbour)
//   2. Falls back to Cloudflare D1 with an in-memory geo-index
// ─────────────────────────────────────────────────────────────────
import { createTidePredictor } from "@neaps/tide-predictor";
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
import stationsIndex from "../data/stations_index.json";

// Maximum distance (km) within which a custom station is preferred
const CUSTOM_STATION_MAX_DISTANCE_KM = 50;

/**
 * Format a station object for consistent API response.
 */
function formatStation(station, distance, source = "neaps") {
  return {
    id: station.id || station.source?.id,
    name: station.name,
    latitude: station.lat || station.latitude,
    longitude: station.lon || station.longitude,
    distance: distance,
    source: source,
  };
}

function degreesToRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

/**
 * Haversine distance in km.
 */
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = degreesToRadians(lat2 - lat1);
  const dLon = degreesToRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(degreesToRadians(lat1)) *
    Math.cos(degreesToRadians(lat2)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Find a station by its ID (checks custom first, then D1).
 */
export async function getStationById(env, id) {
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

  // Fall back to D1
  const { results } = await env.TIDE_DB.prepare("SELECT data FROM stations WHERE id = ?").bind(id).all();
  if (!results || results.length === 0) return null;
  const stationData = JSON.parse(results[0].data);
  return {
    id: stationData.id || stationData.source?.id,
    name: stationData.name,
    latitude: stationData.lat || stationData.latitude,
    longitude: stationData.lon || stationData.longitude,
    source: "neaps",
  };
}

/**
 * Find nearby tide stations using the lightweight JSON index.
 */
export function getNearbyStations(lat, lon, count = 5) {
  const latF = parseFloat(lat);
  const lonF = parseFloat(lon);

  // Get neaps stations from in-memory index
  const distances = stationsIndex.map(s => {
    const dist = haversineKm(latF, lonF, s.lat, s.lon);
    return { ...s, distance: dist * 1000, distanceKm: +dist.toFixed(2), source: "neaps" };
  });

  const neapsStations = distances
    .sort((a, b) => a.distance - b.distance)
    .slice(0, parseInt(count));

  // Get custom stations
  const customList = getCustomStationList().map((s) => {
    const dist = haversineKm(latF, lonF, s.latitude, s.longitude);
    return {
      ...s,
      lat: s.latitude,
      lon: s.longitude,
      distance: dist * 1000,
      distanceKm: +dist.toFixed(2),
      source: "custom",
    };
  });

  // Merge and sort by distance
  const all = [...neapsStations, ...customList]
    .sort((a, b) => a.distance - b.distance)
    .slice(0, parseInt(count))
    .map(s => ({
      id: s.id,
      name: s.name,
      latitude: s.lat,
      longitude: s.lon,
      distance: s.distance,
      distanceKm: s.distanceKm,
      source: s.source
    }));

  return all;
}

// Helper to fetch full station data from D1 SQLite
async function fetchNeapsStation(env, id) {
  const { results } = await env.TIDE_DB.prepare("SELECT data FROM stations WHERE id = ?").bind(id).all();
  if (!results || results.length === 0) throw new Error(`Station not found: ${id}`);
  return JSON.parse(results[0].data);
}

// Helper to create predictor
function createPredictorForStation(stationData, datum) {
  const datums = stationData.datums;
  let offset = 0;
  if (datum && datums) {
    const datumOffset = datums[datum];
    const mslOffset = datums["MSL"];
    if (datumOffset !== undefined && mslOffset !== undefined) {
      offset = mslOffset - datumOffset;
    }
  }
  return createTidePredictor(stationData.harmonic_constituents, { offset, nodeCorrections: stationData.nodeCorrections });
}

// Convert units
function processNeapsResult(prediction, units) {
  const FEET_PER_METER = 3.2808399;
  let level = prediction.level;
  if (units === "feet") level *= FEET_PER_METER;
  return { ...prediction, level };
}

/**
 * Get the current astronomical water level at coordinates.
 */
export async function getCurrentWaterLevel(env, lat, lon, options = {}) {
  const { datum, units = "meters" } = options;
  const latF = parseFloat(lat);
  const lonF = parseFloat(lon);

  // 1. Check custom stations
  const custom = findNearestCustomStation(latF, lonF, CUSTOM_STATION_MAX_DISTANCE_KM);
  if (custom) {
    const now = new Date();
    const level = predictTideHeight(custom, now);
    return {
      level,
      time: now.toISOString(),
      units: units || "meters",
      datum: custom.chart_datum || datum || "MLLW",
      station: formatStation(custom, custom.distance, "custom"),
      engine: "custom-harmonic",
    };
  }

  // 2. Finding nearest from index
  const nearestMeta = getNearbyStations(latF, lonF, 1)[0];
  if (!nearestMeta) throw new Error("No nearby stations found");

  // 3. Fetch from D1
  const stationData = await fetchNeapsStation(env, nearestMeta.id);

  if (stationData.type === "subordinate" && stationData.offsets?.reference) {
    const refData = await fetchNeapsStation(env, stationData.offsets.reference);
    stationData.harmonic_constituents = refData.harmonic_constituents;
    stationData.datums = refData.datums;
  }

  // 4. Predict
  const predictor = createPredictorForStation(stationData, datum || stationData.chart_datum || stationData.defaultDatum);
  const prediction = predictor.getWaterLevelAtTime({ time: new Date(), offsets: stationData.offsets });
  const processed = processNeapsResult(prediction, units);

  return {
    level: processed.level,
    time: processed.time,
    units,
    datum: datum || stationData.chart_datum || stationData.defaultDatum || "MLLW",
    station: formatStation(nearestMeta, nearestMeta.distance, "neaps"),
    engine: "neaps",
  };
}

/**
 * Get tide extremes for graphing/display
 */
export async function getTideExtremes(env, lat, lon, start, end, options = {}) {
  const { datum, units = "meters" } = options;
  const latF = parseFloat(lat);
  const lonF = parseFloat(lon);

  const custom = findNearestCustomStation(latF, lonF, CUSTOM_STATION_MAX_DISTANCE_KM);
  if (custom) {
    const extremes = predictTideExtremes(custom, new Date(start), new Date(end));
    return {
      extremes,
      units: units || "meters",
      datum: custom.chart_datum || datum || "MLLW",
      station: formatStation(custom, custom.distance, "custom"),
      engine: "custom-harmonic",
    };
  }

  const nearestMeta = getNearbyStations(latF, lonF, 1)[0];
  if (!nearestMeta) throw new Error("No nearby stations found");

  const stationData = await fetchNeapsStation(env, nearestMeta.id);
  if (stationData.type === "subordinate" && stationData.offsets?.reference) {
    const refData = await fetchNeapsStation(env, stationData.offsets.reference);
    stationData.harmonic_constituents = refData.harmonic_constituents;
    stationData.datums = refData.datums;
  }

  const predictor = createPredictorForStation(stationData, datum || stationData.chart_datum || stationData.defaultDatum);
  const prediction = predictor.getExtremesPrediction({ start: new Date(start), end: new Date(end), offsets: stationData.offsets });
  const extremes = prediction.map(p => processNeapsResult(p, units));

  return {
    extremes,
    units,
    datum: datum || stationData.chart_datum || stationData.defaultDatum || "MLLW",
    station: formatStation(nearestMeta, nearestMeta.distance, "neaps"),
    engine: "neaps",
  };
}

/**
 * Get tide timeline for graphing/display
 */
export async function getTideTimeline(env, lat, lon, start, end, options = {}) {
  const { datum, units = "meters", interval = 600 } = options;
  const latF = parseFloat(lat);
  const lonF = parseFloat(lon);

  const custom = findNearestCustomStation(latF, lonF, CUSTOM_STATION_MAX_DISTANCE_KM);
  if (custom) {
    const timeline = predictTideTimeline(custom, new Date(start), new Date(end), parseInt(interval));
    return {
      timeline,
      units: units || "meters",
      datum: custom.chart_datum || datum || "MLLW",
      station: formatStation(custom, custom.distance, "custom"),
      engine: "custom-harmonic",
    };
  }

  const nearestMeta = getNearbyStations(latF, lonF, 1)[0];
  if (!nearestMeta) throw new Error("No nearby stations found");

  const stationData = await fetchNeapsStation(env, nearestMeta.id);
  if (stationData.type === "subordinate" && stationData.offsets?.reference) {
    const refData = await fetchNeapsStation(env, stationData.offsets.reference);
    stationData.harmonic_constituents = refData.harmonic_constituents;
    stationData.datums = refData.datums;
  }

  const predictor = createPredictorForStation(stationData, datum || stationData.chart_datum || stationData.defaultDatum);
  const prediction = predictor.getTimelinePrediction({ start: new Date(start), end: new Date(end), timeFidelity: parseInt(interval), offsets: stationData.offsets });
  const timeline = prediction.map(p => processNeapsResult(p, units));

  return {
    timeline,
    units,
    datum: datum || stationData.chart_datum || stationData.defaultDatum || "MLLW",
    station: formatStation(nearestMeta, nearestMeta.distance, "neaps"),
    engine: "neaps",
  };
}
