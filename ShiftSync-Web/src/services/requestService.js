import api from './api';

/**
 * Lấy danh sách yêu cầu từ Backend API (/api/requests).
 * Backend là Source of Truth.
 */
export const getRequests = async () => {
  const response = await api.get('/requests');
  if (response.data !== undefined && response.data !== null) {
    return Array.isArray(response.data) ? response.data : (response.data?.content || []);
  }
  return [];
};

/**
 * Gửi yêu cầu mới lên Backend API (/api/requests).
 */
export const createRequest = async (requestData) => {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();

  const currentUserEmail = localStorage.getItem('userEmail') || 'staff';
  const defaultRequester = currentUserEmail.split('@')[0] || 'Nhân viên';

  const payload = {
    requesterName: requestData.requesterName || defaultRequester,
    avatarKey: requestData.avatarKey || 'paul',
    requestType: requestData.requestType || 'Yêu cầu hỗ trợ',
    typeCategory: requestData.typeCategory || 'support',
    recipient: requestData.recipient || 'Quản lý cửa hàng',
    startDate: requestData.startDate || `${year}-${month}-${day}`,
    endDate: requestData.endDate || `${year}-${month}-${day}`,
    shiftInfo: requestData.shiftInfo || 'Ca tiêu chuẩn',
    content: requestData.content || ''
  };

  const response = await api.post('/requests', payload);
  return response.data;
};

/**
 * Cập nhật trạng thái yêu cầu (Phê duyệt / Từ chối).
 */
export const updateRequestStatus = async (id, newStatus) => {
  const response = await api.put(`/requests/${id}/status`, { status: newStatus });
  return response.data;
};

export const resetDefaultRequests = () => {
  return [];
};
