// API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// API service class
class ApiService {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  // Generic request method
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = localStorage.getItem('token');
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return response.json();
      }
      return response.text() as any;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error('Backend connection failed. Using mock data.');
        throw new Error('Backend connection failed');
      }
      throw error;
    }
  }

  // Authentication endpoints
  async login(email: string, password: string) {
    return this.request<{ access_token: string; token_type: string; user: any }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(userData: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
  }) {
    return this.request<{ access_token: string; token_type: string; user: any }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async getCurrentUser() {
    return this.request<any>('/api/users/me');
  }

  async updateCurrentUser(userData: any) {
    return this.request<any>('/api/users/me', {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async changePassword(passwordData: { current_password: string; new_password: string }) {
    return this.request<any>('/api/users/me/change-password', {
      method: 'POST',
      body: JSON.stringify(passwordData),
    });
  }

  async getAllUsers() {
    return this.request<any[]>('/api/users');
  }

  async getUser(userId: string) {
    return this.request<any>(`/api/users/${userId}`);
  }

  // Deals endpoints
  async getDeals() {
    return this.request<any[]>('/api/deals');
  }

  async createDeal(dealData: any) {
    return this.request<any>('/api/deals', {
      method: 'POST',
      body: JSON.stringify(dealData),
    });
  }

  async updateDeal(dealId: string, dealData: any) {
    return this.request<any>(`/api/deals/${dealId}`, {
      method: 'PUT',
      body: JSON.stringify(dealData),
    });
  }

  async deleteDeal(dealId: string) {
    return this.request<void>(`/api/deals/${dealId}`, {
      method: 'DELETE',
    });
  }

  // Contacts endpoints
  async getContacts() {
    return this.request<any[]>('/api/contacts');
  }

  async createContact(contactData: any) {
    return this.request<any>('/api/contacts', {
      method: 'POST',
      body: JSON.stringify(contactData),
    });
  }

  async updateContact(contactId: string, contactData: any) {
    return this.request<any>(`/api/contacts/${contactId}`, {
      method: 'PUT',
      body: JSON.stringify(contactData),
    });
  }

  async deleteContact(contactId: string) {
    return this.request<void>(`/api/contacts/${contactId}`, {
      method: 'DELETE',
    });
  }

  // Activities endpoints
  async getActivities() {
    return this.request<any[]>('/api/activities');
  }

  async createActivity(activityData: any) {
    return this.request<any>('/api/activities', {
      method: 'POST',
      body: JSON.stringify(activityData),
    });
  }

  async updateActivity(activityId: string, activityData: any) {
    return this.request<any>(`/api/activities/${activityId}`, {
      method: 'PUT',
      body: JSON.stringify(activityData),
    });
  }

  async deleteActivity(activityId: string) {
    return this.request<void>(`/api/activities/${activityId}`, {
      method: 'DELETE',
    });
  }

  // Analytics endpoints
  async getAnalytics() {
    return this.request<any>('/api/analytics');
  }

  async getPipelineAnalytics() {
    return this.request<any>('/api/analytics/pipeline');
  }

  // Health check
  async healthCheck() {
    return this.request<{ status: string; service: string; version: string }>('/health');
  }
}

// Create singleton instance
const apiService = new ApiService(API_BASE_URL);

export default apiService;
