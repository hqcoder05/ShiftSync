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

export const logout = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('userRole');
  localStorage.removeItem('userEmail');
};