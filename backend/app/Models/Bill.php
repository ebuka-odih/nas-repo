<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Bill extends Model
{
    protected $fillable = [
        'sitting_id',
        'bill_title',
        'bill_reference',
        'legislative_stage',
        'description',
    ];

    /**
     * Get the sitting that owns this bill
     */
    public function sitting(): BelongsTo
    {
        return $this->belongsTo(Sitting::class);
    }

    /**
     * Check if bill can be edited
     * Only editable if sitting is in draft status
     */
    public function isEditable(): bool
    {
        return $this->sitting->isDraft();
    }
}
