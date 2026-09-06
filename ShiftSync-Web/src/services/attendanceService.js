import api from './api';

export const getStoreAttendance = (storeId, from, to) =>
  api.get(`/stores/${storeId}/attendance`, { params: { from, to } });

export const updateAttendanceRecord = (storeId, attendanceId, data) =>
  api.put(`/stores/${storeId}/attendance/${attendanceId}`, data);
