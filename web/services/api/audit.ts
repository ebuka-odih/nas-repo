/**
 * Audit Log API Service
 * 
 * Handles audit log-related API calls
 */

import { apiClient } from './client';
import { ApiResponse } from './config';

// Audit log interface
export interface AuditLog {
  id: number;
  user_id: number;
  auditable_type: string;
  auditable_id: number;
  action: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  description?: string;
  created_at: string;
  // Relations
  user?: {
    id: number;
    name: string;
    email: string;
  };
}

// Paginated audit log response
export interface PaginatedAuditLog {
  data: AuditLog[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

/**
 * Audit Log API service
 */
export const auditApi = {
  /**
   * Get audit log for a sitting
   * GET /api/v1/sittings/{id}/audit-log
   */
  async getBySitting(sittingId: number, perPage?: number): Promise<ApiResponse<PaginatedAuditLog>> {
    return apiClient.get<PaginatedAuditLog>(`/sittings/${sittingId}/audit-log`, {
      per_page: perPage,
    });
  },
};








