import api from './api';

const STORAGE_KEY = 'shiftsync_requests_data';

/**
 * Lấy danh sách yêu cầu từ Backend API (/api/requests).
 * Nếu BE trả về mảng rỗng [], trả về [] (không chèn dữ liệu ảo).
 */
export const getRequests = async () => {
  try {
    const response = await api.get('/requests');
    if (response.data !== undefined && response.data !== null) {
      const data = Array.isArray(response.data) ? response.data : (response.data?.content || []);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return data;
    }
  } catch (e) {
    console.info('Backend /api/requests offline, reading local cache:', e.message);
  }

  // Fallback to localStorage cache nếu backend offline
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Error reading local requests cache:', e);
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
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');

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

  try {
    const response = await api.post('/requests', payload);
    if (response.data) {
      // Sync local cache
      const current = await getRequests();
      const updated = [response.data, ...current.filter(c => c.id !== response.data.id)];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return response.data;
    }
  } catch (e) {
    console.info('Backend createRequest API offline, saving to localStorage:', e.message);
  }

  // Fallback to client-side localStorage khi offline
  const current = await getRequests();
  const newReq = {
    id: `req-${Date.now()}`,
    ...payload,
    status: 'Đang chờ phê duyệt',
    requestDate: `${day}-${month}-${year}`,
    requestTime: `Ngày ${day} tháng ${month} năm ${year} vào ${hours}h:${minutes}p`
  };

  const updated = [newReq, ...current];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return newReq;
};

/**
 * Cập nhật trạng thái yêu cầu (Phê duyệt / Từ chối).
 */
export const updateRequestStatus = async (id, newStatus) => {
  try {
    const response = await api.put(`/requests/${id}/status`, { status: newStatus });
    if (response.data) {
      const current = await getRequests();
      const updated = current.map(item => item.id === id ? { ...item, ...response.data, status: newStatus } : item);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return response.data;
    }
  } catch (e) {
    console.info('Backend updateRequestStatus API offline, updating localStorage:', e.message);
  }

  // Fallback to client-side localStorage khi offline
  const current = await getRequests();
  const updated = current.map(item => {
    if (item.id === id) {
      return { ...item, status: newStatus };
    }
    return item;
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated.find(i => i.id === id);
};

export const resetDefaultRequests = () => {
  localStorage.removeItem(STORAGE_KEY);
  return [];
};
