import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, Platform } from 'react-native';

// IP Wi-Fi hiện tại của máy tính chạy backend:
const CURRENT_LAN_IP = '192.168.0.113';

// Tự động trích xuất IP host mà Expo Go đang kết nối, hoặc dùng fallback CURRENT_LAN_IP
const getHostIp = () => {
  if (Platform.OS === 'web') {
    return 'localhost';
  }
  const scriptURL = NativeModules?.SourceCode?.scriptURL;
  if (scriptURL) {
    const address = scriptURL.split('://')[1]?.split('/')[0]?.split(':')[0];
    if (address && address !== 'localhost' && address !== '127.0.0.1') {
      return address;
    }
  }
  return CURRENT_LAN_IP;
};

export const getBaseUrl = () => {
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
  } catch (e) {
    // Ignore AsyncStorage read error
  }
  return config;
});

export default api;