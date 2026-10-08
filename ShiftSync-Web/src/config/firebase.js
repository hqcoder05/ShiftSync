// src/config/firebase.js
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// Dán cùng firebaseConfig giống như trên
const firebaseConfig = {
  apiKey: "AIzaSyDAUPGqcAqCCweTTj156_hXx92dpGGApD0",
  authDomain: "shiftsync-app-93f17.firebaseapp.com",
  projectId: "shiftsync-app-93f17",
  storageBucket: "shiftsync-app-93f17.firebasestorage.app",
  messagingSenderId: "59874071137",
  appId: "1:59874071137:web:217b4421f2d787c719d020"
};

const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);

// Hàm xin quyền và lấy FCM Token gửi về Backend
export const requestFcmToken = async () => {
  try {
    // 1. Kiểm tra trình duyệt có hỗ trợ Notification không
    if (!('Notification' in window)) {
      console.warn('Trình duyệt không hỗ trợ thông báo Notification.');
      return null;
    }

    // 2. Xin quyền hiển thị thông báo
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      // 3. Đăng ký Service Worker
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      
      // 4. Lấy Token từ Google FCM
      const token = await getToken(messaging, {
        serviceWorkerRegistration: registration,
        vapidKey: 'BNlwVsH0qLsPNAKcJNmlt1DoKbBb7hHxdL64f898m90V_S4NDEXe6k6_rprefbAimWwkTM77UpiCFMZB7aee9G0'
      });

      return token;
    } else {
      console.warn('Người dùng đã từ chối quyền thông báo.');
    }
  } catch (error) {
    console.error('Lỗi khi lấy FCM Token:', error);
  }
  return null;
};

// Hàm lắng nghe thông báo khi người dùng ĐANG MỞ tab web
export const onMessageListener = () =>
  new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });

