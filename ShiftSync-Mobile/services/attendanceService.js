import { Platform } from 'react-native';
import api from './api';
import { cachedRequest } from './offlineCache';

export const getMyAttendance = () => cachedRequest('attendance', () => api.get('/attendance/me'));
export const getMyAttendanceHistory = () => api.get('/attendance/me');
export const getMyShifts = () => api.get('/users/me/shifts');

export const submitSelfieAttendance = async ({ shiftId, latitude, longitude, photoUri, action, capturedAt, ownerEmail }) => {
  if (!photoUri) throw new Error('Cần ảnh chụp thật để chấm công.');
  // Never send an offline event to a legacy server that can toggle check-in into check-out on retry.
  if (action || capturedAt) {
    let capability;
    try {
      capability = (await api.get('/attendance/capabilities', { expectedSessionEmail: ownerEmail })).data;
    } catch (error) {
      if (![404, 405].includes(error.response?.status)) throw error;
    }
    if (!(Number(capability?.selfieProtocolVersion) >= 2 && capability?.explicitActions === true && capability?.originalCaptureTime === true)) {
      throw Object.assign(new Error('Ảnh đã lưu an toàn. Máy chủ cần cập nhật để nhận chấm công offline đúng giờ chụp và đúng thao tác.'), { code: 'ATTENDANCE_PROTOCOL_UNSUPPORTED' });
    }
  }
  const data = new FormData();
  data.append('shiftId', shiftId);
  data.append('latitude', String(latitude));
  data.append('longitude', String(longitude));
  if (action) data.append('action', action);
  if (capturedAt) data.append('capturedAt', capturedAt);
  
  if (Platform.OS === 'web') {
    if (photoUri && (photoUri.startsWith('blob:') || photoUri.startsWith('data:'))) {
      const res = await fetch(photoUri);
      const blob = await res.blob();
      data.append('photo', blob, 'attendance-selfie.jpg');
    } else {
      throw new Error('Ảnh chụp không còn khả dụng. Vui lòng chụp lại.');
    }
  } else {
    // Native (iOS & Android)
    if (photoUri) {
      data.append('photo', {
        uri: photoUri,
        name: 'attendance-selfie.jpg',
        type: 'image/jpeg',
      });
    }
  }

  return api.post('/attendance/selfie', data, { expectedSessionEmail: ownerEmail });
};

export const scanAttendance = (qrData) =>
  api.post('/attendance/scan', typeof qrData === 'string' ? { qrCode: qrData } : qrData);

export const getAttendanceQrCode = (storeId, shiftId) =>
  api.get(`/stores/${storeId}/shifts/${shiftId}/attendance/qr`);
