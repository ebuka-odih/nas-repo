<?php

namespace App\Http\Controllers\Api\V1;

use App\DTOs\CreateBillDTO;
use App\Http\Controllers\Controller;
use App\Models\Bill;
use App\Repositories\SittingRepository;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BillController extends Controller
{
    public function __construct(
        private SittingRepository $sittingRepository,
        private AuditService $auditService
    ) {}

    /**
     * List bills for a sitting
     * GET /api/v1/sittings/{id}/bills
     */
    public function index(int $id): JsonResponse
    {
        $sitting = $this->sittingRepository->findOrFail($id);
        $bills = $sitting->bills;

        return response()->json([
            'success' => true,
            'message' => 'Bills retrieved successfully',
            'data' => $bills,
        ]);
    }

    /**
     * Create a new bill (draft only)
     * POST /api/v1/sittings/{id}/bills
     */
    public function store(Request $request, int $id): JsonResponse
    {
        $sitting = $this->sittingRepository->findOrFail($id);

        if (!$sitting->isDraft()) {
            return response()->json([
                'success' => false,
                'message' => 'Bills can only be added to draft sittings',
            ], 403);
        }

        $validated = $request->validate([
            'bill_title' => 'required|string|max:255',
            'bill_reference' => 'nullable|string|max:255',
            'legislative_stage' => 'nullable|string|max:255',
            'description' => 'nullable|string',
        ]);

        $validated['sitting_id'] = $id;
        $dto = CreateBillDTO::fromArray($validated);

        $bill = Bill::create([
            'sitting_id' => $dto->sittingId,
            'bill_title' => $dto->billTitle,
            'bill_reference' => $dto->billReference,
            'legislative_stage' => $dto->legislativeStage,
            'description' => $dto->description,
        ]);

        $this->auditService->logCreate($bill, 'Bill created');

        return response()->json([
            'success' => true,
            'message' => 'Bill created successfully',
            'data' => $bill,
        ], 201);
    }
}
