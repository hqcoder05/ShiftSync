import api from './api';

export const assignStaffToStore = (storeId, data) =>
  api.post(`/stores/${storeId}/staff`, data);

export const getStaffByStore = (storeId, page = 0, size = 20) =>
  api.get(`/stores/${storeId}/staff?page=${page}&size=${size}`);

export const removeStaffFromStore = (storeId, staffId) =>
  api.delete(`/stores/${storeId}/staff/${staffId}`);