const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const authHeader = (token) => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
});

export const getNotifications = async (token) => {
  const res = await fetch(`${API_URL}/notifications/`, {
    headers: authHeader(token)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Failed to fetch notifications');
  return data;
};

export const markNotificationRead = async (token, notificationId) => {
  const res = await fetch(`${API_URL}/notifications/${notificationId}/read`, {
    method: 'PATCH',
    headers: authHeader(token)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Failed to mark read');
  return data;
};

export const markAllNotificationsRead = async (token) => {
  const res = await fetch(`${API_URL}/notifications/read-all`, {
    method: 'PATCH',
    headers: authHeader(token)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Failed to mark all read');
  return data;
};
