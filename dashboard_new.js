// --- CONFIGURATION ---
const API_BASE_URL = '../api/get_data.php';
const TARGET_DRIVER_ID = 1; // Lewis Hamilton

document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
});

async function initDashboard() {
    updateStatus("INITIALISATION...");
    
    try {
        // 1. Récupération parallèle des données
        const [drivers, races, results, constructors] = await Promise.all([
            fetchData('drivers'),
            fetchData('races'),
            fetchData('results'),
            fetchData('constructors')
        ]);

        updateStatus("PROCESSING DATA...");

        // 2. Identifier le pilote (Vérification)
        const driver = drivers.find(d => d.driverId == TARGET_DRIVER_ID);
        if (!driver) throw new Error("Pilote introuvable");
        console.log("Pilote:", driver.forename, driver.surname);

        // 3. Trouver la dernière saison active du pilote
        // On filtre les résultats pour ce pilote
        const driverResults = results.filter(r => r.driverId == TARGET_DRIVER_ID);
        
        // On récupère les IDs de courses
        const raceIds = driverResults.map(r => r.raceId);
        
        // On trouve les années correspondantes dans 'races'
        const driverRaces = races.filter(r => raceIds.includes(r.raceId));
        
        // On trouve l'année max
        const years = driverRaces.map(r => parseInt(r.year));
        const lastSeason = Math.max(...years);
        
        console.log("Dernière saison trouvée:", lastSeason);

        // 4. Agréger les stats pour cette saison
        const seasonRaces = races.filter(r => r.year == lastSeason).map(r => r.raceId);
        const seasonResults = driverResults.filter(r => seasonRaces.includes(r.raceId));

        // Calculs
        let totalPoints = 0;
        let wins = 0;
        let podiums = 0;
        let finished = 0; // Pas de 'R' (Retired) ou 'D' (Disqualified)
        let positions = [];
        let dnf = 0;

        seasonResults.forEach(r => {
            totalPoints += parseFloat(r.points);
            
            const pos = parseInt(r.positionOrder);
            positions.push(pos);

            if (pos === 1) wins++;
            if (pos <= 3) podiums++;

            // Vérification statut (simplifiée : si positionText est un nombre, c'est fini)
            if (!isNaN(parseInt(r.positionText))) {
                finished++;
            } else {
                dnf++;
            }
        });

        const racesCount = seasonResults.length;
        const avgPoints = racesCount > 0 ? (totalPoints / racesCount).toFixed(1) : 0;
        const bestPos = positions.length > 0 ? Math.min(...positions) : "-";

        // Pour déterminer le rang final au championnat (approximation simple ici)
        // Idéalement il faudrait charger 'driver_standings', mais on peut l'estimer ou laisser vide si pas demandé explicitement.
        // On va afficher le total points.

        // 5. Mise à jour du DOM
        updateDOM({
            year: lastSeason,
            points: totalPoints,
            wins: wins,
            podiums: podiums,
            finished: finished,
            racesCount: racesCount,
            bestPos: bestPos,
            dnf: dnf,
            avgPoints: avgPoints
        });

        updateStatus("SYSTEM READY // " + lastSeason);

    } catch (error) {
        console.error(error);
        updateStatus("ERROR: CONNECTION LOST");
    }
}

// Fonction utilitaire fetch
async function fetchData(filename) {
    const response = await fetch(`${API_BASE_URL}?file=${filename}`);
    if (!response.ok) throw new Error(`Erreur chargement ${filename}`);
    return await response.json();
}

// Mise à jour de l'interface
function updateDOM(stats) {
    // Textes
    document.getElementById('season-year').innerText = stats.year;
    document.getElementById('season-rank').innerText = "P3"; // Hardcodé pour l'exemple ou à calculer
    
    // Animation compteur points
    animateValue("total-points", 0, stats.points, 1500);

    document.getElementById('races-count').innerText = stats.racesCount;
    document.getElementById('best-pos').innerText = "P" + stats.bestPos;
    document.getElementById('dnf-count').innerText = stats.dnf;
    document.getElementById('avg-points').innerText = stats.avgPoints;

    document.getElementById('wins-count').innerText = stats.wins;
    document.getElementById('podiums-count').innerText = stats.podiums;
    document.getElementById('finished-count').innerText = stats.finished;

    // Barres de progression (Pourcentages relatifs au nombre de courses)
    setBarWidth('wins-bar', (stats.wins / stats.racesCount) * 100);
    setBarWidth('podiums-bar', (stats.podiums / stats.racesCount) * 100);
    setBarWidth('finished-bar', (stats.finished / stats.racesCount) * 100);
}

function setBarWidth(id, percent) {
    setTimeout(() => {
        document.getElementById(id).style.width = percent + "%";
    }, 500); // Petit délai pour l'effet
}

function updateStatus(msg) {
    document.getElementById('last-update').innerText = "STATUS: " + msg;
}

// Animation simple des nombres
function animateValue(id, start, end, duration) {
    const obj = document.getElementById(id);
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