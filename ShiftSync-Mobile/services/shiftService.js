import api from './api';
import { cachedRequest } from './offlineCache';
import { syncShiftReminders } from './localReminders';

export const getShiftsForStore = (storeId, status) => {
  const q = status ? `?status=${status}` : '';
  return api.get(`/stores/${storeId}/shifts${q}`);
};

export const getMyShifts = (config = {}) => {
  return cachedRequest('my-shifts', () => api.get('/users/me/shifts', config)).then((response) => {
    syncShiftReminders(response.data).catch(() => {});
    return response;
  });
};

export const getShiftAssignments = (storeId, shiftId) => {
  return api.get(`/stores/${storeId}/shifts/${shiftId}/assignments`);
};

export const assignStaffToShift = (storeId, shiftId, staffId) => {
  return api.post(`/stores/${storeId}/shifts/${shiftId}/assignments`, { staffId });
};

export const removeStaffFromShift = (storeId, shiftId, staffId) => {
  return api.delete(`/stores/${storeId}/shifts/${shiftId}/assignments/${staffId}`);
};

export const getMyStoreShifts = (storeId) => {
  return api.get(`/stores/${storeId}/shifts/my`);
};

// Aliases for backward compatibility
export const getShiftRegistrations = getShiftAssignments;
export const registerShift = (storeId, shiftId, staffId) => assignStaffToShift(storeId, shiftId, staffId);
