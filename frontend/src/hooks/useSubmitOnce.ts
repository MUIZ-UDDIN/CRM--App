import { useState, useCallback } from 'react';

/**
 * Custom hook to prevent multiple form submissions
 * Returns [isSubmitting, submitHandler]
 * 
 * Usage:
 * const [isSubmitting, handleSubmit] = useSubmitOnce(async () => {
 *   // Your submit logic here
 *   await api.createDeal(data);
 * });
 */
export function useSubmitOnce<T extends (...args: any[]) => Promise<any>>(
  submitFunction: T
): [boolean, T] {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const wrappedSubmit = useCallback(
    async (...args: Parameters<T>) => {
      // Prevent multiple submissions
      if (isSubmitting) {
        return;
      }

      setIsSubmitting(true);
      try {
        const result = await submitFunction(...args);
        return result;
      } finally {
        // Always reset submitting state, even if there's an error
        setIsSubmitting(false);
      }
    },
    [submitFunction, isSubmitting]
  ) as T;

  return [isSubmitting, wrappedSubmit];
}
