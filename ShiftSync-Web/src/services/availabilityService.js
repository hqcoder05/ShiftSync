import api from './api';

export const getMyAvailability = () => api.get('/availability');

export const getStaffAvailability = (userId) => api.get(`/availability/users/${userId}`);

export const createAvailability = (data) => api.post('/availability', data);

export const updateAvailability = (id, data) => api.put(`/availability/${id}`, data);

export const deleteAvailability = (id) => api.delete(`/availability/${id}`);
