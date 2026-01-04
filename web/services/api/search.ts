/**
 * Search API Service
 * 
 * Handles search-related API calls
 */

import { apiClient } from './client';
import { ApiResponse } from './config';
import { Sitting } from './sittings';

// Search filters
export interface SearchFilters {
  keyword?: string;
  date?: string;
  session?: number;
  bill_reference?: string;
}

/**
 * Search API service
 */
export const searchApi = {
  /**
   * Search sittings
   * GET /api/v1/search
   */
  async search(filters: SearchFilters): Promise<ApiResponse<Sitting[]>> {
    return apiClient.get<Sitting[]>('/search', filters);
  },
};








