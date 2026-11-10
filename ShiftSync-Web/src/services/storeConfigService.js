import api from './api';

export const getStoreConfiguration = (storeId) =>
  api.get(`/stores/${storeId}/configuration`);

export const updateStoreConfiguration = (storeId, data) =>
  api.put(`/stores/${storeId}/configuration`, data);

export const getSchedulerConfig = (storeId) =>
  api.get(`/stores/${storeId}/scheduler-config`);

export const updateSchedulerConfig = (storeId, data) =>
  api.put(`/stores/${storeId}/scheduler-config`, data);
