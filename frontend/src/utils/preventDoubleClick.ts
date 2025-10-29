/**
 * Utility to prevent double-click/double-submission on buttons and forms
 * 
 * Usage in component:
 * 
 * const [isSubmitting, setIsSubmitting] = useState(false);
 * 
 * const handleSubmit = async (e) => {
 *   e.preventDefault();
 *   if (isSubmitting) return; // Prevent double submission
 *   
 *   setIsSubmitting(true);
 *   try {
 *     await yourApiCall();
 *   } finally {
 *     setIsSubmitting(false);
 *   }
 * };
 * 
 * <button disabled={isSubmitting} onClick={handleSubmit}>
 *   {isSubmitting ? 'Submitting...' : 'Submit'}
 * </button>
 */

// Global debounce helper
const debounceTimers = new Map<string, number>();

export function debounceClick(key: string, callback: () => void, delay: number = 1000) {
  if (debounceTimers.has(key)) {
    return; // Already processing
  }

  const timer = window.setTimeout(() => {
    debounceTimers.delete(key);
  }, delay);

  debounceTimers.set(key, timer);
  callback();
}

// Add disabled styling helper
export function getSubmitButtonClass(isSubmitting: boolean, baseClass: string = '') {
  const disabledClass = isSubmitting 
    ? 'opacity-50 cursor-not-allowed pointer-events-none' 
    : '';
  return `${baseClass} ${disabledClass}`.trim();
}
