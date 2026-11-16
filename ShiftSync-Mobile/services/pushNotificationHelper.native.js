import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { registerFcmToken } from './notificationService';
import { requestReminderPermission } from './localReminders';
import { getMyShifts } from './shiftService';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotificationsAsync() {
  try {
    if (!await requestReminderPermission()) return null;
    await getMyShifts().catch(() => {});
    // Android emulators created from a Google Play system image can receive
    // native FCM tokens. Keep the simulator guard for iOS, where this app uses
    // a native APNs token registered directly with the backend.
    if (!Device.isDevice && Platform.OS !== 'android') {
      console.log('[FCM Mobile] iOS simulator khong the dang ky native APNs token');
      return null;
    }
    const pushTokenData = await Notifications.getDevicePushTokenAsync();
    const token = pushTokenData?.data;
    if (token) {
      console.log('[FCM Mobile] Da lay native FCM token, dang gui ve he thong...');
      await registerFcmToken(token);
      console.log('[FCM Mobile] Da dang ky push token thanh cong');
      return token;
    }
  } catch (error) {
    console.warn('[FCM Mobile] Khong the dang ky push token:', error?.message || error);
  }
  return null;
}
