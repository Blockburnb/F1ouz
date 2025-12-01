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

// --- NOUVEAU : Gérer le formulaire de la page login.html ---
// On attend que la page soit chargée
document.addEventListener('DOMContentLoaded', () => {
    
    const loginForm = document.getElementById('loginForm');
    
    // Si le formulaire existe sur la page actuelle (pour éviter les erreurs sur index.html)
    if (loginForm) {
        loginForm.addEventListener('submit', function(event) {
            event.preventDefault(); // Empêche la page de se recharger
            
            const user = document.getElementById('username').value;
            const pass = document.getElementById('password').value;
            
            // On appelle la fonction login
            login(user, pass);
        });
    }
});