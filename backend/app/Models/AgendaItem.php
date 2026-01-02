<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AgendaItem extends Model
{
    protected $fillable = [
        'sitting_id',
        'agenda_number',
        'title',
        'procedural_text',
        'outcome',
        'order',
    ];

    protected function casts(): array
    {
        return [
            'agenda_number' => 'integer',
            'order' => 'integer',
        ];
    }

    /**
     * Get the sitting that owns this agenda item
     */
    public function sitting(): BelongsTo
    {
        return $this->belongsTo(Sitting::class);
    }

    /**
     * Check if agenda item can be edited
     * Only editable if sitting is in draft status
     */
    public function isEditable(): bool
    {
        return $this->sitting->isDraft();
    }
}
