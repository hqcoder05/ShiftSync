import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import api from './api';
import { getNetworkSnapshot, isNetworkFailure } from './networkState';
import { submitSelfieAttendance } from './attendanceService';

const listeners = new Set();
let persistence = Promise.resolve();
let syncing;
let revision = 0;
const serial = (work) => { const result = persistence.then(work); persistence = result.catch(() => {}); return result; };
export const subscribeAttendanceQueue = (listener) => { listeners.add(listener); return () => listeners.delete(listener); };
const changed = () => listeners.forEach((listener) => { try { listener(); } catch {} });
async function session() {
  const values = await AsyncStorage.multiGet(['userEmail', 'accessToken']);
  const email = values[0][1]?.trim().toLowerCase();
  return email && values[1][1] ? { email, key: `@attendance-queue:${email}` } : null;
}
const read = async (key) => JSON.parse(await AsyncStorage.getItem(key) || '[]');
export async function getPendingAttendance(userId) {
  const current = await session();
  if (!current || !userId) return [];
  return (await read(current.key)).filter((event) => String(event.userId) === String(userId));
}
// Keep the original evidence and timestamp; only retry after the cause was resolved.
export async function retryBlockedAttendance(eventId, userId) {
  const current = await session();
  if (!current || !eventId || !userId) throw new Error('Phiên chấm công chưa sẵn sàng.');
  await serial(async () => {
    if ((await session())?.email !== current.email) throw new Error('Tài khoản đã thay đổi.');
    const events = await read(current.key);
    const event = events.find((item) => item.id === eventId && String(item.userId) === String(userId));
    if (!event || (event.ownerEmail && event.ownerEmail !== current.email)) throw new Error('Không tìm thấy dữ liệu chấm công.');
    if (event.status !== 'blocked') return;
    await AsyncStorage.setItem(current.key, JSON.stringify(events.map((item) => item.id === eventId ? { ...item, status: 'pending', error: null } : item)));
    revision += 1;
  });
  changed();
  return syncAttendanceQueue();
}
async function persistPhoto(uri, id) {
  const context = ImageManipulator.manipulate(uri);
  let image, photo;
  try {
    context.resize({ width: 960 });
    image = await context.renderAsync();
    photo = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.6, base64: Platform.OS === 'web' });
    if (Platform.OS === 'web') {
      if (!photo.base64) throw new Error('Không lưu được ảnh chấm công.');
      return `data:image/jpeg;base64,${photo.base64}`;
    }
    const { Directory, File, Paths } = await import('expo-file-system');
    const directory = new Directory(Paths.document, 'attendance-queue');
    directory.create({ idempotent: true, intermediates: true });
    const target = new File(directory, `${id}.jpg`);
    try { new File(photo.uri).copy(target); }
    catch (error) { try { if (target.exists) target.delete(); } catch {} throw error; }
    return target.uri;
  } finally {
    if (Platform.OS === 'web' && typeof URL !== 'undefined') {
      new Set([image?.uri, photo?.uri]).forEach((value) => { if (value?.startsWith('blob:')) URL.revokeObjectURL?.(value); });
    }
    try { image?.release?.(); } catch {}
    try { context.release?.(); } catch {}
  }
}
async function deletePhoto(uri) {
  if (Platform.OS === 'web' || !uri?.startsWith('file:')) return;
  try { const { File } = await import('expo-file-system'); const file = new File(uri); if (file.exists) file.delete(); } catch {}
}
export async function recordAttendance(event) {
  const current = await session();
  if (!current || !event.userId || !['CHECK_IN', 'CHECK_OUT'].includes(event.action)) throw new Error('Phiên chấm công chưa sẵn sàng.');
  if (!event.shiftId || !event.photoUri || !Number.isFinite(Date.parse(event.capturedAt))) {
    throw new Error('Cần ảnh chụp, ca làm và giờ chụp gốc để lưu chấm công.');
  }
  if (!Number.isFinite(event.latitude) || !Number.isFinite(event.longitude)
      || Math.abs(event.latitude) > 90 || Math.abs(event.longitude) > 180) {
    throw new Error('Cần tọa độ GPS hợp lệ để lưu chấm công.');
  }
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const photoUri = await persistPhoto(event.photoUri, id);
  let queued;
  try {
    queued = await serial(async () => {
      const latest = await session();
      if (latest?.email !== current.email) throw new Error('Tài khoản đã thay đổi. Vui lòng chụp lại.');
      const events = await read(current.key);
      const duplicate = events.find((item) => String(item.userId) === String(event.userId) && String(item.shiftId) === String(event.shiftId) && item.action === event.action);
      if (duplicate) { await deletePhoto(photoUri); return duplicate; }
      const entry = { ...event, photoUri, id, ownerEmail: current.email, status: 'pending', error: null };
      await AsyncStorage.setItem(current.key, JSON.stringify([...events, entry]));
      revision += 1;
      return entry;
    });
  } catch (error) { await deletePhoto(photoUri); throw error; }
  changed();
  const results = await syncAttendanceQueue();
  const result = results?.find((item) => item.id === queued.id);
  return result || { queued: true, id: queued.id, ...(queued.status === 'blocked' ? { blocked: true, error: queued.error } : {}) };
}
function inSyncOrder(entries) {
  const shifts = new Map();
  entries.forEach((entry) => {
    const key = String(entry.shiftId);
    if (!shifts.has(key)) shifts.set(key, []);
    shifts.get(key).push(entry);
  });
  // A pending check-in must reach the server before its check-out, including after a restart.
  return [...shifts.values()].flatMap((events) => events.sort((a, b) =>
    Number(a.action === 'CHECK_OUT') - Number(b.action === 'CHECK_OUT')
    || (Date.parse(a.capturedAt) || 0) - (Date.parse(b.capturedAt) || 0)));
}
export async function syncAttendanceQueue() {
  if (!getNetworkSnapshot().online) return [];
  const current = await session().catch(() => null);
  if (!current) return [];
  if (syncing) {
    const flight = syncing;
    const results = await flight.promise;
    if ((await session().catch(() => null))?.email !== current.email) return [];
    const ownResults = flight.email === current.email ? results : [];
    if (flight.email !== current.email || flight.revision !== revision) return [...ownResults, ...await syncAttendanceQueue()];
    return ownResults;
  }
  const flight = { email: current.email, revision, promise: null };
  flight.promise = (async () => {
    const entries = inSyncOrder(await read(current.key));
    if (!entries.length) return [];
    const { data: user } = await api.get('/users/me', { expectedSessionEmail: current.email });
    const results = [], blockedShifts = new Set();
    for (const event of entries) {
      if (String(event.userId) !== String(user.id) || (event.ownerEmail && event.ownerEmail !== current.email)) continue;
      const shiftKey = String(event.shiftId);
      if (event.status === 'blocked' || blockedShifts.has(shiftKey)) {
        blockedShifts.add(shiftKey); continue;
      }
      try {
        const response = await submitSelfieAttendance({ ...event, ownerEmail: current.email });
        await serial(async () => {
          const latest = await read(current.key);
          await AsyncStorage.setItem(current.key, JSON.stringify(latest.filter((item) => item.id !== event.id)));
        });
        await deletePhoto(event.photoUri);
        results.push({ id: event.id, data: response.data, queued: false });
        changed();
      } catch (error) {
        if (error?.code === 'ATTENDANCE_PROTOCOL_UNSUPPORTED') {
          await serial(async () => {
            const latest = await read(current.key);
            await AsyncStorage.setItem(current.key, JSON.stringify(latest.map((item) => item.id === event.id ? { ...item, error: error.message } : item)));
          });
          results.push({ id: event.id, queued: true, error: error.message });
          changed(); break;
        }
        if (isNetworkFailure(error) || error?.response?.status === 401 || error?.response?.status === 429) break;
        const message = error.response?.data?.message || error.message;
        await serial(async () => {
          const latest = await read(current.key);
          await AsyncStorage.setItem(current.key, JSON.stringify(latest.map((item) => item.id === event.id ? { ...item, status: 'blocked', error: message } : item)));
        });
        results.push({ id: event.id, queued: true, blocked: true, error: message });
        blockedShifts.add(shiftKey); changed();
      }
    }
    return results;
  })().catch(() => []).finally(() => { if (syncing === flight) syncing = null; });
  syncing = flight;
  const results = await flight.promise;
  return (await session().catch(() => null))?.email === current.email ? results : [];
}
