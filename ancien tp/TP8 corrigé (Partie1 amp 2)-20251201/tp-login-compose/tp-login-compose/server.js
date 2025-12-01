const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Use environment variables for DB connection (set in docker-compose.yml)
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'compte_utilisateur'
});

// Connect to MySQL and create table if it doesn't exist
db.connect(err => {
  if (err) throw err;
  console.log('✅ Connecté à MySQL (via Docker)');
  
  // Create users table if it doesn't exist
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL
    ) 
  `;
  
  db.query(createTableQuery, (err) => {
    if (err) {
      console.error('❌ Erreur lors de la création de la table:', err.message);
    } else {
      console.log('✅ Table "users" prête');
    }
  });
});

// Routes...
// Pages HTML
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// Inscription
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  
  db.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashed], (err) => {
    if (err) return res.send('⚠️ Erreur : ' + err.message);
    
    // Messages fun aléatoires
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
    
    // Messages fun aléatoires pour login
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