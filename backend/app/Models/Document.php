<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Document extends Model
{
    protected $fillable = [
        'sitting_id',
        'type',
        'file_path',
        'file_name',
        'mime_type',
        'file_size',
        'metadata',
        'is_read_only',
    ];

    protected function casts(): array
    {
        return [
            'file_size' => 'integer',
            'metadata' => 'array',
            'is_read_only' => 'boolean',
        ];
    }

    /**
     * Get the sitting that owns this document
     */
    public function sitting(): BelongsTo
    {
        return $this->belongsTo(Sitting::class);
    }

    /**
     * Check if document can be modified
     * Documents become read-only after submission
     */
    public function isEditable(): bool
    {
        return !$this->is_read_only && $this->sitting->isDraft();
    }

    /**
     * Scope to get original scans
     */
    public function scopeOriginalScan($query)
    {
        return $query->where('type', 'original_scan');
    }

    /**
     * Scope to get rendered HTML
     */
    public function scopeRenderedHtml($query)
    {
        return $query->where('type', 'rendered_html');
    }

    /**
     * Scope to get rendered PDF
     */
    public function scopeRenderedPdf($query)
    {
        return $query->where('type', 'rendered_pdf');
    }
}
