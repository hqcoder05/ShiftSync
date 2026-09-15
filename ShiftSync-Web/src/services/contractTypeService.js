import api from './api';

/**
 * Lấy danh sách loại hợp đồng (contract types) của một chi nhánh.
 * Backend: GET /api/stores/{storeId}/contract-types
 */
export const getContractTypes = (storeId) =>
  api.get(`/stores/${storeId}/contract-types`);

/**
 * Tạo loại hợp đồng mới cho một chi nhánh.
 * Backend: POST /api/stores/{storeId}/contract-types
 */
export const createContractType = (storeId, data) =>
  api.post(`/stores/${storeId}/contract-types`, data);
