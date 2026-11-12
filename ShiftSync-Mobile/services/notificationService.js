import api from './api';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { cachedRequest } from './offlineCache';
import { getNetworkSnapshot, isNetworkFailure } from './networkState';
import * as Notifications from 'expo-notifications';

const DEVICE_FCM_TOKEN_KEY = '@device_fcm_token';

let unread = 0;
let version = 0;
let unreadOwner = null;
let sessionGeneration = 0;
let cacheWrites = Promise.resolve();
const subscribers = new Set();
export const getUnreadSnapshot = () => unread;
export const subscribeUnreadCount = (callback) => { subscribers.add(callback); return () => subscribers.delete(callback); };
export function publishUnreadCount(value, ownerEmail = null) {
  version += 1;
  if (!ownerEmail) sessionGeneration += 1;
  unreadOwner = ownerEmail;
  const next = Math.max(0, Number(value) || 0);
  if (Platform.OS !== 'web') Notifications.setBadgeCountAsync(next).catch(() => {});
  if (next === unread) return;
  unread = next;
  subscribers.forEach((callback) => { try { callback(next); } catch {} });
}

export const getPreferences = () =>
  api.get('/users/me/notification-preferences');

export const updatePreferences = (data) =>
  api.put('/users/me/notification-preferences', data);

export const registerFcmToken = async (token) => {
  const response = await api.post('/users/me/fcm-token', {
    fcmToken: token,
    deviceType: Platform.OS === 'ios' ? 'IOS' : 'ANDROID'
  });
  await AsyncStorage.setItem(DEVICE_FCM_TOKEN_KEY, token);
  return response;
};

export async function unregisterCurrentDeviceToken() {
  const token = await AsyncStorage.getItem(DEVICE_FCM_TOKEN_KEY);
  if (!token) return false;
  try {
    await api.delete('/users/me/fcm-token', {
      data: { fcmToken: token, deviceType: Platform.OS === 'ios' ? 'IOS' : 'ANDROID' },
    });
    return true;
  } finally {
    await AsyncStorage.removeItem(DEVICE_FCM_TOKEN_KEY);
  }
}

export const sendTestNotification = (data) =>
  api.post('/notifications/test', data || {});

// Jackson exposes a Java boolean named isRead as `read`; older cached data
// and some clients use `isRead`. Normalize both at the service boundary.
export const notificationIsRead = (item) => Boolean(item?.isRead ?? item?.read ?? false);
export const getMyNotifications = async () => {
  const response = await cachedRequest('notifications', () => api.get('/users/me/notifications'));
  return { ...response, data: Array.isArray(response.data)
    ? response.data.map((item) => ({ ...item, isRead: notificationIsRead(item) }))
    : response.data };
};

const readSession = async () => { const generation = sessionGeneration; const values = new Map(await AsyncStorage.multiGet(['userEmail', 'accessToken'])); return { generation, email: values.get('userEmail')?.trim().toLowerCase(), token: values.get('accessToken') }; };
const isSession = async (session) => { const next = await readSession(); return session.generation === sessionGeneration && session.generation === next.generation && !!session.email && !!next.token && session.email === next.email; };
const countKey = (session) => `@cache:${session.email}:notification-unread-count`;
function persistCount(session, count, expectedVersion) {
  cacheWrites = cacheWrites.catch(() => {}).then(async () => {
    if (await isSession(session) && version === expectedVersion) await AsyncStorage.setItem(countKey(session), JSON.stringify({ data: { unreadCount: count }, at: Date.now() }));
  });
  return cacheWrites;
}
async function cachedCount(session) {
  try {
    const raw = await AsyncStorage.getItem(countKey(session));
    if (raw) { const cache = JSON.parse(raw); return { data: cache.data, cachedAt: cache.at, fromCache: true }; }
    const rawList = await AsyncStorage.getItem(`@cache:${session.email}:notifications`);
    if (rawList) { const cache = JSON.parse(rawList); if (Array.isArray(cache.data)) return { data: { unreadCount: cache.data.filter((item) => !notificationIsRead(item)).length }, cachedAt: cache.at, fromCache: true }; }
  } catch {}
  return null;
}
export const getUnreadNotificationCount = async () => {
  const session = await readSession();
  if (!session.token || !session.email) throw Object.assign(new Error('Chưa đăng nhập.'), { code: 'NO_SESSION' });
  if (unreadOwner && unreadOwner !== session.email) { publishUnreadCount(0); session.generation = sessionGeneration; }
  const current = version;
  let response;
  try {
    if (!getNetworkSnapshot().online) throw Object.assign(new Error('Đang ngoại tuyến.'), { code: 'OFFLINE' });
    response = await api.get('/users/me/notifications/unread-count', { expectedSessionEmail: session.email });
  } catch (error) {
    if (error.code === 'SESSION_CHANGED' || !isNetworkFailure(error)) throw error;
    response = await cachedCount(session);
    if (!response) throw error;
  }
  if (!await isSession(session)) throw Object.assign(new Error('Phiên đăng nhập đã thay đổi.'), { code: 'SESSION_CHANGED' });
  if (current === version) {
    publishUnreadCount(response.data?.unreadCount, session.email);
    if (!response.fromCache) await persistCount(session, unread, version);
  }
  return { ...response, data: { ...response.data, unreadCount: unread } };
};
function patchCachedNotifications(id, session) {
  cacheWrites = cacheWrites.catch(() => {}).then(async () => {
    const key = `@cache:${session.email}:notifications`;
    if (!await isSession(session)) return;
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return;
    const cached = JSON.parse(raw);
    if (!await isSession(session)) return;
    if (Array.isArray(cached.data)) await AsyncStorage.setItem(key, JSON.stringify({ ...cached, data: cached.data.map((item) => !id || item.id === id ? { ...item, isRead: true } : item) }));
  });
  return cacheWrites;
}
export const markNotificationAsRead = async (id) => {
  const session = await readSession();
  version += 1;
  const response = await api.put(`/users/me/notifications/${id}/read`, undefined, { expectedSessionEmail: session.email });
  if (!await isSession(session)) return response;
  publishUnreadCount(unread - 1, session.email);
  await Promise.allSettled([patchCachedNotifications(id, session), persistCount(session, unread, version)]);
  getUnreadNotificationCount().catch(() => {});
  return response;
};
export const markAllNotificationsAsRead = async () => {
  const session = await readSession();
  version += 1;
  const response = await api.put('/users/me/notifications/read-all', undefined, { expectedSessionEmail: session.email });
  if (!await isSession(session)) return response;
  publishUnreadCount(0, session.email);
  await Promise.allSettled([patchCachedNotifications(undefined, session), persistCount(session, 0, version)]);
  return response;
};
