import csv
import os
import requests
import sys
import time
from pathlib import Path

try:
    from bs4 import BeautifulSoup
except ImportError:
    print("Erreur: La librairie 'beautifulsoup4' est manquante.")
    print("Installez-la avec : pip install beautifulsoup4")
    sys.exit(1)

# --- Configuration ---
BASE_DIR = Path(__file__).resolve().parent.parent
CSV_PATH = BASE_DIR / 'data' / 'drivers.csv'
OUTPUT_DIR = BASE_DIR / 'data' / 'headshots'

# Identification obligatoire pour Wikipedia (sinon erreur 403)
HEADERS = {
    'User-Agent': 'F1DashboardStudentProject/1.0 (Educational purpose; contact: admin@localhost)'
}

os.makedirs(OUTPUT_DIR, exist_ok=True)

def download_image(img_url, driver_id):
    """Télécharge l'image depuis l'URL et la sauvegarde"""
    if not img_url:
        return False
    
    # Correction des URLs relatives (//upload...)
    if img_url.startswith("//"):
        img_url = "https:" + img_url
    
    try:
        # On ajoute les HEADERS ici aussi
        r = requests.get(img_url, headers=HEADERS, timeout=15)
        if r.status_code == 200:
            filename = OUTPUT_DIR / f"{driver_id}.jpg"
            with open(filename, 'wb') as f:
                f.write(r.content)
            return True
    except Exception as e:
        print(f"   -> Erreur DL: {e}")
    return False

def process_drivers():
    if not CSV_PATH.exists():
        print(f"Erreur: Fichier introuvable {CSV_PATH}")
        return

    print(f"Lecture de {CSV_PATH}...")
    
    with open(CSV_PATH, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        count_ok = 0
        
        for row in reader:
            driver_id = row['driverId']
            wiki_url = row['url']
            name = f"{row['forename']} {row['surname']}"
            
            # Si l'image existe déjà, on passe (gain de temps)
            if (OUTPUT_DIR / f"{driver_id}.jpg").exists():
                continue

            if not wiki_url or "wikipedia.org" not in wiki_url:
                continue

            print(f"[{driver_id}] Recherche pour {name}...")
            
            try:
                # C'est ICI que l'erreur 403 se produisait : il manquait headers=HEADERS
                r = requests.get(wiki_url, headers=HEADERS, timeout=10)
                
                if r.status_code != 200:
                    print(f"   -> Erreur HTTP {r.status_code} sur la page Wiki")
                    continue
                
                soup = BeautifulSoup(r.content, 'html.parser')
                target_img = None
                
                # 1. Chercher dans l'infobox (encadré gris à droite)
                infobox = soup.find('table', class_='infobox')
                if infobox:
                    img_tag = infobox.find('img')
                    if img_tag:
                        target_img = img_tag.get('src')
                
                # 2. Fallback : chercher l'image principale de l'article
                if not target_img:
                    img_tag = soup.find('img', class_='mw-file-element')
                    if img_tag:
                        target_img = img_tag.get('src')

                if target_img:
                    if download_image(target_img, driver_id):
                        print(f"   -> OK")
                        count_ok += 1
                        # Petite pause pour être poli avec le serveur
                        time.sleep(0.2)
                    else:
                        print("   -> Échec téléchargement image")
                else:
                    print("   -> Pas d'image trouvée")
                    
            except Exception as e:
                print(f"   -> Erreur: {e}")

    print(f"\nTerminé ! {count_ok} images récupérées.")

if __name__ == "__main__":
    process_drivers()