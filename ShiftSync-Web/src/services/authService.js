import api from './api';

export const login = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  
  // Tự động lưu accessToken vào localStorage ngay khi đăng nhập thành công
  if (response.data && response.data.accessToken) {
    localStorage.setItem('accessToken', response.data.accessToken);
  }
  
  return response.data;
};