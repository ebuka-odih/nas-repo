<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Repositories\AssemblyRepository;
use Illuminate\Http\JsonResponse;

class AssemblyController extends Controller
{
    public function __construct(
        private AssemblyRepository $repository
    ) {}

    /**
     * Get all assemblies
     * GET /api/v1/assemblies
     */
    public function index(): JsonResponse
    {
        $assemblies = $this->repository->getActive();

        return response()->json([
            'success' => true,
            'message' => 'Assemblies retrieved successfully',
            'data' => $assemblies,
        ]);
    }
}
