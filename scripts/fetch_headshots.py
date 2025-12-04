#!/usr/bin/env python3
"""
scripts/fetch_headshots.py

Télécharge les headshots des pilotes listés dans data/drivers.csv en utilisant l'API OpenF1
et les sauvegarde dans data/headshots/<driverId>.ext. Construit progressivement la base locale
pour éviter des appels externes répétés depuis le navigateur.

Usage:
  python scripts/fetch_headshots.py

Dépendances:
  pip install requests

"""
import csv
import os
import sys
from pathlib import Path
from urllib.parse import urlencode

try:
    import requests
except ImportError:
    print("Le module 'requests' est requis. Installez-le avec: pip install requests")
    sys.exit(1)

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / 'data'
DRIVERS_CSV = DATA_DIR / 'drivers.csv'
HEADSHOT_DIR = DATA_DIR / 'headshots'
HEADSHOT_DIR.mkdir(parents=True, exist_ok=True)

API_BASE = 'https://api.openf1.org/v1/drivers'

if not DRIVERS_CSV.exists():
    print(f"Fichier introuvable: {DRIVERS_CSV}")
    sys.exit(1)

def fetch_json(url, params=None):
    try:
        r = requests.get(url, params=params, timeout=10)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        return None

def download_url(url, dest_path):
    try:
        r = requests.get(url, stream=True, timeout=15)
        r.raise_for_status()
        with open(dest_path, 'wb') as f:
            for chunk in r.iter_content(8192):
                if chunk:
                    f.write(chunk)
        return True
    except Exception as e:
        return False

with open(DRIVERS_CSV, newline='', encoding='utf-8') as fh:
    reader = csv.DictReader(fh)
    rows = list(reader)

print(f"Found {len(rows)} drivers. Scanning for missing headshots in {HEADSHOT_DIR}")

for row in rows:
    driverId = row.get('driverId')
    driverRef = (row.get('driverRef') or '').strip()
    number = (row.get('number') or '').strip()
    full_name = ((row.get('forename') or '').strip() + ' ' + (row.get('surname') or '').strip()).strip()
    if not driverId:
        continue
    # prefer jpg extension
    out_jpg = HEADSHOT_DIR / f"{driverId}.jpg"
    out_png = HEADSHOT_DIR / f"{driverId}.png"
    if out_jpg.exists() or out_png.exists():
        # already have a headshot
        continue
    print(f"Fetching for driverId={driverId}, number={number}, name='{full_name}'")
    headshot_url = None
    
    # try by full name
    if not headshot_url and full_name:
        params = {'full_name': full_name, 'session_key': 'latest'}
        j = fetch_json(API_BASE, params=params)
        if isinstance(j, list) and j:
            item = j[0]
            headshot_url = item.get('headshot_url')
    # fallback: try some heuristics using driverRef
    if not headshot_url and driverRef:
        cand = [
            f"https://api.openf1.io/drivers/{driverRef}/image",
            f"https://openf1.io/images/drivers/{driverRef}.jpg",
            f"https://openf1.io/images/drivers/{driverRef}.png",
        ]
        for url in cand:
            r = None
            try:
                r = requests.head(url, allow_redirects=True, timeout=8)
                if r.status_code == 200 and r.headers.get('content-type','').startswith('image/'):
                    headshot_url = url
                    break
            except Exception:
                pass

    if not headshot_url:
        print("  -> no headshot found, skipping")
        continue

    # try download with correct extension
    ext = '.jpg'
    if headshot_url.lower().endswith('.png'):
        ext = '.png'
    out = HEADSHOT_DIR / f"{driverId}{ext}"
    ok = download_url(headshot_url, out)
    if ok:
        print(f"  -> saved to {out.name}")
    else:
        print(f"  -> failed to download {headshot_url}")

print("Done.")
