<?php

namespace App\Http\Controllers\Api\V1;

use App\DTOs\CreateAgendaItemDTO;
use App\Http\Controllers\Controller;
use App\Models\AgendaItem;
use App\Models\Sitting;
use App\Repositories\SittingRepository;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AgendaItemController extends Controller
{
    public function __construct(
        private SittingRepository $sittingRepository,
        private AuditService $auditService
    ) {}

    /**
     * List agenda items for a sitting
     * GET /api/v1/sittings/{id}/agenda-items
     */
    public function index(int $id): JsonResponse
    {
        $sitting = $this->sittingRepository->findOrFail($id);
        $agendaItems = $sitting->agendaItems()->orderBy('order')->get();

        return response()->json([
            'success' => true,
            'message' => 'Agenda items retrieved successfully',
            'data' => $agendaItems,
        ]);
    }

    /**
     * Create a new agenda item (draft only)
     * POST /api/v1/sittings/{id}/agenda-items
     */
    public function store(Request $request, int $id): JsonResponse
    {
        $sitting = $this->sittingRepository->findOrFail($id);

        if (!$sitting->isDraft()) {
            return response()->json([
                'success' => false,
                'message' => 'Agenda items can only be added to draft sittings',
            ], 403);
        }

        $validated = $request->validate([
            'agenda_number' => 'required|integer',
            'title' => 'required|string|max:255',
            'procedural_text' => 'required|string',
            'outcome' => 'nullable|string',
            'order' => 'nullable|integer|min:0',
        ]);

        $validated['sitting_id'] = $id;
        $dto = CreateAgendaItemDTO::fromArray($validated);

        $agendaItem = AgendaItem::create([
            'sitting_id' => $dto->sittingId,
            'agenda_number' => $dto->agendaNumber,
            'title' => $dto->title,
            'procedural_text' => $dto->proceduralText,
            'outcome' => $dto->outcome,
            'order' => $dto->order,
        ]);

        $this->auditService->logCreate($agendaItem, 'Agenda item created');

        return response()->json([
            'success' => true,
            'message' => 'Agenda item created successfully',
            'data' => $agendaItem,
        ], 201);
    }

    /**
     * Update an agenda item (draft only)
     * PUT /api/v1/agenda-items/{agenda_id}
     */
    public function update(Request $request, int $agendaId): JsonResponse
    {
        $agendaItem = AgendaItem::findOrFail($agendaId);

        if (!$agendaItem->isEditable()) {
            return response()->json([
                'success' => false,
                'message' => 'Agenda item can only be updated in draft sittings',
            ], 403);
        }

        $oldValues = $agendaItem->getAttributes();

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'procedural_text' => 'sometimes|required|string',
            'outcome' => 'nullable|string',
            'order' => 'sometimes|integer|min:0',
        ]);

        $agendaItem->update($validated);
        $this->auditService->logUpdate($agendaItem, $oldValues, 'Agenda item updated');

        return response()->json([
            'success' => true,
            'message' => 'Agenda item updated successfully',
            'data' => $agendaItem->fresh(),
        ]);
    }
}
