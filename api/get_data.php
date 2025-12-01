<?php
// api/get_data.php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

// Récupérer le nom du fichier demandé (ex: drivers)
$filename = $_GET['file'] ?? '';

// Liste blanche des fichiers autorisés (Sécurité)
$allowed_files = ['drivers', 'races', 'circuits', 'constructors', 'results'];

if (!in_array($filename, $allowed_files)) {
    echo json_encode(['error' => 'Fichier non autorisé']);
    exit;
}

// Chemin vers le dossier data (remonte d'un cran avec ../)
$filePath = "../data/{$filename}.csv";

if (!file_exists($filePath)) {
    echo json_encode(['error' => "Fichier introuvable: $filePath"]);
    exit;
}

$data = [];
if (($handle = fopen($filePath, "r")) !== FALSE) {
    // Récupérer les entêtes (première ligne)
    $headers = fgetcsv($handle, 1000, ",");
    
    // Nettoyer les entêtes (parfois il y a des caractères invisibles au début du fichier UTF-8 BOM)
    if(isset($headers[0])) {
        $headers[0] = preg_replace('/[\x00-\x1F\x80-\xFF]/', '', $headers[0]);
    }

    while (($row = fgetcsv($handle, 1000, ",")) !== FALSE) {
        if (count($headers) === count($row)) {
            // Créer un tableau associatif : ['forename' => 'Lewis', 'surname' => 'Hamilton', ...]
            $data[] = array_combine($headers, $row);
        }
    }
    fclose($handle);
}

echo json_encode($data);
?>