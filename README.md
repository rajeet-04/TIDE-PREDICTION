# 🌊 TIDE Backend

Real-time tidal prediction API with **harmonic analysis + meteorological corrections**. Built for Indian coastal and estuarine stations, with global fallback coverage via 7,600+ stations.

---

## Features

| Feature | Description |
|---------|-------------|
| **Layer 1 — Harmonic Prediction** | Astronomical tidal heights from harmonic constants using the formula `h(t) = Z₀ + Σ fᵢ·Hᵢ·cos(aᵢt + (V₀+u)ᵢ − Gᵢ)` |
| **Layer 2 — Meteorological Correction** | Real-time inverse barometer effect (pressure) + wind setup from Open-Meteo |
| **Custom Indian Stations** | Diamond Harbour & Calcutta (Garden Reach) — estuarine stations with 17 harmonic constituents including shallow-water overtides |
| **Global Fallback** | 7,600+ stations via the `neaps` library for any coordinate not near a custom station |
| **Tide Extremes** | High/low tide times and heights with ~1-second precision (golden-section refinement) |
| **Timeline** | Water level series at any interval for graphing |
| **Nearby Stations** | Geo-search across both custom and neaps databases |
| **Caching** | In-memory 15-minute TTL cache |
| **Rate Limiting** | Configurable via `.env` |

---

## Quick Start

```bash
# Install
npm install        # or pnpm install

# Configure (optional — defaults work out of the box)
cp .env.example .env

# Run in development
npm run dev        # http://localhost:3001

# Run in production
npm start
```

### Requirements

- Node.js ≥ 18
- No external database required
- No API keys required (Open-Meteo is free)

---

## API Reference

All endpoints are under `/api/`. Coordinates are decimal degrees (WGS84).

### `GET /api/health`

Service health check.

```json
{ "status": "ok", "uptime": 42.3 }
```

---

### `GET /api/tide/current`

Current corrected water level at a coordinate.

**Query parameters:**

| Param | Required | Example | Description |
|-------|----------|---------|-------------|
| `lat` | ✅ | `22.193` | Latitude |
| `lon` | ✅ | `88.185` | Longitude |
| `units` | ❌ | `meters` | `meters` or `feet` |
| `datum` | ❌ | `MLLW` | Chart datum |

**Example:**

```
GET /api/tide/current?lat=22.193&lon=88.185
```

```json
{
  "station": {
    "id": "custom/diamond-harbour",
    "name": "Diamond Harbour",
    "latitude": 22.1927,
    "longitude": 88.1895,
    "distance": 0.46
  },
  "time": "2026-03-03T04:32:00.000Z",
  "prediction": {
    "astronomical": 2.512,
    "corrections": {
      "pressure": -0.004,
      "wind": 0,
      "total": -0.004
    },
    "corrected": 2.508,
    "units": "meters",
    "datum": "MLLW"
  },
  "weather": {
    "pressure_msl": 1013.7,
    "wind_speed": 2.7,
    "wind_direction": 337,
    "temperature": 27.8
  },
  "meta": {
    "layers": ["harmonic", "meteorological"],
    "engine": "custom-harmonic"
  }
}
```

---

### `GET /api/tide/extremes`

High and low tide predictions for a date range.

**Query parameters:**

| Param | Required | Example | Description |
|-------|----------|---------|-------------|
| `lat` | ✅ | `22.193` | Latitude |
| `lon` | ✅ | `88.185` | Longitude |
| `start` | ✅ | `2026-03-03` | Start date/time (ISO 8601) |
| `end` | ✅ | `2026-03-04` | End date/time (ISO 8601) |

**Example:**

```
GET /api/tide/extremes?lat=22.193&lon=88.185&start=2026-03-03&end=2026-03-04
```

```json
{
  "extremes": [
    { "time": "2026-03-03T05:31:00Z", "level": 4.21, "high": true,  "label": "High" },
    { "time": "2026-03-03T11:48:00Z", "level": 0.04, "high": false, "label": "Low"  },
    { "time": "2026-03-03T18:01:00Z", "level": 4.70, "high": true,  "label": "High" }
  ],
  "units": "meters",
  "datum": "MLLW",
  "station": { "id": "custom/diamond-harbour", "name": "Diamond Harbour" },
  "engine": "custom-harmonic"
}
```

---

### `GET /api/tide/timeline`

Water level time series for graphing.

**Query parameters:**

| Param | Required | Default | Description |
|-------|----------|---------|-------------|
| `lat` | ✅ | — | Latitude |
| `lon` | ✅ | — | Longitude |
| `start` | ✅ | — | Start time (ISO 8601) |
| `end` | ✅ | — | End time (ISO 8601) |
| `interval` | ❌ | `600` | Interval in seconds |

**Example:**

```
GET /api/tide/timeline?lat=22.193&lon=88.185&start=2026-03-03&end=2026-03-04&interval=600
```

