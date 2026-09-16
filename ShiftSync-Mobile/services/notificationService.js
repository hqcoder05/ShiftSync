import api from './api';

export const getPreferences = () =>
  api.get('/users/me/notification-preferences');

export const updatePreferences = (data) =>
  api.put('/users/me/notification-preferences', data);

export const registerFcmToken = (token) =>
  api.post('/users/me/fcm-token', { token });

export const sendTestNotification = (data) =>
  api.post('/notifications/test', data || {});
