import api from './api';

/**
 * Headcount Quota Service — 100% API Driven
 * No hardcoded business values. Communicates directly with backend REST API.
 */

// 1. Get list of branches for dropdown
export const getBranches = async () => {
  const res = await api.get('/branches');
  return res.data;
};

// 2. Get operational positions (excluding Leader/Manager)
export const getPositions = async (branchId) => {
  const res = await api.get('/positions', { params: { branchId } });
  return res.data;
};

// 3. Get daily headcount quotas
export const getDailyQuotas = async (branchId, date) => {
  const res = await api.get('/headcount-quotas', { params: { branchId, date } });
  return res.data;
};

// 4. Get 7-day weekly matrix headcount quotas
export const getWeeklyQuotas = async (branchId, weekStart) => {
  const res = await api.get('/headcount-quotas/weekly', { params: { branchId, weekStart } });
  return res.data;
};

// 5. Update quota count (+/-) or Min/Target/Max inline (PUT)
export const updateQuota = async (quotaId, updateData) => {
  const res = await api.put(`/headcount-quotas/${quotaId}`, updateData);
  return res.data;
};

// 6. Auto-fill quotas according to standard norms (POST)
export const autoFillQuotas = async (payload) => {
  const res = await api.post('/headcount-quotas/auto-fill', payload);
  return res.data;
};

// 7. Apply quotas directly to Scheduler (POST)
export const applyToScheduler = async (payload) => {
  const res = await api.post('/headcount-quotas/apply-to-scheduler', payload);
  return res.data;
};

// 8. Get summary metrics (hours, costs, SLA, budget)
export const getQuotaSummary = async (branchId, date, weekStart) => {
  const res = await api.get('/headcount-quotas/summary', { params: { branchId, date, weekStart } });
  return res.data;
};

// 9. Update store monthly salary budget
export const updateMonthlyBudget = async (branchId, monthlyBudget) => {
  const res = await api.put('/headcount-quotas/budget', { branchId, monthlyBudget });
  return res.data;
};

export default {
  getBranches,
  getPositions,
  getDailyQuotas,
  getWeeklyQuotas,
  updateQuota,
  updateMonthlyBudget,
  autoFillQuotas,
  applyToScheduler,
  getQuotaSummary,
};
