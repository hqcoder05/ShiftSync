import api from './api';

export const createAdjustmentRequest = (storeId, data) =>
  api.post(`/stores/${storeId}/attendance-adjustments`, data);

export const getMyAdjustmentRequests = (storeId) =>
  api.get(`/stores/${storeId}/attendance-adjustments/me`);

export const getStoreAdjustmentRequests = (storeId, status) => {
  const q = status ? `?status=${status}` : '';
  return api.get(`/stores/${storeId}/attendance-adjustments${q}`);
};

export const approveAdjustmentRequest = (storeId, requestId, data) =>
  api.put(`/stores/${storeId}/attendance-adjustments/${requestId}/approve`, data);

export const rejectAdjustmentRequest = (storeId, requestId, data) =>
  api.put(`/stores/${storeId}/attendance-adjustments/${requestId}/reject`, data);
