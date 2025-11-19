/**
 * Activities API Service
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
      window.location.href = '/auth/login';
    }
    return Promise.reject(error);
  }
);

export interface Activity {
  id: string;
  type: string;
  subject: string;
  description?: string;
  status?: string;
  due_date?: string;
  completed_at?: string;
  duration_minutes?: number;
  owner_id?: string;
  contact_id?: string;
  deal_id?: string;
  location?: string;
  outcome?: string;
  priority?: number;
  created_at?: string;
  updated_at?: string;
}

// Get all activities
export const getActivities = async (params?: any) => {
  const response = await apiClient.get('/activities', { params });
  return response.data;
};

// Get single activity
export const getActivity = async (id: string) => {
  const response = await apiClient.get(`/activities/${id}`);
  return response.data;
};

// Create activity
export const createActivity = async (data: Partial<Activity>) => {
  const response = await apiClient.post('/activities', data);
  return response.data;
};

// Update activity
export const updateActivity = async (id: string, data: Partial<Activity>) => {
  const response = await apiClient.patch(`/activities/${id}`, data);
  return response.data;
};

// Delete activity
export const deleteActivity = async (id: string) => {
  const response = await apiClient.delete(`/activities/${id}`);
  return response.data;
};

// Complete activity
export const completeActivity = async (id: string) => {
  const response = await apiClient.patch(`/activities/${id}/complete`);
  return response.data;
};

export default {
  getActivities,
  getActivity,
  createActivity,
  updateActivity,
  deleteActivity,
  completeActivity,
};
