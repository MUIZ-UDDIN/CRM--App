/**
 * Centralized Error Handler
 * Provides consistent error handling across the application
 */

import { toast } from 'react-hot-toast';

export interface ErrorHandlerOptions {
  showToast?: boolean;
  toastMessage?: string;
  logToConsole?: boolean;
  onError?: (error: any) => void;
}

/**
 * Handle API errors consistently
 */
export const handleApiError = (
  error: any,
  options: ErrorHandlerOptions = {}
): void => {
  const {
    showToast = true,
    toastMessage,
    logToConsole = true,
    onError
  } = options;

  // Log to console if enabled
  if (logToConsole) {
    console.error('API Error:', error);
  }

  // Extract error message
  let errorMessage = 'An unexpected error occurred';
  
  if (error.response?.data?.detail) {
    errorMessage = error.response.data.detail;
  } else if (error.response?.data?.message) {
    errorMessage = error.response.data.message;
  } else if (error.message) {
    errorMessage = error.message;
  }

  // Show toast notification
  if (showToast) {
    toast.error(toastMessage || errorMessage);
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
