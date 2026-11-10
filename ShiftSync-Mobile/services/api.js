import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, Platform } from 'react-native';
import Constants from 'expo-constants';
import { resetToLogin } from '../navigation/navigationRef';
import { getNetworkSnapshot } from './networkState';

const CONFIGURED_API_URL = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/$/, '');
let sessionVersion = 0;
let authStorage = Promise.resolve();
const serializeAuthStorage = (work) => {
  const result = authStorage.then(work);
  authStorage = result.catch(() => {});
  return result;
};
export function runApiSessionChange(work) {
  sessionVersion += 1;
  return serializeAuthStorage(work);
}
const sessionChanged = () => Object.assign(new Error('Phiên đăng nhập đã thay đổi.'), { code: 'SESSION_CHANGED' });
async function readAuthSession() {
  const values = new Map(await AsyncStorage.multiGet(['accessToken', 'refreshToken', 'userEmail']));
  return { accessToken: values.get('accessToken'), refreshToken: values.get('refreshToken') || null,
    email: values.get('userEmail')?.trim().toLowerCase() };
}

// Tự động trích xuất IP host mà Expo Go đang kết nối, hoặc dùng fallback CURRENT_LAN_IP
export const getHostIp = () => {
  if (Platform.OS === 'web') {
    return 'localhost';
  }

  // 1. Lấy từ Expo Constants (Expo Go trên điện thoại thật kết nối tới Metro)
  const hostUri = Constants.expoConfig?.hostUri 
    || Constants.manifest2?.extra?.expoGo?.debuggerHost;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return ip;
    }
  }

  // 2. Lấy từ NativeModules SourceCode
  const scriptURL = NativeModules?.SourceCode?.scriptURL;
  if (scriptURL) {
    const address = scriptURL.split('://')[1]?.split('/')[0]?.split(':')[0];
    if (address && address !== 'localhost' && address !== '127.0.0.1') {
      return address;
    }
  }

  return 'localhost';
};

export const getBaseUrl = () => {
  if (CONFIGURED_API_URL) {
    return CONFIGURED_API_URL.endsWith('/api')
      ? CONFIGURED_API_URL
      : `${CONFIGURED_API_URL}/api`;
  }

  const host = getHostIp();
  return `http://${host}:8080/api`;
};

const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 20000,
});

api.interceptors.request.use(async (config) => {
  if (!getNetworkSnapshot().online) throw Object.assign(new Error('Đang ngoại tuyến.'), { code: 'OFFLINE' });
  const version = config._sessionVersion ?? sessionVersion;
  const boundEmail = config.expectedSessionEmail || config._sessionEmail;
  try {
    // Luôn cập nhật baseURL theo IP động mới nhất
    config.baseURL = getBaseUrl();
    await authStorage;
    if (version !== sessionVersion) throw sessionChanged();
    const { accessToken: token, email } = await readAuthSession();
    if (version !== sessionVersion || (boundEmail && (!token || email !== boundEmail))) throw sessionChanged();
    if (token) {
      config._sessionEmail = email;
      config._sessionVersion = version;
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log(`[API Req] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
  } catch (e) {
    if (e.code === 'SESSION_CHANGED' || boundEmail || config.headers?.Authorization) throw e;
    // Ignore AsyncStorage read error
  }
  return config;
});

let refreshFlight;
async function refreshAuthSession(version, expectedEmail) {
  let ownerEmail = expectedEmail, refreshToken;
  try {
    await authStorage;
    if (version !== sessionVersion) throw sessionChanged();
    const initial = await readAuthSession();
    if (version !== sessionVersion || (expectedEmail && initial.email !== expectedEmail)) throw sessionChanged();
    ownerEmail = initial.email;
    refreshToken = initial.refreshToken;
    if (!refreshToken) throw Object.assign(new Error('Phiên đăng nhập đã hết hạn.'), { code: 'NO_REFRESH_TOKEN' });
    const response = await axios.post(`${getBaseUrl()}/auth/refresh`, { refreshToken }, { timeout: 10000 });
    if (!response.data?.accessToken) throw new Error('Máy chủ chưa trả về phiên đăng nhập mới.');
    await serializeAuthStorage(async () => {
      if (version !== sessionVersion) throw sessionChanged();
      const current = await readAuthSession();
      if (version !== sessionVersion || current.email !== ownerEmail || current.refreshToken !== refreshToken) throw sessionChanged();
      await AsyncStorage.multiSet([
        ['accessToken', response.data.accessToken],
        ['refreshToken', response.data.refreshToken || refreshToken],
      ]);
      if (version !== sessionVersion) throw sessionChanged();
    });
  } catch (error) {
    if (error.code === 'NO_REFRESH_TOKEN' || [401, 403].includes(error.response?.status)) {
      await serializeAuthStorage(async () => {
        if (version !== sessionVersion) return;
        const current = await readAuthSession();
        if (version !== sessionVersion || current.email !== ownerEmail || current.refreshToken !== refreshToken) return;
        const clearedVersion = ++sessionVersion;
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'userRole', 'userEmail']);
        if (sessionVersion === clearedVersion) resetToLogin();
      });
    }
    throw error;
  }
}

api.interceptors.response.use(
  async (response) => {
    if (response.config?._sessionEmail) {
      await authStorage;
      const current = await readAuthSession();
      if (current.email !== response.config._sessionEmail
          || response.config._sessionVersion !== sessionVersion) throw sessionChanged();
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const method = originalRequest?.method?.toUpperCase() || 'UNKNOWN';
    const url = originalRequest?.url || 'UNKNOWN';
    const status = error.response?.status || 'No Response';
    const resData = error.response?.data;

    let safePayload = undefined;
    if (originalRequest?.data) {
      try {
        const raw = originalRequest.data;
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : { ...raw };
        delete parsed.password;
        delete parsed.token;
        delete parsed.accessToken;
        delete parsed.refreshToken;
        safePayload = parsed;
      } catch (_) {
        safePayload = originalRequest.data;
      }
    }

    console.log(`[API Err] [${method}] ${url} -> Status: ${status}`);
    if (safePayload !== undefined) {
      console.log(`[API Err Request Payload]`, safePayload);
    }
    if (resData) {
      console.log(`[API Err Response Details]`, {
        status: error.response?.status,
        data: resData,
        message: resData?.message,
        error: resData?.error,
        code: resData?.code || resData?.statusCode,
      });
    }

    // Nếu gặp lỗi 401 và không phải request đăng nhập/refresh
    if (
      error.response &&
      error.response.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      if (
        originalRequest.url?.includes('/auth/login') ||
        originalRequest.url?.includes('/auth/refresh') ||
        originalRequest.url?.includes('/auth/register')
      ) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;
      const version = originalRequest._sessionVersion ?? sessionVersion;
      while (refreshFlight) {
        const active = refreshFlight;
        try { await active.promise; }
        catch (refreshError) { if (active.version === version) throw refreshError; }
        if (version !== sessionVersion) throw sessionChanged();
        if (active.version === version) return api(originalRequest);
      }
      if (version !== sessionVersion) throw sessionChanged();
      const flight = { version, promise: null };
      flight.promise = refreshAuthSession(version, originalRequest._sessionEmail)
        .finally(() => { if (refreshFlight === flight) refreshFlight = null; });
      refreshFlight = flight;
      await flight.promise;
      return api(originalRequest);
    }

    return Promise.reject(error);
  }
);

export default api;
