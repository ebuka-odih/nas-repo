/**
 * API Configuration
 * 
 * Centralized configuration for API endpoints and settings
 * 
 * The API base URL is configured via the VITE_API_BASE_URL environment variable.
 * Create a .env file in the web directory with:
 *   VITE_API_BASE_URL=http://localhost:8000/api/v1
 * 
 * For production, set this in your deployment platform's environment variables.
 */

// Get API base URL from environment or use default
let apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

// Ensure the API base URL ends with /api/v1
// If user provided URL without /v1, add it
if (apiBaseUrl && !apiBaseUrl.endsWith('/api/v1') && !apiBaseUrl.endsWith('/api/v1/')) {
  // If it ends with /api, add /v1
  if (apiBaseUrl.endsWith('/api') || apiBaseUrl.endsWith('/api/')) {
    apiBaseUrl = apiBaseUrl.replace(/\/api\/?$/, '/api/v1');
  } else {
    // Otherwise append /api/v1
    apiBaseUrl = apiBaseUrl.replace(/\/$/, '') + '/api/v1';
  }
  console.warn('⚠️ API Base URL was adjusted to include /api/v1:', apiBaseUrl);
}

export const API_BASE_URL = apiBaseUrl;

// Debug: Log the API base URL (always log in browser console for debugging)
if (typeof window !== 'undefined') {
  console.log('🔧 API Configuration:', {
    'VITE_API_BASE_URL (env)': import.meta.env.VITE_API_BASE_URL,
    'API_BASE_URL (resolved)': API_BASE_URL,
    'Expected format': 'https://your-domain.com/backend/api/v1'
  });
}

// API response structure
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

// API error structure
export interface ApiError {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}








