import api from './api';
export const getMyPayslips = () => api.get('/users/me/payslips');
