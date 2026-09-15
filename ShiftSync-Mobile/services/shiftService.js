import api from './api';

export const getShiftsForStore = (storeId, status) => {
  const q = status ? `?status=${status}` : '';
  return api.get(`/stores/${storeId}/shifts${q}`);
};

export const getMyShifts = () => {
  return api.get('/users/me/shifts');
};

// ✅ Endpoint đúng: /assignments (đã xóa /registrations không tồn tại)
export const getShiftAssignments = (storeId, shiftId) =>
  api.get(`/stores/${storeId}/shifts/${shiftId}/assignments`);

// ✅ Marketplace: nhân viên nhận ca trống
export const claimOpenShift = (storeId, shiftId) =>
  api.post(`/stores/${storeId}/marketplace/shifts/${shiftId}/claim`);
