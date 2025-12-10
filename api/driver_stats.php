<?php
// F1ouz/api/driver_stats.php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

include_once 'db.php';

$database = new Database();
$db = $database->getConnection();

$driver_id = isset($_GET['driver_id']) ? $_GET['driver_id'] : null;
$season = isset($_GET['season']) ? $_GET['season'] : 2023; // Default season

if (!$driver_id) {
    echo json_encode(["message" => "Driver ID required"]);
    exit;
}

$response = [];

// 1. Get Driver Info
$queryDriver = "SELECT driverId, forename, surname, number, code, nationality, dob FROM drivers WHERE driverId = :id";
$stmt = $db->prepare($queryDriver);
$stmt->bindParam(":id", $driver_id);
$stmt->execute();
$response['info'] = $stmt->fetch(PDO::FETCH_ASSOC);

// 2. Get Season Stats (Points & Rank)
$querySeason = "SELECT sum(points) as season_points, max(positionOrder) as best_pos 
                FROM results r 
                JOIN races ra ON r.raceId = ra.raceId 
                WHERE r.driverId = :id AND ra.year = :season";
$stmt = $db->prepare($querySeason);
$stmt->bindParam(":id", $driver_id);
$stmt->bindParam(":season", $season);
$stmt->execute();
$response['season_stats'] = $stmt->fetch(PDO::FETCH_ASSOC);

// 3. Get Career Stats (Total Wins, Podiums)
// Wins = positionOrder 1
$queryCareer = "SELECT 
    (SELECT COUNT(*) FROM results WHERE driverId = :id AND positionOrder = 1) as total_wins,
    (SELECT COUNT(*) FROM results WHERE driverId = :id AND positionOrder <= 3) as total_podiums,
    (SELECT SUM(points) FROM results WHERE driverId = :id) as career_points
";
$stmt = $db->prepare($queryCareer);
$stmt->bindParam(":id", $driver_id);
$stmt->execute();
$response['career_stats'] = $stmt->fetch(PDO::FETCH_ASSOC);

// 4. Get Race History for Chart (Position per Round in selected Season)
$queryChart = "SELECT ra.name as race_name, ra.round, r.positionOrder, r.points
               FROM results r
               JOIN races ra ON r.raceId = ra.raceId
               WHERE r.driverId = :id AND ra.year = :season
               ORDER BY ra.round ASC";
$stmt = $db->prepare($queryChart);
$stmt->bindParam(":id", $driver_id);
$stmt->bindParam(":season", $season);
$stmt->execute();
$response['chart_data'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode($response);
?>