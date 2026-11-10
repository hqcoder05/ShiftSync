import api from './api';
import { cachedRequest } from './offlineCache';
import { readableProfile } from '../utils/displayText';

const readableResponse = response => ({ ...response, data: readableProfile(response.data) });
export const getMyProfile = () => cachedRequest('profile', () => api.get('/users/me')).then(readableResponse);
export const updateMyProfile = (data) => api.put('/users/me', data);
export const getMyStores = (userId) => cachedRequest(`stores:${userId}`, () => api.get(`/users/${userId}/stores`)).then(readableResponse);
export const updateMyAvatar = (avatarId) => api.put('/users/me/avatar', { avatarId });

