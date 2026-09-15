import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateMyAvatar } from './profileService';
import { AVATAR_OPTIONS } from '../components/avatarConfigs';

const DEFAULT_AVATAR_ID = 'dilan';
const listeners = new Set();

/**
 * Đăng ký listener để nhận cập nhật Avatar tức thời giữa các màn hình (Profile <-> Dashboard)
 */
export function onAvatarChange(listener) {
  if (typeof listener === 'function') {
    listeners.add(listener);
  }
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Thông báo cho tất cả listener khi avatar thay đổi
 */
export function notifyAvatarChange(avatarId) {
  listeners.forEach((listener) => {
    try {
      listener(avatarId);
    } catch (err) {
      console.warn('Error in avatar listener:', err);
    }
  });
}

/**
 * Lấy avatar đã lưu trong AsyncStorage (ưu tiên user-specific, fallback sang key chung)
 */
export async function getStoredAvatar(userId = null) {
  try {
    if (userId) {
      const userAvatar = await AsyncStorage.getItem(`@user_profile_avatar_${userId}`);
      if (userAvatar && AVATAR_OPTIONS.some((a) => a.id === userAvatar)) {
        return userAvatar;
      }
    }
    const globalAvatar = await AsyncStorage.getItem('@user_profile_avatar');
    if (globalAvatar && AVATAR_OPTIONS.some((a) => a.id === globalAvatar)) {
      return globalAvatar;
    }
  } catch (e) {
    console.warn('Failed to read stored avatar:', e);
  }
  return DEFAULT_AVATAR_ID;
}

/**
 * Lưu avatar 3D:
 * 1. Lưu tức thời vào AsyncStorage (cả key chung lẫn user key)
 * 2. Bắn sự kiện realtime cho các màn hình đang mở (Dashboard, Profile)
 * 3. Đồng bộ lên Backend API trong nền
 */
export async function saveAvatar(avatarId, userId = null) {
  if (!avatarId || !AVATAR_OPTIONS.some((a) => a.id === avatarId)) {
    return false;
  }

  // 1. Lưu ngay vào local storage
  try {
    await AsyncStorage.setItem('@user_profile_avatar', avatarId);
    if (userId) {
      await AsyncStorage.setItem(`@user_profile_avatar_${userId}`, avatarId);
    }
  } catch (e) {
    console.warn('Failed to save avatar to AsyncStorage:', e);
  }

  // 2. Cập nhật UI ngay lập tức
  notifyAvatarChange(avatarId);

  // 3. Đồng bộ Backend API (background, không chặn UI)
  try {
    await updateMyAvatar(avatarId);
    return true;
  } catch (e) {
    console.log('Failed to sync avatar to backend (saved locally):', e?.message);
    return false;
  }
}
