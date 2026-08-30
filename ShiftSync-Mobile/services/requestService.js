import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'shiftsync_mobile_requests';

// Dữ liệu mẫu ban đầu khớp với ảnh 2 & 5 trong Yêu cầu xin nghỉ_mobile.docx
const INITIAL_MOCK_REQUESTS = [
  {
    id: 'req-001',
    type: 'LEAVE',
    typeLabel: 'Xin nghỉ',
    status: 'PENDING',
    statusLabel: 'Chờ Duyệt',
    date: '25-10-2026',
    startDate: '25-10-2026',
    endDate: '27-10-2026',
    requesterName: 'Dilan. Jon',
    description: 'Đơn của bạn đang chờ Quản lý xem xét và phê duyệt.',
    reason: 'Em có việc gia đình đột xuất cần về quê 3 ngày. Mong Quản lý xem xét phê duyệt giúp em ạ!',
  },
  {
    id: 'req-002',
    type: 'LEAVE',
    typeLabel: 'Xin nghỉ',
    status: 'REJECTED',
    statusLabel: 'Từ Chối',
    date: '22-09-2026',
    startDate: '30-10-2026',
    endDate: '05-11-2026',
    requesterName: 'Dilan. Jon',
    description: 'Quản lý đã từ chối yêu cầu của bạn. Bấm để xem lý do.',
    reason: 'Em chào Quản lý, em bị sốt đột xuất nên thể trạng hôm nay không đảm bảo để đi làm. Em xin phép được vắng ca này để đi khám và nghỉ ngơi. Mong Quản lý xem xét duyệt đơn giúp em ạ!',
    rejectReason: 'Chi nhánh đang thiếu nhân sự trong khung giờ này, bạn vui lòng tìm người đổi ca thay thế nhé.',
  },
  {
    id: 'req-003',
    type: 'SWAP',
    typeLabel: 'Hỗ trợ đổi ca',
    status: 'APPROVED',
    statusLabel: 'Đã Duyệt',
    date: '04-03-2026',
    startDate: '04-03-2026',
    endDate: '04-03-2026',
    requesterName: 'Dilan. Jon',
    targetStaffName: 'Mew. Ama',
    shiftInfo: '6:00AM - 15:00PM (Barista)',
    description: 'Yêu cầu đã được duyệt! Quản lý đã phê duyệt yêu cầu của bạn. Lịch làm việc đã cập nhật.',
    reason: 'Em bận lịch thi học phần buổi sáng nên đã thỏa thuận đổi ca với bạn Mew. Ama.',
  },
];

// Lấy danh sách yêu cầu (gọi API thật + fallback local storage)
export const getMyRequests = async () => {
  try {
    const res = await api.get('/requests');
    if (res.data && Array.isArray(res.data) && res.data.length > 0) {
      return res.data;
    }
  } catch (err) {
    console.log('Mobile getMyRequests API fallback to local storage:', err.message);
  }

  // Fallback local storage
  try {
    const local = await AsyncStorage.getItem(STORAGE_KEY);
    if (local) {
      return JSON.parse(local);
    }
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_MOCK_REQUESTS));
    return INITIAL_MOCK_REQUESTS;
  } catch (e) {
    return INITIAL_MOCK_REQUESTS;
  }
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
    console.log('Mobile createStaffRequest API fallback to local:', err.message);
  }

  // Tạo local request object
  const newReq = {
    id: `req-${Date.now()}`,
    type: requestData.type || 'LEAVE',
    typeLabel: requestData.type === 'SWAP' ? 'Hỗ trợ đổi ca' : (requestData.type === 'ABSENT' ? 'Yêu cầu xin vắng' : 'Xin nghỉ'),
    status: 'PENDING',
    statusLabel: 'Chờ Duyệt',
    date: new Date().toLocaleDateString('vi-VN').replace(/\//g, '-'),
    startDate: requestData.startDate || new Date().toLocaleDateString('vi-VN').replace(/\//g, '-'),
    endDate: requestData.endDate || new Date().toLocaleDateString('vi-VN').replace(/\//g, '-'),
    requesterName: requestData.requesterName || 'Dilan. Jon',
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
    const list = raw ? JSON.parse(raw) : INITIAL_MOCK_REQUESTS;
    const updated = [newReq, ...list];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.log('Error saving to AsyncStorage:', e);
  }
}
