// Fonction de connexion (déjà vue précédemment)
function login(username, password) {
    fetch('api/login.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username, password: password })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // 1. Sauvegarder le rôle et le nom
            localStorage.setItem('userRole', data.role);
            localStorage.setItem('userName', data.username);
            
            // 2. Rediriger vers le tableau de bord
            window.location.href = 'dashboard.html';
        } else {
            // Afficher l'erreur sur la page
            document.getElementById('error-msg').innerText = data.message;
        }
    })
    .catch(error => console.error('Erreur:', error));
}

document.addEventListener('DOMContentLoaded', () => {
    
    // --- GESTION DU LOGIN ---
    const loginForm = document.getElementById('loginForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', function(event) {
            event.preventDefault(); 
            
            const usernameVal = document.getElementById('username').value;
            const passwordVal = document.getElementById('password').value;
            const errorMsg = document.getElementById('error-message');

            fetch('api/login.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: usernameVal, password: passwordVal })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // 1. On stocke les infos de session
                    localStorage.setItem('userRole', data.role);
                    localStorage.setItem('userName', data.username);

                    // 2. MODIFICATION ICI : Redirection vers index.html
                    window.location.href = 'tp9_dashboard/dashboard.html'; 
                } else {
                    errorMsg.innerText = data.message || "Erreur de connexion";
                }
            })
            .catch(err => {
                console.error(err);
                if(errorMsg) errorMsg.innerText = "Erreur serveur";
            });
        });
    }
});
// --- GESTION DES ACCÈS (DASHBOARD) ---

function checkDashboardAccess() {
    const role = localStorage.getItem('userRole');
    const username = localStorage.getItem('userName');

    // 1. Sécurité : Si pas connecté, retour à l'accueil ou login
    if (!role) {
        alert("Accès interdit. Veuillez vous connecter.");
        window.location.href = 'login.html';
        return;
    }

    // Afficher le nom de l'utilisateur
    document.getElementById('user-info').innerText = "Bonjour, " + username + " (" + role + ")";

    // 2. Gestion Admin vs User
    const adminZone = document.getElementById('admin-zone');

    if (role === 'admin') {
        // Si c'est un admin, on affiche la zone complexe
        adminZone.style.display = 'block'; 
        console.log("Mode Admin : Tout est affiché.");
    } else {
        // Si c'est un user (ou autre), on s'assure que c'est caché
        adminZone.style.display = 'none';
        console.log("Mode User : Graphique complexe masqué.");
    }
}

// Fonction de déconnexion
function logout() {
    localStorage.clear(); // On vide le stockage
    window.location.href = 'login.html'; // Retour au login
}
let allDrivers = [];

// Mapping manuel des nationalités F1 vers codes ISO (2 lettres) pour l'API de drapeaux
const nationalityToCode = {
    "British": "gb", "German": "de", "French": "fr", "Italian": "it", "Spanish": "es",
    "Brazilian": "br", "Argentine": "ar", "American": "us", "Austrian": "at", "Australian": "au",
    "Belgian": "be", "Canadian": "ca", "Dutch": "nl", "Finnish": "fi", "Japanese": "jp",
    "Mexican": "mx", "Monegasque": "mc", "New Zealander": "nz", "Russian": "ru", "Swedish": "se",
    "Swiss": "ch", "Danish": "dk", "Thai": "th", "Polish": "pl", "Venezuelan": "ve",
    "Colombian": "co", "Portuguese": "pt", "South African": "za", "Irish": "ie", "Indian": "in",
    "Hungarian": "hu", "Chinese": "cn", "Malaysian": "my", "Indonesian": "id"
};

document.addEventListener('DOMContentLoaded', () => {
    updateNavbar();

    const loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);

    const registerForm = document.getElementById('registerForm');
    if (registerForm) registerForm.addEventListener('submit', handleRegister);

    if (document.getElementById('driversTable')) {
        fetchDrivers();
    }
});

// --- CHARGEMENT DONNÉES ---
function fetchDrivers() {
    const loadingMsg = document.getElementById('loading-msg');
    fetch('api/get_data.php?file=drivers')
        .then(res => res.json())
        .then(data => {
            if (data.error) { loadingMsg.innerText = data.error; return; }
            allDrivers = data;
            loadingMsg.style.display = 'none';
            
            // 1. Initialiser le filtre des nationalités
            populateNationalityFilter(allDrivers);
            
            // 2. Afficher le tableau
            updateTable(allDrivers);
        })
        .catch(err => {
            console.error(err);
            loadingMsg.innerText = "Erreur chargement données.";
        });
}

