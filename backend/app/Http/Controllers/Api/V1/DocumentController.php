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
        private AuditService $auditService,
        private \App\Services\OcrService $ocrService
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
            'file' => 'required|file|max:5120', // 5MB max
            'type' => 'required|in:original_scan,rendered_html,rendered_pdf',
        ]);

        $file = $request->file('file');
        $path = $file->store("sittings/{$id}/documents", 'public');

        // Extract text if it's an image
        $extractedText = null;
        if (str_starts_with($file->getMimeType(), 'image/')) {
            $extractedText = $this->ocrService->extractText($file);
        }

        $document = Document::create([
            'sitting_id' => $id,
            'type' => $validated['type'],
            'file_path' => $path,
            'file_name' => $file->getClientOriginalName(),
            'mime_type' => $file->getMimeType(),
            'file_size' => $file->getSize(),
            'extracted_text' => $extractedText,
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
     * Process document (OCR) without storing relation
     * POST /api/v1/documents/process
     */
    public function process(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'nullable|file|mimes:jpeg,png,jpg,bmp',
            'image_base64' => 'nullable|string',
        ]);

        try {
            $text = '';

            if ($request->hasFile('file')) {
                $text = $this->ocrService->extractText($request->file('file'));
            } elseif ($request->filled('image_base64')) {
                // Handle base64
                $data = $request->input('image_base64');
                // Remove header if present
                if (preg_match('/^data:image\/(\w+);base64,/', $data, $type)) {
                    $data = substr($data, strpos($data, ',') + 1);
                    $type = strtolower($type[1]); // jpg, png, etc.
                } else {
                    $type = 'png'; // Default
                }
                
                $data = base64_decode($data);
                if ($data === false) {
                    throw new \Exception('Invalid base64 data');
                }

                $tempPath = tempnam(sys_get_temp_dir(), 'ocr_') . '.' . $type;
                file_put_contents($tempPath, $data);
                
                $text = $this->ocrService->extractText($tempPath);
                unlink($tempPath);
            } else {
                 return response()->json(['success' => false, 'message' => 'No image provided'], 400);
            }

            return response()->json([
                'success' => true,
                'data' => ['text' => $text]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Processing failed: ' . $e->getMessage()
            ], 500);
        }
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
