import api from './api';

export const getShiftTemplates = (storeId, config) =>
  api.get(`/stores/${storeId}/shift-templates`, config);

export const createShiftTemplate = (storeId, data, config) =>
  api.post(`/stores/${storeId}/shift-templates`, data, config);

export const updateShiftTemplate = (storeId, templateId, data, config) =>
  api.put(`/stores/${storeId}/shift-templates/${templateId}`, data, config);

export const deleteShiftTemplate = (storeId, templateId, config) =>
  api.delete(`/stores/${storeId}/shift-templates/${templateId}`, config);
