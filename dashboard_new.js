// F1ouz/dashboard_new.js

// --- CONFIGURATION ---
const API_BASE_URL = 'api/get_data.php'; 

// Variables globales
let ALL_DRIVERS = [];
let ALL_RACES = [];
let ALL_RESULTS = [];
let ALL_CONSTRUCTORS = [];

document.addEventListener('DOMContentLoaded', () => {
    setupControls(); 
});

/**
 * Charge toutes les données au démarrage
 */
async function setupControls() {
    updateStatus("CHARGEMENT DES DONNÉES...");
    
    try {
        // Chargement parallèle des 4 fichiers nécessaires
        const [drivers, races, results, constructors] = await Promise.all([
            fetchData('drivers'),
            fetchData('races'),
            fetchData('results'),
            fetchData('constructors')
        ]);

        // Stockage en mémoire
        ALL_DRIVERS = drivers;
        ALL_RACES = races;
        ALL_RESULTS = results;
        ALL_CONSTRUCTORS = constructors;
        
        // Configuration de la recherche et de la liste
        setupDriverSearch(drivers);

        // Écouteur pour le changement de pilote (met à jour les années)
        document.getElementById('driver-select').addEventListener('change', (e) => {
            updateSeasonListForDriver(e.target.value);
        });

        // Écouteur pour le bouton Charger
        document.getElementById('load-stats-btn').addEventListener('click', () => {
            const selectedDriverId = document.getElementById('driver-select').value;
            const selectedSeason = document.getElementById('season-select').value;
            loadDashboard(selectedDriverId, selectedSeason);
        });
        
        // --- CORRECTIF ICI : GESTION PRIORITAIRE (URL vs DÉFAUT) ---
        
        // 1. Vérifier si un ID est présent dans l'URL (ex: ?driverId=830)
        const urlParams = new URLSearchParams(window.location.search);
        const urlDriverId = urlParams.get('driverId');
        
        let targetDriverId = null;

        if (urlDriverId && drivers.find(d => d.driverId == urlDriverId)) {
            // Priorité 1 : L'URL demande un pilote spécifique
            console.log("Chargement via URL pour driverId:", urlDriverId);
            targetDriverId = urlDriverId;
        } else {
            // Priorité 2 : Sinon, on met Hamilton (ou le premier de la liste) par défaut
            const defaultDriver = drivers.find(d => d.surname.toLowerCase() === 'hamilton') || drivers[0];
            if (defaultDriver) targetDriverId = defaultDriver.driverId;
        }

        // 2. Appliquer la sélection et charger automatiquement
        if (targetDriverId) {
            const select = document.getElementById('driver-select');
            select.value = targetDriverId;
            
            // Mettre à jour la liste des saisons pour ce pilote (CRUCIAL)
            updateSeasonListForDriver(targetDriverId);
            
            // Simuler le clic pour afficher les données
            document.getElementById('load-stats-btn').click();
        }
        // -----------------------------------------------------------

    } catch (error) {
        console.error("Erreur setup:", error);
        updateStatus("ERREUR: Impossible de charger les données (Vérifiez api/get_data.php)");
    }
}

/**
 * Configure la barre de recherche de pilotes
 */
function setupDriverSearch(drivers) {
    const searchInput = document.getElementById('driver-search');
    const driverSelect = document.getElementById('driver-select');

    // Fonction pour remplir le menu déroulant
    const populateSelect = (list) => {
        driverSelect.innerHTML = '';
        // Tri alphabétique par nom de famille
        list.sort((a, b) => a.surname.localeCompare(b.surname));
        
        list.forEach(driver => {
            const option = document.createElement('option');
            option.value = driver.driverId;
            option.textContent = `${driver.surname}, ${driver.forename}`;
            driverSelect.appendChild(option);
        });
    };

    // Remplissage initial
    populateSelect(drivers);

    // Filtrage à chaque frappe clavier
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = drivers.filter(d => 
            d.surname.toLowerCase().includes(term) || 
            d.forename.toLowerCase().includes(term)
        );
        populateSelect(filtered);
        
        // Sélectionner automatiquement le premier résultat de la recherche
        if(filtered.length > 0) {
            driverSelect.value = filtered[0].driverId;
            updateSeasonListForDriver(filtered[0].driverId);
        }
    });
}

