const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Connexion MySQL XAMPP
const db = mysql.createConnection({
  host: 'host.docker.internal', // Accès MySQL local depuis Docker
  user: 'root',
  password: '',                // Mot de passe XAMPP (vide par défaut)
  database: 'tp_login'
});

db.connect(err => {
  if (err) throw err;
  console.log('✅ Connecté à MySQL XAMPP');

  // Créer la table users si elle n'existe pas
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL
    )
  `;

  db.query(createTableQuery, (err) => {
    if (err) throw err;
    console.log('✅ Table users prête !');
  });
});

// Pages HTML
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// Inscription
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const hashed = await bcrypt.hash(password, 10);

  db.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashed], (err) => {
    if (err) return res.send('⚠️ Erreur : ' + err.message);

    const messages = [
      "🎉 Bravo, nouveau membre !",
      "🚀 Bienvenue dans le club des codeurs !",
      "✨ Utilisateur créé avec succès !",
      "😎 Tu es maintenant inscrit, let's code !"
    ];
    const randomMsg = messages[Math.floor(Math.random() * messages.length)];

    res.send(`${randomMsg} <a href="/login.html">Connecte-toi maintenant</a>`);
  });
});

// Connexion
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  db.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
    if (err) return res.send('⚠️ Erreur : ' + err.message);
    if (results.length === 0) return res.send('❌ Utilisateur non trouvé');

    const match = await bcrypt.compare(password, results[0].password);
    if (!match) return res.send('❌ Mot de passe incorrect');

    const messagesLogin = [
      `👋 Salut ${results[0].username}, content de te revoir !`,
      `🎯 Bienvenue ${results[0].username}, mission accomplie !`,
      `✨ Hello ${results[0].username} ! Prêt pour coder ?`,
      `🚀 ${results[0].username}, let's go !`
    ];
    const randomLoginMsg = messagesLogin[Math.floor(Math.random() * messagesLogin.length)];

    res.send(randomLoginMsg);
  });
});

// Démarrage serveur
app.listen(port, () => console.log(`🚀 Serveur Node.js démarré sur http://localhost:${port}`));
