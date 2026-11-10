import api from './api';

const base = (storeId, type, entityId) => `/stores/${storeId}/payroll/compensation-history/${type}/${entityId}`;

export const getCompensationHistory = (storeId, type, entityId) => api.get(base(storeId, type, entityId));
export const reconcileCompensationHistory = (storeId, type, entityId, data) => api.post(`${base(storeId, type, entityId)}/reconciliations`, data);
export const reconcileUntrackedCompensation = (storeId, type, entityId, data) => api.post(`${base(storeId, type, entityId)}/untracked-reconciliations`, data);
