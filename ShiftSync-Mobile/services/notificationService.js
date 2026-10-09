import api from './api';
import { Platform } from 'react-native';

export const getPreferences = () =>
  api.get('/users/me/notification-preferences');

export const updatePreferences = (data) =>
  api.put('/users/me/notification-preferences', data);

export const registerFcmToken = (token) =>
  api.post('/users/me/fcm-token', {
    fcmToken: token,
    deviceType: Platform.OS === 'ios' ? 'IOS' : 'ANDROID'
  });

export const sendTestNotification = (data) =>
  api.post('/notifications/test', data || {});

export const getMyNotifications = () =>
  api.get('/users/me/notifications');

export const getUnreadNotificationCount = () =>
  api.get('/users/me/notifications/unread-count');

export const markNotificationAsRead = (id) =>
  api.put(`/users/me/notifications/${id}/read`);

export const markAllNotificationsAsRead = () =>
  api.put('/users/me/notifications/read-all');
