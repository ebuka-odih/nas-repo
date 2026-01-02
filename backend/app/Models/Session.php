<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Session extends Model
{
    protected $table = 'legislative_sessions';

    protected $fillable = [
        'assembly_id',
        'name',
        'description',
        'start_date',
        'end_date',
        'order',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'order' => 'integer',
        ];
    }

    /**
     * Get the assembly that owns this session
     */
    public function assembly(): BelongsTo
    {
        return $this->belongsTo(Assembly::class);
    }

    /**
     * Get all sittings for this session
     */
    public function sittings(): HasMany
    {
        return $this->hasMany(Sitting::class)->orderBy('date');
    }
}
