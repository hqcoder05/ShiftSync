import api from './api';

/**
 * Lấy danh sách yêu cầu từ Backend API (/api/requests).
 * Chỉ ADMIN/MANAGER mới gọi được endpoint này.
 */
export const getRequests = async (status, typeCategory, search) => {
  const params = {};
  if (status) params.status = status;
  if (typeCategory) params.typeCategory = typeCategory;
  if (search) params.search = search;
  const response = await api.get('/requests', { params });
  const data = response.data;
  return Array.isArray(data) ? data : (data?.content || []);
};

/**
 * Lấy danh sách yêu cầu của chính người dùng đang đăng nhập.
 * Dùng cho nhân viên (STAFF) - endpoint /api/requests/me
 */
export const getMyRequests = async () => {
  const response = await api.get('/requests/me');
  const data = response.data;
  return Array.isArray(data) ? data : (data?.content || []);
};

/**
 * Gửi yêu cầu mới lên Backend API (/api/requests).
 * requesterName sẽ được tự động gán từ JWT token bởi Backend.
 */
export const createRequest = async (requestData) => {
  const now = new Date();
  const payload = {
    requesterName: requestData.requesterName || '',
    avatarKey: requestData.avatarKey || 'paul',
    requestType: requestData.requestType || 'Yêu cầu hỗ trợ',
    typeCategory: requestData.typeCategory || 'support',
    recipient: requestData.recipient || 'Quản lý cửa hàng',
    startDate: requestData.startDate || now.toISOString().slice(0, 10),
    endDate: requestData.endDate || now.toISOString().slice(0, 10),
    shiftInfo: requestData.shiftInfo || 'Ca tiêu chuẩn',
    content: requestData.content || ''
  };
  const response = await api.post('/requests', payload);
  return response.data;
};

/**
 * Cập nhật trạng thái yêu cầu (Phê duyệt / Từ chối).
 * ✅ Gửi đúng Enum Backend: APPROVED | REJECTED | PENDING
 */
export const updateRequestStatus = async (id, newStatus) => {
  // Chuẩn hoá sang Enum Backend
  const ENUM_MAP = {
    'APPROVED': 'APPROVED',
    'REJECTED': 'REJECTED',
    'PENDING': 'PENDING',
    'Đã phê duyệt': 'APPROVED',
    'Đã từ chối': 'REJECTED',
    'Đang chờ phê duyệt': 'PENDING',
  };
  const status = ENUM_MAP[newStatus] || newStatus;
  const response = await api.put(`/requests/${id}/status`, { status });
  return response.data;
};
