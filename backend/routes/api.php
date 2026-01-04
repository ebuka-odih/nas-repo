<?php

use App\Http\Controllers\Api\V1\AgendaItemController;
use App\Http\Controllers\Api\V1\AssemblyController;
use App\Http\Controllers\Api\V1\AuditLogController;
use App\Http\Controllers\Api\V1\BillController;
use App\Http\Controllers\Api\V1\DocumentController;
use App\Http\Controllers\Api\V1\SearchController;
use App\Http\Controllers\Api\V1\SessionController;
use App\Http\Controllers\Api\V1\SittingController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes - Version 1
|--------------------------------------------------------------------------
|
| All API routes are versioned under /api/v1
| Authentication is required for all routes (via Sanctum)
|
*/

// Handle OPTIONS preflight requests for CORS


// API info endpoint (no version prefix) - accessible at /api or /api/
Route::get('/', function (\Illuminate\Http\Request $request) {
    return response()->json([
        'success' => true,
        'message' => 'Senate Votes & Proceedings API',
        'version' => '1.0',
        'status' => 'online',
        'endpoints' => [
            'v1' => '/api/v1',
            'login' => '/api/v1/login',
            'documentation' => 'All endpoints are under /api/v1'
        ]
    ]);
})->name('api.info');

Route::prefix('v1')->group(function () {
    // Authentication endpoints (public)
    Route::post('/login', [\App\Http\Controllers\Api\V1\AuthController::class, 'login']);
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/me', [\App\Http\Controllers\Api\V1\AuthController::class, 'me']);
        Route::post('/logout', [\App\Http\Controllers\Api\V1\AuthController::class, 'logout']);

        // Context endpoints
        Route::get('/assemblies', [AssemblyController::class, 'index']);
        Route::get('/sessions', [SessionController::class, 'all']);
        Route::get('/assemblies/{assembly_id}/sessions', [SessionController::class, 'index']);

        // Sittings endpoints
        Route::get('/sittings', [SittingController::class, 'index']);
        Route::post('/sittings', [SittingController::class, 'store'])->middleware('role:clerk,admin');
        Route::get('/sittings/{id}', [SittingController::class, 'show']);
        Route::get('/sittings/{id}/summary', [SittingController::class, 'summary']);
        Route::delete('/sittings/{id}', [SittingController::class, 'destroy'])->middleware('role:clerk,admin');
        Route::post('/sittings/{id}/submit', [SittingController::class, 'submit'])->middleware('role:clerk,admin');
        Route::post('/sittings/{id}/officialize', [SittingController::class, 'officialize'])->middleware('role:reviewer,admin');

        // Agenda items endpoints (draft only)
        Route::get('/sittings/{id}/agenda-items', [AgendaItemController::class, 'index']);
        Route::post('/sittings/{id}/agenda-items', [AgendaItemController::class, 'store'])
            ->middleware(['role:clerk,admin', 'draft.editable']);
        Route::put('/agenda-items/{agenda_id}', [AgendaItemController::class, 'update'])
            ->middleware(['role:clerk,admin', 'draft.editable']);

        // Bills endpoints (draft only)
        Route::get('/sittings/{id}/bills', [BillController::class, 'index']);
        Route::post('/sittings/{id}/bills', [BillController::class, 'store'])
            ->middleware(['role:clerk,admin', 'draft.editable']);

        // Documents endpoints
        // Documents endpoints
        Route::post('/documents/process', [DocumentController::class, 'process']);
        Route::post('/sittings/{id}/documents', [DocumentController::class, 'store'])
            ->middleware(['role:clerk,admin', 'draft.editable']);
        Route::get('/sittings/{id}/document/html', [DocumentController::class, 'html']);
        Route::get('/sittings/{id}/document/pdf', [DocumentController::class, 'pdf']);

        // Search endpoint
        Route::get('/search', [SearchController::class, 'search']);

        // Audit log endpoint
        Route::get('/sittings/{id}/audit-log', [AuditLogController::class, 'index']);

        // AI endpoints (optional - clearly marked as AI generated)
        // These would be implemented separately if needed
        // Route::get('/sittings/{id}/ai-summary', [AIController::class, 'summary']);
        // Route::get('/sittings/{id}/ai-questions', [AIController::class, 'questions']);
        // Route::get('/sittings/{id}/audio', [AIController::class, 'audio']);
    });
});

