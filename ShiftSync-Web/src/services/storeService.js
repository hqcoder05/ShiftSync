import api from './api';

export const getAllStores = (page = 0, size = 100, search = '') => {
  const s = search ? `&search=${encodeURIComponent(search)}` : '';
  return api.get(`/stores?page=${page}&size=${size}${s}`);
};
export const getStoreById = (id) => api.get(`/stores/${id}`);
export const createStore = (data) => api.post('/stores', data);
export const updateStore = (id, data) => api.patch(`/stores/${id}`, data);
export const deleteStore = (id) => api.delete(`/stores/${id}`);
export const getStoreDirectory = () => api.get('/stores/directory');