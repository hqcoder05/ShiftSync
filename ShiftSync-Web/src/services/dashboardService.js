import api from './api';

/**
 * Lấy các chỉ số KPI tổng quan của Dashboard cho một chi nhánh.
 * Backend: GET /api/stores/{storeId}/dashboard?startDate=...&endDate=...
 */
export const getStoreDashboardMetrics = (storeId, startDate, endDate) => {
  const params = {};
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;
  return api.get(`/stores/${storeId}/dashboard`, { params });
};

/**
 * Lấy dữ liệu biểu đồ cho Dashboard của một chi nhánh.
 * Backend: GET /api/stores/{storeId}/dashboard/chart?startDate=...&endDate=...
 */
export const getStoreDashboardChart = (storeId, startDate, endDate) => {
  const params = {};
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;
  return api.get(`/stores/${storeId}/dashboard/chart`, { params });
};
