import api from './api';

export const getShiftsForStore = (storeId, status) => {
  const q = status ? `?status=${status}` : '';
  return api.get(`/stores/${storeId}/shifts${q}`);
};

export const createShift = (storeId, data) =>
  api.post(`/stores/${storeId}/shifts`, data);

export const updateShift = (storeId, shiftId, data) =>
  api.put(`/stores/${storeId}/shifts/${shiftId}`, data);

export const deleteShift = (storeId, shiftId) =>
  api.delete(`/stores/${storeId}/shifts/${shiftId}`);

export const publishShifts = (storeId, startDate, endDate) =>
  api.post(`/stores/${storeId}/shifts/publish`, { startDate, endDate });

export const autoScheduleShifts = (storeId, startDateOrPayload, maybeEndDate) => {
  const payload =
    typeof startDateOrPayload === 'string'
      ? { startDate: startDateOrPayload, endDate: maybeEndDate }
      : startDateOrPayload;
  return api.post(`/stores/${storeId}/shifts/auto-schedule`, payload, {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const updateShiftRequirements = (storeId, shiftId, data) =>
  api.put(`/stores/${storeId}/shifts/${shiftId}/requirements`, data);

export const saveBulkDemandPlanning = (storeId, payload) =>
  api.post(`/stores/${storeId}/shifts/demand-planning`, payload);

export const getMyStoreShifts = (storeId) =>
  api.get(`/stores/${storeId}/shifts/my`);

// ── Shift Assignment API (Fixes /registrations -> /assignments) ──
export const getShiftAssignments = (storeId, shiftId) =>
  api.get(`/stores/${storeId}/shifts/${shiftId}/assignments`);

export const assignStaffToShift = (storeId, shiftId, staffId, zoneId, force = false) => {
  const payload = { staffId };
  if (zoneId) payload.zoneId = zoneId;
  if (force) payload.force = true;
  return api.post(`/stores/${storeId}/shifts/${shiftId}/assignments`, payload);
};

export const removeStaffFromShift = (storeId, shiftId, staffId) =>
  api.delete(`/stores/${storeId}/shifts/${shiftId}/assignments/${staffId}`);

export const getEligibleStaffForShift = (storeId, shiftId) =>
  api.get(`/stores/${storeId}/shifts/${shiftId}/eligible-staff`);

// Backward compatibility alias
export const getShiftRegistrations = getShiftAssignments;