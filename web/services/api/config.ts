/**
 * API Configuration
 * 
 * Centralized configuration for API endpoints and settings
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







