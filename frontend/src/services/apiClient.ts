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
  
  // Ensure headers object exists
  if (!config.headers) {
    config.headers = {} as any;
  }
  
  // Always set Authorization header if token exists
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

// Track if we've already logged out to prevent multiple redirects
let hasLoggedOut = false;

// Handle 401 errors with silent logout
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If error is 401 (Unauthorized)
    if (error.response?.status === 401) {
      
      // Prevent multiple logout attempts
      if (!hasLoggedOut) {
        hasLoggedOut = true;
        
        // Clear authentication
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Dispatch logout event to stop all background intervals
        window.dispatchEvent(new Event('auth:logout'));
        
        // Silently redirect to login after a short delay
        setTimeout(() => {
          window.location.href = '/login';
        }, 100);
      }
      
      // Return a rejected promise without logging to console
      return Promise.reject({ ...error, silent: true });
    }
    
    // For other errors, just reject as normal
    return Promise.reject(error);
  }
);

export default apiClient;
