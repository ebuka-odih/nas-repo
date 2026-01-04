/**
 * Sittings API Service
 * 
 * Handles sitting-related API calls
 */

import { apiClient } from './client';
import { ApiResponse } from './config';

// Sitting status type
export type SittingStatus = 'draft' | 'submitted' | 'official';

// Sitting interface
export interface Sitting {
  id: number;
  session_id: number;
  date: string;
  time_opened?: string;
  status: SittingStatus;
  created_by?: number;
  submitted_by?: number;
  submitted_at?: string;
  officialized_at?: string;
  created_at: string;
  updated_at: string;
  // Relations (when loaded)
  session?: {
    id: number;
    name: string;
    assembly?: {
      id: number;
      name: string;
    };
  };
  creator?: {
    id: number;
    name: string;
    email: string;
  };
  agenda_items?: any[];
  bills?: any[];
}

// Create sitting request
export interface CreateSittingRequest {
  session_id: number;
  date: string;
  time_opened?: string;
}

// Sittings filter parameters
export interface SittingsFilters {
  assembly?: number;
  session?: number;
  date_from?: string;
  date_to?: string;
  status?: SittingStatus;
  per_page?: number;
}

/**
 * Sittings API service
 */
export const sittingsApi = {
  /**
   * List sittings with filters
   * GET /api/v1/sittings
   */
  async list(filters?: SittingsFilters): Promise<ApiResponse<Sitting[]>> {
    return apiClient.get<Sitting[]>('/sittings', filters);
  },

  /**
   * Get full sitting record
   * GET /api/v1/sittings/{id}
   */
  async getById(id: number): Promise<ApiResponse<Sitting>> {
    return apiClient.get<Sitting>(`/sittings/${id}`);
  },

  /**
   * Get sitting summary (default view)
   * GET /api/v1/sittings/{id}/summary
   */
  async getSummary(id: number): Promise<ApiResponse<Sitting>> {
    return apiClient.get<Sitting>(`/sittings/${id}/summary`);
  },

  /**
   * Create a new draft sitting
   * POST /api/v1/sittings
   */
  async create(data: CreateSittingRequest): Promise<ApiResponse<Sitting>> {
    return apiClient.post<Sitting>('/sittings', data);
  },

  /**
   * Submit a sitting (locks record)
   * POST /api/v1/sittings/{id}/submit
   */
  async submit(id: number): Promise<ApiResponse<Sitting>> {
    return apiClient.post<Sitting>(`/sittings/${id}/submit`);
  },

  /**
   * Officialize a sitting (makes it immutable)
   * POST /api/v1/sittings/{id}/officialize
   */
  async officialize(id: number): Promise<ApiResponse<Sitting>> {
    return apiClient.post<Sitting>(`/sittings/${id}/officialize`);
  },

  /**
   * Delete a sitting (only draft sittings)
   * DELETE /api/v1/sittings/{id}
   */
  async delete(id: number): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/sittings/${id}`);
  },
};







