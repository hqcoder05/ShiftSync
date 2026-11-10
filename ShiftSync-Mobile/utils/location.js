import { Linking, Platform } from 'react-native';
export function haversineMeters(a, b) {
  const values = [a?.latitude, a?.longitude, b?.latitude, b?.longitude];
  if (values.some((value) => value == null || value === '' || !Number.isFinite(Number(value)))) return null;
  const [lat1, lon1, lat2, lon2] = values.map(Number);
  if (Math.abs(lat1) > 90 || Math.abs(lat2) > 90 || Math.abs(lon1) > 180 || Math.abs(lon2) > 180) return null;
  const rad = (n) => n * Math.PI / 180;
  const dLat = rad(lat2 - lat1), dLon = rad(lon2 - lon1);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}
export function attendanceLocationError(location, radius, now = Date.now()) {
  if (haversineMeters(location?.coords, location?.coords) == null) return 'GPS chưa có tọa độ hợp lệ. Hãy cập nhật vị trí rồi thử lại.';
  if (!Number.isFinite(location.timestamp) || now - location.timestamp > 30000 || location.timestamp - now > 10000) return 'Vị trí GPS đã cũ. Hãy cập nhật vị trí rồi chụp lại.';
  const accuracy = location.coords.accuracy;
  if (!Number.isFinite(accuracy) || accuracy < 0 || accuracy > Math.max(50, Number(radius) || 0)) return 'Tín hiệu GPS chưa đủ chính xác. Di chuyển tới nơi thoáng rồi thử lại.';
  return '';
}
export function openStoreMap(store) {
  const valid = haversineMeters(store, store) != null;
  const query = valid ? `${Number(store.latitude)},${Number(store.longitude)}` : store.address || store.storeAddress || store.name || store.storeName;
  if (!query) return Promise.reject(new Error('Chưa có địa chỉ cửa hàng.'));
  const url = Platform.OS === 'ios' ? `https://maps.apple.com/?daddr=${encodeURIComponent(query)}` : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;
  return Linking.openURL(url);
}
