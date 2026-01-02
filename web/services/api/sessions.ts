/**
 * Sessions API Service
 * 
 * Handles session-related API calls
 */

import { apiClient } from './client';
import { ApiResponse } from './config';

// Session interface
export interface Session {
  id: number;
  assembly_id: number;
  name: string;
  start_date: string;
  end_date?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Sessions API service
 */
export const sessionsApi = {
  /**
   * Get sessions for an assembly
   * GET /api/v1/assemblies/{assembly_id}/sessions
   */
  async getByAssembly(assemblyId: number): Promise<ApiResponse<Session[]>> {
    return apiClient.get<Session[]>(`/assemblies/${assemblyId}/sessions`);
  },
};







