<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\UploadedFile;
use thiagoalessio\TesseractOCR\TesseractOCR;

class OcrService
{
    /**
     * Extract text from a file using the configured driver.
     *
     * @param string|UploadedFile $file
     * @return string|null
     */
    public function extractText($file): ?string
    {
        // Try local Tesseract first (if configured/available)
        // Check if explicitly disabled via ENV or if command fails
        if (config('app.ocr_driver') !== 'api') {
            try {
                $path = $file instanceof UploadedFile ? $file->getRealPath() : $file;
                return (new TesseractOCR($path))->run();
            } catch (\Exception $e) {
                Log::warning('Local Tesseract failed or not found, falling back to API: ' . $e->getMessage());
                // Fallthrough to API
            }
        }

        return $this->extractViaApi($file);
    }

    /**
     * Extract text using OCR.space API
     */
    protected function extractViaApi($file): ?string
    {
        try {
            $apiKey = config('services.ocr_space.key', 'helloworld');
            $driver = config('app.ocr_driver', 'auto');
            
            Log::info("OCR Service: Attempting API extraction. Driver: {$driver}, Key Present: " . ($apiKey !== 'helloworld' ? 'Yes' : 'Using Demo'));

            $filePath = $file instanceof UploadedFile ? $file->getRealPath() : $file;
            Log::info("OCR Service: File path: {$filePath}");

            $response = Http::asMultipart()
                ->post('https://api.ocr.space/parse/image', [
                    'apikey' => $apiKey,
                    'file' => fopen($filePath, 'r'),
                    'detectOrientation' => 'true',
                    'scale' => 'true',
                    'OCREngine' => '1',
                ]);

            Log::info("OCR Service: API Response Status: " . $response->status());

            if ($response->successful()) {
                $result = $response->json();
                
                if (isset($result['ParsedResults'][0]['ParsedText'])) {
                    $text = $result['ParsedResults'][0]['ParsedText'];
                    Log::info("OCR Service: Success. Text length: " . strlen($text));
                    return $text;
                }
                
                if (isset($result['ErrorMessage'])) {
                    Log::error('OCR.space API Error: ' . json_encode($result['ErrorMessage']));
                } else {
                    Log::error('OCR.space API Unknown Error: ' . json_encode($result));
                }
            } else {
                Log::error('OCR.space HTTP Error: ' . $response->status() . ' Body: ' . $response->body());
            }
        } catch (\Exception $e) {
            Log::error('OCR Service Exception: ' . $e->getMessage());
        }

        return null;
    }
}
