<?php

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

// Determine if the application is in maintenance mode...
if (file_exists($maintenance = __DIR__.'/../storage/framework/maintenance.php')) {
    require $maintenance;
}

// Register the Composer autoloader...
require __DIR__.'/../vendor/autoload.php';

// Bootstrap Laravel and handle the request...
/** @var Application $app */
$app = require_once __DIR__.'/../bootstrap/app.php';

// Handle CORS preflight requests before Laravel processes them
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? null;
    
    // Check if origin is allowed (simple check - middleware will do full validation)
    $allowedOrigins = [
        'https://nas-repo.vercel.app',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
    ];
    
    $isAllowed = false;
    if ($origin) {
        $isAllowed = in_array($origin, $allowedOrigins) || preg_match('#^https://.*\.vercel\.app$#', $origin);
    }
    
    if ($isAllowed && $origin) {
        header("Access-Control-Allow-Origin: {$origin}");
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin');
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Max-Age: 86400');
        http_response_code(200);
        exit;
    }
}

$app->handleRequest(Request::capture());
