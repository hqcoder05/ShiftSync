import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';
import { AVATAR_OPTIONS } from '../components/avatarConfigs';
import { getNetworkSnapshot } from './networkState';

const DEFAULT_AVATAR_ID = 'dilan';
const listeners = new Set();
let syncing;
const valid = (id) => AVATAR_OPTIONS.some((avatar) => avatar.id === id);
export function onAvatarChange(listener) { listeners.add(listener); return () => listeners.delete(listener); }
export function notifyAvatarChange(avatarId) { listeners.forEach((listener) => listener(avatarId)); }
async function email() { return (await AsyncStorage.getItem('userEmail'))?.trim().toLowerCase(); }
export async function getStoredAvatar(userId) {
  try {
    if (!userId) {
      const account = await email();
      const cached = account && await AsyncStorage.getItem(`@cache:${account}:profile`);
      userId = cached ? JSON.parse(cached).data?.id : null;
    }
    const stored = userId && await AsyncStorage.getItem(`@user_profile_avatar_${userId}`);
    return valid(stored) ? stored : DEFAULT_AVATAR_ID;
  } catch { return DEFAULT_AVATAR_ID; }
}
export async function resolveProfileAvatar(user) {
  if (!user?.id) return getStoredAvatar();
  const pending = await AsyncStorage.getItem(`@avatar-pending:${await email()}`);
  if (pending && String(JSON.parse(pending).userId) === String(user.id)) return getStoredAvatar(user.id);
  if (valid(user.avatarId)) {
    await AsyncStorage.setItem(`@user_profile_avatar_${user.id}`, user.avatarId);
    return user.avatarId;
  }
  return getStoredAvatar(user.id);
}
export async function syncAvatar() {
  if (syncing || !getNetworkSnapshot().online) return;
  syncing = true;
  try {
    const account = await email();
    const key = account && `@avatar-pending:${account}`;
    const raw = key && await AsyncStorage.getItem(key);
    if (!raw || !await AsyncStorage.getItem('accessToken')) return;
    const pending = JSON.parse(raw);
    const { data: user } = await api.get('/users/me', { expectedSessionEmail: account });
    if (String(user.id) !== String(pending.userId) || !valid(pending.avatarId)) return;
    await api.put('/users/me/avatar', { avatarId: pending.avatarId }, { expectedSessionEmail: account });
    if (await AsyncStorage.getItem(key) === raw) { await AsyncStorage.removeItem(key); notifyAvatarChange(pending.avatarId); }
  } finally { syncing = false; }
}
export async function saveAvatar(avatarId, userId) {
  const account = await email();
  if (!valid(avatarId) || !userId || !account) return false;
  await AsyncStorage.setItem(`@user_profile_avatar_${userId}`, avatarId);
  await AsyncStorage.setItem(`@avatar-pending:${account}`, JSON.stringify({ userId, avatarId }));
  notifyAvatarChange(avatarId);
  try { await syncAvatar(); } catch {}
  return !(await AsyncStorage.getItem(`@avatar-pending:${account}`));
}
