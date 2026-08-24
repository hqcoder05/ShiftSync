import api from './api';

export const getShiftsForStore = (storeId, status) => {
  const q = status ? `?status=${status}` : '';
  return api.get(`/stores/${storeId}/shifts${q}`);
};

export const getMyShifts = () => {
  return api.get('/users/me/shifts');
};

export const getShiftRegistrations = (storeId, shiftId) => {
  return api.get(`/stores/${storeId}/shifts/${shiftId}/registrations`);
};

export const registerShift = (storeId, shiftId) => {
  return api.post(`/stores/${storeId}/shifts/${shiftId}/registrations`);
};
