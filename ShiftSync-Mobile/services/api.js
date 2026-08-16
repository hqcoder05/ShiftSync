import axios from 'axios';

const api = axios.create({
  baseURL: 'http://192.168.1.8:8080/api',
});
//Muốn sử dụng Expo Go thì phải đổi baseURL thành: 'http://{ip máy của bạn}:8080/api'
//Muốn biết ip máy của bạn là gì thì mở cmd gõ ipconfig, tìm IPv4 Address ở mục Wireless LAN adapter Wi-Fi
//Muốn sử dụng trên điện thoại thì phải để điện thoại và máy tính cùng mạng wifi
//
export default api;