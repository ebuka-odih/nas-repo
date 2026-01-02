<?php

namespace App\Services;

use App\DTOs\CreateSittingDTO;
use App\Models\Sitting;
use App\Repositories\SittingRepository;
use Illuminate\Support\Facades\DB;

class SittingService
{
    public function __construct(
        private SittingRepository $repository,
        private AuditService $auditService
    ) {}

    /**
     * Create a new draft sitting
     */
    public function createDraft(CreateSittingDTO $dto, int $userId): Sitting
    {
        return DB::transaction(function () use ($dto, $userId) {
            $sitting = $this->repository->create([
                'session_id' => $dto->sessionId,
                'date' => $dto->date,
                'time_opened' => $dto->timeOpened,
                'status' => 'draft',
                'created_by' => $userId,
            ]);

            $this->auditService->logCreate($sitting, 'Draft sitting created');

            return $sitting;
        });
    }

    /**
     * Submit a sitting (move from draft to submitted)
     */
    public function submit(int $sittingId, int $userId): Sitting
    {
        return DB::transaction(function () use ($sittingId, $userId) {
            $sitting = $this->repository->findOrFail($sittingId);

            if (!$sitting->isDraft()) {
                throw new \Exception('Only draft sittings can be submitted');
            }

            $oldStatus = $sitting->status;
            $sitting->update([
                'status' => 'submitted',
                'submitted_by' => $userId,
                'submitted_at' => now(),
            ]);

            $this->auditService->logStatusChange(
                $sitting,
                $oldStatus,
                'submitted',
                'Sitting submitted for review'
            );

            return $sitting->fresh();
        });
    }

    /**
     * Officialize a sitting (move from submitted to official - becomes immutable)
     */
    public function officialize(int $sittingId, int $userId): Sitting
    {
        return DB::transaction(function () use ($sittingId, $userId) {
            $sitting = $this->repository->findOrFail($sittingId);

            if (!$sitting->isSubmitted()) {
                throw new \Exception('Only submitted sittings can be officialized');
            }

            $oldStatus = $sitting->status;
            $sitting->update([
                'status' => 'official',
                'officialized_at' => now(),
            ]);

            // Mark all documents as read-only
            $sitting->documents()->update(['is_read_only' => true]);

            $this->auditService->logStatusChange(
                $sitting,
                $oldStatus,
                'official',
                'Sitting officialized - now immutable'
            );

            return $sitting->fresh();
        });
    }

    /**
     * Check if sitting can be edited
     */
    public function canEdit(Sitting $sitting): bool
    {
        return $sitting->isDraft();
    }
}













