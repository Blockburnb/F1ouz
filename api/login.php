<?php
// api/login.php
require 'db.php';
header('Content-Type: application/json');

$input = json_decode(file_get_contents('php://input'), true);
$username = $input['username'] ?? '';
$password = $input['password'] ?? '';

// 1. On récupère l'utilisateur par son nom UNIQUEMENT
$stmt = $pdo->prepare("SELECT * FROM users WHERE username = ?");
$stmt->execute([$username]);
$user = $stmt->fetch();

if ($user) {
    // 2. On vérifie le mot de passe haché
    // password_verify ré-hache le mot de passe fourni avec le "sel" contenu dans $user['password']
    // et compare les résultats pour garantir l'authenticité.
    if (password_verify($password, $user['password'])) {
        echo json_encode([
            'success' => true, 
            'role' => $user['role'], 
            'username' => $user['username']
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Mot de passe incorrect']);
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Utilisateur inconnu']);
}
?>