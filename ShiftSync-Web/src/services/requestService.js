import api from './api';

const STORAGE_KEY = 'shiftsync_requests_data';

const DEFAULT_REQUESTS = [
  {
    id: 'req-1',
    requesterName: 'Vivi.an',
    avatarKey: 'vivi',
    requestType: 'Yêu cầu hỗ trợ',
    typeCategory: 'support',
    status: 'Đang chờ phê duyệt',
    requestDate: '04-08-2026',
    requestTime: 'Ngày 04 tháng 08 năm 2026 vào 11h:32p',
    recipient: 'Quản lý cửa hàng (Store Manager)',
    startDate: '2026-08-08',
    endDate: '2026-08-08',
    shiftInfo: 'Ca A (06:00 - 12:00)',
    content: `Yêu cầu hỗ trợ nhân viên
Người gửi: Vivi (Quản lý)

Chào anh/chị quản lý, hiện tại quán em đang thiếu nhân sự trong ca làm sắp tới nên cần hỗ trợ thêm 1 nhân viên từ quán khác sang phụ giúp để đảm bảo hoạt động phục vụ khách hàng được ổn định.

Quán cần hỗ trợ nhân viên vào ngày 08/08/2026, ca A từ 06:00 đến 12:00.
Rất mong anh/chị hỗ trợ sắp xếp một nhân viên phù hợp từ quán khác sang hỗ trợ quán em trong ca này.

Cảm ơn anh/chị đã hỗ trợ!
Vivi – Quản lý quán`
  },
  {
    id: 'req-2',
    requesterName: 'Mew. Ama',
    avatarKey: 'mew',
    requestType: 'Yêu cầu nghỉ',
    typeCategory: 'leave',
    status: 'Đang chờ phê duyệt',
    requestDate: '04-08-2026',
    requestTime: 'Ngày 04 tháng 08 năm 2026 vào 09h:15p',
    recipient: 'Quản lý trực tiếp',
    startDate: '2026-08-06',
    endDate: '2026-08-07',
    shiftInfo: 'Cả ngày',
    content: `Kính gửi Quản lý cửa hàng,

Em xin phép được nghỉ phép 2 ngày (06/08/2026 - 07/08/2026) do gia đình có việc quan trọng cần giải quyết ở quê.
Em đã hoàn thành bàn giao công việc ca trực tuần này cho các bạn trong nhóm và sẽ quay trở lại làm việc đúng giờ vào ngày 08/08/2026.

Mong quản lý xem xét và phê duyệt giúp em ạ!
Em xin cảm ơn!`
  },
  {
    id: 'req-3',
    requesterName: 'Thia. Ago',
    avatarKey: 'thia',
    requestType: 'Yêu cầu đổi ca',
    typeCategory: 'swap',
    status: 'Đã phê duyệt',
    requestDate: '01-08-2026',
    requestTime: 'Ngày 01 tháng 08 năm 2026 vào 14h:20p',
    recipient: 'Quản lý ca',
    startDate: '2026-08-03',
    endDate: '2026-08-03',
    shiftInfo: 'Ca Chiều ⇄ Ca Sáng',
    content: `Kính gửi Quản lý,

Em viết đơn này xin phép hoán đổi ca làm việc ngày 03/08/2026 từ Ca Chiều (14:00 - 22:00) sang Ca Sáng (06:00 - 14:00) với bạn Paul. Lee do em có lịch thi học phần tại trường vào buổi chiều.
Bạn Paul. Lee đã đồng ý hỗ trợ và nhận ca chiều thay em.

Kính mong Ban quản lý phê duyệt hoán đổi ca trực.
Trân trọng!`
  },
  {
    id: 'req-4',
    requesterName: 'Dilan. Jon',
    avatarKey: 'dilan',
    requestType: 'Yêu cầu đổi ca',
    typeCategory: 'swap',
    status: 'Đã phê duyệt',
    requestDate: '01-08-2026',
    requestTime: 'Ngày 01 tháng 08 năm 2026 vào 16h:45p',
    recipient: 'Quản lý cửa hàng',
    startDate: '2026-08-05',
    endDate: '2026-08-05',
    shiftInfo: 'Ca Tối ⇄ Ca Sáng',
    content: `Kính gửi Quản lý,

Em xin phép đổi ca làm việc ngày 05/08/2026 từ Ca Tối sang Ca Sáng. Em đã trao đổi và thống nhất với bạn trong ca cùng chi nhánh để đảm bảo đủ quân số phục vụ khách hàng.

Kính nhờ Quản lý duyệt giúp em. Em cảm ơn!`
  }
];

/**
 * Lấy danh sách yêu cầu từ Backend API (/api/requests).
 * Tự động fallback về localStorage nếu backend chưa khởi động.
 */
export const getRequests = async () => {
  try {
    const response = await api.get('/requests');
    if (response.data && Array.isArray(response.data) && response.data.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(response.data));
      return response.data;
    }
  } catch (e) {
    console.info('Backend /api/requests offline or empty, using localStorage cache:', e.message);
  }

  // Fallback to localStorage / default
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_REQUESTS));
    return DEFAULT_REQUESTS;
  } catch (e) {
    console.warn('Error reading local requests cache:', e);
    return DEFAULT_REQUESTS;
  }
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

  const payload = {
    requesterName: requestData.requesterName || 'Paul. Lee',
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

  // Fallback to client-side localStorage
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

  // Fallback to client-side localStorage
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_REQUESTS));
  return DEFAULT_REQUESTS;
};
