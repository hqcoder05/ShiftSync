import api from './api';
import { waitForFcmRegistration } from './notificationService';
import { clearLegacyAuthStorage, clearSession, setSession } from './authSession';

let loggingOut = false;
// React StrictMode intentionally mounts effects twice in development.  Without
// sharing this promise, two startup refreshes race: the first rotates the
// cookie and the second immediately submits the now-invalid token (401).
let restoreSessionInFlight = null;
export const isLoggingOut = () => loggingOut;

export const login = async (email, password) => {
  loggingOut = false;
  const response = await api.post('/auth/login', { email, password });
  
  if (response.data?.accessToken) setSession(response.data);
  
  return response.data;
};

export const refreshToken = () => {
  return api.post('/auth/refresh', {});
};

export const restoreSession = async () => {
  if (!restoreSessionInFlight) {
    restoreSessionInFlight = refreshToken()
      .then((response) => {
        if (response.data?.accessToken) setSession(response.data);
        return response.data;
      })
      .finally(() => {
        restoreSessionInFlight = null;
      });
  }
  return restoreSessionInFlight;
};

export const logout = async () => {
  loggingOut = true;
  try { await waitForFcmRegistration(); } catch { /* Registration did not succeed. */ }
  const fcmToken = sessionStorage.getItem('fcmToken');
  if (fcmToken) {
    try {
      await api.delete('/users/me/fcm-token', { data: { fcmToken } });
      sessionStorage.removeItem('fcmToken');
    } catch (e) {
      console.warn('Không thể hủy đăng ký thông báo thiết bị:', e.message);
    }
  }
  try {
    await api.post('/auth/logout', {});
  } catch (e) {
    console.warn('Backend logout warning:', e.message);
  }
  clearSession();
  clearLegacyAuthStorage();
};
