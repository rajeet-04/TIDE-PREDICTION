# TIDE Backend — Technical Documentation

## 1. The Core Tidal Prediction Formula

Tidal water level at any point in time is computed using the **harmonic analysis equation**:

```
h(t) = Z₀ + Σ fᵢ · Hᵢ · cos(aᵢ·t + (V₀+u)ᵢ − Gᵢ)
```

| Symbol | Meaning |
|--------|---------|
| `h(t)` | Water level above chart datum at time `t` (metres) |
| `Z₀`   | Mean sea level above chart datum (DC offset) |
| `fᵢ`   | Nodal modulation factor (18.6-year lunar node correction) |
| `Hᵢ`   | Amplitude of constituent `i` (metres) |
| `aᵢ`   | Angular speed of constituent `i` (degrees per hour) |
| `t`    | Hours elapsed since the start of the year (UTC) |
| `V₀+u` | Equilibrium argument at reference epoch (degrees) |
| `Gᵢ`   | Phase lag of constituent `i` at the station (degrees) |

### 1.1 Tidal Constituents Used

The backend uses **17 harmonic constituents** per station:

#### Semidiurnal (two highs/lows per day)

| Name | Period | Cause | Speed (°/hr) |
|------|--------|-------|-------------|
| M2   | 12.42 hr | Principal lunar | 28.9841 |
| S2   | 12.00 hr | Principal solar | 30.0000 |
| N2   | 12.66 hr | Lunar elliptic orbit | 28.4397 |
| K2   | 11.97 hr | Luni-solar declination | 30.0821 |
| L2   | 12.19 hr | Smaller lunar elliptic | 29.5285 |
| 2N2  | 12.91 hr | Second-order elliptic | 27.8954 |
| MU2  | 12.87 hr | Variational | 27.9682 |
| NU2  | 12.63 hr | Larger lunar evectional | 28.5126 |
| T2   | 12.01 hr | Larger solar elliptic | 29.9589 |

#### Diurnal (one high/low per day)

| Name | Period | Cause | Speed (°/hr) |
|------|--------|-------|-------------|
| K1   | 23.93 hr | Luni-solar declination | 15.0411 |
| O1   | 25.82 hr | Principal lunar diurnal | 13.9430 |
| P1   | 24.07 hr | Principal solar diurnal | 14.9589 |
| Q1   | 26.87 hr | Larger lunar elliptic | 13.3987 |

#### Shallow-Water / Overtides (critical for estuaries)

| Name | Period | Cause | Speed (°/hr) |
|------|--------|-------|-------------|
| M4   | 6.21 hr | Overtide of M2 | 57.9682 |
| MS4  | 6.10 hr | Compound M2+S2 | 58.9841 |
| MN4  | 6.27 hr | Compound M2+N2 | 57.4238 |
| M6   | 4.14 hr | Third overtide of M2 | 86.9523 |

> **Why shallow-water constituents matter:** In estuaries like the Hooghly, the tidal wave distorts as it propagates into shallower water. The flood tide is compressed (shorter) and the ebb is stretched (longer). M4 and its companions represent this distortion, causing the pronounced asymmetry seen at Diamond Harbour and Garden Reach.

---

### 1.2 Nodal Factor Calculation (fᵢ)

The Moon's orbit is tilted 5.14° to the ecliptic and precesses over **18.6 years** (the lunar nodal cycle). This modulates tidal amplitudes and phases year-by-year:

```
N = ascending longitude of the lunar node (degrees)

f(M2) = 1.0 − 0.037·cos(N)
f(K1) = 1.006 + 0.115·cos(N)
f(O1) = 1.009 + 0.187·cos(N)
f(K2) = 1.0 + 0.286·cos(N)
f(M4) = f(M2)²
f(M6) = f(M2)³
f(S2) = 1.0  (no correction — solar origin)
```

`N` is re-computed from Julian date each time, following Schureman (1958).

---

### 1.3 Equilibrium Arguments (V₀ + u)

The equilibrium argument places every constituent at its correct position in its cycle for a given moment. Based on Schureman (1958) and Foreman (1977):

```
s  = mean longitude of the Moon
h  = mean longitude of the Sun
p  = mean longitude of lunar perigee
N  = mean longitude of lunar ascending node
pp = mean longitude of solar perigee

V₀(M2) + u = 2(h − s) − 2.14·sin(N)
V₀(S2) + u = 0
V₀(K1) + u = h + 90° − 8.86·sin(N)
V₀(O1) + u = h − 2s − 90° + 10.80·sin(N)
V₀(M4) + u = 4(h − s) − 4.28·sin(N)
```

All arguments are computed in degrees and reduced to [0°, 360°).

---

### 1.4 Tide Extreme Detection

Extremes (high and low tides) are found in two passes:

1. **Coarse scan** at 6-minute intervals — detects sign changes in the first derivative (level going from rising to falling or vice versa)
2. **Golden-section refinement** over the bracketed interval — converges to ~1 second precision in 30 iterations

