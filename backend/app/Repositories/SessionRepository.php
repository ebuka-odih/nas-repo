<?php

namespace App\Repositories;

use App\Models\Session;
use Illuminate\Database\Eloquent\Collection;

class SessionRepository
{
    /**
     * Get sessions for an assembly
     */
    public function getByAssembly(int $assemblyId): Collection
    {
        return Session::where('assembly_id', $assemblyId)
            ->orderBy('order')
            ->get();
    }

    /**
     * Find session by ID
     */
    public function findOrFail(int $id): Session
    {
        return Session::findOrFail($id);
    }

    /**
     * Get all sessions
     */
    public function getAll(): Collection
    {
        return Session::with('assembly')
            ->orderBy('order')
            ->get();
    }
}













