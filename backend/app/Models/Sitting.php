<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Sitting extends Model
{
    protected $fillable = [
        'session_id',
        'date',
        'time_opened',
        'status',
        'created_by',
        'submitted_by',
        'submitted_at',
        'officialized_at',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'time_opened' => 'datetime',
            'submitted_at' => 'datetime',
            'officialized_at' => 'datetime',
        ];
    }

    /**
     * Get the session that owns this sitting
     */
    public function session(): BelongsTo
    {
        return $this->belongsTo(Session::class);
    }

    /**
     * Get the user who created this sitting
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the user who submitted this sitting
     */
    public function submitter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    /**
     * Get all agenda items for this sitting
     */
    public function agendaItems(): HasMany
    {
        return $this->hasMany(AgendaItem::class)->orderBy('order');
    }

    /**
     * Get all bills for this sitting
     */
    public function bills(): HasMany
    {
        return $this->hasMany(Bill::class);
    }

    /**
     * Get all documents for this sitting
     */
    public function documents(): HasMany
    {
        return $this->hasMany(Document::class);
    }

    /**
     * Check if sitting is in draft status
     */
    public function isDraft(): bool
    {
        return $this->status === 'draft';
    }

    /**
     * Check if sitting is submitted
     */
    public function isSubmitted(): bool
    {
        return $this->status === 'submitted';
    }

    /**
     * Check if sitting is official (immutable)
     */
    public function isOfficial(): bool
    {
        return $this->status === 'official';
    }

    /**
     * Check if sitting can be edited
     */
    public function isEditable(): bool
    {
        return $this->isDraft();
    }

    /**
     * Check if sitting is immutable
     */
    public function isImmutable(): bool
    {
        return $this->isOfficial();
    }

    /**
     * Scope to get only draft sittings
     */
    public function scopeDraft($query)
    {
        return $query->where('status', 'draft');
    }

    /**
     * Scope to get only official sittings
     */
    public function scopeOfficial($query)
    {
        return $query->where('status', 'official');
    }
}
