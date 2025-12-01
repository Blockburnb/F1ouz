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
                    window.location.href = 'index.html'; 
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

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. GESTION DE LA NAVIGATION (Connecté vs Invité)
    updateNavbar();

    // 2. GESTION DU LOGIN (Page login.html)
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // 3. GESTION DE L'INSCRIPTION (Page register.html) - NOUVEAU
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }

    // 4. CHARGEMENT DES DONNÉES (Page index.html)
    if (document.getElementById('driversTable')) {
        // Le scroll est géré dans style.css
        fetchDrivers();
    }
});

// --- Gestion Navigation ---
function updateNavbar() {
    const navAuth = document.getElementById('nav-auth');
    if (!navAuth) return; 

    const role = localStorage.getItem('userRole');
    const username = localStorage.getItem('userName');

    if (role) {
        // UTILISATEUR CONNECTÉ
        navAuth.innerHTML = `
            <span class="user-greeting">Bonjour, <strong>${username}</strong> (${role})</span>
            <button onclick="logout()" class="btn-logout">Déconnexion</button>
        `;
        const welcomeTitle = document.getElementById('welcome-title');
        if (welcomeTitle) welcomeTitle.innerText = "Heureux de vous revoir, " + username;

    } else {
        // INVITÉ
        navAuth.innerHTML = `
            <a href="login.html" class="btn-login">Connexion Membre</a>
        `;
    }
}

function logout() {
    localStorage.clear(); 
    window.location.href = 'index.html'; 
}

// --- Gestion Login ---
function handleLogin(event) {
    event.preventDefault();
    const userVal = document.getElementById('username').value;
    const passVal = document.getElementById('password').value;
    const errorMsg = document.getElementById('error-message');

    fetch('api/login.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: userVal, password: passVal })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            localStorage.setItem('userRole', data.role);
            localStorage.setItem('userName', data.username);
            window.location.href = 'index.html'; 
        } else {
            errorMsg.innerText = data.message || "Erreur id/mdp";
        }
    })
    .catch(err => { console.error(err); errorMsg.innerText = "Erreur serveur"; });
}

// --- Gestion Inscription (NOUVEAU) ---
function handleRegister(event) {
    event.preventDefault();
    const userVal = document.getElementById('reg-username').value;
    const passVal = document.getElementById('reg-password').value;
    const errorMsg = document.getElementById('error-message');
    const successMsg = document.getElementById('success-message');

    // Réinitialisation des messages
    errorMsg.innerText = "";
    successMsg.innerText = "";

    fetch('api/register.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: userVal, password: passVal })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            successMsg.innerText = "Compte créé ! Redirection vers la connexion...";
            // Redirection automatique après 1.5 secondes
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
        } else {
            errorMsg.innerText = data.message || "Erreur lors de l'inscription";
        }
    })
    .catch(err => { 
        console.error(err); 
        errorMsg.innerText = "Erreur serveur (Vérifiez api/register.php)"; 
    });
}

// --- Gestion Données (Tableau) ---
function fetchDrivers() {
    const loadingMsg = document.getElementById('loading-msg');
    fetch('api/get_data.php?file=drivers')
        .then(res => res.json())
        .then(data => {
            if (data.error) { loadingMsg.innerText = data.error; return; }
            allDrivers = data;
            loadingMsg.style.display = 'none';
            updateTable(allDrivers);
        })
        .catch(err => {
            console.error(err);
            loadingMsg.innerText = "Erreur chargement données.";
        });
}

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
    rows.append("td").text(d => d.nationality);
    rows.append("td").text(d => d.dob);
    rows.append("td").append("a")
        .attr("href", d => d.url).attr("target", "_blank")
        .classed("wiki-link", true).text("🔗 Bio");
}

function filterTable() {
    const term = document.getElementById('searchInput').value.toLowerCase();
    const filtered = allDrivers.filter(d => 
        (d.forename + " " + d.surname).toLowerCase().includes(term) || 
        d.nationality.toLowerCase().includes(term)
    );
    updateTable(filtered);
}