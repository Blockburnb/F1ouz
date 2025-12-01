<?php
// api/login.php
require 'db.php';
header('Content-Type: application/json');

// Récupérer les données envoyées en JSON par le JS
$input = json_decode(file_get_contents('php://input'), true);
$username = $input['username'] ?? '';
$password = $input['password'] ?? '';

$stmt = $pdo->prepare("SELECT * FROM users WHERE username = ? AND password = ?");
$stmt->execute([$username, $password]);
$user = $stmt->fetch();

if ($user) {
    echo json_encode(['success' => true, 'role' => $user['role'], 'username' => $user['username']]);
} else {
    echo json_encode(['success' => false, 'message' => 'Identifiants incorrects']);
}
?>