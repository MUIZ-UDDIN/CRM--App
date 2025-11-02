/**
 * Shared API Client with interceptors
 */

import axios from 'axios';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/api';
const API_VERSION = '1.0.0'; // Increment this to bust cache after deployments

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token and version to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Add version query param for cache busting
  if (config.url && !config.url.includes('?')) {
    config.url += `?v=${API_VERSION}`;
  } else if (config.url) {
    config.url += `&v=${API_VERSION}`;
  }
  
  return config;
});

// Handle 401 errors - redirect to login
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth data
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Redirect to login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
