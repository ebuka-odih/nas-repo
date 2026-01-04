/**
 * Assemblies API Service
 * 
 * Handles assembly-related API calls
 */

import { apiClient } from './client';
import { ApiResponse } from './config';

// Assembly interface
export interface Assembly {
  id: number;
  name: string;
  start_date: string;
  end_date?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Assemblies API service
 */
export const assembliesApi = {
  /**
   * Get all assemblies
   * GET /api/v1/assemblies
   */
  async getAll(): Promise<ApiResponse<Assembly[]>> {
    return apiClient.get<Assembly[]>('/assemblies');
  },
};








