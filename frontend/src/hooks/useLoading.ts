/**
 * Custom hook for managing loading states
 */

import { useState, useCallback } from 'react';

export interface UseLoadingReturn {
  isLoading: boolean;
  startLoading: () => void;
  stopLoading: () => void;
  withLoading: <T>(operation: () => Promise<T>) => Promise<T | null>;
}

/**
 * Hook to manage loading state
 */
export const useLoading = (initialState = false): UseLoadingReturn => {
  const [isLoading, setIsLoading] = useState(initialState);

  const startLoading = useCallback(() => {
    setIsLoading(true);
  }, []);

  const stopLoading = useCallback(() => {
    setIsLoading(false);
  }, []);

  /**
   * Wrapper that automatically manages loading state
   */
  const withLoading = useCallback(
    async <T,>(operation: () => Promise<T>): Promise<T | null> => {
      try {
        startLoading();
        const result = await operation();
        return result;
      } catch (error) {
        throw error;
      } finally {
        stopLoading();
      }
    },
    [startLoading, stopLoading]
  );

  return {
    isLoading,
    startLoading,
    stopLoading,
    withLoading,
  };
};

/**
 * Hook for managing multiple loading states
 */
export const useMultipleLoading = () => {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

  const setLoading = useCallback((key: string, value: boolean) => {
    setLoadingStates(prev => ({ ...prev, [key]: value }));
  }, []);

  const isLoading = useCallback((key: string) => {
    return loadingStates[key] || false;
  }, [loadingStates]);

  const isAnyLoading = useCallback(() => {
    return Object.values(loadingStates).some(state => state);
  }, [loadingStates]);

  return {
    setLoading,
    isLoading,
    isAnyLoading,
    loadingStates,
  };
};
