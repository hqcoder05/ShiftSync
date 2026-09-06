import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:8080/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      // Nếu không có token hoặc token không hợp lệ / hết hạn
      if (!token || error.response.status === 401) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userEmail');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;