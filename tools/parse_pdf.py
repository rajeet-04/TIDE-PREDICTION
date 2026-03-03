"""
parse_pdf.py
Reads NHO (Survey of India) hourly tide table PDFs for a station and
produces a CSV with columns: datetime, height_m

Usage:
    uv run python tools/parse_pdf.py --station "DIAMOND HARBOUR"
    uv run python tools/parse_pdf.py --station "HALDIA"
"""

import re
import argparse
import glob
import os
import csv
from datetime import datetime, timedelta

import pdfplumber

MONTHS = {
    "JANUARY": 1, "FEBRUARY": 2, "MARCH": 3, "APRIL": 4,
    "MAY": 5, "JUNE": 6, "JULY": 7, "AUGUST": 8,
    "SEPTEMBER": 9, "OCTOBER": 10, "NOVEMBER": 11, "DECEMBER": 12,
}

# Regex to grab port name, month, year from the header line
HEADER_RE = re.compile(
    r"NAME OF PORT[:\-\s]+(.+?)\s+MONTH\s+(\w+)\s+YEAR\s+(\d{4})",
    re.IGNORECASE
)

# A data row starts with a 1-or-2-digit day number then floats
ROW_RE = re.compile(r"^\s*(\d{1,2})\s+([\d.\s]+)$")


def parse_pdf(path: str, station_name: str) -> list:
    """Return list of (datetime, float) for every hourly reading in a PDF."""
    records = []
    current_month = None
    current_year = None

    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if not text:
                continue

            lines = text.splitlines()
            for line in lines:
                # Detect header line: NAME OF PORT ... MONTH ... YEAR ...
                m = HEADER_RE.search(line)
                if m:
                    port = m.group(1).strip().upper()
                    # Accept if station name appears in port name or vice-versa
                    if station_name.upper() in port or port in station_name.upper():
                        current_month = MONTHS.get(m.group(2).upper())
                        current_year = int(m.group(3))
                    continue

                if current_month is None:
                    continue

                # Try to parse a data row
                # Strip trailing whitespace / page numbers
                stripped = line.strip()
                parts = stripped.split()
                if not parts:
                    continue

                # First token must be a day number (1-31)
                try:
                    day = int(parts[0])
                    if not (1 <= day <= 31):
                        continue
                except ValueError:
                    continue

                # Rest must be floating-point hourly heights (up to 24)
                floats = []
                for p in parts[1:]:
                    try:
                        floats.append(float(p))
                    except ValueError:
                        break  # stop at non-float tokens (e.g. page footer)

                if len(floats) < 12:  # need a reasonable number of hours
                    continue

                # Build datetimes: hour 0 .. len(floats)-1
                for hour, h in enumerate(floats[:24]):
                    try:
                        dt = datetime(current_year, current_month, day, hour, 0)
                        records.append((dt, h))
                    except ValueError:
                        pass  # skip invalid dates (e.g. Feb 30)

    return records


def main():
    parser = argparse.ArgumentParser(description="Parse NHO tide PDFs to CSV")
    parser.add_argument("--station", required=True,
                        help='Station folder name, e.g. "DIAMOND HARBOUR"')
    parser.add_argument("--data-dir", default=r"R:\Code\TIDE\data",
                        help="Root data directory")
    parser.add_argument("--out-dir", default=r"R:\Code\TIDE\tools\output",
                        help="Output directory for CSV files")
    args = parser.parse_args()

    station_dir = os.path.join(args.data_dir, args.station)
    pdfs = sorted(glob.glob(os.path.join(station_dir, "*.pdf")))

    if not pdfs:
        print(f"No PDFs found in {station_dir}")
        return

    os.makedirs(args.out_dir, exist_ok=True)

    all_records = []
    for pdf_path in pdfs:
        year = os.path.splitext(os.path.basename(pdf_path))[0]
        print(f"  Parsing {year} ...", end=" ", flush=True)
        recs = parse_pdf(pdf_path, args.station)
        print(f"{len(recs)} hourly rows")
        all_records.extend(recs)

    # Sort and deduplicate by datetime
    all_records.sort(key=lambda x: x[0])
    seen = set()
    deduped = []
    for dt, h in all_records:
        if dt not in seen:
            seen.add(dt)
            deduped.append((dt, h))

    safe_name = args.station.replace(" ", "_")
    out_path = os.path.join(args.out_dir, f"{safe_name}_hourly.csv")

    with open(out_path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["datetime", "height_m"])
        for dt, h in deduped:
            writer.writerow([dt.strftime("%Y-%m-%d %H:%M:%S"), h])

    print(f"\nWrote {len(deduped)} rows → {out_path}")


if __name__ == "__main__":
    main()
