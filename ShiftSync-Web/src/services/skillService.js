import api from './api';

export const getSkillsByStore = (storeId) => api.get(`/stores/${storeId}/skills`);
export const createSkill = (storeId, data) => api.post(`/stores/${storeId}/skills`, data); // { name, description }
export const updateSkill = (storeId, skillId, data) => api.put(`/stores/${storeId}/skills/${skillId}`, data);
export const deleteSkill = (storeId, skillId) => api.delete(`/stores/${storeId}/skills/${skillId}`);