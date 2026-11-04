import api from './api';

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
