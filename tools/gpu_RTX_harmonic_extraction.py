import pandas as pd
import numpy as np
import torch
import time
import json
import os

# Exact Angular Constant Tones configured natively
SPEEDS = {
    'M2': 28.984104, 'S2': 30.000000, 'N2': 28.439730, 'K1': 15.041069,
    'O1': 13.943036, 'M4': 57.968210, 'MS4': 58.984104, 'K2': 30.082137,
    'MN4': 57.423830, 'M6': 86.952310, 'MK3': 44.025173, 'S4': 60.000000,
    'P1': 14.958931, 'Q1': 13.398661, 'MF': 1.098033, 'MM': 0.544375
}

def torch_harmonic_inverse(csv_path, out_json_path):
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Executing on Hardware Device: {device}\n")

    # 1. Pipeline Read Optimization
    print(f"Loading CSV Data: {csv_path} ...")
    df = pd.read_csv(csv_path).dropna(subset=['height_m'])
    df['datetime'] = pd.to_datetime(df['datetime'])
    
    # Track times elapsed relative to Greenwich Phase standard epoch
    time_ref = pd.Timestamp("2000-01-01")
    hours = (df['datetime'] - time_ref).dt.total_seconds().values / 3600.0

    # 2. Compile Arrays cleanly mapping to PyTorch (Offload to GPU)
    start_time = time.time()
    t = torch.tensor(hours, dtype=torch.float32, device=device)
    y = torch.tensor(df['height_m'].values, dtype=torch.float32, device=device)
    
    # Format Frequencies
    speeds_rad = torch.tensor(list(SPEEDS.values()), dtype=torch.float32, device=device) * (np.pi / 180.0)

    # 3. Construct Design Matrix A
    A_cols = 1 + len(SPEEDS) * 2
    A = torch.ones((len(t), A_cols), dtype=torch.float32, device=device)
    
    for i in range(len(SPEEDS)):
        angle = speeds_rad[i] * t
        A[:, 1 + i*2]     = torch.cos(angle)
        A[:, 1 + i*2 + 1] = torch.sin(angle)

    # 4. Extract Weights with GPU Least-Squares
    print("Computing Reverse Factorization across Matrix...")
    # torch.linalg.lstsq outputs a namedtuple: (solution, residuals, rank, singular_values)
    lstsq_solution = torch.linalg.lstsq(A, y, rcond=None)
    weights = lstsq_solution.solution
    
    # Sync memory to clock precisely
    if device.type == 'cuda':
        torch.cuda.synchronize()
        
    compute_time = time.time() - start_time
    print(f">> Extraction Pipeline Core Factorization executed in: {compute_time:.4f}s\n")
    
    # 5. Reverse Scaling output arrays to exact Values
    Z0 = weights[0].item()
    print(f"Mean Sea Level (Z0): {Z0:.4f}m\n")

    output = {
        "station": os.path.basename(csv_path).replace("_hourly.csv", "").replace("_", " "),
        "Z0": float(Z0),
        "constituents": {}
    }

    print(f"{'Station':<15} | {'Constituent':<5} | {'Amp (H_m)':>10} | {'Phase (G_deg)':>12}")
    print("-" * 55)

    for i, name in enumerate(SPEEDS.keys()):
        w_cos = weights[1 + i*2].item()
        w_sin = weights[1 + i*2 + 1].item()
        
        # Amplitude is hypotenuse of weights
        amplitude = np.sqrt(w_cos**2 + w_sin**2)
        
        # Phase maps quadrant dynamically
        phase_rad = np.arctan2(w_sin, w_cos)
        phase_deg = (phase_rad * 180.0 / np.pi) % 360.0
        
        station_short = os.path.basename(csv_path)[:10]
        print(f"{station_short:<15} | {name:<5} | {amplitude:>10.4f}m | {phase_deg:>12.2f}°")
        
        output["constituents"][name] = {
            "H_m": round(float(amplitude), 4),
            "G_deg": round(float(phase_deg), 2)
        }
        
    # Write cleanly mapped dictionary to JSON
    with open(out_json_path, 'w') as f:
        json.dump(output, f, indent=2)
    print(f"✔ Real Values Parameterized and Written: {out_json_path}\n")


if __name__ == '__main__':
    # Force process extraction exactly as asked matching file formats
    # HALDIA
    haldia_csv = r"tools\output\HALDIA_hourly.csv"
    haldia_out = r"tools\output\HALDIA_RTX_harmonics.json"
    torch_harmonic_inverse(haldia_csv, haldia_out)

    # DIAMOND HARBOUR
    dh_csv = r"tools\output\DIAMOND_HARBOUR_hourly.csv"
    dh_out = r"tools\output\DIAMOND_HARBOUR_RTX_harmonics.json"
    torch_harmonic_inverse(dh_csv, dh_out)

