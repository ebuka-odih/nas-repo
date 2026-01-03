<?php

namespace App\Repositories;

use App\Models\Sitting;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;

class SittingRepository
{
    /**
     * Find sitting by ID
     */
    public function findOrFail(int $id): Sitting
    {
        return Sitting::findOrFail($id);
    }

    /**
     * Create a new sitting
     */
    public function create(array $data): Sitting
    {
        return Sitting::create($data);
    }

    /**
     * Update a sitting
     */
    public function update(Sitting $sitting, array $data): bool
    {
        return $sitting->update($data);
    }

    /**
     * Delete a sitting
     */
    public function delete(Sitting $sitting): bool
    {
        return $sitting->delete();
    }

    /**
     * List sittings with filters
     */
    public function list(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = Sitting::with(['session.assembly', 'creator', 'submitter']);

        if (isset($filters['assembly'])) {
            $query->whereHas('session', function ($q) use ($filters) {
                $q->where('assembly_id', $filters['assembly']);
            });
        }

        if (isset($filters['session'])) {
            $query->where('session_id', $filters['session']);
        }

        if (isset($filters['date_from'])) {
            $query->where('date', '>=', $filters['date_from']);
        }

        if (isset($filters['date_to'])) {
            $query->where('date', '<=', $filters['date_to']);
        }

        if (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        return $query->orderBy('created_at', 'desc')
            ->orderBy('date', 'desc')
            ->paginate($perPage);
    }

    /**
     * Get sitting with full relationships for summary view
     */
    public function getSummary(int $id): Sitting
    {
        return Sitting::with([
            'session.assembly',
            'agendaItems' => function ($query) {
                $query->orderBy('order');
            },
            'bills',
            'creator',
            'submitter',
        ])->findOrFail($id);
    }

    /**
     * Get sitting with full relationships for full record view
     */
    public function getFullRecord(int $id): Sitting
    {
        return Sitting::with([
            'session.assembly',
            'agendaItems' => function ($query) {
                $query->orderBy('order');
            },
            'bills',
            'documents',
            'creator',
            'submitter',
        ])->findOrFail($id);
    }

    /**
     * Search sittings
     */
    public function search(array $filters): Collection
    {
        $query = Sitting::with(['session.assembly']);

        if (isset($filters['keyword'])) {
            $keyword = $filters['keyword'];
            $query->where(function ($q) use ($keyword) {
                $q->whereHas('agendaItems', function ($q) use ($keyword) {
                    $q->where('title', 'like', "%{$keyword}%")
                      ->orWhere('procedural_text', 'like', "%{$keyword}%");
                })
                ->orWhereHas('bills', function ($q) use ($keyword) {
                    $q->where('bill_title', 'like', "%{$keyword}%")
                      ->orWhere('bill_reference', 'like', "%{$keyword}%");
                });
            });
        }

        if (isset($filters['date'])) {
            $query->where('date', $filters['date']);
        }

        if (isset($filters['session'])) {
            $query->where('session_id', $filters['session']);
        }

        if (isset($filters['bill_reference'])) {
            $query->whereHas('bills', function ($q) use ($filters) {
                $q->where('bill_reference', $filters['bill_reference']);
            });
        }

        return $query->orderBy('created_at', 'desc')
            ->orderBy('date', 'desc')
            ->get();
    }
}













