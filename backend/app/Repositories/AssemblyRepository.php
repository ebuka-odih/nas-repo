<?php

namespace App\Repositories;

use App\Models\Assembly;
use Illuminate\Database\Eloquent\Collection;

class AssemblyRepository
{
    /**
     * Get all active assemblies
     */
    public function getActive(): Collection
    {
        return Assembly::where('is_active', true)
            ->orderBy('start_date', 'desc')
            ->get();
    }

    /**
     * Get all assemblies
     */
    public function getAll(): Collection
    {
        return Assembly::orderBy('start_date', 'desc')->get();
    }

    /**
     * Find assembly by ID
     */
    public function findOrFail(int $id): Assembly
    {
        return Assembly::findOrFail($id);
    }
}














