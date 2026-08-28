import api from './api';

export const getStoreAttendance = (storeId, from, to) =>
  api.get(`/stores/${storeId}/attendance`, { params: { from, to } });
