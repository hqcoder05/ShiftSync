import api from './api';

export const createLeaveRequest = (storeId, data) =>
  api.post(`/stores/${storeId}/leave-requests`, data);

export const getStoreLeaveRequests = (storeId, status) => {
  const q = status ? `?status=${status}` : '';
  return api.get(`/stores/${storeId}/leave-requests${q}`);
};

export const getMyLeaveRequests = (storeId) =>
  api.get(`/stores/${storeId}/leave-requests/my`);

export const cancelLeaveRequest = (storeId, id) =>
  api.delete(`/stores/${storeId}/leave-requests/${id}`);

export const approveLeaveRequest = (storeId, id) =>
  api.put(`/stores/${storeId}/leave-requests/${id}/approve`);

export const rejectLeaveRequest = (storeId, id, data) =>
  api.put(`/stores/${storeId}/leave-requests/${id}/reject`, data);

export const updateLeaveReason = (storeId, id, reason) =>
  api.put(`/stores/${storeId}/leave-requests/${id}/reason`, { reason });

export const getLeaveImpact = (storeId, id) =>
  api.get(`/stores/${storeId}/leave-requests/${id}/impact`);
