import api from './api';
import { getAvailabilityWeekStart, shiftAvailabilityWeek } from '../utils/availabilityDeadline';

export function validHistoryDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}
export function historyWeekStart(value, now = new Date()) {
  return getAvailabilityWeekStart(validHistoryDate(value) ? new Date(`${value}T12:00:00+07:00`) : now, 0);
}
export function historyWeekRange(weekStart) {
  const startDate = historyWeekStart(weekStart);
  const sunday = new Date(`${startDate}T00:00:00Z`);
  sunday.setUTCDate(sunday.getUTCDate() + 6);
  return { startDate, endDate: sunday.toISOString().slice(0, 10) };
}
export const moveHistoryWeek = (weekStart, offset) => shiftAvailabilityWeek(historyWeekStart(weekStart), offset);
const sameValues = (a, b) => JSON.stringify((Array.isArray(a) ? [...a] : []).map(String).sort()) === JSON.stringify((Array.isArray(b) ? [...b] : []).map(String).sort());
export function historyChanges(entry) {
  if (!entry.before) return ['Thêm ca'];
  if (!entry.after) return ['Xóa ca'];
  const changes = [];
  if (entry.before.shiftDate !== entry.after.shiftDate) changes.push('Ngày làm');
  if (entry.before.startTime !== entry.after.startTime || entry.before.endTime !== entry.after.endTime) changes.push('Giờ làm');
  if (entry.before.status !== entry.after.status) changes.push('Trạng thái');
  if (!sameValues(entry.before.zones, entry.after.zones) || !sameValues(entry.before.zoneIds, entry.after.zoneIds)) changes.push('Khu vực');
  return changes.length ? changes : ['Cập nhật ca'];
}
export async function getScheduleHistory(storeId, { startDate, endDate, ownerEmail } = {}) {
  if (!storeId || !validHistoryDate(startDate) || !validHistoryDate(endDate)) throw new Error('Chi nhánh và khoảng ngày hợp lệ là bắt buộc.');
  const days = (Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / 86400000 + 1;
  if (days < 1 || days > 31) throw new Error('Khoảng lịch sử cần từ 1 đến 31 ngày.');
  const response = await api.get(`/stores/${encodeURIComponent(storeId)}/schedule-history`, {
    ...(ownerEmail ? { expectedSessionEmail: ownerEmail.trim().toLowerCase() } : {}), params: { startDate, endDate },
  });
  return { ...response, data: (Array.isArray(response.data) ? response.data : [])
    .filter((item) => item.id && Number.isFinite(Date.parse(item.changedAt)))
    .sort((a, b) => Date.parse(b.changedAt) - Date.parse(a.changedAt) || String(b.id).localeCompare(String(a.id))) };
}
