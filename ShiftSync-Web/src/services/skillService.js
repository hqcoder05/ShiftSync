import api from './api';

export const getAllSkills = (storeId, config = {}) => {
  if (storeId) {
    return api.get(`/skills?storeId=${storeId}`, config);
  }
  return api.get('/skills', config);
};
export const getSkillsByStore = (storeId, config = {}) => api.get(`/stores/${storeId}/skills`, config);
export const createSkill = (storeId, data) => api.post(`/stores/${storeId}/skills`, data); // { name, description }
export const updateSkill = (storeId, skillId, data) => api.put(`/stores/${storeId}/skills/${skillId}`, data);
export const deleteSkill = (storeId, skillId) => api.delete(`/stores/${storeId}/skills/${skillId}`);
export const getStaffSkills = (userId, config = {}) => api.get(`/users/${userId}/skills`, config);
export const updateStaffSkills = (userId, skillIds) => api.put(`/users/${userId}/skills`, skillIds);
