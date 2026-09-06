import api from './api';

export const getMyAttendance = () => api.get('/attendance/me');
export const getMyShifts = () => api.get('/users/me/shifts');

export const submitSelfieAttendance = ({ shiftId, latitude, longitude, photoUri, forcedStatus }) => {
  const data = new FormData();
  data.append('shiftId', shiftId);
  data.append('latitude', String(latitude));
  data.append('longitude', String(longitude));
  if (forcedStatus) {
    data.append('forcedStatus', forcedStatus);
  }
  if (photoUri) {
    data.append('photo', { uri: photoUri, name: 'attendance-selfie.jpg', type: 'image/jpeg' });
  }
  return api.post('/attendance/selfie', data);
};
