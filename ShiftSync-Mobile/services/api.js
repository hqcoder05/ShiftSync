import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Tự động nhận diện môi trường:
// - Web trình duyệt: http://localhost:8080/api
// - Điện thoại thật (Expo Go): http://172.20.10.7:8080/api
const DEV_MACHINE_IP = '172.20.10.7';

const getBaseUrl = () => {
  if (Platform.OS === 'web') {
    return 'http://localhost:8080/api';
  }
  return `http://${DEV_MACHINE_IP}:8080/api`;
};

const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 4000,
});

api.interceptors.request.use(async (config) => {
  try {
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