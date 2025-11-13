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

// Suppress axios console errors globally for this instance
const originalConsoleError = console.error;
const suppressedErrors = new WeakSet();

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

// Override console.error to suppress axios errors for this client
console.error = function(...args) {
  // Check if this is an axios error from our apiClient
  const isAxiosError = args.some(arg => 
    arg && typeof arg === 'object' && 
    (arg.isAxiosError || (arg.config && arg.response))
  );
  
  // Don't log axios errors from our apiClient (they're handled in interceptors)
  if (!isAxiosError) {
    originalConsoleError.apply(console, args);
  }
};

// Handle 401 errors - redirect to login silently
// Suppress console errors for expected validation failures (400)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth data
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Redirect to login immediately without showing error
      // Use replace to prevent back button from returning to protected page
      window.location.replace('/auth/login');
      
      // Return a resolved promise to prevent error propagation
      return new Promise(() => {}); // Never resolves, page is redirecting
    }
    
    // Mark error as handled to prevent console logging
    suppressedErrors.add(error);
    
    return Promise.reject(error);
  }
);

export default apiClient;
