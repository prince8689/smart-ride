import toast from './toastConfig';

/**
 * Centralized error handler for API calls
 * Usage: catch(err) { handleApiError(err); }
 */
export function handleApiError(error, fallbackMessage = 'Something went wrong') {
  const message = error?.message || error?.error || fallbackMessage;

  if (error?.isNetworkError) {
    toast.error('Network error. Check your connection and try again.');
    return;
  }

  if (error?.errors && Array.isArray(error.errors)) {
    // Validation errors from backend
    const firstError = error.errors[0];
    toast.error(firstError?.message || message);
    return;
  }

  toast.error(message);
}

/**
 * Get role-based redirect path
 */
export function getRolePath(role) {
  const paths = {
    user: '/dashboard',
    driver: '/driver',
    admin: '/admin',
  };
  return paths[role] || '/login';
}

/**
 * Safe JSON parse — returns null on failure
 */
export function safeJsonParse(str) {
  try { return JSON.parse(str); }
  catch { return null; }
}

/**
 * Format API validation errors to react-hook-form setError format
 * Usage: setFormErrors(error, setError)
 */
export function setFormErrors(error, setError) {
  if (error?.errors && Array.isArray(error.errors)) {
    error.errors.forEach(({ field, message }) => {
      if (field && setError) {
        setError(field, { type: 'server', message });
      }
    });
  }
}
