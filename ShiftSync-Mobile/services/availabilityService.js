import api from './api';

export const getMyAvailability = () => api.get('/availability');

export const getMyWeeklyAvailability = (weekStart) =>
  api.get(`/availability/weeks/${weekStart}`);

export const saveMyWeeklyAvailability = (weekStart, revision, slots) =>
  api.put(`/availability/weeks/${weekStart}`, {
    revision,
    slots: slots.map(({ dayOfWeek, startTime, endTime }) => ({ dayOfWeek, startTime, endTime })),
  });

export const createAvailability = (dayOfWeek, startTime, endTime) =>
  api.post('/availability', { dayOfWeek, startTime, endTime });

export const updateAvailability = (id, dayOfWeek, startTime, endTime) =>
  api.put(`/availability/${id}`, { dayOfWeek, startTime, endTime });

export const deleteAvailability = (id) => api.delete(`/availability/${id}`);
