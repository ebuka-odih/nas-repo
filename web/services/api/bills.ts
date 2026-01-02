/**
 * Bills API Service
 * 
 * Handles bill-related API calls
 */

import { apiClient } from './client';
import { ApiResponse } from './config';

// Bill interface
export interface Bill {
  id: number;
  sitting_id: number;
  bill_title: string;
  bill_reference?: string;
  legislative_stage?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

// Create bill request
export interface CreateBillRequest {
  bill_title: string;
  bill_reference?: string;
  legislative_stage?: string;
  description?: string;
}

/**
 * Bills API service
 */
export const billsApi = {
  /**
   * List bills for a sitting
   * GET /api/v1/sittings/{id}/bills
   */
  async getBySitting(sittingId: number): Promise<ApiResponse<Bill[]>> {
    return apiClient.get<Bill[]>(`/sittings/${sittingId}/bills`);
  },

  /**
   * Create a new bill (draft only)
   * POST /api/v1/sittings/{id}/bills
   */
  async create(sittingId: number, data: CreateBillRequest): Promise<ApiResponse<Bill>> {
    return apiClient.post<Bill>(`/sittings/${sittingId}/bills`, data);
  },
};







