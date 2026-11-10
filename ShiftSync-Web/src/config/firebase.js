// src/config/firebase.js
import { initializeApp } from '@firebase/app';
import { getMessaging, getToken, isSupported, onMessage } from '@firebase/messaging';

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

const isBrowserNotificationSupported = async () =>
  typeof window !== 'undefined'
  && 'Notification' in window
  && 'serviceWorker' in navigator
  && await isSupported();

const getBrowserMessaging = async () => {
  if (!await isBrowserNotificationSupported()) return null;
  return getMessaging(app);
};

export const getBrowserNotificationPermission = () =>
  typeof Notification === 'undefined' ? 'unsupported' : Notification.permission;

// Hàm xin quyền và lấy FCM Token gửi về Backend
export const requestFcmToken = async () => {
  try {
    if (!await isBrowserNotificationSupported()) {
      console.warn('Trình duyệt không hỗ trợ thông báo Windows hoặc Service Worker.');
      return null;
    }

    // Hàm này chỉ được gọi từ thao tác bấm nút của người dùng. Một số trình
    // duyệt chặn hộp thoại xin quyền nếu nó được gọi ngầm sau khi đăng nhập.
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Người dùng chưa cho phép thông báo Windows.');
      return null;
    } else {
      const [registration, messaging] = await Promise.all([
        navigator.serviceWorker.register('/firebase-messaging-sw.js'),
        getBrowserMessaging(),
      ]);
      if (!messaging) return null;

      return getToken(messaging, {
        serviceWorkerRegistration: registration,
        vapidKey: 'BNlwVsH0qLsPNAKcJNmlt1DoKbBb7hHxdL64f898m90V_S4NDEXe6k6_rprefbAimWwkTM77UpiCFMZB7aee9G0',
      });
    }
  } catch (error) {
    console.error('Lỗi khi lấy FCM Token:', error);
  }
  return null;
};

// Hàm lắng nghe thông báo khi người dùng ĐANG MỞ tab web
export const onMessageListener = async (handler) => {
  const messaging = await getBrowserMessaging();
  if (!messaging) return () => {};
  return onMessage(messaging, handler);
};

