/**
 * Workflows API Service
 */

import apiClient from './apiClient';

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  trigger_type: string;
  trigger_config?: any;
  actions?: any[];
  is_active: boolean;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

// Get all workflows
export const getWorkflows = async (params?: any) => {
  const response = await apiClient.get('/workflows', { params });
  return response.data;
};

// Get single workflow
export const getWorkflow = async (id: string) => {
  const response = await apiClient.get(`/workflows/${id}`);
  return response.data;
};

// Create workflow
export const createWorkflow = async (data: Partial<Workflow>) => {
  const response = await apiClient.post('/workflows', data);
  return response.data;
};

// Update workflow
export const updateWorkflow = async (id: string, data: Partial<Workflow>) => {
  const response = await apiClient.put(`/workflows/${id}`, data);
  return response.data;
};

// Delete workflow
export const deleteWorkflow = async (id: string) => {
  const response = await apiClient.delete(`/workflows/${id}`);
  return response.data;
};

// Activate/Deactivate workflow
export const toggleWorkflow = async (id: string, isActive: boolean) => {
  const response = await apiClient.post(`/workflows/${id}/toggle`, { is_active: isActive });
  return response.data;
};

// Execute workflow manually
export const executeWorkflow = async (id: string) => {
  const response = await apiClient.post(`/workflows/${id}/execute`);
  return response.data;
};

export default {
  getWorkflows,
  getWorkflow,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  toggleWorkflow,
  executeWorkflow,
};
