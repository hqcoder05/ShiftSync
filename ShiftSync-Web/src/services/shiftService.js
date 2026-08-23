import api from './api';

export const getShiftsForStore = (storeId, status) => {
  const q = status ? `?status=${status}` : '';
  return api.get(`/stores/${storeId}/shifts${q}`);
};

export const getShiftRegistrations = (storeId, shiftId) =>
  api.get(`/stores/${storeId}/shifts/${shiftId}/registrations`);

export const createShift = (storeId, data) =>
  api.post(`/stores/${storeId}/shifts`, data);

export const updateShift = (storeId, shiftId, data) =>
  api.put(`/stores/${storeId}/shifts/${shiftId}`, data);

export const publishShifts = (storeId, startDate, endDate) =>
  api.post(`/stores/${storeId}/shifts/publish`, { startDate, endDate });

export const deleteShift = (storeId, shiftId) =>
  api.delete(`/stores/${storeId}/shifts/${shiftId}`);