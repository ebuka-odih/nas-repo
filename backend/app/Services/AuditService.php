<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

class AuditService
{
    /**
     * Log an action for an auditable model
     */
    public function log(
        Model $auditable,
        string $action,
        ?array $oldValues = null,
        ?array $newValues = null,
        ?string $description = null
    ): AuditLog {
        return AuditLog::create([
            'auditable_type' => get_class($auditable),
            'auditable_id' => $auditable->id,
            'user_id' => Auth::id(),
            'action' => $action,
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'description' => $description,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);
    }

    /**
     * Log creation of a model
     */
    public function logCreate(Model $model, ?string $description = null): AuditLog
    {
        return $this->log(
            $model,
            'created',
            null,
            $model->getAttributes(),
            $description
        );
    }

    /**
     * Log update of a model
     */
    public function logUpdate(Model $model, array $oldValues, ?string $description = null): AuditLog
    {
        return $this->log(
            $model,
            'updated',
            $oldValues,
            $model->getAttributes(),
            $description
        );
    }

    /**
     * Log status change
     */
    public function logStatusChange(
        Model $model,
        string $oldStatus,
        string $newStatus,
        ?string $description = null
    ): AuditLog {
        return $this->log(
            $model,
            'status_changed',
            ['status' => $oldStatus],
            ['status' => $newStatus],
            $description ?? "Status changed from {$oldStatus} to {$newStatus}"
        );
    }

    /**
     * Log deletion of a model
     */
    public function logDelete(Model $model, ?string $description = null): AuditLog
    {
        return $this->log(
            $model,
            'deleted',
            $model->getAttributes(),
            null,
            $description
        );
    }
}













