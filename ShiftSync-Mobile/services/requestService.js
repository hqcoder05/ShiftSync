import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'shiftsync_mobile_requests';

// Lấy danh sách yêu cầu thực tế từ Backend API (/requests)
export const getMyRequests = async () => {
  try {
    const res = await api.get('/requests');
    if (res.data && Array.isArray(res.data)) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(res.data));
      return res.data;
    }
  } catch (err) {
    console.log('Mobile getMyRequests API offline, reading local cache:', err.message);
  }

  // Fallback reading cached requests
  try {
    const local = await AsyncStorage.getItem(STORAGE_KEY);
    if (local) {
      return JSON.parse(local);
    }
  } catch (e) {
    console.log('Error reading cached requests:', e);
  }

  return [];
};

// Tạo yêu cầu mới (Xin nghỉ, Đổi ca, Xin vắng)
export const createStaffRequest = async (requestData) => {
  try {
    const res = await api.post('/requests', requestData);
    if (res.data) {
      await saveRequestToLocal(res.data);
      return res.data;
    }
  } catch (err) {
    console.log('Mobile createStaffRequest API offline, saving to local:', err.message);
  }

  // Tạo local request object khi offline
  const newReq = {
    id: `req-${Date.now()}`,
    type: requestData.type || 'LEAVE',
    typeLabel: requestData.type === 'SWAP' ? 'Hỗ trợ đổi ca' : (requestData.type === 'ABSENT' ? 'Yêu cầu xin vắng' : 'Xin nghỉ'),
    status: 'PENDING',
    statusLabel: 'Chờ Duyệt',
    date: new Date().toLocaleDateString('vi-VN').replace(/\//g, '-'),
    startDate: requestData.startDate || new Date().toLocaleDateString('vi-VN').replace(/\//g, '-'),
    endDate: requestData.endDate || new Date().toLocaleDateString('vi-VN').replace(/\//g, '-'),
    requesterName: requestData.requesterName || 'Nhân viên',
    targetStaffName: requestData.targetStaffName || '',
    shiftInfo: requestData.shiftInfo || '',
    description: 'Đơn của bạn đang chờ Quản lý xem xét và phê duyệt.',
    reason: requestData.reason || '',
  };

  await saveRequestToLocal(newReq);
  return newReq;
};

// Helper lưu vào AsyncStorage
async function saveRequestToLocal(newReq) {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const updated = [newReq, ...list.filter(item => item.id !== newReq.id)];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.log('Error saving to AsyncStorage:', e);
  }
}
