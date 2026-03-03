# TIDE Backend — Future Phases (Phase 3 & Phase 4)

> **Status:** Phase 1 (Harmonic Engine) and Phase 2 (Meteorological Corrections) are complete and deployed.  
> This document describes the planned work for Phase 3 and Phase 4, as discussed in the TIDE development sessions.

---

## Phase 3 — Live Gauge Data Integration & Blended Prediction

### Overview

Phase 3 upgrades the backend from a **pure prediction system** to a **prediction + observation blend**. Where real-time tide gauge sensors exist, their measured data is ingested and merged with the harmonic prediction using a Kalman filter. This eliminates residual errors that harmonics cannot model — storm surges, seiches, estuarine freshwater variation, and slow astronomical drift.

---

### 3.1 Data Source — NOAA CO-OPS API

For stations in the NOAA network, live water-level observations are freely available in real time:

```
https://api.tidesandcurrents.noaa.gov/api/prod/datagetter
  ?product=water_level
  &station={stationId}
  &datum=MLLW
  &time_zone=GMT
  &units=metric
  &format=json
```

**Provides:**

- Observed water level (6-minute intervals, ~1–4 cm accuracy)
- Verified data after quality control (daily)
- Predicted tide for the same station (for comparison)
- Inferred water level (fills gaps when sensors fail)

**Limitations:**

- US stations only
- International equivalents: UK NTSLF, Copernicus EU (CMEMS), and individual national networks (e.g., Indian National Centre for Ocean Information Services — INCOIS)

---

### 3.2 INCOIS — Indian National Centre for Ocean Information Services

For Indian stations, INCOIS provides:

```
https://incois.gov.in/portal/datainfo/observations.jsp
```

- Real-time tide gauge data for ~50 Indian ports
- Updates every 6–15 minutes
- Covers: Kochi, Mumbai, Chennai, Kolkata, Paradip, Visakhapatnam, etc.

> **Challenge:** INCOIS does not offer a public JSON REST API. Data is available via web portal and some limited institutional data-sharing programs. Phase 3 will require either a scraping strategy or establishing a research/institutional data-sharing agreement.

---

### 3.3 Blending Strategy — Kalman Filter

The core idea: the **harmonic prediction** gives a smooth astronomical baseline, and the **observed gauge reading** tells us where the water *actually* is. The Kalman filter optimally combines both based on their respective uncertainty:

```
State:
  x_k   = true water level at time k
  x̂_k   = our best estimate (filtered)

Prediction step:
  x̂_k|k-1 = x̂_k-1|k-1              (harmonic prediction propagates)
  P_k|k-1  = P_k-1|k-1 + Q          (process noise: storm surge, surge, etc.)

Update step (when observation arrives):
  K_k  = P_k|k-1 / (P_k|k-1 + R)   (Kalman gain)
  x̂_k  = x̂_k|k-1 + K_k·(z_k − x̂_k|k-1)   (blend prediction + observation)
  P_k  = (1 − K_k)·P_k|k-1         (updated uncertainty)

Where:
  z_k  = observed gauge reading (m)
  Q    = process noise variance (~0.002 m² for normal conditions)
  R    = observation noise variance (~0.001 m² for quality gauge)
```

**Output:** A blended estimate that automatically weights toward observations when available, and gracefully falls back to pure harmonics when gauges are offline.

---

### 3.4 New API Endpoint

```
GET /api/tide/observed?lat=22.193&lon=88.185
```

Response additions:

```json
{
  "prediction": { ... },
  "observed": {
    "level": 2.49,
    "time": "2026-03-03T04:30:00Z",
    "source": "INCOIS/Kolkata",
    "quality": "good"
  },
  "blended": {
    "level": 2.497,
    "confidence_m": 0.03
  }
}
```

---

### 3.5 Surge Detection

When the blended estimate deviates significantly from the harmonic prediction, a **storm surge event** is detected:

