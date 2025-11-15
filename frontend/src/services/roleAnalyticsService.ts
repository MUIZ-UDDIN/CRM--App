/**
 * Role-Based Analytics API Service
 * Provides dashboard data based on user role
 */

import apiClient from './apiClient';

// Get role-based dashboard analytics
export const getRoleDashboardAnalytics = async () => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await apiClient.get('/role-analytics/dashboard', {
      timeout: 10000,
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    return response.data;
  } catch (error: any) {
    throw error;
  }
};

export default {
  getRoleDashboardAnalytics
};