/**
 * Met à jour la liste des années où le pilote a couru
 */
function updateSeasonListForDriver(driverId) {
    const seasonSelect = document.getElementById('season-select');
    seasonSelect.innerHTML = ""; 

    // 1. Trouver tous les résultats de ce pilote
    const driverResults = ALL_RESULTS.filter(r => r.driverId == driverId);
    // 2. Récupérer les ID des courses
    const driverRaceIds = new Set(driverResults.map(r => r.raceId));
    
    // 3. Trouver les années correspondantes dans ALL_RACES
    const driverRaces = ALL_RACES.filter(r => driverRaceIds.has(r.raceId));
    const years = [...new Set(driverRaces.map(r => parseInt(r.year)))];

    // 4. Trier du plus récent au plus ancien
    years.sort((a, b) => b - a);

    if (years.length === 0) {
        const option = document.createElement('option');
        option.textContent = "-";
        seasonSelect.appendChild(option);
    } else {
        years.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            seasonSelect.appendChild(option);
        });
        // Sélectionner la saison la plus récente par défaut
        seasonSelect.selectedIndex = 0;
    }
}

/**
 * Fonction principale : Calcule et affiche les statistiques
 */
async function loadDashboard(driverId, season) {
    if (!driverId || !season) return;
    
    updateStatus(`ANALYSE TÉLÉMÉTRIE ${season}...`);

    try {
        const driver = ALL_DRIVERS.find(d => d.driverId == driverId);
        
        // --- GESTION IMAGE (Wiki -> OpenF1 -> Défaut) ---
        updateDriverImage(null); // Reset d'abord
        resolveDriverImage(driver).then(url => {
            updateDriverImage(url);
        });

        // 2. Identifier les courses de la saison choisie
        const seasonRaceIds = ALL_RACES
            .filter(r => r.year == season)
            .map(r => r.raceId);
            
        // 3. Filtrer les résultats du pilote pour cette saison UNIQUEMENT
        const seasonResults = ALL_RESULTS.filter(r => 
            r.driverId == driverId && seasonRaceIds.includes(r.raceId)
        );

        // 4. Trouver l'ÉQUIPE (Constructeur)
        let teamName = "ÉQUIPE INCONNUE";
        if (seasonResults.length > 0) {
            const constructorId = seasonResults[0].constructorId;
            const team = ALL_CONSTRUCTORS.find(c => c.constructorId == constructorId);
            if (team) teamName = team.name.toUpperCase();
        }

        updateDriverProfileInfo(driver, teamName);

        // 5. Calculer les statistiques
        let totalPoints = 0;
        let wins = 0;
        let podiums = 0;
        let finished = 0;
        let dnf = 0;
        let positions = [];

        seasonResults.forEach(r => {
            totalPoints += parseFloat(r.points);
            const pos = parseInt(r.positionOrder);
            positions.push(pos);

            if (pos === 1) wins++;
            if (pos <= 3) podiums++;
            
            // Si positionText est un nombre, la course est finie. Sinon (R, W, etc.) c'est un abandon.
            if (!isNaN(parseInt(r.positionText))) {
                finished++;
            } else {
                dnf++;
            }
        });

        const racesCount = seasonResults.length;
        const avgPoints = racesCount > 0 ? (totalPoints / racesCount).toFixed(1) : 0;
        const bestPos = positions.length > 0 ? Math.min(...positions) : "--";

        // 6. Mise à jour de l'affichage HTML
        updateDOM({
            year: season,
            points: totalPoints,
            wins: wins,
            podiums: podiums,
            finished: finished,
            racesCount: racesCount,
            bestPos: bestPos,
            dnf: dnf,
            avgPoints: avgPoints
        });

        updateStatus(`DONNÉES CHARGÉES: ${driver.surname} ${season}`);

    } catch (error) {
        console.error(error);
        updateStatus("ERREUR LORS DU TRAITEMENT");
    }
}

// --- FONCTIONS UTILITAIRES ---

async function fetchData(filename) {
    const response = await fetch(`${API_BASE_URL}?file=${filename}`);
    if (!response.ok) throw new Error(`Fichier introuvable: ${filename}`);
    return await response.json();
}

