<?php
// api/register.php
require 'db.php';
header('Content-Type: application/json');

// 1. Récupérer les données JSON
$input = json_decode(file_get_contents('php://input'), true);
$username = trim($input['username'] ?? '');
$password = $input['password'] ?? '';

// 2. Vérifications basiques
if (empty($username) || empty($password)) {
    echo json_encode(['success' => false, 'message' => 'Veuillez remplir tous les champs.']);
    exit;
}

// 3. Vérifier si l'utilisateur existe déjà
$stmt = $pdo->prepare("SELECT id FROM users WHERE username = ?");
$stmt->execute([$username]);
if ($stmt->fetch()) {
    echo json_encode(['success' => false, 'message' => 'Cet identifiant est déjà pris.']);
    exit;
}

// 4. Hachage du mot de passe (Sécurité)
// PASSWORD_DEFAULT utilise l'algorithme bcrypt actuellement. 
// Il génère un sel aléatoire automatiquement et l'inclut dans le hachage final.
$hashedPassword = password_hash($password, PASSWORD_DEFAULT);

// 5. Insertion en base
try {
    $stmt = $pdo->prepare("INSERT INTO users (username, password, role) VALUES (?, ?, 'user')");
    $stmt->execute([$username, $hashedPassword]);
    
    echo json_encode(['success' => true, 'message' => 'Compte créé avec succès !']);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Erreur lors de l\'inscription.']);
}
?>