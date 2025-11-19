/**
 * Fetch wrapper that automatically handles 401 errors and redirects to login
 */
export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const response = await fetch(url, options);
  
  // Handle 401 Unauthorized - token expired
  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/auth/login';
    throw new Error('Session expired. Please log in again.');
  }
  
  return response;
}
