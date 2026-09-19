import api from './api';
import { createLeaveRequest, getMyLeaveRequests } from './leaveService';

export const toIsoDate = (dateStr) => {
  if (!dateStr) return new Date().toISOString().slice(0, 10);
  const trimmed = String(dateStr).trim();
  if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(trimmed)) {
    const parts = trimmed.split(/[-/]/);
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  return trimmed;
};

// Lấy danh sách yêu cầu thực tế từ Backend (Leave requests, Swaps, Adjustments)
export const getMyRequests = async (storeId) => {
  const allRequests = [];

  // 1. Fetch Real Leave Requests
  if (storeId) {
    try {
      const leaveRes = await getMyLeaveRequests(storeId);
      const leaveList = Array.isArray(leaveRes.data)
        ? leaveRes.data
        : (leaveRes.data?.content || []);
      
      leaveList.forEach((l) => {
        let typeLabel = 'Xin nghỉ phép';
        if (l.leaveType === 'SICK') typeLabel = 'Nghỉ ốm';
        else if (l.leaveType === 'EMERGENCY') typeLabel = 'Nghỉ khẩn cấp';
        else if (l.leaveType === 'UNPAID') typeLabel = 'Nghỉ không lương';
        else if (l.leaveType === 'ANNUAL') typeLabel = 'Nghỉ phép năm';

        allRequests.push({
          id: l.id,
          rawId: l.id,
          type: 'LEAVE',
          typeCategory: 'leave',
          leaveType: l.leaveType,
          requestedDays: l.requestedDays,
          storeId: l.storeId,
          typeLabel,
          status: l.status,
          statusLabel: l.status === 'APPROVED' ? 'Đã duyệt' : (l.status === 'REJECTED' ? 'Từ chối' : 'Chờ duyệt'),
          startDate: l.startDate,
          endDate: l.endDate,
          date: l.startDate && l.endDate ? `${l.startDate} → ${l.endDate}` : (l.startDate || ''),
          reason: l.reason || '',
          content: l.reason || '',
          rejectionReason: l.rejectionReason,
          description: l.status === 'APPROVED'
            ? `Đơn xin nghỉ (${l.requestedDays || 1} ngày) đã được Quản lý phê duyệt.`
            : (l.status === 'REJECTED'
              ? `Đơn đã bị từ chối: ${l.rejectionReason || 'Không có lý do cụ thể'}`
              : `Đơn xin nghỉ (${l.requestedDays || 1} ngày) đang chờ Quản lý phê duyệt.`),
          createdAt: l.createdAt,
        });
      });
    } catch (err) {
      console.log('Error fetching leave requests from backend:', err.message);
    }
  }

  // 2. Fetch Generic Staff Requests (SWAP, ABSENT, SUPPORT)
  try {
    const res = await api.get('/requests');
    if (res.data && Array.isArray(res.data)) {
      res.data.forEach((r) => {
        const cat = (r.typeCategory || '').toLowerCase();
        let type = 'OTHER';
        let typeLabel = r.requestType || 'Yêu cầu hỗ trợ';
        if (cat === 'swap' || (r.requestType && r.requestType.toLowerCase().includes('đổi'))) {
          type = 'SWAP';
          typeLabel = 'Yêu cầu đổi ca';
        } else if (cat === 'absence' || cat === 'absent' || (r.requestType && r.requestType.toLowerCase().includes('vắng'))) {
          type = 'ABSENT';
          typeLabel = 'Yêu cầu xin vắng';
        } else if (cat === 'leave' || (r.requestType && r.requestType.toLowerCase().includes('nghỉ'))) {
          type = 'LEAVE';
          typeLabel = 'Yêu cầu xin nghỉ';
        }

        allRequests.push({
          id: r.id,
          rawId: r.id,
          type,
          typeCategory: r.typeCategory,
          requestType: r.requestType,
          typeLabel,
          status: r.status || 'PENDING',
          statusLabel: r.status === 'APPROVED' ? 'Đã duyệt' : (r.status === 'REJECTED' ? 'Từ chối' : 'Chờ duyệt'),
          date: r.requestDate || (r.startDate && r.endDate ? `${r.startDate} → ${r.endDate}` : (r.startDate || '')),
          requestDate: r.requestDate,
          requestTime: r.requestTime,
          startDate: r.startDate,
          endDate: r.endDate,
          requesterName: r.requesterName || 'Nhân viên',
          avatarKey: r.avatarKey,
          targetStaffName: r.targetStaffName || '',
          shiftInfo: r.shiftInfo || '',
          content: r.content || '',
          description: r.content || '',
          reason: r.content || '',
          recipient: r.recipient || 'Quản lý cửa hàng',
          createdAt: r.createdAt,
        });
      });
    }
  } catch (err) {
    console.log('Error fetching staff requests from backend:', err.message);
  }

  return allRequests.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
};

// Tạo yêu cầu mới (Xin nghỉ, Đổi ca, Xin vắng)
export const createStaffRequest = async (requestData, storeId) => {
  // 1. If request is a Leave Request, route to real Leave Request backend API
  if (requestData.type === 'LEAVE' || requestData.typeCategory === 'leave') {
    if (!storeId) {
      throw new Error('Không tìm thấy thông tin cửa hàng của bạn để gửi đơn xin nghỉ phép.');
    }
    const isoStart = toIsoDate(requestData.startDate);
    const isoEnd = toIsoDate(requestData.endDate);
    const res = await createLeaveRequest(storeId, {
      leaveType: requestData.leaveType || 'ANNUAL',
      startDate: isoStart,
      endDate: isoEnd,
      reason: requestData.reason || requestData.content || '',
    });
    return res.data;
  }

  // 2. Generic staff requests (SWAP, ABSENT, SUPPORT, etc.) -> POST /api/requests
  const category = (requestData.typeCategory || requestData.type || 'support').toLowerCase();
  let defaultRequestType = 'Yêu cầu hỗ trợ';
  if (category === 'swap') defaultRequestType = 'Yêu cầu đổi ca';
  else if (category === 'absent' || category === 'absence') defaultRequestType = 'Yêu cầu xin vắng';
  else if (category === 'leave') defaultRequestType = 'Yêu cầu xin nghỉ';

  const todayIso = new Date().toISOString().slice(0, 10);
  const startIso = requestData.startDate ? toIsoDate(requestData.startDate) : todayIso;
  const endIso = requestData.endDate ? toIsoDate(requestData.endDate) : startIso;

  const contentText = requestData.content || requestData.reason || requestData.description || 'Yêu cầu gửi tới Quản lý';

  const payload = {
    requesterName: requestData.requesterName || undefined,
    avatarKey: requestData.avatarKey || 'paul',
    requestType: requestData.requestType || defaultRequestType,
    typeCategory: category === 'absent' ? 'absence' : category,
    recipient: requestData.recipient || 'Quản lý cửa hàng (Store Manager)',
    startDate: startIso,
    endDate: endIso,
    shiftInfo: requestData.shiftInfo || 'Ca tiêu chuẩn',
    content: contentText,
  };

  const res = await api.post('/requests', payload);
  return res.data;
};
