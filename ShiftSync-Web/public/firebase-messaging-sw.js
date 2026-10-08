// public/firebase-messaging-sw.js

// 1. Nhập thư viện Firebase SDK tương thích cho Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// 2. Cấu hình Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDAUPGqcAqCCweTTj156_hXx92dpGGApD0",
  authDomain: "shiftsync-app-93f17.firebaseapp.com",
  projectId: "shiftsync-app-93f17",
  storageBucket: "shiftsync-app-93f17.firebasestorage.app",
  messagingSenderId: "59874071137",
  appId: "1:59874071137:web:217b4421f2d787c719d020"
};

// Khởi tạo Firebase App trong Service Worker
firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// 3. Lắng nghe và hiển thị thông báo khi tab web đang đóng hoặc chạy ngầm
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Nhận notification ngầm:', payload);

  const title = payload.notification?.title || payload.data?.title || 'ShiftSync';
  const options = {
    body: payload.notification?.body || payload.data?.message || 'Bạn có thông báo mới từ hệ thống.',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    data: payload.data || {}
  };

  self.registration.showNotification(title, options);
});

// 4. Bắt sự kiện khi người dùng click vào thông báo -> Focus hoặc mở tab web
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
