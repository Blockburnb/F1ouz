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
    // --- EXCEPTION DEMANDÉE ---
    // On vérifie manuellement si c'est admin/admin ou toto/toto
    // Cela permet de contourner la vérification de hachage pour ces comptes de test
    $isLegacyAdmin = ($username === 'admin' && $password === 'admin');
    $isLegacyToto  = ($username === 'toto' && $password === 'toto');

    // 2. On valide si c'est une exception OU si le mot de passe haché correspond
    if ($isLegacyAdmin || $isLegacyToto || password_verify($password, $user['password'])) {
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