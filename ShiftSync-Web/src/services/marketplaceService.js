import api from './api';

export const getMarketplaceShifts = (storeId) =>
  api.get(`/stores/${storeId}/marketplace/shifts`);

export const publishShiftToMarketplace = (storeId, shiftId) =>
  api.post(`/stores/${storeId}/marketplace/shifts/${shiftId}/publish`);

export const unpublishShiftFromMarketplace = (storeId, shiftId) =>
  api.post(`/stores/${storeId}/marketplace/shifts/${shiftId}/unpublish`);

export const claimMarketplaceShift = (storeId, shiftId) =>
  api.post(`/stores/${storeId}/marketplace/shifts/${shiftId}/claim`);
