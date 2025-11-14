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

// Store pending requests that should be retried after token refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
  config: any;
}> = [];

// Process the queue of failed requests
const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(request => {
    if (error) {
      request.reject(error);
    } else if (token) {
      // Retry the request with the new token
      request.config.headers['Authorization'] = `Bearer ${token}`;
      request.resolve(axios(request.config));
    }
  });
  
  // Reset the queue
  failedQueue = [];
};

// Handle 401 errors with token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Log all API errors for debugging
    console.error('API Error:', {
      status: error.response?.status,
      url: originalRequest?.url,
      method: originalRequest?.method,
      data: error.response?.data
    });
    
    // If error is 401 and we haven't tried to refresh the token yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      console.log('Attempting to handle 401 error');
      
      // TEMPORARY FIX: For debugging, don't redirect immediately
      // Instead, show a message and let the user stay on the page
      console.warn('Authentication error - token may be invalid or expired');
      
      // If we're already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject, config: originalRequest });
        });
      }
      
      // Mark that we're now refreshing
      originalRequest._retry = true;
      isRefreshing = true;
      
      try {
        // Try to refresh the token
        const token = localStorage.getItem('token');
        console.log('Current token:', token ? `${token.substring(0, 15)}...` : 'No token');
        
        if (token) {
          // Try to refresh token
          try {
            console.log('Attempting to refresh token...');
            const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, {
              headers: { Authorization: `Bearer ${token}` }
            });
            
            if (response.data && response.data.access_token) {
              // Update the token
              const newToken = response.data.access_token;
              console.log('Token refreshed successfully');
              localStorage.setItem('token', newToken);
              
              // Update headers for the original request
              originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
              
              // Process the queue with the new token
              processQueue(null, newToken);
              
              // Retry the original request
              return axios(originalRequest);
            }
          } catch (refreshError) {
            // Token refresh failed
            console.error('Token refresh failed:', refreshError);
            processQueue(refreshError, null);
            
            // TEMPORARY: Don't redirect, just log the error
            console.warn('Authentication failed but staying on page for debugging');
            return Promise.reject(refreshError);
          }
        }
        
        // TEMPORARY: Don't redirect, just log the error
        console.warn('No token or refresh failed, but staying on page for debugging');
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }
    
    // For other errors, just reject as normal
    return Promise.reject(error);
  }
);

export default apiClient;