```
φ = 0.618033988  (golden ratio conjugate)

Repeat 30×:
  t₁ = a + φ(b−a),  t₂ = b − φ(b−a)
  Compare h(t₁) vs h(t₂) and tighten bracket
```

---

## 2. Layer 2 — Meteorological Corrections

Beyond the pure astronomy, real water levels are influenced by weather. Two physics-based corrections are applied:

### 2.1 Inverse Barometer Effect

High atmospheric pressure suppresses sea level; low pressure allows it to rise:

```
ΔH_pressure = −(P − P_ref) / 100   [metres]
```

where `P_ref = 1013.25 hPa` (standard atmosphere). Every **+1 hPa** above standard pushes the sea surface **−1 cm** down.

*Source: real-time pressure from Open-Meteo Marine API.*

### 2.2 Wind Setup

Sustained wind blowing onshore piles up water:

```
ΔH_wind = (Cw · U²) / (g · d)   [metres]

Cw = 3.2×10⁻⁶   (empirical drag coefficient)
U  = wind speed (m/s)
g  = 9.81 m/s²
d  = effective fetch depth (m)
```

Only the component of wind directed onshore (toward the coast) contributes.

*Source: real-time wind speed/direction from Open-Meteo Marine API.*

---

## 3. Custom Station Data

The open-source `neaps` library covers 7,600+ global stations but only **4 Indian stations**: Cochin, Minicoy, Port Blair, Vishakhapatnam. The Hooghly River estuary is entirely absent.

We built a **custom station database** (`src/data/customStations.js`) with station-specific harmonic constants derived from published Survey of India / Admiralty Tide Table data.

### 3.1 Diamond Harbour

| Parameter | Value |
|-----------|-------|
| Location  | 22.1927°N, 88.1895°E |
| River     | Hooghly, 50 km from the Bay of Bengal |
| Z₀        | 2.00 m |
| M2        | H = 1.92 m, G = 339.0° |
| S2        | H = 0.72 m, G = 360.0° |
| N2        | H = 0.40 m, G = 313.0° |
| K1        | H = 0.26 m, G = 323.0° |
| Datum     | MLLW |

**Calibration accuracy vs published tide tables (March 3, 2026):**

| Extreme | Reference | Predicted | Time Δ | Height Δ |
|---------|-----------|-----------|--------|----------|
| Morning High | 11:02 AM, 4.40 m | 11:01 AM, 4.21 m | **−1 min** | −0.19 m |
| Evening High | 11:16 PM, 4.78 m | 11:31 PM, 4.70 m | **+15 min** | −0.08 m |
| Lows    | ~0.00–0.01 m | ~0.00–0.04 m | ±20–50 min | ±0.04–0.14 m |

### 3.2 Calcutta (Garden Reach)

| Parameter | Value |
|-----------|-------|
| Location  | 22.554°N, 88.329°E |
| River     | Hooghly, ~21 km upriver from Diamond Harbour |
| Z₀        | 2.28 m |
| M2        | H = 1.10 m, G = 28.0° |
| S2        | H = 0.41 m, G = 49.0° |
| N2        | H = 0.23 m, G = 2.0° |
| K1        | H = 0.16 m, G = 347.0° |
| Datum     | MLLW |

**Key differences from Diamond Harbour:**

- M2 phase lag is **+49°** higher (tidal wave takes ~1.7 hr to propagate upriver)
- M2 amplitude is **43% lower** (upriver attenuation in the funnel)
- Z₀ is higher (river freshwater residual level raises baseline)
- Shallow-water M4/MN4 amplitudes are relatively larger (stronger estuary distortion)

**Calibration accuracy vs published tide tables (March 3, 2026):**

| Extreme | Reference | Predicted | Time Δ | Height Δ |
|---------|-----------|-----------|--------|----------|
| 1:12 AM High | 4.02 m | 3.93 m | **+8 min** | **−0.09 m** |
| 1:29 PM High | 3.83 m | 3.63 m | −40 min | −0.20 m |
| Lows | 0.55 m | 0.89–1.21 m | ±100 min | +0.34–0.66 m |

---

## 4. Challenges & Solutions

### ❌ Challenge 1: No Indian Estuarine Stations in neaps

**Problem:** The `neaps` library's bundled database covers 7,600+ stations globally but has zero stations in West Bengal or the Hooghly River estuary. The nearest station (Hiron Point, Bangladesh) is 140 km away and an open-coast station — completely misrepresenting the ~4.5 m estuarine tidal amplification at Diamond Harbour.

**Solution:** Built a hybrid two-engine system:

- For coordinates within 50 km of a known custom station → use our own harmonic predictor with station-specific constants
- For all other locations → fall back to the neaps library

New files: `src/data/customStations.js`, `src/services/customPredictor.js`, updated `src/services/tideService.js`.

---

### ❌ Challenge 2: Harmonic Constants for Diamond Harbour are Proprietary

**Problem:** The Survey of India and UK Admiralty Tide Tables hold the official harmonic constants for all Indian ports. These are not freely available online. No open dataset (UHSLC, NOAA, IHO) includes Diamond Harbour.

