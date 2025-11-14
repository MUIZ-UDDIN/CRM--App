/**
 * Admin Analytics API Service
 * Connects frontend to backend admin analytics endpoints
 */

import apiClient from './apiClient';

// Admin Analytics Filters interface
export interface AdminAnalyticsFilters {
  date_from?: string;
  date_to?: string;
  company_id?: number;
}

// Get admin dashboard analytics
export const getAdminDashboardAnalytics = async (filters?: AdminAnalyticsFilters) => {
  try {
    // Add timeout to prevent hanging requests
    const response = await apiClient.get('/analytics/admin-dashboard', { 
      params: filters,
      timeout: 10000 // 10 second timeout
    });
    return response.data;
  } catch (error: any) {
    // Log detailed error information
    console.error('Error fetching admin dashboard analytics:', error);
    console.error('Error details:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url: error.config?.url
    });
    
    // Rethrow the error to allow proper handling by the component
    throw error;
  }
};

// Get company analytics
export const getCompanyAnalytics = async (filters?: AdminAnalyticsFilters) => {
  try {
    const response = await apiClient.get('/analytics/companies', { params: filters });
    return response.data;
  } catch (error) {
    console.error('Error fetching company analytics:', error);
    return {
      companies: [],
      total_companies: 0
    };
  }
};

// Get user analytics
export const getUserAnalytics = async (filters?: AdminAnalyticsFilters) => {
  try {
    const response = await apiClient.get('/analytics/users', { params: filters });
    return response.data;
  } catch (error) {
    console.error('Error fetching user analytics:', error);
    return {
      users: [],
      total_users: 0
    };
  }
};

export default {
  getAdminDashboardAnalytics,
  getCompanyAnalytics,
  getUserAnalytics
};
