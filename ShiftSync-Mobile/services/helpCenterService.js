import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

const sameId = (left, right) => left != null && right != null && String(left) === String(right);

export async function loadHelpCenterContext(storeId) {
  const email = (await AsyncStorage.getItem('userEmail'))?.trim().toLowerCase();
  if (!email) throw new Error('Vui lòng đăng nhập lại để xem hỗ trợ của chi nhánh.');
  const config = { expectedSessionEmail: email };
  const { data: user } = await api.get('/users/me', config);
  const { data: memberships } = await api.get(`/users/${user.id}/stores`, config);
  if (!Array.isArray(memberships)) throw new Error('Không tải được danh sách chi nhánh.');
  const stores = memberships.filter((store) => store.status === 'ACTIVE');
  const store = stores.find((item) => sameId(item.storeId || item.id, storeId)) || stores[0];
  const activeStoreId = store?.storeId || store?.id;
  if (!activeStoreId) return { user, stores, email, store: null, contact: null, configuration: null };
  const [support, configuration] = await Promise.allSettled([
    api.get(`/stores/${activeStoreId}/support`, config),
    api.get(`/stores/${activeStoreId}/configuration`, config),
  ]);
  return {
    user, stores, email, store,
    contact: support.status === 'fulfilled' ? support.value.data : null,
    supportError: support.status === 'rejected' ? support.reason : null,
    configuration: configuration.status === 'fulfilled' ? configuration.value.data : null,
  };
}

export function validateSupportContact({ supportPhone, supportLabel }) {
  const phone = String(supportPhone || '').trim();
  const label = String(supportLabel || '').trim();
  if (phone && !/^\+?\d{3,15}$/.test(phone)) throw new Error('Hotline cần 3–15 chữ số, có thể bắt đầu bằng dấu +.');
  if (label.length > 80) throw new Error('Tên liên hệ tối đa 80 ký tự.');
  return { supportPhone: phone || null, supportLabel: label || null };
}

export async function saveSupportContact(storeId, contact, email) {
  if (!storeId || !email) throw new Error('Phiên chi nhánh chưa sẵn sàng. Vui lòng tải lại.');
  const payload = validateSupportContact(contact);
  const { data } = await api.put(`/stores/${storeId}/support`, payload, { expectedSessionEmail: email });
  return data;
}
