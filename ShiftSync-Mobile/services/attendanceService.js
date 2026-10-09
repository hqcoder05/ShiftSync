import { Platform } from 'react-native';
import api from './api';

export const getMyAttendance = () => api.get('/attendance/me');
export const getMyAttendanceHistory = () => api.get('/attendance/me');
export const getMyShifts = () => api.get('/users/me/shifts');

export const submitSelfieAttendance = async ({ shiftId, latitude, longitude, photoUri }) => {
  const data = new FormData();
  data.append('shiftId', shiftId);
  data.append('latitude', String(latitude));
  data.append('longitude', String(longitude));
  
  if (Platform.OS === 'web') {
    if (photoUri && (photoUri.startsWith('blob:') || photoUri.startsWith('data:'))) {
      try {
        const res = await fetch(photoUri);
        const blob = await res.blob();
        data.append('photo', blob, 'attendance-selfie.jpg');
      } catch (_) {
        const blob = new Blob(['shiftsync-selfie-mock'], { type: 'image/jpeg' });
        data.append('photo', blob, 'attendance-selfie.jpg');
      }
    } else {
      const blob = new Blob(['shiftsync-selfie-mock'], { type: 'image/jpeg' });
      data.append('photo', blob, 'attendance-selfie.jpg');
    }
  } else {
    // Native (iOS & Android)
    if (photoUri) {
      data.append('photo', {
        uri: photoUri,
        name: 'attendance-selfie.jpg',
        type: 'image/jpeg',
      });
    } else {
      data.append('photo', {
        uri: 'file:///placeholder-selfie.jpg',
        name: 'attendance-selfie.jpg',
        type: 'image/jpeg',
      });
    }
  }

  return api.post('/attendance/selfie', data);
};

export const scanAttendance = (qrData) =>
  api.post('/attendance/scan', typeof qrData === 'string' ? { qrCode: qrData } : qrData);

export const getAttendanceQrCode = (storeId, shiftId) =>
  api.get(`/stores/${storeId}/shifts/${shiftId}/attendance/qr`);
