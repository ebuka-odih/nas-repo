<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CorsMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $origin = $request->header('Origin');
        $corsConfig = config('cors');
        
        // Get allowed origins (ensure array and filter out empty values)
        $allowedOrigins = array_values(array_filter($corsConfig['allowed_origins'] ?? [], function($value) {
            return !empty($value);
        }));
        $allowedPatterns = $corsConfig['allowed_origins_patterns'] ?? [];
        
        // Check if origin is allowed
        $isAllowed = false;
        if ($origin) {
            // Check exact matches (case-insensitive comparison)
            foreach ($allowedOrigins as $allowedOrigin) {
                if (strtolower($origin) === strtolower($allowedOrigin)) {
                    $isAllowed = true;
                    break;
                }
            }
            
            // Check pattern matches if not already allowed
            if (!$isAllowed) {
                foreach ($allowedPatterns as $pattern) {
                    if (preg_match($pattern, $origin)) {
                        $isAllowed = true;
                        break;
                    }
                }
            }
        }
        
        // Handle preflight OPTIONS request
        if ($request->getMethod() === 'OPTIONS') {
            $response = response('', 200);
            
            // Always add CORS headers for OPTIONS requests if origin is allowed
            if ($isAllowed && $origin) {
                $response->headers->set('Access-Control-Allow-Origin', $origin);
                
                // Handle allowed_methods (can be array or '*')
                $methods = $corsConfig['allowed_methods'] ?? ['*'];
                $methodsStr = is_array($methods) ? implode(', ', $methods) : $methods;
                $response->headers->set('Access-Control-Allow-Methods', $methodsStr);
                
                // Handle allowed_headers (can be array or '*')
                $headers = $corsConfig['allowed_headers'] ?? ['*'];
                $headersStr = is_array($headers) ? implode(', ', $headers) : $headers;
                $response->headers->set('Access-Control-Allow-Headers', $headersStr);
                
                if ($corsConfig['supports_credentials'] ?? false) {
                    $response->headers->set('Access-Control-Allow-Credentials', 'true');
                }
                
                if (($corsConfig['max_age'] ?? 0) > 0) {
                    $response->headers->set('Access-Control-Max-Age', (string) $corsConfig['max_age']);
                } else {
                    // Set a default max age for preflight
                    $response->headers->set('Access-Control-Max-Age', '86400');
                }
            }
            
            return $response;
        }
        
        // Process the actual request
        $response = $next($request);
        
        // Add CORS headers to the response if origin is allowed
        if ($isAllowed && $origin) {
            $response->headers->set('Access-Control-Allow-Origin', $origin);
            
            if ($corsConfig['supports_credentials'] ?? false) {
                $response->headers->set('Access-Control-Allow-Credentials', 'true');
            }
        }
        
        return $response;
    }
}

