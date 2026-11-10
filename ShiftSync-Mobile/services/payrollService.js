import api from './api';
import { cachedRequest } from './offlineCache';
export const getMyPayslips = () => cachedRequest('payslips', () => api.get('/users/me/payslips'));
