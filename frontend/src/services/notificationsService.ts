const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
  link?: string;
}

const request = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  const token = localStorage.getItem('token');
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  
  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/auth/login';
    throw new Error('Session expired');
  }
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
  }

  return response.json();
};

export const getNotifications = async (unreadOnly: boolean = false): Promise<Notification[]> => {
  const params = unreadOnly ? '?unread_only=true' : '';
  return request<Notification[]>(`/api/notifications/${params}`);
};

export const getUnreadCount = async (): Promise<number> => {
  const response = await request<{ count: number }>('/api/notifications/unread-count');
  return response.count;
};

export const markAsRead = async (notificationId: string): Promise<void> => {
  await request(`/api/notifications/${notificationId}/mark-read`, {
    method: 'POST'
  });
};

export const markAllAsRead = async (): Promise<void> => {
  await request('/api/notifications/mark-all-read', {
    method: 'POST'
  });
};

export const deleteNotification = async (notificationId: string): Promise<void> => {
  await request(`/api/notifications/${notificationId}`, {
    method: 'DELETE'
  });
};

export const deleteAllNotifications = async (): Promise<void> => {
  await request('/api/notifications/', {
    method: 'DELETE'
  });
};
