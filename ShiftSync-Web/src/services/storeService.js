import api from './api';

export const getAllStores = (page = 0, size = 100) =>
  api.get(`/stores?page=${page}&size=${size}`);
export const createStore = (data) => api.post('/stores', data);
export const updateStore = (id, data) => api.put(`/stores/${id}`, data);
export const deleteStore = (id) => api.delete(`/stores/${id}`);