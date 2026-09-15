import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'shiftsync_mobile_requests';

function toIsoDate(dStr) {
  if (!dStr) return new Date().toISOString().split('T')[0];
  if (typeof dStr !== 'string') return new Date().toISOString().split('T')[0];
  if (dStr.includes('-')) {
    const parts = dStr.split('-');
    if (parts[0].length === 4) return dStr; // YYYY-MM-DD
    if (parts[2]?.length === 4) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`; // DD-MM-YYYY -> YYYY-MM-DD
  }
  if (dStr.includes('/')) {
    const parts = dStr.split('/');
    if (parts[2]?.length === 4) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return new Date().toISOString().split('T')[0];
}

function mapBackendRequest(r) {
  const isApproved = r.status === 'APPROVED';
  const isRejected = r.status === 'REJECTED';
  const statusLabel = isApproved ? 'Đã duyệt' : (isRejected ? 'Từ chối' : 'Chờ Duyệt');

  return {
    id: r.id,
    type: (r.typeCategory || 'leave').toUpperCase(),
    typeLabel: r.requestType || (r.typeCategory === 'swap' ? 'Yêu cầu đổi ca' : (r.typeCategory === 'absence' ? 'Yêu cầu xin vắng' : 'Yêu cầu nghỉ')),
    status: r.status,
    statusLabel,
    date: r.requestDate || (r.createdAt ? new Date(r.createdAt).toLocaleDateString('vi-VN').replace(/\//g, '-') : ''),
    requestDate: r.requestDate,
    requestTime: r.requestTime,
    startDate: r.startDate,
    endDate: r.endDate,
    requesterName: r.requesterName,
    recipient: r.recipient,
    shiftInfo: r.shiftInfo,
    description: r.content || 'Đơn của bạn đang chờ Quản lý xem xét.',
    reason: r.content,
    content: r.content,
    raw: r,
  };
}

// Lấy danh sách yêu cầu thực tế từ Backend API (/requests/me hoặc /requests)
export const getMyRequests = async () => {
  try {
    let res;
    try {
      res = await api.get('/requests/me');
    } catch {
      res = await api.get('/requests');
    }

    if (res && res.data && Array.isArray(res.data)) {
      const mapped = res.data.map(mapBackendRequest);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
      return mapped;
    }
  } catch (err) {
    console.log('Mobile getMyRequests API error, reading local cache:', err.message);
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

// Tạo yêu cầu mới (Xin nghỉ, Đổi ca, Xin vắng) gửi lên Backend DB thực
export const createStaffRequest = async (requestData) => {
  const typeMapping = {
    LEAVE: { requestType: 'Yêu cầu nghỉ', typeCategory: 'leave' },
    SWAP: { requestType: 'Yêu cầu đổi ca', typeCategory: 'swap' },
    ABSENT: { requestType: 'Yêu cầu xin vắng', typeCategory: 'absence' },
    SUPPORT: { requestType: 'Yêu cầu hỗ trợ', typeCategory: 'support' },
  };

  const mapped = typeMapping[requestData.type] || {
    requestType: requestData.requestType || 'Yêu cầu nghỉ',
    typeCategory: requestData.typeCategory || 'leave',
  };

  const contentText = requestData.content || requestData.reason || 'Yêu cầu từ nhân viên';

  const payload = {
    requesterName: requestData.requesterName || 'Nhân viên',
    avatarKey: requestData.avatarKey || 'dilan',
    requestType: mapped.requestType,
    typeCategory: mapped.typeCategory,
    type: requestData.type,
    recipient: requestData.recipient || 'Quản lý cửa hàng',
    startDate: toIsoDate(requestData.startDate),
    endDate: toIsoDate(requestData.endDate || requestData.startDate),
    shiftInfo: requestData.shiftInfo || 'Ca làm việc',
    content: contentText,
    reason: contentText,
  };

  try {
    const res = await api.post('/requests', payload);
    if (res.data) {
      const mappedResult = mapBackendRequest(res.data);
      await saveRequestToLocal(mappedResult);
      return mappedResult;
    }
  } catch (err) {
    console.log('Mobile createStaffRequest API error, saving to local:', err.message);
  }

  // Tạo local request object khi offline
  const newReq = {
    id: `req-${Date.now()}`,
    type: requestData.type || 'LEAVE',
    typeLabel: mapped.requestType,
    status: 'PENDING',
    statusLabel: 'Chờ Duyệt',
    date: new Date().toLocaleDateString('vi-VN').replace(/\//g, '-'),
    startDate: requestData.startDate || new Date().toLocaleDateString('vi-VN').replace(/\//g, '-'),
    endDate: requestData.endDate || requestData.startDate || new Date().toLocaleDateString('vi-VN').replace(/\//g, '-'),
    requesterName: requestData.requesterName || 'Nhân viên',
    targetStaffName: requestData.targetStaffName || '',
    shiftInfo: requestData.shiftInfo || '',
    description: contentText,
    reason: contentText,
    content: contentText,
  };

  await saveRequestToLocal(newReq);
  return newReq;
};

// Helper lưu vào AsyncStorage
async function saveRequestToLocal(newReq) {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const updated = [newReq, ...list.filter((item) => item.id !== newReq.id)];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.log('Error saving to AsyncStorage:', e);
  }
}
