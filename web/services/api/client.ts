/**
 * API Client
 * 
 * Base HTTP client for making API requests with authentication
 */

import { API_BASE_URL, ApiResponse, ApiError } from './config';

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    // Load token from localStorage on initialization
    this.loadToken();
  }

  /**
   * Load authentication token from localStorage
   */
  private loadToken(): void {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  /**
   * Set authentication token
   */
  setToken(token: string | null): void {
    this.token = token;
    if (token && typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    } else if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  /**
   * Get authentication token
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.token !== null;
  }

  /**
   * Build full URL from endpoint
   */
  private buildURL(endpoint: string): string {
    // Remove leading slash if present
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    return `${this.baseURL}/${cleanEndpoint}`;
  }

  /**
   * Get headers for request
   */
  private getHeaders(customHeaders?: HeadersInit): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...customHeaders,
    };

    // Add authorization header if token exists
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  /**
   * Handle API response
   */
  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const data = await response.json();

    if (!response.ok) {
      const error: ApiError = {
        success: false,
        message: data.message || 'An error occurred',
        errors: data.errors,
      };
      throw error;
    }

    return data as ApiResponse<T>;
  }

  /**
   * Make GET request
   */
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    let url = this.buildURL(endpoint);

    // Add query parameters if provided
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return this.handleResponse<T>(response);
  }

  /**
   * Make POST request
   */
  async post<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    const response = await fetch(this.buildURL(endpoint), {
      method: 'POST',
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });

    return this.handleResponse<T>(response);
  }

  /**
   * Make PUT request
   */
  async put<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    const response = await fetch(this.buildURL(endpoint), {
      method: 'PUT',
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });

    return this.handleResponse<T>(response);
  }

  /**
   * Make DELETE request
   */
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    const response = await fetch(this.buildURL(endpoint), {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    return this.handleResponse<T>(response);
  }

  /**
   * Upload file (multipart/form-data)
   */
  async upload<T>(endpoint: string, formData: FormData): Promise<ApiResponse<T>> {
    const headers: HeadersInit = {};

    // Add authorization header if token exists
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    // Don't set Content-Type for FormData - browser will set it with boundary
    const response = await fetch(this.buildURL(endpoint), {
      method: 'POST',
      headers,
      body: formData,
    });

    return this.handleResponse<T>(response);
  }
}

// Export singleton instance
export const apiClient = new ApiClient(API_BASE_URL);







