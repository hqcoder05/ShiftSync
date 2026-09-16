import api from './api';

export const getStoreDashboardMetrics = (storeId, startDate, endDate) => {
  const params = {};
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;
  return api.get(`/stores/${storeId}/dashboard`, { params });
};

export const getStoreDashboardChart = (storeId, startDate, endDate) => {
  const params = {};
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;
  return api.get(`/stores/${storeId}/dashboard/chart`, { params });
};
