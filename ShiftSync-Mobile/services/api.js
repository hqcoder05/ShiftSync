import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, Platform } from 'react-native';
import Constants from 'expo-constants';
import { resetToLogin } from '../navigation/navigationRef';

const CONFIGURED_API_URL = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/$/, '');

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
  try {
    // Luôn cập nhật baseURL theo IP động mới nhất
    config.baseURL = getBaseUrl();
    const token = await AsyncStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log(`[API Req] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
  } catch (e) {
    // Ignore AsyncStorage read error
  }
  return config;
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
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

      if (isRefreshing) {
        // Đang có 1 tiến trình refresh token chạy -> đưa request vào hàng đợi
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (refreshToken) {
          console.log('[API] 401 phát hiện! Đang tự động refresh token...');
          const refreshUrl = `${getBaseUrl()}/auth/refresh`;
          const res = await axios.post(refreshUrl, { refreshToken }, { timeout: 10000 });

          if (res.data?.accessToken) {
            const newAccessToken = res.data.accessToken;
            const newRefreshToken = res.data.refreshToken || refreshToken;

            console.log('[API] Refresh token thành công! Cập nhật storage và thử lại request...');
            await AsyncStorage.multiSet([
              ['accessToken', newAccessToken],
              ['refreshToken', newRefreshToken],
            ]);

            processQueue(null, newAccessToken);
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return api(originalRequest);
          }
        }
      } catch (refreshErr) {
        console.log('[API] Refresh token thất bại hoặc phiên đã hết hạn:', refreshErr.message);
        processQueue(refreshErr, null);
      } finally {
        isRefreshing = false;
      }

      // Nếu refresh thất bại hoặc không có refreshToken -> dọn dẹp và đưa về Login
      await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'userRole', 'userEmail']);
      resetToLogin();
    }

    return Promise.reject(error);
  }
);

export default api;
