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
    const response = await apiClient.get('/analytics/admin-dashboard', { params: filters });
    return response.data;
  } catch (error) {
    console.error('Error fetching admin dashboard analytics:', error);
    // Return fallback data if the server returns an error
    return {
      companies_count: 0,
      active_users_count: 0,
      total_deals_count: 0,
      total_pipeline_value: 0,
      recent_activities: [],
      companies_by_size: [],
      deals_by_stage: [],
      user_activity: []
    };
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
