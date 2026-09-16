import api from './api';

export const login = (email, password) =>
  api.post('/auth/login', { email, password });

export const register = (data) =>
  api.post('/auth/register', data);

export const refreshToken = (token) =>
  api.post('/auth/refresh', { refreshToken: token });

export const logout = (token) =>
  api.post('/auth/logout', { refreshToken: token });