import api from './api';

export const createSwapRequest = (data) =>
  api.post('/users/me/swaps', data);

export const getMySwapRequests = () =>
  api.get('/users/me/swaps');

export const respondToSwapRequest = (requestId, data) =>
  api.put(`/users/me/swaps/${requestId}/respond`, data);

export const getStoreSwapRequests = (storeId, status) => {
  const q = status ? `?status=${status}` : '';
  return api.get(`/stores/${storeId}/swaps${q}`);
};

export const approveSwapRequest = (requestId) =>
  api.post(`/swaps/${requestId}/approve`);

export const rejectSwapRequest = (requestId) =>
  api.post(`/swaps/${requestId}/reject`);
