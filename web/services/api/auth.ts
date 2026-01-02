/**
 * Authentication API Service
 * 
 * Handles all authentication-related API calls
 */

import { apiClient } from './client';
import { ApiResponse } from './config';

// User interface matching backend User model
export interface User {
  id: number;
  name: string;
  email: string;
  role: 'clerk' | 'reviewer' | 'admin';
  email_verified_at?: string;
  created_at: string;
  updated_at: string;
}

// Login request payload
export interface LoginRequest {
  email: string;
  password: string;
}

// Login response
export interface LoginResponse {
  user: User;
  token: string;
}

/**
 * Authentication API service
 */
export const authApi = {
  /**
   * Login user
   * POST /api/v1/login
   */
  async login(credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    const response = await apiClient.post<LoginResponse>('/login', credentials);
    
    // Store token if login successful
    if (response.success && response.data?.token) {
      apiClient.setToken(response.data.token);
    }
    
    return response;
  },

  /**
   * Get authenticated user
   * GET /api/v1/me
   */
  async getCurrentUser(): Promise<ApiResponse<User>> {
    return apiClient.get<User>('/me');
  },

  /**
   * Logout user
   * POST /api/v1/logout
   */
  async logout(): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.post<void>('/logout');
      // Clear token regardless of response
      apiClient.setToken(null);
      return response;
    } catch (error) {
      // Clear token even if request fails
      apiClient.setToken(null);
      throw error;
    }
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return apiClient.isAuthenticated();
  },
};







