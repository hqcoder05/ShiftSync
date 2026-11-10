import { colors as uiColors } from '../theme/koreanPalette';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';
import { cachedRequest } from './offlineCache';

export const INCIDENT_CATEGORIES = [
  { value: 'EQUIPMENT', label: 'Thiết bị', icon: 'construct-outline' },
  { value: 'SAFETY', label: 'An toàn', icon: 'shield-checkmark-outline' },
  { value: 'CUSTOMER', label: 'Khách hàng', icon: 'people-outline' },
  { value: 'OTHER', label: 'Khác', icon: 'ellipsis-horizontal-circle-outline' },
];
export const INCIDENT_SEVERITIES = [
  { value: 'LOW', label: 'Thấp', color: uiColors.successText, background: uiColors.mint },
  { value: 'MEDIUM', label: 'Trung bình', color: uiColors.warningText, background: uiColors.butter },
  { value: 'HIGH', label: 'Cao', color: uiColors.dangerText, background: uiColors.dangerSoft },
];
export const INCIDENT_STATUSES = [
  { value: 'OPEN', label: 'Đã tiếp nhận', color: uiColors.warningText, background: uiColors.butter },
  { value: 'IN_REVIEW', label: 'Đang xử lý', color: uiColors.infoText, background: uiColors.sky },
  { value: 'RESOLVED', label: 'Đã giải quyết', color: uiColors.successText, background: uiColors.mint },
];
const base = (storeId) => `/stores/${encodeURIComponent(storeId)}/incidents`;
const config = (email) => ({ ...(email ? { expectedSessionEmail: email.trim().toLowerCase() } : {}) });
async function verifyCacheOwner(ownerEmail) {
  if (!ownerEmail) return;
  const values = new Map(await AsyncStorage.multiGet(['userEmail', 'accessToken']));
  if (!values.get('accessToken') || values.get('userEmail')?.trim().toLowerCase() !== ownerEmail.trim().toLowerCase()) {
    throw Object.assign(new Error('Phiên đăng nhập đã thay đổi.'), { code: 'SESSION_CHANGED' });
  }
}

export function createIncidentRequestId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const value = Math.floor(Math.random() * 16);
    return (character === 'x' ? value : (value & 3) | 8).toString(16);
  });
}
export function validateIncident({ category, severity, description, photos = [] }) {
  if (!INCIDENT_CATEGORIES.some((item) => item.value === category)) return 'Chọn loại sự cố.';
  if (!INCIDENT_SEVERITIES.some((item) => item.value === severity)) return 'Chọn mức độ sự cố.';
  if ((description || '').trim().length < 10) return 'Mô tả cần ít nhất 10 ký tự.';
  if (description.trim().length > 2000) return 'Mô tả tối đa 2.000 ký tự.';
  if (photos.length > 3) return 'Đính kèm tối đa 3 ảnh.';
  if (photos.some((photo) => !photo?.uri || photo.sizeBytes > 2 * 1024 * 1024)) return 'Mỗi ảnh phải nhỏ hơn 2 MB. Vui lòng chụp lại.';
  return '';
}
export function recentIncidentShifts(shifts, storeId, now = Date.now()) {
  const from = new Date(now - 7 * 86400000).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  const through = new Date(now).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  return (Array.isArray(shifts) ? shifts : []).filter((shift) => String(shift.storeId) === String(storeId)
    && shift.shiftDate >= from && shift.shiftDate <= through && !['CANCELLED', 'DRAFT'].includes(shift.status))
    .sort((a, b) => `${b.shiftDate} ${b.startTime}`.localeCompare(`${a.shiftDate} ${a.startTime}`));
}
export const getIncidentReports = async (storeId, { manager = false, ownerEmail } = {}) => {
  await verifyCacheOwner(ownerEmail);
  const response = await cachedRequest(`incidents:${storeId}:${manager ? 'store' : 'my'}`, async () => {
    const response = await api.get(`${base(storeId)}${manager ? '' : '/my'}`, config(ownerEmail));
    return { ...response, data: Array.isArray(response.data) ? response.data.slice(0, 100) : [] };
  });
  await verifyCacheOwner(ownerEmail);
  return response;
};
export const getIncidentReport = (storeId, incidentId, ownerEmail) =>
  api.get(`${base(storeId)}/${encodeURIComponent(incidentId)}`, config(ownerEmail));
export const updateIncidentStatus = (storeId, incidentId, status, reviewNote, ownerEmail) =>
  api.patch(`${base(storeId)}/${encodeURIComponent(incidentId)}/status`, { status, reviewNote: reviewNote.trim() }, config(ownerEmail));

export async function submitIncident(storeId, draft, ownerEmail) {
  const error = validateIncident(draft);
  if (error) throw new Error(error);
  if (!draft.clientRequestId) throw new Error('Thiếu mã gửi báo cáo. Vui lòng thử lại.');
  const form = new FormData();
  ['category', 'severity', 'clientRequestId'].forEach((field) => form.append(field, draft[field]));
  form.append('description', draft.description.trim());
  if (draft.shiftId) form.append('shiftId', draft.shiftId);
  for (const photo of draft.photos || []) {
    if (Platform.OS === 'web') {
      if (!/^(blob:|data:image\/)/.test(photo.uri)) throw new Error('Ảnh chụp không còn khả dụng. Vui lòng chụp lại.');
      const response = await fetch(photo.uri);
      const blob = await response.blob();
      if (!blob.size || blob.size > 2 * 1024 * 1024) throw new Error('Ảnh chụp không hợp lệ hoặc lớn hơn 2 MB.');
      form.append('photos', blob, 'incident.jpg');
    } else {
      if (!/^(file:|content:)/.test(photo.uri)) throw new Error('Ảnh chụp không còn khả dụng. Vui lòng chụp lại.');
      form.append('photos', { uri: photo.uri, name: 'incident.jpg', type: 'image/jpeg' });
    }
  }
  return api.post(base(storeId), form, { ...config(ownerEmail), timeout: 45000 });
}

export async function getIncidentPhoto(storeId, incidentId, photoId, ownerEmail) {
  const response = await api.get(`${base(storeId)}/${encodeURIComponent(incidentId)}/photos/${encodeURIComponent(photoId)}`,
    { ...config(ownerEmail), responseType: 'arraybuffer' });
  const bytes = new Uint8Array(response.data);
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  const mime = String(response.headers?.['content-type'] || 'image/jpeg').split(';')[0];
  return `data:${mime};base64,${globalThis.btoa(binary)}`;
}
