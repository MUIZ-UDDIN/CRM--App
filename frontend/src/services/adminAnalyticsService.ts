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
    // Get token explicitly
    const token = localStorage.getItem('token');
    
    // Add timeout to prevent hanging requests
    const response = await apiClient.get('/admin-analytics/dashboard', { 
      params: filters,
      timeout: 10000, // 10 second timeout
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    return response.data;
  } catch (error: any) {
    // Rethrow the error to allow proper handling by the component
    throw error;
  }
};

// Get company analytics - Super Admin only
export const getCompanyAnalytics = async (filters?: AdminAnalyticsFilters) => {
  try {
    const response = await apiClient.get('/admin-analytics/companies', { params: filters });
    return response.data;
  } catch (error: any) {
    // Silently handle errors
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
    // Silently handle errors
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
