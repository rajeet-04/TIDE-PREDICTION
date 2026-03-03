import numpy as np
import pandas as pd
import json
import os

SPEEDS_DEGREES = {
    'M2': 28.984104, 'S2': 30.000000, 'N2': 28.439730, 'K1': 15.041069,
    'O1': 13.943036, 'M4': 57.968210, 'MS4': 58.984104, 'K2': 30.082137,
    'MN4': 57.423830, 'M6': 86.952310, 'MK3': 44.025173, 'S4': 60.000000,
    'P1': 14.958931, 'Q1': 13.398661, 'MF': 1.098033, 'MM': 0.544375
}

def analyze_station(csv_path, json_out_path):
    print(f"Loading {csv_path}...")
    df = pd.read_csv(csv_path).dropna(subset=['height_m'])
    df['datetime'] = pd.to_datetime(df['datetime'])
    
    # Calculate hours since a standard reference epoch (e.g., year 2000)
    hours_elapsed = (df['datetime'] - pd.Timestamp('2000-01-01')).dt.total_seconds().values / 3600.0
    y = df['height_m'].values

    # Pre-allocate A array = N_records x 33 (1+16*2)
    speeds_rad = np.array(list(SPEEDS_DEGREES.values())) * (np.pi / 180.0)
    A = np.ones((len(hours_elapsed), 1 + 2 * len(SPEEDS_DEGREES)), dtype=np.float32)

    for i in range(len(SPEEDS_DEGREES)):
        angle = speeds_rad[i] * hours_elapsed
        A[:, 1 + i*2]     = np.cos(angle)
        A[:, 1 + i*2 + 1] = np.sin(angle)
        
    print("Computing least squares factorization...")
    weights, residuals, rank, s = np.linalg.lstsq(A, y, rcond=None)
    
    Z0 = weights[0]
    
    output = {
        "station": os.path.basename(csv_path).replace("_hourly.csv", "").replace("_", " "),
        "Z0": float(Z0),
        "constituents": {}
    }
    
    constituENTS_keys = list(SPEEDS_DEGREES.keys())
    for i, name in enumerate(constituENTS_keys):
        w_cos = float(weights[1 + i*2])
        w_sin = float(weights[1 + i*2 + 1])
        
        # Calculate Amplitude and Phase Lag
        amplitude = np.sqrt(w_cos**2 + w_sin**2)
        phase_rad = np.arctan2(w_sin, w_cos)
        phase_deg = (phase_rad * 180.0 / np.pi) % 360.0
        
        output["constituents"][name] = {
            "H_m": round(amplitude, 4),
            "G_deg": round(phase_deg, 2)
        }
    
    with open(json_out_path, 'w') as f:
        json.dump(output, f, indent=2)
    
    print(f"Successfully wrote corrected parameters to {json_out_path}\n Z0: {Z0:.3f}")

if __name__ == '__main__':
    # Fix DIAMOND HARBOUR
    dh_csv = r"tools\output\DIAMOND_HARBOUR_hourly.csv"
    dh_json = r"tools\output\DIAMOND_HARBOUR_harmonics.json"
    analyze_station(dh_csv, dh_json)
    
    # Fix HALDIA
    hd_csv = r"tools\output\HALDIA_hourly.csv"
    hd_json = r"tools\output\HALDIA_harmonics.json"
    analyze_station(hd_csv, hd_json)
