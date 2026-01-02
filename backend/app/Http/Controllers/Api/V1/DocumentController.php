<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Document;
use App\Repositories\SittingRepository;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class DocumentController extends Controller
{
    public function __construct(
        private SittingRepository $sittingRepository,
        private AuditService $auditService
    ) {}

    /**
     * Upload a document for a sitting
     * POST /api/v1/sittings/{id}/documents
     */
    public function store(Request $request, int $id): JsonResponse
    {
        $sitting = $this->sittingRepository->findOrFail($id);

        if (!$sitting->isDraft()) {
            return response()->json([
                'success' => false,
                'message' => 'Documents can only be uploaded to draft sittings',
            ], 403);
        }

        $validated = $request->validate([
            'file' => 'required|file|max:10240', // 10MB max
            'type' => 'required|in:original_scan,rendered_html,rendered_pdf',
        ]);

        $file = $request->file('file');
        $path = $file->store("sittings/{$id}/documents", 'public');

        $document = Document::create([
            'sitting_id' => $id,
            'type' => $validated['type'],
            'file_path' => $path,
            'file_name' => $file->getClientOriginalName(),
            'mime_type' => $file->getMimeType(),
            'file_size' => $file->getSize(),
            'is_read_only' => false,
        ]);

        $this->auditService->logCreate($document, 'Document uploaded');

        return response()->json([
            'success' => true,
            'message' => 'Document uploaded successfully',
            'data' => $document,
        ], 201);
    }

    /**
     * Get HTML document view
     * GET /api/v1/sittings/{id}/document/html
     */
    public function html(int $id): JsonResponse
    {
        $sitting = $this->sittingRepository->findOrFail($id);
        $document = $sitting->documents()->renderedHtml()->first();

        if (!$document) {
            return response()->json([
                'success' => false,
                'message' => 'HTML document not found',
            ], 404);
        }

        $content = Storage::disk('public')->get($document->file_path);

        return response()->json([
            'success' => true,
            'message' => 'HTML document retrieved successfully',
            'data' => [
                'document' => $document,
                'content' => $content,
            ],
        ]);
    }

    /**
     * Get PDF document view
     * GET /api/v1/sittings/{id}/document/pdf
     */
    public function pdf(int $id): JsonResponse
    {
        $sitting = $this->sittingRepository->findOrFail($id);
        $document = $sitting->documents()->renderedPdf()->first();

        if (!$document) {
            return response()->json([
                'success' => false,
                'message' => 'PDF document not found',
            ], 404);
        }

        $url = Storage::disk('public')->url($document->file_path);

        return response()->json([
            'success' => true,
            'message' => 'PDF document retrieved successfully',
            'data' => [
                'document' => $document,
                'url' => $url,
            ],
        ]);
    }
}
