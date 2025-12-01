<?php
// api/get_data.php
header('Content-Type: application/json');

// Quel fichier veut-on ? (ex: drivers)
$filename = $_GET['file'] ?? '';

// Sécurité basique pour éviter de lire n'importe quoi sur le disque
$allowed_files = ['drivers', 'results', 'circuits', 'constructors', 'races', 'qualifying']; // Ajoutez vos autres fichiers ici

if (!in_array($filename, $allowed_files)) {
    echo json_encode(['error' => 'Fichier non autorisé ou inexistant']);
    exit;
}

$filePath = "../data/{$filename}.csv";

if (!file_exists($filePath)) {
    echo json_encode(['error' => 'Fichier introuvable']);
    exit;
}

$data = [];
if (($handle = fopen($filePath, "r")) !== FALSE) {
    // Lire la première ligne pour les clés (en-têtes)
    $headers = fgetcsv($handle, 1000, ",");
    
    while (($row = fgetcsv($handle, 1000, ",")) !== FALSE) {
        // Associer chaque valeur à son en-tête
        if (count($headers) === count($row)) { // Vérif de sécurité
            $data[] = array_combine($headers, $row);
        }
    }
    fclose($handle);
}

echo json_encode($data);
?>