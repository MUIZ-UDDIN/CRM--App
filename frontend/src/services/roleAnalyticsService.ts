/**
 * Role-Based Analytics API Service
 * Provides dashboard data based on user role
 */

import apiClient from './apiClient';

// Get role-based dashboard analytics
export const getRoleDashboardAnalytics = async () => {
  try {
    const token = localStorage.getItem('token');
    
    console.log('🔑 Role Dashboard Request:', {
      hasToken: !!token,
      url: '/role-analytics/dashboard'
    });
    
    const response = await apiClient.get('/role-analytics/dashboard', {
      timeout: 10000,
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Role Dashboard Response:', response.status);
    return response.data;
  } catch (error: any) {
    console.error('Error fetching role dashboard analytics:', error);
    console.error('Error details:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url: error.config?.url
    });
    throw error;
  }
};

export default {
  getRoleDashboardAnalytics
};
