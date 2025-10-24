/**
 * Pipelines API Service
 */

import axios from 'axios';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors - redirect to login
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface Stage {
  id: string;
  name: string;
  probability: number;
  order_index: number;
  is_closed: boolean;
  is_won: boolean;
}

export interface Pipeline {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  stages?: Stage[];
}

// Get all pipelines
export const getPipelines = async () => {
  const response = await apiClient.get('/pipelines');
  return response.data;
};

// Get single pipeline with stages
export const getPipeline = async (id: string) => {
  const response = await apiClient.get(`/pipelines/${id}`);
  return response.data;
};

// Get pipeline stages
export const getPipelineStages = async (pipelineId: string) => {
  const response = await apiClient.get(`/pipelines/${pipelineId}/stages`);
  return response.data;
};

// Create pipeline
export const createPipeline = async (data: Partial<Pipeline>) => {
  const response = await apiClient.post('/pipelines', data);
  return response.data;
};

// Update pipeline
export const updatePipeline = async (id: string, data: Partial<Pipeline>) => {
  const response = await apiClient.patch(`/pipelines/${id}`, data);
  return response.data;
};

// Delete pipeline
export const deletePipeline = async (id: string) => {
  const response = await apiClient.delete(`/pipelines/${id}`);
  return response.data;
};

// Create stage
export const createStage = async (pipelineId: string, data: Partial<Stage>) => {
  const response = await apiClient.post(`/pipelines/${pipelineId}/stages`, data);
  return response.data;
};

// Update stage
export const updateStage = async (stageId: string, data: Partial<Stage>) => {
  const response = await apiClient.patch(`/pipeline-stages/${stageId}`, data);
  return response.data;
};

// Delete stage
export const deleteStage = async (stageId: string) => {
  const response = await apiClient.delete(`/pipeline-stages/${stageId}`);
  return response.data;
};

// Reorder stages
export const reorderStages = async (pipelineId: string, stages: { id: string; order_index: number }[]) => {
  const response = await apiClient.patch(`/pipelines/${pipelineId}/reorder-stages`, { stages });
  return response.data;
};

export default {
  getPipelines,
  getPipeline,
  getPipelineStages,
  createPipeline,
  updatePipeline,
  deletePipeline,
  createStage,
  updateStage,
  deleteStage,
  reorderStages,
};
