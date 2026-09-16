import api from './api';

export const getShiftTemplates = (storeId) =>
  api.get(`/stores/${storeId}/shift-templates`);

export const createShiftTemplate = (storeId, data) =>
  api.post(`/stores/${storeId}/shift-templates`, data);

export const updateShiftTemplate = (storeId, templateId, data) =>
  api.put(`/stores/${storeId}/shift-templates/${templateId}`, data);

export const deleteShiftTemplate = (storeId, templateId) =>
  api.delete(`/stores/${storeId}/shift-templates/${templateId}`);
