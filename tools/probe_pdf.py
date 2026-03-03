"""Probe a single tide table PDF to understand its text and table structure."""
import sys
import pdfplumber

PDF = r"R:\Code\TIDE\data\DIAMOND HARBOUR\2023.pdf"

with pdfplumber.open(PDF) as pdf:
    for i, page in enumerate(pdf.pages[:4]):
        print(f"\n{'='*60}")
        print(f"PAGE {i+1}")
        print(f"{'='*60}")
        text = page.extract_text()
        print(text[:2000] if text else "(no text)")
        print("\n--- TABLES ---")
        for t in page.extract_tables():
            for row in t[:6]:
                print(row)
