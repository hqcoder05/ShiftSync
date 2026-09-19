import api from './api';

export const getMyProfile = () => api.get('/users/me');
export const updateMyProfile = (data) => api.put('/users/me', data);
export const getMyStores = (userId) => api.get(`/users/${userId}/stores`);
export const updateMyAvatar = (avatarId) => api.put('/users/me/avatar', { avatarId });

