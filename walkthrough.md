# TIDE Backend — Walkthrough

## What Was Built

A **Node.js/Express REST API** that provides real-time tidal predictions using two layers of data:

| Layer | Source | What it does |
|---|---|---|
| **Layer 1** — Harmonic | `neaps` library (7,600+ stations) | Astronomical tide prediction using the full harmonic formula with 37-60+ constituents |
| **Layer 2** — Meteorological | Open-Meteo API (free) | Inverse barometer + wind setup corrections using real-time pressure & wind data |

## Project Structure

```
r:\Code\TIDE\
├── .env                              # Config (port, cache TTL, rate limits)
├── .gitignore
├── package.json
└── src/
    ├── server.js                     # Express entry point
    ├── routes/tideRoutes.js          # All API routes
    ├── services/
    │   ├── tideService.js            # Layer 1: neaps harmonic wrapper
    │   ├── weatherService.js         # Layer 2: Open-Meteo fetcher
    │   ├── correctionEngine.js       # Combines L1+L2 with physics math
    │   └── cacheService.js           # In-memory TTL cache (15 min)
    └── middleware/
        ├── validation.js             # Coordinate & date validation
        └── errorHandler.js           # Global error handler
```

## Verified Endpoints

### ✅ Health Check
```
GET /api/health → 200 OK
```

### ✅ Current Corrected Water Level
```
GET /api/tide/current?lat=18.93&lon=72.83
```
```json
{
  "station": { "id": "ticon/karachi-147-pak-uhslc_fd", "name": "Karachi" },
  "prediction": {
    "astronomical": 2.919972,
    "corrections": { "pressure": -0.00547, "wind": 0, "total": -0.00547 },
    "corrected": 2.914502,
    "units": "meters",
    "datum": "LAT"
  },
  "weather": { "pressure_msl": 1013.8, "wind_speed": 5.4, "wind_direction": 20 }
}
```

### ✅ Tide Extremes
```
GET /api/tide/extremes?lat=18.93&lon=72.83&start=2026-03-03&end=2026-03-04
```
Returned 3 extremes: High (3.167m) → Low (0.728m) → High (3.557m)

### ✅ Nearby Stations
```
GET /api/stations/nearby?lat=18.93&lon=72.83&count=3
```
Found Karachi, Cochin, Vishakhapatnam (and more)

### ✅ Error Handling
| Test | Response |
|---|---|
| `lat=999` | 400 `INVALID_LATITUDE` |
| Missing params | 400 `MISSING_COORDINATES` |
| Unknown route | 404 with list of available endpoints |

### ✅ Caching
Second identical request returns `"cached": true` — served from in-memory cache.

## How to Run

```bash
cd r:\Code\TIDE
npm run dev     # Starts with nodemon on http://localhost:3001
```