```json
{
  "timeline": [
    { "time": "2026-03-03T00:00:00.000Z", "level": 1.82 },
    { "time": "2026-03-03T00:10:00.000Z", "level": 1.97 }
  ],
  "units": "meters",
  "datum": "MLLW"
}
```

---

### `GET /api/stations/nearby`

Find the nearest tide stations to a coordinate.

**Query parameters:**

| Param | Required | Default | Description |
|-------|----------|---------|-------------|
| `lat` | ✅ | — | Latitude |
| `lon` | ✅ | — | Longitude |
| `count` | ❌ | `5` | Number of stations to return |

**Example:**

```
GET /api/stations/nearby?lat=22.193&lon=88.185&count=5
```

---

### `GET /api/stations/lookup`

Retrieve station details by ID.

**Query parameters:**

| Param | Required | Description |
|-------|----------|-------------|
| `id` | ✅ | Station ID (supports slash-separated IDs like `noaa/8723214`) |

**Example:**

```
GET /api/stations/lookup?id=custom/diamond-harbour
GET /api/stations/lookup?id=ticon/hiron_point-134a-bgd-uhslc_rq
```

---

## Custom Stations (Indian Estuarine)

The following stations are served by our own harmonic prediction engine with 17 constituents each:

| Station | ID | Coordinates | Datum | Accuracy (High Tides) |
|---------|----|-------------|-------|----------------------|
| Diamond Harbour | `custom/diamond-harbour` | 22.193°N, 88.189°E | MLLW | ±1–20 min, ±10–20 cm |
| Calcutta (Garden Reach) | `custom/garden-reach` | 22.554°N, 88.329°E | MLLW | ±8–40 min, ±10–20 cm |

> Any coordinate within **50 km** of a custom station will use that station's engine automatically.

---

## Architecture

```
src/
├── server.js                  # Express entry point, middleware, routing
├── routes/
│   └── tideRoutes.js          # All API endpoint definitions
├── services/
│   ├── tideService.js         # Hybrid engine: custom → neaps fallback
│   ├── customPredictor.js     # h(t) = Z₀ + Σ fᵢHᵢcos(...) implementation
│   ├── weatherService.js      # Open-Meteo API client (pressure, wind)
│   ├── correctionEngine.js    # Layer 1 + Layer 2 combiner
│   └── cacheService.js        # In-memory cache (node-cache)
├── middleware/
│   ├── validation.js          # Request parameter validation
│   └── errorHandler.js        # Global error handler
└── data/
    └── customStations.js      # Harmonic constants for Indian stations
```

### Data Flow

```
Request (lat, lon)
       │
       ▼
  Within 50 km of         YES → Custom Harmonic Engine
  a custom station? ──────────  (customPredictor.js)
       │                              │
       NO                            │
       │                             │
       ▼                             │
  neaps library            Layer 1 astronomical height
  (7,600+ stations)                  │
       │                             │
       └──────────┬──────────────────┘
                  │
                  ▼
        weatherService.js
        (Open-Meteo API)
                  │
                  ▼
        correctionEngine.js
        + Inverse barometer
        + Wind setup
                  │
                  ▼
           Final corrected
            water level
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |
| `CACHE_TTL` | `900` | Cache TTL in seconds |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Rate limit window (15 min) |
| `RATE_LIMIT_MAX` | `100` | Max requests per window |
| `OPEN_METEO_BASE_URL` | `https://api.open-meteo.com` | Open-Meteo base URL |

---

## Accuracy Notes

- **Global stations (via neaps):** Heights typically within ±10–20 cm; timing varies by regional dataset quality
- **Diamond Harbour:** High tides within ±20 min and ±20 cm vs Survey of India tables
- **Garden Reach:** High tides within ±40 min and ±20 cm; low tides overestimated due to river residual (see [Technical Docs](documentation/TECHNICAL.md))
- **Layer 2 corrections:** Typically ±1–5 cm depending on weather conditions

---

## Deployment & CI/CD

### GitHub Actions (Automation)

While GitHub Actions is not a hosting platform for "live" persistent servers (it times out after a few hours), it is the perfect tool for **Continuous Integration (CI)** and **Continuous Deployment (CD)**.

We have included a GitHub Actions workflow to:

1. **CI**: Automatically test and lint your code on every push.
2. **CD**: Deploy the code to your chosen hosting provider (e.g., Render, Railway, Fly.io).

### Recommended Hosting

For this Express backend, we recommend:

- **[Render](https://render.com/)**: Easy "Web Service" setup with automatic GitHub integration.
- **[Railway](https://railway.app/)**: Very fast setup, supports `pnpm` out of the box.
- **[Fly.io](https://fly.io/)**: Low-latency edge hosting (great for global tide data).

---

## Documentation

- [`documentation/TECHNICAL.md`](documentation/TECHNICAL.md) — Full tidal math, harmonic constants, challenge log, and accuracy results
- [`documentation/FUTURE_PHASES.md`](documentation/FUTURE_PHASES.md) — Phase 3 (live gauge + Kalman filter) and Phase 4 (official constants + estuary chain) roadmap
