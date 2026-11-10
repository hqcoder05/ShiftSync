import AsyncStorage from '@react-native-async-storage/async-storage';
import { getNetworkSnapshot, isNetworkFailure } from './networkState';

async function cacheSession() {
  const values = new Map(await AsyncStorage.multiGet(['userEmail', 'accessToken']));
  return { email: values.get('userEmail')?.trim().toLowerCase(), token: values.get('accessToken') };
}
const cacheKey = (session, name) => session.email && session.token ? `@cache:${session.email}:${name}` : null;
const changed = () => Object.assign(new Error('Phiên đăng nhập đã thay đổi.'), { code: 'SESSION_CHANGED' });
export async function sessionCacheKey(name) { return cacheKey(await cacheSession(), name); }
export async function cachedRequest(name, request) {
  const owner = await cacheSession();
  const key = cacheKey(owner, name);
  const verifyOwner = async () => {
    const current = await cacheSession();
    if (current.email !== owner.email || current.token !== owner.token) throw changed();
  };
  const fallback = async () => {
    const raw = key && await AsyncStorage.getItem(key);
    await verifyOwner();
    if (!raw) return null;
    try { const cached = JSON.parse(raw); return { data: cached.data, fromCache: true, cachedAt: cached.at }; } catch { return null; }
  };
  if (!getNetworkSnapshot().online) {
    const cached = await fallback();
    if (cached) return cached;
    throw Object.assign(new Error('Chưa có dữ liệu đã lưu cho tài khoản này.'), { code: 'OFFLINE_CACHE_MISS' });
  }
  try {
    const response = await request();
    // Refresh may replace the token for the same owner. Never cache or deliver another account's data.
    const current = await cacheSession();
    if (current.email !== owner.email || !current.token) throw changed();
    if (key && current.token === owner.token) await AsyncStorage.setItem(key, JSON.stringify({ data: response.data, at: Date.now() })).catch(() => {});
    return response;
  } catch (error) {
    if (error?.code === 'SESSION_CHANGED') throw error;
    if (isNetworkFailure(error)) { const cached = await fallback(); if (cached) return cached; }
    throw error;
  }
}
