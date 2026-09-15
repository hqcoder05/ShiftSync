import api from './api';

export const login = async (email, password) => {
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

export const logout = async () => {
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      await api.post('/auth/logout', { refreshToken });
    }
  } catch (e) {
    // ignore logout API errors - always clear local storage
    console.warn('Backend logout error (ignored):', e.message);
  } finally {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('selectedStoreId');
  }
};