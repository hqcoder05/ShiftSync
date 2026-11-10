import api from './api';
import { cachedRequest } from './offlineCache';
export const getStoreDetails = (id) => cachedRequest(`store:${id}`, () => api.get(`/stores/${id}`));
export const getStoreConfiguration = (id) => cachedRequest(`store-config:${id}`, () => api.get(`/stores/${id}/configuration`));
