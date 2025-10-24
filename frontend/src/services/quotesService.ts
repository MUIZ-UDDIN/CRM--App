/**
 * Quotes API Service
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

export interface Quote {
  id: string;
  quote_number: string;
  title: string;
  amount: number;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  client_id?: string;
  deal_id?: string;
  owner_id: string;
  valid_until?: string;
  description?: string;
  terms?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Get all quotes
export const getQuotes = async (params?: any) => {
  const response = await apiClient.get('/quotes', { params });
  return response.data;
};

// Get single quote
export const getQuote = async (id: string) => {
  const response = await apiClient.get(`/quotes/${id}`);
  return response.data;
};

// Create quote
export const createQuote = async (data: Partial<Quote>) => {
  const response = await apiClient.post('/quotes', data);
  return response.data;
};

// Update quote
export const updateQuote = async (id: string, data: Partial<Quote>) => {
  const response = await apiClient.patch(`/quotes/${id}`, data);
  return response.data;
};

// Delete quote
export const deleteQuote = async (id: string) => {
  const response = await apiClient.delete(`/quotes/${id}`);
  return response.data;
};

export default {
  getQuotes,
  getQuote,
  createQuote,
  updateQuote,
  deleteQuote,
};
