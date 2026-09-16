import api from './api';

export const createAdjustmentRequest = (storeId, data) =>
  api.post(`/stores/${storeId}/attendance-adjustments`, data);

export const getMyAdjustmentRequests = (storeId) =>
  api.get(`/stores/${storeId}/attendance-adjustments/me`);
