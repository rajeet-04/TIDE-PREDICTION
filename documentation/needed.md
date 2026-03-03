# Data Request: Tidal Harmonic Constants

## For Survey of India — Custom Station Integration

---

## Purpose

This document specifies the exact tidal data required from the **Survey of India (Naval Hydrographic Office)** to enable accurate harmonic tide prediction for Indian coastal and estuarine stations.

Our tide prediction engine uses the standard harmonic formula:

```
h(t) = Z₀ + Σ [ fᵢ · Hᵢ · cos(aᵢt + (V₀+u)ᵢ − Gᵢ) ]
```

All constants below are required as inputs to this formula.

---

## Requested Data — Per Station

### 1. Station Metadata

| Field | Description | Example |
|-------|-------------|---------|
| Station Name | Official name | Diamond Harbour |
| Latitude | Decimal degrees (WGS84) | 22.1927 |
| Longitude | Decimal degrees (WGS84) | 88.1895 |
| Chart Datum | Reference datum used for heights | MLLW / LAT / CD |
| Mean Sea Level (MSL) above datum | Z₀ or Z0 in meters | 2.53 |

---

### 2. Harmonic Constituents (Per Station)

For each tidal constituent, the following two values are needed:

| Symbol | Name | Unit | Description |
|--------|------|------|-------------|
| **H** | Amplitude | meters (m) | Height of the constituent above MSL |
| **G** (or g / kappa) | Phase lag / Greenwich epoch | degrees (°) | Phase lag relative to Greenwich equilibrium argument |

#### Minimum Required Constituents (8)

These cover 95%+ of the tidal signal at most Indian stations:

| No. | Constituent | Period | Notes |
|-----|------------|--------|-------|
| 1 | **M2** | 12.42 hr | Principal lunar semidiurnal — most important |
| 2 | **S2** | 12.00 hr | Principal solar semidiurnal |
| 3 | **N2** | 12.66 hr | Larger lunar elliptic |
| 4 | **K1** | 23.93 hr | Luni-solar diurnal |
| 5 | **O1** | 25.82 hr | Principal lunar diurnal |
| 6 | **M4** | 6.21 hr | Shallow-water overtide of M2 |
| 7 | **MS4** | 6.10 hr | Shallow-water compound |
| 8 | **K2** | 11.97 hr | Luni-solar semidiurnal |

#### Recommended Full Set (17 constituents — for estuarine stations like Diamond Harbour)

Estuaries and river mouths require additional shallow-water constituents due to non-linear distortion:

| No. | Constituent | Notes |
|-----|------------|-------|
| 9 | **MN4** | Lunar elliptic quarter diurnal |
| 10 | **M6** | Sixth-diurnal shallow water |
| 11 | **MK3** | Shallow water terdiurnal |
| 12 | **S4** | Shallow water compound |
| 13 | **MN4** | Compound |
| 14 | **P1** | Principal solar diurnal |
| 15 | **Q1** | Larger lunar elliptic diurnal |
| 16 | **MF** | Lunisolar fortnightly |
| 17 | **MM** | Lunar monthly |

---

### 3. Example: Expected Data Format

```
Station: Diamond Harbour
Latitude: 22.1927° N
Longitude: 88.1895° E
Chart Datum: MLLW
Z0 (MSL above datum): 2.85 m

Constituent | H (m)  | G (°)
------------|--------|------
M2          | 2.214  | 172.4
S2          | 0.690  | 203.1
N2          | 0.453  | 148.2
K1          | 0.241  | 284.6
O1          | 0.198  | 262.1
M4          | 0.183  | 54.8
MS4         | 0.162  | 96.3
K2          | 0.190  | 205.0
...
```

---

## Priority Stations

| # | Station | Location | Type | Priority |
|---|---------|----------|------|----------|
| 1 | Diamond Harbour | 22.19°N, 88.19°E | Estuarine (Hooghly) | 🔴 High |
| 2 | Calcutta (Garden Reach) | 22.55°N, 88.33°E | Estuarine (Hooghly) | 🔴 High |
| 3 | Haldia | 22.03°N, 88.07°E | Port / Estuarine | 🟡 Medium |
| 4 | Sagar Island | 21.65°N, 88.07°E | Coastal | 🟡 Medium |
| 5 | Paradip | 20.27°N, 86.68°E | Port | 🟢 Low |
| 6 | Visakhapatnam | 17.69°N, 83.28°E | Port | 🟢 Low |

---

## What Will Be Built With This Data

Once received, this data will be used to:

1. Store the harmonic constants securely in **Cloudflare D1** (SQLite) — no public exposure
2. Compute tide predictions using the harmonic summation formula in real-time at the edge
3. Apply **Layer 2 meteorological corrections** (inverse barometer + wind setup from Open-Meteo)
4. Serve predictions via a REST API at `tide-backend.meek.workers.dev`

---

## Contact / Submission Format

Please provide data as:

- A **PDF table** (scanned or digital) per station, or
- **CSV/Excel** with columns: `constituent, H_meters, G_degrees, Z0_meters`
- Publication reference: *Indian Tide Tables* (NHO Publication NP 201) or equivalent

> **Important:** Phase angles (G) must be **Greenwich phase lags** (kappa), not local epoch. If local epochs are provided, the conversion formula is: `G = V₀ + u − local_epoch` at the time of analysis.
