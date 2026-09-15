import api from './api';

export const getShiftsForStore = (storeId, status) => {
  const q = status ? `?status=${status}` : '';
  return api.get(`/stores/${storeId}/shifts${q}`);
};

// ✅ Endpoint đúng: /assignments (không phải /registrations)
export const getShiftAssignments = (storeId, shiftId) =>
  api.get(`/stores/${storeId}/shifts/${shiftId}/assignments`);

export const assignStaffToShift = (storeId, shiftId, staffId) =>
  api.post(`/stores/${storeId}/shifts/${shiftId}/assignments`, { staffId });

export const unassignStaffFromShift = (storeId, shiftId, staffId) =>
  api.delete(`/stores/${storeId}/shifts/${shiftId}/assignments/${staffId}`);

export const createShift = (storeId, data) =>
  api.post(`/stores/${storeId}/shifts`, data);

export const updateShift = (storeId, shiftId, data) =>
  api.put(`/stores/${storeId}/shifts/${shiftId}`, data);

export const publishShifts = (storeId, startDate, endDate) =>
  api.post(`/stores/${storeId}/shifts/publish`, { startDate, endDate });

export const deleteShift = (storeId, shiftId) =>
  api.delete(`/stores/${storeId}/shifts/${shiftId}`);

// ✅ Marketplace: nhân viên nhận ca trống
export const claimOpenShift = (storeId, shiftId) =>
  api.post(`/stores/${storeId}/marketplace/shifts/${shiftId}/claim`);