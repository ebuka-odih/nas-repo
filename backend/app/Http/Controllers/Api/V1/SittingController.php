<?php

namespace App\Http\Controllers\Api\V1;

use App\DTOs\CreateSittingDTO;
use App\Http\Controllers\Controller;
use App\Repositories\SittingRepository;
use App\Services\SittingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SittingController extends Controller
{
    public function __construct(
        private SittingRepository $repository,
        private SittingService $service
    ) {}

    /**
     * List sittings with filters
     * GET /api/v1/sittings
     */
    public function index(Request $request): JsonResponse
    {
        $filters = [
            'assembly' => $request->input('assembly'),
            'session' => $request->input('session'),
            'date_from' => $request->input('date_from'),
            'date_to' => $request->input('date_to'),
            'status' => $request->input('status'),
        ];

        $sittings = $this->repository->list($filters, $request->input('per_page', 15));

        return response()->json([
            'success' => true,
            'message' => 'Sittings retrieved successfully',
            'data' => $sittings,
        ]);
    }

    /**
     * Create a new draft sitting
     * POST /api/v1/sittings
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'session_id' => 'required|exists:sessions,id',
            'date' => 'required|date',
            'time_opened' => 'nullable|date_format:H:i',
        ]);

        $dto = CreateSittingDTO::fromArray($validated);
        $sitting = $this->service->createDraft($dto, $request->user()->id);

        return response()->json([
            'success' => true,
            'message' => 'Draft sitting created successfully',
            'data' => $sitting->load(['session.assembly', 'creator']),
        ], 201);
    }

    /**
     * Get sitting summary (default session open view)
     * GET /api/v1/sittings/{id}/summary
     */
    public function summary(int $id): JsonResponse
    {
        $sitting = $this->repository->getSummary($id);

        return response()->json([
            'success' => true,
            'message' => 'Sitting summary retrieved successfully',
            'data' => $sitting,
        ]);
    }

    /**
     * Get full sitting record
     * GET /api/v1/sittings/{id}
     */
    public function show(int $id): JsonResponse
    {
        $sitting = $this->repository->getFullRecord($id);

        return response()->json([
            'success' => true,
            'message' => 'Sitting retrieved successfully',
            'data' => $sitting,
        ]);
    }

    /**
     * Submit a sitting (locks record and marks as submitted)
     * POST /api/v1/sittings/{id}/submit
     */
    public function submit(Request $request, int $id): JsonResponse
    {
        try {
            $sitting = $this->service->submit($id, $request->user()->id);

            return response()->json([
                'success' => true,
                'message' => 'Sitting submitted successfully',
                'data' => $sitting,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Officialize a sitting (makes it immutable)
     * POST /api/v1/sittings/{id}/officialize
     */
    public function officialize(Request $request, int $id): JsonResponse
    {
        try {
            $sitting = $this->service->officialize($id, $request->user()->id);

            return response()->json([
                'success' => true,
                'message' => 'Sitting officialized successfully',
                'data' => $sitting,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }
}
