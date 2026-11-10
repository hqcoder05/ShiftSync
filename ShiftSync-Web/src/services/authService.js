import api from './api';
import { waitForFcmRegistration } from './notificationService';

let loggingOut = false;
export const isLoggingOut = () => loggingOut;

export const login = async (email, password) => {
  loggingOut = false;
  const response = await api.post('/auth/login', { email, password });
  
  if (response.data) {
    if (response.data.accessToken) {
      localStorage.setItem('accessToken', response.data.accessToken);
    }
    if (response.data.refreshToken) {
      localStorage.setItem('refreshToken', response.data.refreshToken);
    }
    if (response.data.role) {
      localStorage.setItem('userRole', response.data.role);
    }
    if (response.data.email) {
      localStorage.setItem('userEmail', response.data.email);
    }
  }
  
  return response.data;
};

export const register = (data) => api.post('/auth/register', data);

export const refreshToken = (token) => {
  const rt = token || localStorage.getItem('refreshToken');
  return api.post('/auth/refresh', { refreshToken: rt });
};

export const logout = async () => {
  loggingOut = true;
  try { await waitForFcmRegistration(); } catch { /* Registration did not succeed. */ }
  const rt = localStorage.getItem('refreshToken');
  const fcmToken = sessionStorage.getItem('fcmToken');
  if (fcmToken) {
    try {
      await api.delete('/users/me/fcm-token', { data: { fcmToken } });
      sessionStorage.removeItem('fcmToken');
    } catch (e) {
      console.warn('Không thể hủy đăng ký thông báo thiết bị:', e.message);
    }
  }
  if (rt) {
    try {
      await api.post('/auth/logout', { refreshToken: rt });
    } catch (e) {
      console.warn('Backend logout warning:', e.message);
    }
  }
  localStorage.removeItem('accessToken');
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('userRole');
  localStorage.removeItem('userEmail');
};
