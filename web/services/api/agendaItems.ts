/**
 * Agenda Items API Service
 * 
 * Handles agenda item-related API calls
 */

import { apiClient } from './client';
import { ApiResponse } from './config';

// Agenda item interface
export interface AgendaItem {
  id: number;
  sitting_id: number;
  agenda_number: number;
  title: string;
  procedural_text: string;
  outcome?: string;
  order: number;
  created_at: string;
  updated_at: string;
}

// Create agenda item request
export interface CreateAgendaItemRequest {
  agenda_number: number;
  title: string;
  procedural_text: string;
  outcome?: string;
  order?: number;
}

// Update agenda item request
export interface UpdateAgendaItemRequest {
  title?: string;
  procedural_text?: string;
  outcome?: string;
  order?: number;
}

/**
 * Agenda Items API service
 */
export const agendaItemsApi = {
  /**
   * List agenda items for a sitting
   * GET /api/v1/sittings/{id}/agenda-items
   */
  async getBySitting(sittingId: number): Promise<ApiResponse<AgendaItem[]>> {
    return apiClient.get<AgendaItem[]>(`/sittings/${sittingId}/agenda-items`);
  },

  /**
   * Create a new agenda item (draft only)
   * POST /api/v1/sittings/{id}/agenda-items
   */
  async create(sittingId: number, data: CreateAgendaItemRequest): Promise<ApiResponse<AgendaItem>> {
    return apiClient.post<AgendaItem>(`/sittings/${sittingId}/agenda-items`, data);
  },

  /**
   * Update an agenda item (draft only)
   * PUT /api/v1/agenda-items/{agenda_id}
   */
  async update(agendaId: number, data: UpdateAgendaItemRequest): Promise<ApiResponse<AgendaItem>> {
    return apiClient.put<AgendaItem>(`/agenda-items/${agendaId}`, data);
  },
};







