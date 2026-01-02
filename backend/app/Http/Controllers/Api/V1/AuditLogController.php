<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Sitting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    /**
     * Get audit log for a sitting
     * GET /api/v1/sittings/{id}/audit-log
     */
    public function index(Request $request, int $id): JsonResponse
    {
        $sitting = Sitting::findOrFail($id);

        $auditLogs = AuditLog::where('auditable_type', Sitting::class)
            ->where('auditable_id', $id)
            ->with('user')
            ->orderBy('created_at', 'desc')
            ->paginate($request->input('per_page', 15));

        return response()->json([
            'success' => true,
            'message' => 'Audit log retrieved successfully',
            'data' => $auditLogs,
        ]);
    }
}
