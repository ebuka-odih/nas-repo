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
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

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








