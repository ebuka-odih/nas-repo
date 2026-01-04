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
                $text = (new TesseractOCR($path))->run();
            } catch (\Exception $e) {
                Log::warning('Local Tesseract failed or not found, falling back to API: ' . $e->getMessage());
                // Fallthrough to API
            }
        }

        if (!isset($text)) {
            $text = $this->extractViaApi($file);
        }

        return $this->cleanText($text);
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
            $fileName = $file instanceof UploadedFile ? $file->getClientOriginalName() : basename($filePath);
            
            Log::info("OCR Service: File path: {$filePath}, Name: {$fileName}");

            $fileStream = fopen($filePath, 'r');
            $fileSize = filesize($filePath);
            
            // Check if compression is needed (limit is ~1MB for free tier)
            if ($fileSize > 1000 * 1024) { // slightly less than 1024KB for safety
                Log::info("OCR Service: File size ({$fileSize}) exceeds 1MB limit. Compressing...");
                $compressedPath = $this->compressImage($filePath);
                
                if ($compressedPath) {
                    $fileStream = fopen($compressedPath, 'r');
                    $filePath = $compressedPath; // Update for cleanup if needed
                    Log::info("OCR Service: Compressed to " . filesize($compressedPath));
                }
            }

            $response = Http::asMultipart()
                ->attach(
                    'file', 
                    $fileStream, 
                    $fileName
                )
                // ... rest of request ...
                ->post('https://api.ocr.space/parse/image', [
                    'apikey' => $apiKey,
                    // 'file' is attached above
                    'detectOrientation' => 'true',
                    'scale' => 'true',
                    'OCREngine' => '1',
                    'isTable' => 'true',
                    'filetype' => pathinfo($fileName, PATHINFO_EXTENSION) ?: 'jpg'
                ]);

            // Clean up compressed file if created
            if (isset($compressedPath) && file_exists($compressedPath)) {
                unlink($compressedPath);
            }


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

    /**
     * Compress image to fit within size limits
     */
    protected function compressImage(string $sourcePath): ?string
    {
        if (!extension_loaded('gd')) {
            Log::warning('OCR Service: GD extension not loaded, cannot compress image.');
            return null;
        }
        
        try {
            list($width, $height, $type) = getimagesize($sourcePath);
            
            // Create image resource based on type
            $sourceImage = match ($type) {
                IMAGETYPE_JPEG => imagecreatefromjpeg($sourcePath),
                IMAGETYPE_PNG => imagecreatefrompng($sourcePath),
                IMAGETYPE_GIF => imagecreatefromgif($sourcePath),
                default => null,
            };

            if (!$sourceImage) {
                return null;
            }

            // Calculate new dimensions (max 1500px width/height to be safe)
            $maxDim = 1500;
            if ($width > $maxDim || $height > $maxDim) {
                $ratio = $width / $height;
                if ($ratio > 1) {
                    $newWidth = $maxDim;
                    $newHeight = $maxDim / $ratio;
                } else {
                    $newWidth = $maxDim * $ratio;
                    $newHeight = $maxDim;
                }
            } else {
                $newWidth = $width;
                $newHeight = $height;
            }

            $newImage = imagecreatetruecolor($newWidth, $newHeight);
            
            // Handle transparency
            if ($type == IMAGETYPE_PNG || $type == IMAGETYPE_GIF) {
                imagecolortransparent($newImage, imagecolorallocatealpha($newImage, 0, 0, 0, 127));
                imagealphablending($newImage, false);
                imagesavealpha($newImage, true);
            }

            imagecopyresampled($newImage, $sourceImage, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);

            $tempPath = tempnam(sys_get_temp_dir(), 'ocr_comp_');
            
            // Save as JPEG with lower quality (60)
            imagejpeg($newImage, $tempPath, 60);

            imagedestroy($sourceImage);
            imagedestroy($newImage);

            return $tempPath;
        } catch (\Exception $e) {
            Log::error('OCR Service: Compression failed: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Clean extracted text by removing unwanted strings
     */
    protected function cleanText(?string $text): ?string
    {
        if (empty($text)) {
            return $text;
        }

        // Use regex for more flexible matching (extra spaces, newlines, optional punctuation)
        $patterns = [
            '/PRINTED\s+BY\s+NATIONAL\s+ASSEMBLY\s+PRESS,?\s+ABUJA/iu',
        ];

        return preg_replace($patterns, '', $text);
    }
}