```
surge = observed − harmonic_prediction

if |surge| > threshold_m:
  trigger surge alert
  extend meteorological corrections (Layer 2) with adjustment
```

Surge alerts can be surfaced via:

- `/api/tide/surge` endpoint
- WebSocket push events (Phase 4)

---

### 3.6 Phase 3 New Files

| File | Purpose |
|------|---------|
| `src/services/gaugeService.js` | NOAA / INCOIS fetcher, fallback chain |
| `src/services/kalmanFilter.js` | Kalman state estimator |
| `src/services/surgeDetector.js` | Surge event classification |
| `src/routes/observedRoutes.js` | `/api/tide/observed`, `/api/tide/surge` |

---

### 3.7 Caching & Resilience

- Gauge data cached at **5-minute TTL** (much shorter than the 15-minute harmonic cache)
- If gauge fetch fails, system transparently falls back to Layer 1 + Layer 2 (current behaviour)
- Stale gauge readings older than 30 minutes are discarded; pure harmonic is used instead
- Rate-limit the gauge fetch independently from user-facing endpoints

---

## Phase 4 — Official Harmonic Constants & Full Estuary Chain

### Overview

Phase 4 is about **data precision**, not new prediction techniques. It replaces the derived/approximated harmonic constants in `customStations.js` with **certified constants** from official hydrographic authorities, and expands coverage to the full Hooghly River tidal propagation chain from the Bay of Bengal to Kolkata.

---

### 4.1 Official Harmonic Constant Sources

| Source | Coverage | Format | Access |
|--------|----------|--------|--------|
| **Admiralty Tide Tables (Vol. 2)** | Indian Ocean, South Asia | Printed + digital (AVCS) | Purchase from UKHO |
| **Survey of India Tide Tables** | All Indian standard ports | Printed annual tables | Purchase / institutional |
| **CHS (Canada)** | Global open-ocean | Digital (IHO SP-97) | Institutional |
| **UHSLC** | Research quality, global | NetCDF / ASCII | Free (partially covers India) |
| **IHO Data Centre** | Global synthesis | IHO SP-97 | Institutional access |

**Target stations for Phase 4:**

| Station | Distance from sea | Expected M2 amplitude |
|---------|-------------------|----------------------|
| Sagar Island (Sagardwip) | 0 km (river mouth) | ~1.6 m |
| Haldia (Kolkata Port anchorage) | 65 km | ~1.4 m |
| Diamond Harbour | 95 km | ~1.92 m (current approximation) |
| Garden Reach (Kolkata) | 116 km | ~1.10 m (current approximation) |
| Mayapur Ghat | 145 km | ~0.65 m (tidal limit) |

> **Note:** The M2 amplitude is non-monotonic in the Hooghly — it peaks near Diamond Harbour due to the funnel shape, then decays rapidly upriver. Accurately modelling this requires individual constants at each station.

---

### 4.2 Low Water Height Correction — River Residual

At Garden Reach and above, the observed low water is dominated by the Hooghly's freshwater discharge. This **river residual** cannot be captured by harmonic analysis.

**Phase 4 solution:**

```
corrected_low = harmonic_low + Δ_river

where:

Δ_river = f(Q_discharge, season, upstream_dam_release)
```

Data source: **Central Water Commission (CWC)** daily/hourly discharge data from Farakka Barrage.

```
Station: Farakka Barrage, River Ganga
CWC Station Code: GD-111
Discharge at Farakka (m³/s) → time delay to Garden Reach ≈ 2–3 days
Empirical relationship: Δ_river (m) ≈ 0.0004 × Q (m³/s)
```

**Seasonal extremes:**

| Season | Discharge (m³/s) | River Residual |
|--------|-----------------|----------------|
| Summer (pre-monsoon) | ~1,000 | ~0.4 m |
| Monsoon peak | ~40,000 | ~1.6 m |
| Winter | ~2,500 | ~1.0 m |

