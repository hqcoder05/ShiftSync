import api from './api';

export const getMyAvailability = () => api.get('/availability');

export const createAvailability = (dayOfWeek, startTime, endTime) =>
  api.post('/availability', { dayOfWeek, startTime, endTime });

export const deleteAvailability = (id) => api.delete(`/availability/${id}`);