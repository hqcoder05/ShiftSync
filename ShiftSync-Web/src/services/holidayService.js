import api from './api';

export const getHolidays = () =>
  api.get('/holidays');

export const createHoliday = (data) =>
  api.post('/holidays', data);

export const updateHoliday = (id, data) =>
  api.put(`/holidays/${id}`, data);

export const deleteHoliday = (id) =>
  api.delete(`/holidays/${id}`);
