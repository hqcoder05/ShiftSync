import api from './api';

export const getPayrollPeriods = (storeId) => api.get(`/stores/${storeId}/payroll`);
export const getPayslips = (storeId, periodId) => api.get(`/stores/${storeId}/payroll/${periodId}/payslips`);
export const generatePayroll = (storeId, payload) => api.post(`/stores/${storeId}/payroll/generate`, payload);
export const updatePayrollStatus = (storeId, periodId, status) => api.put(`/stores/${storeId}/payroll/${periodId}/status`, { status });
export const exportPayrollExcel = (storeId, periodId) => api.get(`/stores/${storeId}/payroll/${periodId}/export/excel`, { responseType: 'blob' });
export const getMyPayslips = () => api.get('/users/me/payslips');
export const downloadPayslipPdf = (payrollId) => api.get(`/users/me/payslips/${payrollId}/pdf`, { responseType: 'blob' });
