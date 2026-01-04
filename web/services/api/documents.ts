/**
 * Documents API Service
 * 
 * Handles document-related API calls
 */

import { apiClient } from './client';
import { ApiResponse } from './config';

// Document type
export type DocumentType = 'original_scan' | 'rendered_html' | 'rendered_pdf';

// Document interface
export interface Document {
  id: number;
  sitting_id: number;
  type: DocumentType;
  file_path: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  extracted_text?: string | null;
  is_read_only: boolean;
  created_at: string;
  updated_at: string;
}

// Upload document request
export interface UploadDocumentRequest {
  file: File;
  type: DocumentType;
}

// HTML document response
export interface HtmlDocumentResponse {
  document: Document;
  content: string;
}

// PDF document response
export interface PdfDocumentResponse {
  document: Document;
  url: string;
}

/**
 * Documents API service
 */
export const documentsApi = {
  /**
   * Upload a document for a sitting
   * POST /api/v1/sittings/{id}/documents
   */
  async upload(sittingId: number, file: File, type: DocumentType): Promise<ApiResponse<Document>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    return apiClient.upload<Document>(`/sittings/${sittingId}/documents`, formData);
  },

  /**
   * Get HTML document view
   * GET /api/v1/sittings/{id}/document/html
   */
  async getHtml(sittingId: number): Promise<ApiResponse<HtmlDocumentResponse>> {
    return apiClient.get<HtmlDocumentResponse>(`/sittings/${sittingId}/document/html`);
  },

  /**
   * Get PDF document view
   * GET /api/v1/sittings/{id}/document/pdf
   */
  async getPdf(sittingId: number): Promise<ApiResponse<PdfDocumentResponse>> {
    return apiClient.get<PdfDocumentResponse>(`/sittings/${sittingId}/document/pdf`);
  },
};







