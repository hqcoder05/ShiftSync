import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

let syncing = Promise.resolve();
const normalizeEmail = (value) => value?.trim().toLowerCase();
const readOwner = async () => { const values = new Map(await AsyncStorage.multiGet(['userEmail', 'accessToken'])); return { email: normalizeEmail(values.get('userEmail')), token: values.get('accessToken') }; };
const isOwner = async (owner) => { const current = await readOwner(); return owner.email === current.email && owner.token === current.token; };
export const canPresentNotifications = (permission) => permission?.granted === true || permission?.status === 'granted'
  || [Notifications.IosAuthorizationStatus?.AUTHORIZED, Notifications.IosAuthorizationStatus?.PROVISIONAL, Notifications.IosAuthorizationStatus?.EPHEMERAL].some((status) => status != null && status === permission?.ios?.status);

export async function prepareNotificationChannel() {
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('default', {
    name: 'ShiftSync · Nhắc ca và thông báo', importance: Notifications.AndroidImportance.HIGH,
    sound: 'default', vibrationPattern: [0, 250, 150, 250], lightColor: '#FF7043',
  });
}

export async function requestReminderPermission() {
  if (Platform.OS === 'web') return false;
  await prepareNotificationChannel();
  const existing = await Notifications.getPermissionsAsync();
  return canPresentNotifications(existing) || canPresentNotifications(await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: true, allowSound: true } }));
}

export function syncShiftReminders(shifts) {
  // Capture ownership before queueing, so a delayed job cannot schedule another account's shifts.
  const ownerPromise = readOwner();
  syncing = syncing.catch(() => {}).then(async () => {
    if (Platform.OS === 'web') return;
    const owner = await ownerPromise;
    if (!owner.email || !owner.token || !await isOwner(owner)) return;
    await prepareNotificationChannel();
    const permission = await Notifications.getPermissionsAsync();
    const enabled = canPresentNotifications(permission) && await AsyncStorage.getItem(`@reminders:${owner.email}`) !== 'off';
    const prefix = `shiftsync:${owner.email}:`;
    const existing = await Notifications.getAllScheduledNotificationsAsync();
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
        await Notifications.cancelScheduledNotificationAsync(item.identifier);
      } else desired.delete(item.identifier);
    }
    for (const [identifier, { time, shift, minutes }] of desired) {
      if (!await isOwner(owner)) return;
      await Notifications.scheduleNotificationAsync({ identifier,
        content: { title: `Ca làm bắt đầu sau ${minutes} phút`, body: `${String(shift.startTime).slice(0, 5)} · ${shift.storeName || 'Cửa hàng được phân công'}`,
          data: { shiftId: shift.id, scheduledAt: time, ownerEmail: owner.email }, sound: 'default' },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(time), channelId: 'default' },
      });
      if (!await isOwner(owner)) { await Notifications.cancelScheduledNotificationAsync(identifier); return; }
    }
    return { scheduled: Math.min(allDesired.size, capacity), deferred: Math.max(0, allDesired.size - capacity), enabled };
  });
  return syncing;
}

export function clearShiftReminders() {
  syncing = syncing.catch(() => {}).then(async () => {
    if (Platform.OS === 'web') return;
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(scheduled.filter((item) => item.identifier.startsWith('shiftsync:')).map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)));
  });
  return syncing;
}
