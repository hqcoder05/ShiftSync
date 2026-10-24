import api from './api';

export const getStoreAttendance = (storeId, from, to) =>
  api.get(`/stores/${storeId}/attendance`, { params: { from, to } });

export const updateAttendanceRecord = (storeId, attendanceId, data) =>
  api.put(`/stores/${storeId}/attendance/${attendanceId}`, data);

export const deleteAttendanceRecord = (storeId, attendanceId) =>
  api.delete(`/stores/${storeId}/attendance/${attendanceId}`);

export const submitSelfieAttendance = (formData) =>
  api.post('/attendance/selfie', formData);

export const scanAttendance = (data) =>
  api.post('/attendance/scan', data);

export const getAttendanceQrCode = (storeId, shiftId) =>
  api.get(`/stores/${storeId}/shifts/${shiftId}/attendance/qr`);

export const getMyAttendance = () =>
  api.get('/attendance/me');

export const getAttendancePhoto = (attendanceId, kind, { storeId, mine = false } = {}) => {
  const path = mine
    ? `/attendance/me/${attendanceId}/photos/${kind}`
    : `/stores/${storeId}/attendance/${attendanceId}/photos/${kind}`;
  return api.get(path, { responseType: 'blob' });
};