This correction would eliminate the current ~0.5–0.7 m low-water error at Garden Reach.

---

### 4.3 Tidal Propagation Model (Hooghly Estuary Chain)

With constants for Sagar, Haldia, Diamond Harbour, and Garden Reach, the system can interpolate the tidal wave's progression upriver in real time:

```
Tidal crest propagation speed ≈ √(g·d) — shallow-water wave

At Hooghly:
  d ≈ 6–8 m → c ≈ 8–9 m/s

Sagar Island → Diamond Harbour: ~1.7 hr
Diamond Harbour → Garden Reach: ~1.7 hr
Garden Reach → Uluberia: ~1.2 hr
```

**New endpoint:**

```
GET /api/tide/estuary?river=hooghly&time=2026-03-03T10:00:00Z

→ Returns predicted water level at all Hooghly stations as a 1D spatial snapshot
```

---

### 4.4 Subordinate Station Support

The Admiralty tables list ~30 **subordinate stations** along the Indian coast and rivers. Each subordinate station has offsets relative to a **standard port** (reference station):

```json
{
  "name": "Haldia",
  "reference": "Diamond Harbour",
  "offsets": {
    "high_water_time": "+0h 22min",
    "low_water_time":  "+0h 18min",
    "high_water_height_ratio": 0.89,
    "low_water_height_ratio":  1.12
  }
}
```

**Phase 4 adds subordinate station handling:**

1. Load subordinate offsets into `customStations.js`
2. When a subordinate station is the nearest match, predict for its reference station first
3. Apply the Admiralty time and height offsets to yield the subordinate prediction

This would expand Indian estuarine coverage to ~30 additional Hooghly ports without needing full harmonic constants for each.

---

### 4.5 WebSocket Real-Time Push (Phase 4 Stretch Goal)

Rather than polling `/api/tide/current` every N seconds, Phase 4 introduces a WebSocket endpoint for live subscriptions:

```
ws://localhost:3001/ws/tide?lat=22.193&lon=88.185
```

Server pushes:

```json
{
  "type": "water_level_update",
  "time": "2026-03-03T10:00:00Z",
  "level": 2.51,
  "trend": "rising",
  "rate_cm_per_min": 1.8,
  "next_extreme": { "type": "High", "time": "2026-03-03T11:01:00Z", "level": 4.21 }
}
```

Updates are pushed at:

- **Every 1 minute** during approach to high/low tide (±30 min)
- **Every 5 minutes** during mid-tide

---

### 4.6 Phase 4 New Files

| File | Purpose |
|------|---------|
| `src/data/subordinateStations.js` | Admiralty offsets for ~30 Indian subordinate ports |
| `src/services/riverDischarge.js` | CWC Farakka Barrage data fetcher |
| `src/services/estuaryChain.js` | Hooghly spatial tidal propagation model |
| `src/routes/estuaryRoutes.js` | `/api/tide/estuary`, `/ws/tide` WebSocket |
| `src/services/websocketServer.js` | WebSocket connection manager |

---

## Summary Roadmap

```
Phase 1 ✅  Harmonic prediction engine (neaps + custom)
Phase 2 ✅  Meteorological corrections (inverse barometer + wind setup)
Phase 3 🔲  Live gauge blending (NOAA/INCOIS + Kalman filter + surge detection)
Phase 4 🔲  Official harmonic constants + river correction + estuary chain + WebSocket
```

| Phase | Target accuracy (high tides) | Target accuracy (low tides) |
|-------|-----------------------------|-----------------------------|
| 1+2 (current) | ±1–40 min, ±10–20 cm | ±20–100 min, ±4–70 cm |
| After Phase 3 | ±5–10 min, ±3–8 cm | ±10–30 min, ±3–10 cm |
| After Phase 4 | ±2–5 min, ±2–5 cm | ±5–15 min, ±2–5 cm |