// --- NOUVEAU : Remplir la liste déroulante ---
function populateNationalityFilter(data) {
    const select = document.getElementById('nationalityFilter');
    if (!select) return;

    // Récupérer toutes les nationalités uniques
    const nationalities = [...new Set(data.map(d => d.nationality))].sort();

    nationalities.forEach(nat => {
        const option = document.createElement('option');
        option.value = nat;
        // Ajout d'un petit emoji drapeau si dispo (optionnel, sinon juste texte)
        option.textContent = nat;
        select.appendChild(option);
    });
}

// --- MISE À JOUR TABLEAU ---
function updateTable(data) {
    const tbody = d3.select("#tableBody");
    tbody.html("");
    
    if (data.length === 0) {
        document.getElementById('no-result-msg').style.display = 'block';
        return;
    }
    document.getElementById('no-result-msg').style.display = 'none';

    const rows = tbody.selectAll("tr").data(data).enter().append("tr");
    
    rows.append("td").text(d => d.code || d.driverRef);
    rows.append("td").text(d => d.forename);
    rows.append("td").html(d => `<strong>${d.surname}</strong>`);
    
    // --- COLONNE NATIONALITÉ AVEC DRAPEAU ---
    rows.append("td")
        .html(d => {
            const code = nationalityToCode[d.nationality];
            let flagHtml = "";
            if (code) {
                // Utilisation de flagcdn pour les images
                flagHtml = `<img src="https://flagcdn.com/24x18/${code}.png" 
                             alt="${d.nationality}" 
                             style="vertical-align: middle; margin-right: 8px; border: 1px solid #ddd;">`;
            } else {
                flagHtml = "🏳️ "; // Drapeau blanc par défaut si code inconnu
            }
            return flagHtml + d.nationality;
        });

    rows.append("td").text(d => d.dob);
    rows.append("td").append("a")
        .attr("href", d => d.url).attr("target", "_blank")
        .classed("wiki-link", true).text("🔗 Bio");
}

// --- FILTRAGE COMBINÉ (Texte + Select) ---
function filterTable() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const selectedNat = document.getElementById('nationalityFilter').value; // Valeur du select

    const filtered = allDrivers.filter(d => {
        // 1. Filtre Texte
        const matchesSearch = (d.forename + " " + d.surname).toLowerCase().includes(searchTerm) || 
                              d.nationality.toLowerCase().includes(searchTerm);
        
        // 2. Filtre Select (si une nationalité est choisie)
        const matchesNat = selectedNat === "" || d.nationality === selectedNat;

        return matchesSearch && matchesNat;
    });

    updateTable(filtered);
}

// --- AUTRES FONCTIONS (Navigation, Login, Register) ---
// (Identiques à avant, je les remets pour que le fichier soit complet)

function updateNavbar() {
    const navAuth = document.getElementById('nav-auth');
    if (!navAuth) return;
    const role = localStorage.getItem('userRole');
    const username = localStorage.getItem('userName');
    if (role) {
        navAuth.innerHTML = `<span class="user-greeting">Bonjour, <strong>${username}</strong> (${role})</span> <button onclick="logout()" class="btn-logout">Déconnexion</button>`;
        const wt = document.getElementById('welcome-title');
        if(wt) wt.innerText = "Heureux de vous revoir, " + username;
    } else {
        navAuth.innerHTML = `<a href="login.html" class="btn-login">Connexion Membre</a>`;
    }
}
function logout() { localStorage.clear(); window.location.href = 'index.html'; }
function handleLogin(e) {
    e.preventDefault();
    fetch('api/login.php', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({username: document.getElementById('username').value, password: document.getElementById('password').value})
    }).then(r=>r.json()).then(d=>{
        if(d.success){ localStorage.setItem('userRole',d.role); localStorage.setItem('userName',d.username); window.location.href='index.html'; }
        else document.getElementById('error-message').innerText = d.message;
    }).catch(e=>console.error(e));
}
function handleRegister(e) {
    e.preventDefault();
    const msg = document.getElementById('success-message');
    const err = document.getElementById('error-message');
    fetch('api/register.php', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({username: document.getElementById('reg-username').value, password: document.getElementById('reg-password').value})
    }).then(r=>r.json()).then(d=>{
        if(d.success){ msg.innerText="Compte créé !"; setTimeout(()=>window.location.href='login.html',1500); }
        else err.innerText = d.message;
    }).catch(e=>console.error(e));
}