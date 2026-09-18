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

  // 2. Fetch Generic Staff Requests (if any)
  try {
    const res = await api.get('/requests');
    if (res.data && Array.isArray(res.data)) {
      res.data.forEach((r) => {
        allRequests.push({
          id: r.id,
          rawId: r.id,
          type: r.type || 'OTHER',
          typeLabel: r.type === 'SWAP' ? 'Hỗ trợ đổi ca' : (r.type === 'ABSENT' ? 'Yêu cầu xin vắng' : 'Yêu cầu khác'),
          status: r.status || 'PENDING',
          statusLabel: r.status === 'APPROVED' ? 'Đã duyệt' : (r.status === 'REJECTED' ? 'Từ chối' : 'Chờ duyệt'),
          date: r.date || r.startDate || '',
          startDate: r.startDate,
          endDate: r.endDate,
          requesterName: r.requesterName || 'Nhân viên',
          targetStaffName: r.targetStaffName || '',
          shiftInfo: r.shiftInfo || '',
          description: r.description || r.reason || '',
          reason: r.reason || '',
          createdAt: r.createdAt,
        });
      });
    }
  } catch (err) {
    // ignore
  }

  return allRequests.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
};

// Tạo yêu cầu mới (Xin nghỉ, Đổi ca, Xin vắng)
export const createStaffRequest = async (requestData, storeId) => {
  // If request is a Leave Request, route directly to real Leave Request backend API
  if (requestData.type === 'LEAVE') {
    if (!storeId) {
      throw new Error('Không tìm thấy thông tin cửa hàng để gửi đơn xin nghỉ');
    }
    const isoStart = toIsoDate(requestData.startDate);
    const isoEnd = toIsoDate(requestData.endDate);
    const res = await createLeaveRequest(storeId, {
      leaveType: requestData.leaveType || 'ANNUAL',
      startDate: isoStart,
      endDate: isoEnd,
      reason: requestData.reason || '',
    });
    return res.data;
  }

  // Fallback for other request types
  const res = await api.post('/requests', requestData);
  return res.data;
};
