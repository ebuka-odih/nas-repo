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
        
        // Get allowed origins
        $allowedOrigins = $corsConfig['allowed_origins'] ?? [];
        $allowedPatterns = $corsConfig['allowed_origins_patterns'] ?? [];
        
        // Check if origin is allowed
        $isAllowed = false;
        if ($origin) {
            if (in_array($origin, $allowedOrigins)) {
                $isAllowed = true;
            } else {
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
        } else {
            $response = $next($request);
        }
        
        // Add CORS headers if origin is allowed
        if ($isAllowed && $origin) {
            $response->headers->set('Access-Control-Allow-Origin', $origin);
            $response->headers->set('Access-Control-Allow-Methods', implode(', ', $corsConfig['allowed_methods'] ?? ['*']));
            $response->headers->set('Access-Control-Allow-Headers', implode(', ', $corsConfig['allowed_headers'] ?? ['*']));
            
            if ($corsConfig['supports_credentials'] ?? false) {
                $response->headers->set('Access-Control-Allow-Credentials', 'true');
            }
            
            if (($corsConfig['max_age'] ?? 0) > 0) {
                $response->headers->set('Access-Control-Max-Age', (string) $corsConfig['max_age']);
            }
        }
        
        return $response;
    }
}

