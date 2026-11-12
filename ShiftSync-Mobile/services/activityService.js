import { colors as uiColors } from '../theme/koreanPalette';
import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { cachedRequest } from './offlineCache';

export const ACTIVITY_FILTERS = [
  { value: 'all', label: 'Tất cả', icon: 'layers-outline', color: uiColors.primaryStrong, background: uiColors.peach },
  { value: 'attendance', label: 'Chấm công', icon: 'time-outline', color: uiColors.successText, background: uiColors.mint },
  { value: 'request', label: 'Yêu cầu', icon: 'document-text-outline', color: '#796887', background: uiColors.lavender },
  { value: 'shift', label: 'Nhận ca', icon: 'calendar-outline', color: uiColors.infoText, background: uiColors.sky },
];
export function activityKind(type = '') {
  if (type.startsWith('ATTENDANCE_')) return 'attendance';
  if (type.startsWith('SHIFT_CLAIM') || type === 'SHIFT_ASSIGNED') return 'shift';
  if (/^(REQUEST_|SWAP_|LEAVE_|ADJUSTMENT_|INCIDENT_)/.test(type)) return 'request';
  return 'all';
}
export function mergeActivities(current, incoming) {
  const byId = new Map();
  [...current, ...incoming].forEach((event) => {
    if (event?.id && event.occurredAt && Number.isFinite(Date.parse(event.occurredAt))) byId.set(String(event.id), event);
  });
  return [...byId.values()].sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt) || String(b.id).localeCompare(String(a.id)));
}
export function activityDay(value) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(value));
  const part = (name) => parts.find((item) => item.type === name)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function groupActivities(items, filter = 'all') {
  const groups = new Map();
  mergeActivities([], items).filter((item) => filter === 'all' || activityKind(item.type) === filter).forEach((item) => {
    const day = activityDay(item.occurredAt);
    if (!groups.has(day)) groups.set(day, { title: day, data: [] });
    groups.get(day).data.push(item);
  });
  return [...groups.values()];
}
async function verifyCacheOwner(ownerEmail) {
  if (ownerEmail) {
    const values = new Map(await AsyncStorage.multiGet(['userEmail', 'accessToken']));
    if (!values.get('accessToken') || values.get('userEmail')?.trim().toLowerCase() !== ownerEmail.trim().toLowerCase()) {
      throw Object.assign(new Error('Phiên đăng nhập đã thay đổi.'), { code: 'SESSION_CHANGED' });
    }
  }
}
export async function getMyActivity(storeId, { before, limit = 30, ownerEmail } = {}) {
  await verifyCacheOwner(ownerEmail);
  const size = Math.max(1, Math.min(50, Math.trunc(Number(limit) || 30)));
  const request = async () => {
    const response = await api.get('/users/me/activity', {
      ...(ownerEmail ? { expectedSessionEmail: ownerEmail.trim().toLowerCase() } : {}),
      params: { storeId, limit: size, ...(before ? { before } : {}) },
    });
    return { ...response, data: { items: mergeActivities([], Array.isArray(response.data?.items) ? response.data.items : []).slice(0, size), nextCursor: response.data?.nextCursor || null } };
  };
  // Only the first page is cached. Pagination never creates an unbounded trail of account data.
  const response = await (before ? request() : cachedRequest(`activity:${storeId}:latest:${size}`, request));
  await verifyCacheOwner(ownerEmail);
  return response;
}
