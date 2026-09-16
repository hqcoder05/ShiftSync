import api from './api';

export const getContractTypes = (storeId) =>
  api.get(`/stores/${storeId}/contract-types`);

export const createContractType = (storeId, data) =>
  api.post(`/stores/${storeId}/contract-types`, data);

export const updateContractType = (storeId, contractTypeId, data) =>
  api.put(`/stores/${storeId}/contract-types/${contractTypeId}`, data);

export const deleteContractType = (storeId, contractTypeId) =>
  api.delete(`/stores/${storeId}/contract-types/${contractTypeId}`);
