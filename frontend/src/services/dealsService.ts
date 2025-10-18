/**
 * Deals API Service
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

export interface Deal {
  id: string;
  title: string;
  value: number;
  currency?: string;
  pipeline_id: string;
  stage_id: string;
  status?: string;
  owner_id?: string;
  contact_id?: string;
  company?: string;
  contact?: string;
  expected_close_date?: string;
  probability?: number;
  description?: string;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
}

// Get all deals
export const getDeals = async (params?: any) => {
  const response = await apiClient.get('/deals', { params });
  return response.data;
};

// Get single deal
export const getDeal = async (id: string) => {
  const response = await apiClient.get(`/deals/${id}`);
  return response.data;
};

// Create deal
export const createDeal = async (data: Partial<Deal>) => {
  const response = await apiClient.post('/deals', data);
  return response.data;
};

// Update deal
export const updateDeal = async (id: string, data: Partial<Deal>) => {
  const response = await apiClient.patch(`/deals/${id}`, data);
  return response.data;
};

// Delete deal
export const deleteDeal = async (id: string) => {
  const response = await apiClient.delete(`/deals/${id}`);
  return response.data;
};

// Move deal to different stage
export const moveDealStage = async (id: string, fromStageId: string, toStageId: string) => {
  const response = await apiClient.patch(`/deals/${id}/move`, {
    from_stage_id: fromStageId,
    to_stage_id: toStageId,
  });
  return response.data;
};

export default {
  getDeals,
  getDeal,
  createDeal,
  updateDeal,
  deleteDeal,
  moveDealStage,
};
