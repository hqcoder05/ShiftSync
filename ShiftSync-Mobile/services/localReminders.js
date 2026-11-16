import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const getNativeNotifications = () => require('expo-notifications');

let syncing = Promise.resolve();
const normalizeEmail = (value) => value?.trim().toLowerCase();
const readOwner = async () => { const values = new Map(await AsyncStorage.multiGet(['userEmail', 'accessToken'])); return { email: normalizeEmail(values.get('userEmail')), token: values.get('accessToken') }; };
const isOwner = async (owner) => { const current = await readOwner(); return owner.email === current.email && owner.token === current.token; };
export const canPresentNotifications = (permission) => {
  const notifications = Platform.OS === 'web' ? null : getNativeNotifications();
  return permission?.granted === true || permission?.status === 'granted'
    || [notifications?.IosAuthorizationStatus?.AUTHORIZED, notifications?.IosAuthorizationStatus?.PROVISIONAL, notifications?.IosAuthorizationStatus?.EPHEMERAL].some((status) => status != null && status === permission?.ios?.status);
};

export async function prepareNotificationChannel() {
  if (Platform.OS === 'android') {
    const notifications = getNativeNotifications();
    await notifications.setNotificationChannelAsync('shift-reminders-v2', {
    name: 'ShiftSync · Nhắc ca và thông báo', importance: notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 150, 250], lightColor: '#FF7043',
    });
  }
}

export async function requestReminderPermission() {
  if (Platform.OS === 'web') return false;
  const notifications = getNativeNotifications();
  await prepareNotificationChannel();
  const existing = await notifications.getPermissionsAsync();
  return canPresentNotifications(existing) || canPresentNotifications(await notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: true, allowSound: true } }));
}

export function syncShiftReminders(shifts) {
  // Capture ownership before queueing, so a delayed job cannot schedule another account's shifts.
  const ownerPromise = readOwner();
  syncing = syncing.catch(() => {}).then(async () => {
    if (Platform.OS === 'web') return;
    const notifications = getNativeNotifications();
    const owner = await ownerPromise;
    if (!owner.email || !owner.token || !await isOwner(owner)) return;
    await prepareNotificationChannel();
    const permission = await notifications.getPermissionsAsync();
    const enabled = canPresentNotifications(permission) && await AsyncStorage.getItem(`@reminders:${owner.email}`) !== 'off';
    const prefix = `shiftsync:v2:${owner.email}:`;
    const existing = await notifications.getAllScheduledNotificationsAsync();
    if (!await isOwner(owner)) return;
    const allDesired = new Map();
    if (enabled) for (const shift of shifts || []) {
      if (shift.status !== 'PUBLISHED' || !shift.id || !shift.shiftDate || !shift.startTime) continue;
      const starts = new Date(`${shift.shiftDate}T${String(shift.startTime).slice(0, 8)}+07:00`).getTime();
      for (const minutes of [60, 30]) {
        const time = starts - minutes * 60000;
        if (!Number.isFinite(time) || time <= Date.now()) continue;
        allDesired.set(`${prefix}${shift.id}:${minutes}`, { time, shift, minutes });
      }
    }
    // Keep the nearest reminders within iOS's 64-pending-notification limit, respecting unrelated entries.
    const unrelated = existing.filter((item) => !item.identifier.startsWith('shiftsync:')).length;
    const capacity = Platform.OS === 'ios' ? Math.max(0, 64 - unrelated) : Infinity;
    const desired = new Map([...allDesired].sort((a, b) => a[1].time - b[1].time).slice(0, capacity));
    for (const item of existing) {
      if (!item.identifier.startsWith('shiftsync:')) continue;
      if (!await isOwner(owner)) return;
      const wanted = desired.get(item.identifier);
      if (!item.identifier.startsWith(prefix) || !wanted || Number(item.content.data?.scheduledAt) !== wanted.time) {
        await notifications.cancelScheduledNotificationAsync(item.identifier);
      } else desired.delete(item.identifier);
    }
    for (const [identifier, { time, shift, minutes }] of desired) {
      if (!await isOwner(owner)) return;
      await notifications.scheduleNotificationAsync({ identifier,
        content: { title: `Ca làm bắt đầu sau ${minutes} phút`, body: `${String(shift.startTime).slice(0, 5)} · ${shift.storeName || 'Cửa hàng được phân công'}`,
          data: { shiftId: shift.id, scheduledAt: time, ownerEmail: owner.email } },
        trigger: { type: notifications.SchedulableTriggerInputTypes.DATE, date: new Date(time), channelId: 'shift-reminders-v2' },
      });
      if (!await isOwner(owner)) { await notifications.cancelScheduledNotificationAsync(identifier); return; }
    }
    return { scheduled: Math.min(allDesired.size, capacity), deferred: Math.max(0, allDesired.size - capacity), enabled };
  });
  return syncing;
}

export function clearShiftReminders() {
  syncing = syncing.catch(() => {}).then(async () => {
    if (Platform.OS === 'web') return;
    const notifications = getNativeNotifications();
    const scheduled = await notifications.getAllScheduledNotificationsAsync();
    await Promise.all(scheduled.filter((item) => item.identifier.startsWith('shiftsync:')).map((item) => notifications.cancelScheduledNotificationAsync(item.identifier)));
  });
  return syncing;
}
