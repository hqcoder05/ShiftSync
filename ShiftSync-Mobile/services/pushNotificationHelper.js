import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { registerFcmToken } from './notificationService';
import { requestReminderPermission } from './localReminders';
import { getMyShifts } from './shiftService';

// Configure foreground notification presentation
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Requests push notification permissions and registers FCM device token with ShiftSync backend.
 */
export async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'web') {
    return null;
  }

  try {
    // Local reminders also work without a remote push token, including on simulators.
    if (!await requestReminderPermission()) return null;
    // The Dashboard may have loaded before the permission dialog was accepted.
    // Reconcile immediately after granting permission, including from the offline shift cache.
    await getMyShifts().catch(() => {});

    if (!Device.isDevice) {
      console.log('[FCM Mobile] Running on simulator/emulator - push tokens require a physical device');
      return null;
    }

    // Fetch Native FCM Token for Android / APNs Token for iOS
    const pushTokenData = await Notifications.getDevicePushTokenAsync();
    const token = pushTokenData?.data;

    if (token) {
      console.log('[FCM Mobile] Native FCM token retrieved, sending to backend...');
      await registerFcmToken(token);
      console.log('[FCM Mobile] Push token registered with backend successfully!');
      return token;
    }
  } catch (error) {
    console.warn('[FCM Mobile] Failed to register push token:', error?.message || error);
  }

  return null;
}
