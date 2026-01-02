<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Repositories\SessionRepository;
use Illuminate\Http\JsonResponse;

class SessionController extends Controller
{
    public function __construct(
        private SessionRepository $repository
    ) {}

    /**
     * Get sessions for an assembly
     * GET /api/v1/assemblies/{assembly_id}/sessions
     */
    public function index(int $assemblyId): JsonResponse
    {
        $sessions = $this->repository->getByAssembly($assemblyId);

        return response()->json([
            'success' => true,
            'message' => 'Sessions retrieved successfully',
            'data' => $sessions,
        ]);
    }

    /**
     * Get all sessions
     * GET /api/v1/sessions
     */
    public function all(): JsonResponse
    {
        $sessions = $this->repository->getAll();

        return response()->json([
            'success' => true,
            'message' => 'All sessions retrieved successfully',
            'data' => $sessions,
        ]);
    }
}
