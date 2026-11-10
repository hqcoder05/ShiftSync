import api from './api';
import { API_BASE_URL } from './api';

export const getNotificationPreferences = () =>
  api.get('/users/me/notification-preferences');

export const updateNotificationPreferences = (data) =>
  api.put('/users/me/notification-preferences', data);

let pendingFcmRegistration = null;
export const registerFcmToken = (token) => {
  const request = api.post('/users/me/fcm-token', { fcmToken: token, deviceType: 'WEB' });
  pendingFcmRegistration = request;
  request.finally(() => { if (pendingFcmRegistration === request) pendingFcmRegistration = null; }).catch(() => {});
  return request;
};
export const waitForFcmRegistration = () => pendingFcmRegistration || Promise.resolve();

export const getMyNotifications = () =>
  api.get('/users/me/notifications');

export const getUnreadNotificationCount = () =>
  api.get('/users/me/notifications/unread-count');

export const markNotificationAsRead = (id) =>
  api.put(`/users/me/notifications/${id}/read`);

export const markAllNotificationsAsRead = () =>
  api.put('/users/me/notifications/read-all');

export const sendTestNotification = (payload = {}) => api.post('/notifications/test', payload);

export const scheduleDelayedTestNotification = (payload = {}) => api.post('/notifications/test/delayed', payload);

// EventSource cannot attach the Bearer header used by this application. Read the
// SSE response with fetch instead so the existing JWT policy remains intact.
export const subscribeNotificationStream = (onMessage, onError) => {
  const controller = new AbortController();
  const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
  fetch(`${API_BASE_URL}/users/me/notifications/stream`, {
    headers: token ? { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' } : {},
    signal: controller.signal,
  }).then(async (response) => {
    if (!response.ok || !response.body) throw new Error('Không thể kết nối luồng thông báo');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (!controller.signal.aborted) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split(/\r?\n\r?\n/);
      buffer = events.pop() || '';
      events.forEach((event) => {
        const eventName = event.split(/\r?\n/).find((line) => line.startsWith('event:'))?.slice(6).trim();
        const raw = event.split(/\r?\n/).find((line) => line.startsWith('data:'))?.slice(5).trim();
        if (!raw) return;
        // `connect` is a transport acknowledgement, not an in-app notification.
        // Only notification payloads are JSON objects and should refresh the UI.
        if (eventName && eventName !== 'notification') return;
        try {
          const payload = JSON.parse(raw);
          if (payload && typeof payload === 'object') onMessage(payload);
        } catch {
          // Ignore malformed/non-notification SSE payloads while retaining the stream.
        }
      });
    }
  }).catch((error) => { if (!controller.signal.aborted) onError?.(error); });
  return () => controller.abort();
};