function updateDOM(stats) {
    document.getElementById('season-year').innerText = stats.year;
    document.getElementById('season-points-display').innerText = stats.points;
    
    // Animation du gros compteur de points
    animateValue("total-points", 0, stats.points, 1000);

    document.getElementById('races-count').innerText = stats.racesCount;
    document.getElementById('best-pos').innerText = typeof stats.bestPos === 'number' ? "P" + stats.bestPos : stats.bestPos;
    document.getElementById('dnf-count').innerText = stats.dnf;
    document.getElementById('avg-points').innerText = stats.avgPoints;

    document.getElementById('wins-count').innerText = stats.wins;
    document.getElementById('podiums-count').innerText = stats.podiums;
    document.getElementById('finished-count').innerText = stats.finished;

    // Barres de progression (en pourcentage des courses disputées)
    const total = stats.racesCount > 0 ? stats.racesCount : 1;
    setBarWidth('wins-bar', (stats.wins / total) * 100);
    setBarWidth('podiums-bar', (stats.podiums / total) * 100);
    setBarWidth('finished-bar', (stats.finished / total) * 100);
}

function setBarWidth(id, percent) {
    setTimeout(() => {
        const el = document.getElementById(id);
        if(el) el.style.width = percent + "%";
    }, 100); 
}

function updateStatus(msg) {
    document.getElementById('last-update').innerText = "STATUS: " + msg;
}

function animateValue(id, start, end, duration) {
    const obj = document.getElementById(id);
    if (!obj) return;
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

function updateDriverProfileInfo(driver, teamName) {
    document.getElementById('driver-number').innerText = driver.number || '--';
    document.getElementById('driver-name').innerHTML = `${driver.forename}<br><span class="surname">${driver.surname}</span>`;
    document.getElementById('driver-team').innerText = teamName;
    
    const nationText = driver.nationality ? driver.nationality.substring(0, 3).toUpperCase() : '---';
    document.getElementById('driver-nation').innerText = `NAT: ${nationText}`; 
}

// --- GESTION IMAGE AVANCÉE (CASCADE & VERIFICATION) ---

function updateDriverImage(imageUrl) {
    const centerPanel = document.querySelector('.center-panel');
    if (!centerPanel) return;
    
    if (imageUrl) {
        centerPanel.style.setProperty('--driver-bg-url', `url('${imageUrl}')`);
    } else {
        centerPanel.style.setProperty('--driver-bg-url', 'none');
    }
}

async function resolveDriverImage(driver) {
    // 1. Wikipédia
    if (driver.url) {
        const wikiUrl = await fetchWikiImage(driver.url);
        if (wikiUrl && await testImageLoad(wikiUrl)) {
            console.log("Image: Wiki OK");
            return wikiUrl;
        }
    }
    // 2. OpenF1
    const openF1Url = await fetchOpenF1Image(driver);
    if (openF1Url && await testImageLoad(openF1Url)) {
        console.log("Image: OpenF1 OK");
        return openF1Url;
    }
    // 3. Défaut
    console.log("Image: Défaut");
    return 'images/driver_silhouette.png'; 
}

async function fetchWikiImage(wikiUrl) {
    if (!wikiUrl) return null;
    try {
        const parts = wikiUrl.split('/wiki/');
        if (parts.length < 2) return null;
        const articleTitle = parts[1]; 
        const API_WIKI = `https://en.wikipedia.org/w/api.php?action=query&titles=${articleTitle}&prop=pageimages&pithumbsize=600&format=json&origin=*`;
        const r = await fetch(API_WIKI);
        const d = await r.json();
        const p = d.query.pages;
        const pid = Object.keys(p)[0];
        if (pid !== "-1" && p[pid].thumbnail) return p[pid].thumbnail.source;
    } catch (e) { console.warn(e); }
    return null;
}

async function fetchOpenF1Image(driver) {
    try {
        const fullName = `${driver.forename} ${driver.surname}`;
        const r = await fetch(`https://api.openf1.org/v1/drivers?full_name=${encodeURIComponent(fullName)}&session_key=latest`);
        if (!r.ok) return null;
        const d = await r.json();
        if (Array.isArray(d) && d.length > 0 && d[0].headshot_url) return d[0].headshot_url;
    } catch (e) { console.warn(e); }
    return null;
}

function testImageLoad(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = url;
    });
}