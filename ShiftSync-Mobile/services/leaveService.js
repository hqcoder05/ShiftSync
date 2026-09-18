import api from './api';

export const createLeaveRequest = (storeId, data) =>
  api.post(`/stores/${storeId}/leave-requests`, data);

export const getMyLeaveRequests = (storeId) =>
  api.get(`/stores/${storeId}/leave-requests/my`);

export const cancelLeaveRequest = (storeId, id) =>
  api.delete(`/stores/${storeId}/leave-requests/${id}`);

export const getLeaveTypes = (storeId) =>
  api.get(`/stores/${storeId}/leave-requests/types`);

export const getMyLeaveBalance = (storeId, year) => {
  const q = year ? `?year=${year}` : '';
  return api.get(`/stores/${storeId}/leave-requests/balances/my${q}`);
};

