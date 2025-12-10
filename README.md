# F1ouz

Tableau de bord F1 interactif avec visualisations de données (D3.js, HTML/CSS/JavaScript).

**Dataset:** https://www.kaggle.com/datasets/rohanrao/formula-1-world-championship-1950-2020?select=results.csv

## Fonctionnalités

- Classement par équipe, par pilote, par équipe de pilote
- Meilleures victoires et podiums par circuit
- Record de chaque piste (fastest lap)
- Statistiques pole position (qualification)
- Pitstops les plus rapides par pilote et par écurie
- Affichage des photos de pilotes
- Filtrage dynamique par pilote, écurie, circuit, année
- Thème personnalisé par couleur d'équipe
- Écran de chargement animé (feux de départ F1)
- Focus de chaque pilote (vue détaillée / profil pilote)

## Profils de connexion (Base de données)

Après initialisation, deux comptes test sont disponibles:

| Username | Password | Rôle     |
|----------|----------|----------|
| `admin`  | `admin`  | Admin    |
| `toto`   | `toto`   | User     |

## Vérifier les comptes créés (base de données)

Si vous avez démarré l'application avec Docker, vous pouvez vérifier les comptes utilisateur directement dans la base MySQL du conteneur. Depuis un terminal (PowerShell ou bash) exécutez :

```powershell
# Ouvrir un shell MySQL dans le conteneur (remplacez le nom du conteneur si besoin)
docker exec -it f1ouz-web mysql -u root -pf1_pass f1_project

# Une fois dans le prompt MySQL, lancer la requête :
SELECT * FROM users;
```

Remarques :
- `f1ouz-web` est le nom d'exemple du conteneur de base de données. Adaptez-le au nom réel de votre conteneur (voir `docker ps`).
- `-pf1_pass` utilise ici le mot de passe `f1_pass` défini dans la configuration ; si votre mot de passe est différent, remplacez-le.
- La base cible est `f1_project` (nom d'exemple utilisé ici) — adaptez si votre configuration diffère.

Cette commande vous affichera les comptes présents (username, hash de mot de passe, rôle, etc.).

## Installation

### Méthode 1 : Installation simple (Windows)

1. **Cloner le dépôt**
   ```bash
   git clone https://github.com/Blockburnb/F1ouz.git
   cd F1ouz
   ```

2. **Lancer le script d'installation**
   ```cmd
   installer.bat
   ```

   Le script va automatiquement :
   - Vérifier/installer Docker
   - Composer l'application (`docker compose up --build`)
   - Ouvrir `http://localhost` dans le navigateur

### Méthode 2 : Installation manuelle (Docker)

1. **Cloner le dépôt**
   ```bash
   git clone https://github.com/Blockburnb/F1ouz.git
   cd F1ouz
   ```

2. **Ouvrir Docker Desktop** (Windows/Mac) ou démarrer le service Docker (Linux)

3. **Composer et lancer les conteneurs**
   ```bash
   docker compose up --build
   ```

4. **Ouvrir dans le navigateur**
   - Application Web: [http://localhost](http://localhost)
   - Base de données (phpMyAdmin): [http://localhost:8080](http://localhost:8080) (si configuré)
