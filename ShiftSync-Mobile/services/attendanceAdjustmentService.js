import api from './api';

export const createAttendanceAdjustment = (storeId, data) =>
  api.post(`/stores/${storeId}/attendance-adjustments`, data);

export const getMyAttendanceAdjustments = (storeId) =>
  api.get(`/stores/${storeId}/attendance-adjustments/me`);
