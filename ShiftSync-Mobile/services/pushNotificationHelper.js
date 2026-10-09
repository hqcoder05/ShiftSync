import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { registerFcmToken } from './notificationService';

// Configure foreground notification presentation
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
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
    // Configure default high-priority channel on Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'ShiftSync Notification',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4CAF50',
      });
    }

    if (!Device.isDevice) {
      console.log('[FCM Mobile] Running on simulator/emulator - push tokens require a physical device');
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[FCM Mobile] User did not grant push notification permission');
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
