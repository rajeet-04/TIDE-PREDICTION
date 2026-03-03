"""
harmonic_analysis.py
Reads the hourly CSV produced by parse_pdf.py and uses utide to extract
tidal harmonic constants (amplitude H and phase lag G) for all 17 requested
constituents. Outputs a JSON file per station.

Usage:
    uv run python tools/harmonic_analysis.py --station "DIAMOND HARBOUR"
    uv run python tools/harmonic_analysis.py --station "HALDIA"
"""

import argparse
import json
import os
import numpy as np
import pandas as pd
import utide
import matplotlib.dates as mdates

# 17 constituents requested
CONSTITUENTS = [
    "M2", "S2", "N2", "K1", "O1",
    "M4", "MS4", "K2", "MN4", "M6",
    "MK3", "S4", "P1", "Q1", "MF", "MM",
]
# utide uses 'MN4' (not duplicate), so filter unique
CONSTITUENTS_UNIQUE = list(dict.fromkeys(CONSTITUENTS))  # preserves order, drops dupe MN4

STATION_COORDS = {
    "DIAMOND HARBOUR": (22.1927, 88.1895),
    "HALDIA": (22.0300, 88.0700),
}


def main():
    parser = argparse.ArgumentParser(description="Harmonic analysis on hourly tide CSV")
    parser.add_argument("--station", required=True,
                        help='Station name, e.g. "DIAMOND HARBOUR"')
    parser.add_argument("--out-dir", default=r"R:\Code\TIDE\tools\output",
                        help="Directory with CSVs (also where JSON is written)")
    args = parser.parse_args()

    safe_name = args.station.replace(" ", "_")
    csv_path = os.path.join(args.out_dir, f"{safe_name}_hourly.csv")

    if not os.path.exists(csv_path):
        print(f"CSV not found: {csv_path}")
        print("Run parse_pdf.py first.")
        return

    print(f"Loading {csv_path} ...")
    df = pd.read_csv(csv_path, parse_dates=["datetime"])
    df = df.dropna(subset=["height_m"])
    df = df.sort_values("datetime").reset_index(drop=True)

    print(f"  {len(df)} hourly records spanning "
          f"{df['datetime'].iloc[0]} → {df['datetime'].iloc[-1]}")

    # utide requires time as decimal days (numpy float64 days since epoch)
    # utide requires time as decimal days. Matplotlib's date2num does this perfectly.
    t = mdates.date2num(pd.to_datetime(df["datetime"]))
    elev = df["height_m"].values.astype(float)

    lat = STATION_COORDS.get(args.station.upper(), (22.0, 88.0))[0]

    print(f"Running utide harmonic analysis (lat={lat}) ...")
    coef = utide.solve(
        t, elev,
        lat=lat,
        method="ols",
        conf_int="linear",
        constit=CONSTITUENTS_UNIQUE,
        epoch='2000-01-01',
        verbose=True,
    )

    # Build result dict: constituent -> {H, G}
    result = {
        "station": args.station,
        "lat": STATION_COORDS.get(args.station.upper(), (None, None))[0],
        "lon": STATION_COORDS.get(args.station.upper(), (None, None))[1],
        "n_records": len(df),
        "time_start": str(df["datetime"].iloc[0]),
        "time_end": str(df["datetime"].iloc[-1]),
        "constituents": {}
    }

    names = list(coef.name)
    for c in CONSTITUENTS_UNIQUE:
        if c in names:
            idx = names.index(c)
            H = float(coef.A[idx])
            G = float(coef.g[idx])
            H_ci = float(coef.A_ci[idx]) if hasattr(coef, "A_ci") else None
            G_ci = float(coef.g_ci[idx]) if hasattr(coef, "g_ci") else None
            result["constituents"][c] = {
                "H_m": round(H, 4),
                "G_deg": round(G, 2),
                "H_ci": round(H_ci, 4) if H_ci is not None else None,
                "G_ci": round(G_ci, 2) if G_ci is not None else None,
            }
        else:
            result["constituents"][c] = {"H_m": None, "G_deg": None, "note": "not resolved"}

    out_path = os.path.join(args.out_dir, f"{safe_name}_harmonics.json")
    with open(out_path, "w") as f:
        json.dump(result, f, indent=2)

    print(f"\n{'='*55}")
    print(f"Station : {args.station}")
    print(f"Records : {len(df)}")
    print(f"{'='*55}")
    print(f"{'Constituent':<12} {'H (m)':>8} {'G (°)':>8}")
    print(f"{'-'*30}")
    for c, v in result["constituents"].items():
        h = f"{v['H_m']:.4f}" if v["H_m"] is not None else "  N/A  "
        g = f"{v['G_deg']:>8.2f}" if v["G_deg"] is not None else "  N/A  "
        print(f"{c:<12} {h:>8} {g}")

    print(f"\nSaved → {out_path}")


if __name__ == "__main__":
    main()
