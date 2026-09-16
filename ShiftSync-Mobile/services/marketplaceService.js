import api from './api';

export const getActiveShifts = (storeId) =>
  api.get(`/stores/${storeId}/marketplace/shifts`);

export const claimShift = (storeId, shiftId) =>
  api.post(`/stores/${storeId}/marketplace/shifts/${shiftId}/claim`);
