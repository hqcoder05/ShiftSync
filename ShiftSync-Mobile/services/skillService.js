import api from './api';

export const getSkillsByStore = (storeId) => api.get(`/stores/${storeId}/skills`);
