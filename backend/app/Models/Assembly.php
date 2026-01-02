<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Assembly extends Model
{
    protected $fillable = [
        'name',
        'description',
        'start_date',
        'end_date',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'is_active' => 'boolean',
        ];
    }

    /**
     * Get all sessions for this assembly
     */
    public function sessions(): HasMany
    {
        return $this->hasMany(Session::class)->orderBy('order');
    }

    /**
     * Get all sittings for this assembly (through sessions)
     */
    public function sittings(): HasMany
    {
        return $this->hasManyThrough(Sitting::class, Session::class);
    }
}
