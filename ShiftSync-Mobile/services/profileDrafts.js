import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';
import { getNetworkSnapshot } from './networkState';
import { normalizePersonalInfo, validatePersonalInfo } from '../utils/profileValidation';

let syncing;
let persistence = Promise.resolve();
const serial = (work) => { const result = persistence.then(work); persistence = result.catch(() => {}); return result; };
const currentEmail = async () => (await AsyncStorage.getItem('userEmail'))?.trim().toLowerCase();

export async function syncProfileDraft() {
  if (!getNetworkSnapshot().online) return;
  if (syncing) return syncing;
  syncing = (async () => {
    const email = await currentEmail();
    if (!email || !(await AsyncStorage.getItem('accessToken'))) return;
    const key = `@profile-pending:${email}`;
    while (getNetworkSnapshot().online && await currentEmail() === email) {
      const raw = await serial(() => AsyncStorage.getItem(key));
      if (!raw) return;
      const draft = JSON.parse(raw);
      const customKey = `@user_profile_custom_${draft.userId}`;
      const custom = JSON.parse(await AsyncStorage.getItem(customKey) || '{}');
      const form = draft.form || { ...custom, phone: draft.phone };
      if (Object.keys(validatePersonalInfo(form)).length) return;
      const { data: user } = await api.get('/users/me', { expectedSessionEmail: email });
      if (String(user.id) !== String(draft.userId)) return;
      const personal = normalizePersonalInfo(form);
      const gender = { Nam: 'MALE', 'Nữ': 'FEMALE', Khác: 'OTHER' }[personal.gender] || personal.gender || user.gender || 'MALE';
      const { data: saved } = await api.put('/users/me', {
        fullName: user.fullName,
        email: user.email,
        phone: personal.phone || null,
        birthDate: personal.birthDate,
        birthPlace: personal.birthPlace || null,
        gender,
      }, { expectedSessionEmail: email });
      if (!saved || String(saved.id) !== String(draft.userId) || !['phone', 'birthDate', 'birthPlace', 'gender'].every((field) => Object.prototype.hasOwnProperty.call(saved, field))) {
        throw new Error('Máy chủ chưa hỗ trợ đồng bộ đầy đủ hồ sơ. Thông tin đã lưu trên thiết bị.');
      }
      await serial(async () => {
        if (await AsyncStorage.getItem(key) !== raw) return;
        const latest = JSON.parse(await AsyncStorage.getItem(customKey) || '{}');
        await AsyncStorage.setItem(customKey, JSON.stringify({ ...latest, pendingPhone: false, pendingPersonalInfo: false }));
        const cacheKey = `@cache:${email}:profile`;
        await AsyncStorage.setItem(cacheKey, JSON.stringify({ data: saved, at: Date.now() }));
        await AsyncStorage.removeItem(key);
      });
    }
  })().finally(() => { syncing = null; });
  return syncing;
}

export async function savePersonalDraft(userId, form) {
  if (Object.keys(validatePersonalInfo(form)).length) throw new Error('Thông tin hồ sơ chưa hợp lệ.');
  const email = await currentEmail();
  if (!userId || !email || !(await AsyncStorage.getItem('accessToken'))) throw new Error('Phiên đăng nhập chưa sẵn sàng.');
  const pendingKey = `@profile-pending:${email}`;
  await serial(async () => {
    if (await currentEmail() !== email) throw new Error('Tài khoản đã thay đổi. Vui lòng mở lại hồ sơ.');
    await AsyncStorage.setItem(`@user_profile_custom_${userId}`, JSON.stringify({ ...form, pendingPhone: true, pendingPersonalInfo: true }));
    await AsyncStorage.setItem(pendingKey, JSON.stringify({ userId, form }));
  });
  try { await syncProfileDraft(); } catch {}
  return !(await AsyncStorage.getItem(pendingKey));
}
