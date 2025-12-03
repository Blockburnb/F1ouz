#!/usr/bin/env python3
"""
scripts/headshot_server.py

Petit serveur Flask pour récupérer à la volée les headshots manquants et les stocker
sous data/headshots/<driverId>.*. Utilisé par le dashboard local pour construire la base
progressivement et éviter des appels API répétés depuis le navigateur.

Usage:
  pip install flask requests
  python scripts/headshot_server.py

Le serveur écoute sur http://0.0.0.0:8001
"""
from flask import Flask, request, jsonify, send_from_directory
from pathlib import Path
import csv
import requests
import os

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / 'data'
DRIVERS_CSV = DATA_DIR / 'drivers.csv'
HEADSHOT_DIR = DATA_DIR / 'headshots'
HEADSHOT_DIR.mkdir(parents=True, exist_ok=True)

API_BASE = 'https://api.openf1.org/v1/drivers'

app = Flask(__name__)

# Allow simple CORS for local dashboard
@app.after_request
def add_cors(resp):
    resp.headers['Access-Control-Allow-Origin'] = '*'
    resp.headers['Access-Control-Allow-Methods'] = 'GET,OPTIONS'
    resp.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    return resp

def fetch_json(url, params=None):
    try:
        r = requests.get(url, params=params, timeout=10)
        r.raise_for_status()
        return r.json()
    except Exception:
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
    except Exception:
        return False

# helper to find driver row in drivers.csv
def find_driver_row(driverId):
    if not DRIVERS_CSV.exists():
        return None
    with open(DRIVERS_CSV, newline='', encoding='utf-8') as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            if row.get('driverId') and str(row.get('driverId')) == str(driverId):
                return row
    return None

@app.route('/fetch_headshot')
def fetch_headshot():
    driverId = request.args.get('driverId')
    if not driverId:
        return jsonify({'status':'error','message':'driverId required'}), 400

    # already exists?
    for ext in ('.jpg','.jpeg','.png','.webp'):
        p = HEADSHOT_DIR / f"{driverId}{ext}"
        if p.exists():
            return jsonify({'status':'exists','filename': p.name})

    row = find_driver_row(driverId)
    driverRef = None
    number = None
    full_name = None
    if row:
        driverRef = (row.get('driverRef') or '').strip()
        number = (row.get('number') or '').strip()
        full_name = ((row.get('forename') or '').strip() + ' ' + (row.get('surname') or '').strip()).strip()

    headshot_url = None
    # try by number
    if number and number != "\\N":
        params = {'driver_number': number, 'session_key': 'latest'}
        j = fetch_json(API_BASE, params=params)
        if isinstance(j, list) and j:
            headshot_url = j[0].get('headshot_url')
    # try by name
    if not headshot_url and full_name:
        params = {'full_name': full_name, 'session_key': 'latest'}
        j = fetch_json(API_BASE, params=params)
        if isinstance(j, list) and j:
            headshot_url = j[0].get('headshot_url')

    # fallback heuristics
    if not headshot_url and driverRef:
        candidates = [
            f"https://api.openf1.io/drivers/{driverRef}/image",
            f"https://openf1.io/images/drivers/{driverRef}.jpg",
            f"https://openf1.io/images/drivers/{driverRef}.png",
        ]
        for url in candidates:
            try:
                r = requests.head(url, allow_redirects=True, timeout=8)
                if r.status_code == 200 and r.headers.get('content-type','').startswith('image/'):
                    headshot_url = url
                    break
            except Exception:
                pass

    if not headshot_url:
        return jsonify({'status':'not_found'}), 404

    # determine extension
    ext = '.jpg'
    if headshot_url.lower().endswith('.png'):
        ext = '.png'
    elif headshot_url.lower().endswith('.webp'):
        ext = '.webp'

    out = HEADSHOT_DIR / f"{driverId}{ext}"
    ok = download_url(headshot_url, out)
    if ok:
        return jsonify({'status':'saved','filename': out.name})
    else:
        return jsonify({'status':'error','message':'download_failed'}), 500

@app.route('/headshots/<path:filename>')
def serve_headshot(filename):
    return send_from_directory(str(HEADSHOT_DIR), filename)

if __name__ == '__main__':
    print('Starting headshot server on http://0.0.0.0:8001')
    app.run(host='0.0.0.0', port=8001)