**Solution:** Derived approximate constants by:

1. Starting with regional Bay of Bengal M2 amplitudes from literature
2. Calibrating Z₀ from the arithmetic mean of reference high and low water levels
3. Tuning phase lags iteratively against published tide tables until high-tide timing error < 20 min
4. Setting amplitude ratios (S2/M2, N2/M2, etc.) from known Bay of Bengal tidal dynamics

Resulting accuracy: high tides within ±1–20 min and ±10–20 cm; lows within ±50 min.

---

### ❌ Challenge 3: Shallow-Water Tidal Asymmetry in the Hooghly

**Problem:** Standard ocean tide databases ignore estuarine overtides (M4, MS4, MN4, M6). Without them, the predicted tidal curve is falsely symmetric — the model thinks flood and ebb take equal time, but in reality the Hooghly flood is fast (~4 hr) and ebb is slow (~8 hr).

**Solution:** Included all four shallow-water constituents explicitly, with amplitudes and phase lags appropriate to the Hooghly geometry. This correctly shortens the flood, lengthens the ebb, and reproduces the near-zero low water levels at Diamond Harbour.

---

### ❌ Challenge 4: Low Water Discrepancy at Garden Reach

**Problem:** The lows at Garden Reach (Kolkata) are 0.55 m above datum — significantly higher than Diamond Harbour's near-zero lows. This is not a tidal effect; it is a **freshwater river residual**: the Hooghly's river flow maintains a baseline water level. Harmonic analysis cannot capture this non-tidal DC offset.

**Partial solution:** Increased Z₀ for Garden Reach. However, the residual river level is not constant — it varies with monsoon season, upstream flow, and storm events. A true correction would require real-time river discharge data (not currently integrated). High tide predictions remain accurate; low tides are overestimated by ~0.3–0.7 m.

---

### ❌ Challenge 5: Express 5 Route Compatibility

**Problem:** Station IDs in the neaps database use slash-separated format (e.g., `noaa/8723214`, `ticon/hiron_point-134a-bgd-uhslc_rq`). Express 5 (with `path-to-regexp` v8) treats slashes in route parameters as path separators, causing 404 errors when clients requested `/api/stations/noaa/8723214`.

**Solution:** Changed the route from `/stations/:id` to a query-parameter design: `GET /api/stations/lookup?id=noaa/8723214`. This sidesteps Express's path parsing entirely.

---

### ❌ Challenge 6: neaps 5-Hour Timing Error on Cochin

**Problem:** Testing the neaps library against published Cochin tide tables revealed a consistent **~5-hour timing error** on all extremes. Heights were accurate (within ±8 cm) but timing was wrong by almost exactly 5 hours — suspiciously close to UTC+5 (not UTC+5:30 IST).

**Status:** Known limitation of the neaps library's harmonic constant dataset for Cochin. The phase reference or epoch used in neaps differs from the Admiralty/Survey of India tables. Our custom engine does not have this issue because we calibrate phase lags directly against published IST tide tables.

---

### ✅ What Is Working Well

| Feature | Status |
|---------|--------|
| Harmonic prediction (neaps) for 7,600 global stations | ✅ |
| Custom harmonic engine for Indian estuarine stations | ✅ |
| Inverse barometer correction (Layer 2) | ✅ |
| Wind setup correction (Layer 2) | ✅ |
| In-memory caching (15-min TTL) | ✅ |
| Rate limiting | ✅ |
| Diamond Harbour high tides (±1–20 min, ±10–20 cm) | ✅ |
| Garden Reach high tides (±8–40 min, ±10–20 cm) | ✅ |
| Nearby station search (includes custom stations) | ✅ |
| Express 5 slash-ID route fix | ✅ |

---

## 5. Data Sources

| Source | What it provides | Access |
|--------|-----------------|--------|
| `neaps` npm library | Harmonic constants for 7,600+ stations | Free / bundled |
| `@neaps/tide-database` | Raw station database | Free / bundled |
| Open-Meteo Marine API | Real-time pressure, wind, temperature | Free, no key |
| Survey of India Tide Tables | Official Indian port harmonic constants | Proprietary / purchase |
| UK Admiralty Tide Tables | Harmonic constants for subordinate ports | Proprietary / purchase |

---

## 6. Further Accuracy Improvements (Future Work)

1. **Obtain official Admiralty constants** — Purchasing the Admiralty Tide Tables for Indian ports would give certified M2, S2, K1 amplitudes and phase lags, eliminating the calibration approximation.

2. **River discharge correction for Garden Reach** — Integrate CWC (Central Water Commission) real-time gauge data to apply a dynamic Z₀ offset per season/flow condition.

3. **NOAA CO-OPS API (Layer 3)** — For NOAA stations, pull live observed water levels and blend with harmonic predictions using a Kalman filter.

4. **More Hooghly stations** — Add Sagar Island (river mouth), Haldia (intermediate), and Mayapur (above Garden Reach) to interpolate tides along the full estuary.
