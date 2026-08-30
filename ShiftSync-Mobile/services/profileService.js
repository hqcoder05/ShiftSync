import api from './api';

// Hồ sơ luôn lấy theo access token hiện tại, không dùng dữ liệu mẫu trong app.
export const getMyProfile = () => api.get('/users/me');
export const getMyStores = (userId) => api.get(`/users/${userId}/stores`);
