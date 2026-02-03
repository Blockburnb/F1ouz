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
(Mot de passe DB : 'f1_pass')
docker exec -it f1_db_container mysql -u root -p

Ensuite, il faut sélectionner la base f1_project
USE f1_project;
On peut vérifier les tables présentes : 
SHOW TABLES;


# Une fois dans le prompt MySQL, lancer la requête :
SELECT * FROM users;
```
```powershell
mysql> SHOW TABLES;
+----------------------+
| Tables_in_f1_project |
+----------------------+
| users                |
+----------------------+
1 row in set (0.01 sec)

mysql> SELECT * FROM users;
+----+----------+--------------------------------------------------------------+-------+
| id | username | password                                                     | role  |
+----+----------+--------------------------------------------------------------+-------+
|  1 | admin    | admin                                                        | admin |
|  2 | toto     | toto                                                         | user  |
|  3 | test2    | $2y$10$DoJWz.FYzTbXk5FhUX61eONz6fhaTsnL0CiQ2QKZil1H9WI2Gx2Ru | user  |
|  4 | test3    | $2y$10$J6p24Jz9ORucl8NKSX2N1exybSCYjwLtCusjJzmqlx8UvaBxjGD0. | user  |
+----+----------+--------------------------------------------------------------+-------+
4 rows in set (0.01 sec)
```
On voit ici que les comptes qui ne sont pas les comptes test disposent bel et bien d'un mot de passe hashé

Remarques :
- `f1ouz-web` est le nom d'exemple du conteneur de base de données. Adaptez-le au nom réel de votre conteneur (voir `docker ps`).
- `-pf1_pass` utilise ici le mot de passe `f1_pass` défini dans la configuration
- La base cible est `f1_project`

Cette commande vous affichera les comptes présents (username, hash de mot de passe, rôle, etc.).

## Installation

### Méthode 1 : Installation simple (Windows)

1. **Cloner le dépôt**
   ```bash
   git clone https://github.com/Blockburnb/R5.VCOD.07_Programmation_web_pour_la_visualisation.git
   cd R5.VCOD.07_Programmation_web_pour_la_visualisation
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
   git clone https://github.com/Blockburnb/R5.VCOD.07_Programmation_web_pour_la_visualisation.git
   cd R5.VCOD.07_Programmation_web_pour_la_visualisation
   ```

2. **Ouvrir Docker Desktop** (Windows/Mac) ou démarrer le service Docker (Linux)

3. **Composer et lancer les conteneurs**
   ```bash
   docker compose up --build
   ```

4. **Ouvrir dans le navigateur**
   - Application Web: [http://localhost](http://localhost)

