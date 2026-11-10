import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { getUnreadNotificationCount } from '../services/notificationService';
import { getNetworkSnapshot, subscribeNetwork } from '../services/networkState';
import { refreshMessagingUnreadCount } from '../services/messagingService';
import { syncAvatar } from '../services/avatarSync';
import { syncProfileDraft } from '../services/profileDrafts';
import { syncAttendanceQueue } from '../services/attendanceQueue';
import { startNotificationStream } from '../services/notificationStream';
import { getMyShifts } from '../services/shiftService';

export default function NotificationRuntime() {
  useEffect(() => {
    let running = false, disposed = false, queued = false, shiftsRequested = false;
    const refresh = async (includeShifts = false) => {
      if (disposed || (AppState.currentState && AppState.currentState !== 'active')) return;
      queued = true; shiftsRequested ||= includeShifts;
      if (running) return;
      running = true;
      try {
        while (queued && !disposed) {
          queued = false; const shouldLoadShifts = shiftsRequested; shiftsRequested = false;
          if (!await AsyncStorage.getItem('accessToken')) continue;
          const work = [getUnreadNotificationCount()];
          if (getNetworkSnapshot().online) {
            work.push(refreshMessagingUnreadCount(), syncProfileDraft(), syncAvatar(), syncAttendanceQueue());
            if (shouldLoadShifts) work.push(getMyShifts());
          }
          await Promise.allSettled(work);
        }
      } catch {} finally { running = false; }
    };
    const timer = setInterval(() => refresh(), 15000);
    const reminderTimer = setInterval(() => refresh(true), 15 * 60 * 1000);
    const app = AppState.addEventListener('change', (state) => { if (state === 'active') refresh(true); });
    const network = subscribeNetwork(() => refresh(true));
    const push = Platform.OS !== 'web' ? Notifications.addNotificationReceivedListener(() => refresh(true)) : null;
    const stream = startNotificationStream(() => refresh(true));
    refresh(true);
    return () => { disposed = true; clearInterval(timer); clearInterval(reminderTimer); app.remove(); network(); push?.remove(); stream(); };
  }, []);
  return null;
}
