/**
 * Analytics API Service
 * Connects frontend to backend analytics endpoints
 */

import apiClient from './apiClient';

// Analytics API interfaces
export interface AnalyticsFilters {
  date_from?: string;
  date_to?: string;
  user_id?: number;
  team_id?: number;
  pipeline_id?: number;
  activity_type?: string;
  source?: string;
  document_type?: string;
}

export interface CustomAnalyticsParams extends AnalyticsFilters {
  metrics?: string;
  group_by?: string;
}

// Pipeline Analytics
export const getPipelineAnalytics = async (filters?: AnalyticsFilters) => {
  const response = await apiClient.get('/analytics/pipeline', { params: filters });
  return response.data;
};

// Activity Analytics
export const getActivityAnalytics = async (filters?: AnalyticsFilters) => {
  const response = await apiClient.get('/analytics/activities', { params: filters });
  return response.data;
};

// Email Analytics
export const getEmailAnalytics = async (filters?: AnalyticsFilters) => {
  const response = await apiClient.get('/analytics/emails', { params: filters });
  return response.data;
};

// Call Analytics
export const getCallAnalytics = async (filters?: AnalyticsFilters) => {
  const response = await apiClient.get('/analytics/calls', { params: filters });
  return response.data;
};

// Contact Analytics
export const getContactAnalytics = async (filters?: AnalyticsFilters) => {
  const response = await apiClient.get('/analytics/contacts', { params: filters });
  return response.data;
};

// Document Analytics
export const getDocumentAnalytics = async (filters?: AnalyticsFilters) => {
  const response = await apiClient.get('/analytics/documents', { params: filters });
  return response.data;
};

// Custom Analytics
export const getCustomAnalytics = async (params?: CustomAnalyticsParams) => {
  const response = await apiClient.get('/analytics/custom', { params });
  return response.data;
};

// Dashboard Analytics
export const getDashboardAnalytics = async (filters?: AnalyticsFilters) => {
  const response = await apiClient.get('/analytics/dashboard', { params: filters });
  return response.data;
};

// Revenue Analytics
export const getRevenueAnalytics = async (filters?: AnalyticsFilters) => {
  const response = await apiClient.get('/analytics/revenue', { params: filters });
  return response.data;
};

// User Analytics
export const getUserAnalytics = async () => {
  const response = await apiClient.get('/analytics/users');
  return response.data;
};

// Export functions
export const exportAnalyticsToPDF = async (filters?: AnalyticsFilters) => {
  const response = await apiClient.get('/analytics/export/pdf', {
    params: filters,
    responseType: 'blob',
  });
  return response.data;
};

export const exportAnalyticsToCSV = async (filters?: AnalyticsFilters) => {
  const response = await apiClient.get('/analytics/export/csv', {
    params: filters,
    responseType: 'blob',
  });
  return response.data;
};

export default {
  getPipelineAnalytics,
  getActivityAnalytics,
  getEmailAnalytics,
  getCallAnalytics,
  getContactAnalytics,
  getDocumentAnalytics,
  getCustomAnalytics,
  getDashboardAnalytics,
  getRevenueAnalytics,
  getUserAnalytics,
  exportAnalyticsToPDF,
  exportAnalyticsToCSV,
};
