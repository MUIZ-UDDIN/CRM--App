/**
 * Centralized Error Handler
 * Provides consistent, user-friendly error handling for SaaS CRM application
 */

import { toast } from 'react-hot-toast';

export interface ErrorHandlerOptions {
  showToast?: boolean;
  toastMessage?: string;
  logToConsole?: boolean;
  onError?: (error: any) => void;
}

export interface UserFriendlyError {
  title: string;
  message: string;
  suggestion?: string;
  status_code?: number;
  technical_detail?: string;
}

/**
 * Extract user-friendly error from API response
 */
const extractUserFriendlyError = (error: any): UserFriendlyError | null => {
  // Check if backend sent user-friendly error format
  if (error.response?.data?.error) {
    return error.response.data.error;
  }
  return null;
};

/**
 * Get fallback user-friendly message based on status code
 */
const getFallbackMessage = (statusCode: number, detail: string): UserFriendlyError => {
  switch (statusCode) {
    case 401:
      return {
        title: 'Session Expired',
        message: 'Your session has expired. Please log in again.',
        suggestion: 'Redirecting to login page...',
        status_code: 401
      };
    case 403:
      return {
        title: 'Access Denied',
        message: 'You don\'t have permission to perform this action.',
        suggestion: 'Contact your administrator if you need access to this feature.',
        status_code: 403
      };
    case 404:
      return {
        title: 'Not Found',
        message: 'The requested resource could not be found.',
        suggestion: 'The item may have been deleted or you may not have access to it.',
        status_code: 404
      };
    case 422:
      return {
        title: 'Validation Error',
        message: detail || 'Please check your input and try again.',
        suggestion: 'Make sure all required fields are filled correctly.',
        status_code: 422
      };
    case 500:
      return {
        title: 'Server Error',
        message: 'Something went wrong on our end.',
        suggestion: 'Please try again in a few moments or contact support.',
        status_code: 500
      };
    default:
      return {
        title: 'Error',
        message: detail || 'An unexpected error occurred.',
        suggestion: 'Please try again or contact support if the problem persists.',
        status_code: statusCode
      };
  }
};

/**
 * Handle API errors consistently with user-friendly messages
 */
export const handleApiError = (
  error: any,
  options: ErrorHandlerOptions = {}
): void => {
  const {
    showToast = true,
    toastMessage,
    logToConsole = false, // Changed default to false for production
    onError
  } = options;

  // Log to console only in development
  if (logToConsole || import.meta.env.DEV) {
    console.error('API Error:', error);
  }

  // Try to extract user-friendly error from backend
  const friendlyError = extractUserFriendlyError(error);
  
  if (friendlyError) {
    // Backend sent user-friendly error
    if (showToast) {
      const message = friendlyError.suggestion 
        ? `${friendlyError.title}: ${friendlyError.message}\n💡 ${friendlyError.suggestion}`
        : `${friendlyError.title}: ${friendlyError.message}`;
      toast.error(message, { duration: 5000 });
    }
  } else {
    // Fallback to extracting from standard error response
    const statusCode = error.response?.status || 500;
    const detail = error.response?.data?.detail || error.response?.data?.message || error.message;
    const fallbackError = getFallbackMessage(statusCode, detail);
    
    if (showToast) {
      const message = toastMessage || (
        fallbackError.suggestion 
          ? `${fallbackError.title}: ${fallbackError.message}\n💡 ${fallbackError.suggestion}`
          : `${fallbackError.title}: ${fallbackError.message}`
      );
      toast.error(message, { duration: 5000 });
    }
  }

  // Handle 401 - redirect to login
  if (error.response?.status === 401) {
    setTimeout(() => {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }, 2000);
  }

  // Call custom error handler if provided
  if (onError) {
    onError(error);
  }
};

/**
 * Wrapper for async operations with error handling
 */
export const withErrorHandler = async <T>(
  operation: () => Promise<T>,
  options: ErrorHandlerOptions = {}
): Promise<T | null> => {
  try {
    return await operation();
  } catch (error) {
    handleApiError(error, options);
    return null;
  }
};

/**
 * Handle form validation errors
 */
export const handleValidationError = (
  field: string,
  message: string
): void => {
  toast.error(`${field}: ${message}`);
};
