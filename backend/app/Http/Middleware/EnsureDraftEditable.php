<?php

namespace App\Http\Middleware;

use App\Models\Sitting;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureDraftEditable
{
    /**
     * Handle an incoming request.
     * Ensures that the sitting is in draft status and can be edited
     */
    public function handle(Request $request, Closure $next): Response
    {
        $sittingId = $request->route('id') ?? $request->route('sitting_id') ?? $request->input('sitting_id');

        if ($sittingId) {
            $sitting = Sitting::findOrFail($sittingId);

            if (!$sitting->isDraft()) {
                return response()->json([
                    'success' => false,
                    'message' => 'This record is not editable. Only draft records can be modified.',
                ], 403);
            }
        }

        return $next($request);
    }
}














