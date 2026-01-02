<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Repositories\SittingRepository;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    public function __construct(
        private SittingRepository $repository
    ) {}

    /**
     * Search sittings
     * GET /api/v1/search
     */
    public function search(Request $request): JsonResponse
    {
        $filters = [
            'keyword' => $request->input('keyword'),
            'date' => $request->input('date'),
            'session' => $request->input('session'),
            'bill_reference' => $request->input('bill_reference'),
        ];

        $results = $this->repository->search($filters);

        return response()->json([
            'success' => true,
            'message' => 'Search completed successfully',
            'data' => $results,
        ]);
    }
}
