import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Dev qua trình duyệt (bấm phím "w" trong Expo) -> dùng 'http://localhost:8080/api'
// Dev qua điện thoại thật bằng Expo Go -> đổi thành IP LAN máy tính, ví dụ 'http://192.168.1.8:8080/api'
// Cách tìm IP: mở cmd/PowerShell gõ ipconfig, tìm IPv4 Address ở mục Wireless LAN adapter Wi-Fi
// Điện thoại và máy tính phải cùng 1 mạng wifi khi dùng Expo Go
const api = axios.create({
  baseURL: 'http://localhost:8080/api',
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;