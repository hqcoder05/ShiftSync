import api from './api';

export const getAllSkills = (storeId) => {
  if (storeId) {
    return api.get(`/skills?storeId=${storeId}`);
  }
  return api.get('/skills');
};
export const getSkillsByStore = (storeId) => api.get(`/stores/${storeId}/skills`);
export const createSkill = (storeId, data) => api.post(`/stores/${storeId}/skills`, data); // { name, description }
export const updateSkill = (storeId, skillId, data) => api.put(`/stores/${storeId}/skills/${skillId}`, data);
export const deleteSkill = (storeId, skillId) => api.delete(`/stores/${storeId}/skills/${skillId}`);
export const getStaffSkills = (userId) => api.get(`/users/${userId}/skills`);
export const updateStaffSkills = (userId, skillIds) => api.put(`/users/${userId}/skills`, skillIds);
