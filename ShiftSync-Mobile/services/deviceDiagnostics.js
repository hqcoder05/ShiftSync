import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const MINIMUM_FREE_STORAGE = 20 * 1024 * 1024;
export const formatStorageBytes = (bytes) => bytes >= 1024 ** 3
  ? `${(bytes / 1024 ** 3).toFixed(1)} GB` : `${Math.round(bytes / 1024 ** 2)} MB`;

export async function checkDeviceStorage() {
  const key = `@diagnostics:probe:${Date.now()}`, value = `ShiftSync:${Date.now()}`;
  let free, total, browser = false;
  try {
    await AsyncStorage.setItem(key, value);
    if (await AsyncStorage.getItem(key) !== value) throw new Error('Không đọc lại được dữ liệu vừa ghi.');
    if (Platform.OS === 'web') {
      if (typeof navigator === 'undefined' || !navigator.storage?.estimate) throw new Error('Trình duyệt không cung cấp dung lượng còn trống. Hãy kiểm tra trên ứng dụng điện thoại.');
      const estimate = await navigator.storage.estimate();
      total = estimate.quota; free = total - (estimate.usage || 0); browser = true;
    } else {
      const { Paths } = await import('expo-file-system');
      free = Paths.availableDiskSpace; total = Paths.totalDiskSpace;
    }
    if (!Number.isFinite(free) || free < 0 || !Number.isFinite(total) || total <= 0) throw new Error('Thiết bị không trả về dung lượng lưu trữ hợp lệ.');
    if (free < MINIMUM_FREE_STORAGE) throw new Error(`Chỉ còn ${formatStorageBytes(free)}. Cần ít nhất 20 MB trống để lưu ảnh chấm công khi ngoại tuyến.`);
    return `${browser ? 'Hạn mức trình duyệt' : 'Bộ nhớ thiết bị'} còn ${formatStorageBytes(free)} / ${formatStorageBytes(total)}. Ghi và đọc dữ liệu thành công.`;
  } finally { await AsyncStorage.removeItem(key); }
}
