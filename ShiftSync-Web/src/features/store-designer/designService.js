import api from '../../services/api';
export const getStoreDesign = (storeId,signal) => api.get(`/stores/${storeId}/design`,{signal});
export const saveStoreDesign = (storeId,baseRevision,document) => api.put(`/stores/${storeId}/design`,{baseRevision,document});
export const getDesignVersions = storeId => api.get(`/stores/${storeId}/design/versions`);
export const getDesignVersion = (storeId,revision) => api.get(`/stores/${storeId}/design/versions/${revision}`);
