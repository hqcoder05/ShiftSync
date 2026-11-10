import api from './api';
import { createLeaveRequest, getMyLeaveRequests } from './leaveService';
import { vietnamDateKey } from '../utils/vietnamTime';

export const toIsoDate = (dateStr) => {
  if (!dateStr) return vietnamDateKey();
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
export const getMyRequests = async (storeId, currentUserId) => {
  if (!currentUserId) return [];
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
          requesterId: l.staffId,
          requesterName: l.staffName,
          approvedById: l.approvedBy,
          approvedByName: l.approvedByName,
          reviewedAt: l.approvedAt,
          managerNote: l.rejectionReason,
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
          requesterId: r.requesterId,
          storeId: r.storeId,
          approvedById: r.reviewedById,
          approvedByName: r.reviewedByName,
          reviewedAt: r.reviewedAt,
          managerNote: r.managerNote,
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

  // 3. Fetch Real Shift Swap Requests from /api/users/me/swaps
  try {
    const swapRes = await api.get('/users/me/swaps');
    if (swapRes.data && Array.isArray(swapRes.data)) {
      swapRes.data.forEach((s) => {
        let statusLabel = 'Chờ đồng nghiệp duyệt';
        if (s.status === 'APPROVED') {
          statusLabel = 'Đã duyệt';
        } else if (s.status === 'REJECTED') {
          statusLabel = 'Từ chối';
        } else if (s.status === 'CANCELLED') {
          statusLabel = 'Đã huỷ';
        } else if (s.employeeAccepted) {
          statusLabel = 'Chờ Quản lý duyệt';
        }

        const fromTime = `${String(s.fromShiftStartTime || '').slice(0, 5)} - ${String(s.fromShiftEndTime || '').slice(0, 5)}`;
        const toTime = `${String(s.toShiftStartTime || '').slice(0, 5)} - ${String(s.toShiftEndTime || '').slice(0, 5)}`;

        allRequests.push({
          id: s.id,
          rawId: s.id,
          type: 'SWAP',
          typeCategory: 'swap',
          requestType: 'Yêu cầu đổi ca',
          typeLabel: 'Yêu cầu đổi ca',
          status: s.status || 'PENDING',
          employeeAccepted: !!s.employeeAccepted,
          statusLabel,
          fromStaffId: s.fromStaffId,
          fromStaffName: s.fromStaffName || 'Đồng nghiệp',
          toStaffId: s.toStaffId,
          toStaffName: s.toStaffName || 'Đồng nghiệp',
          fromShiftId: s.fromShiftId,
          fromShiftDate: s.fromShiftDate,
          fromShiftStartTime: s.fromShiftStartTime,
          fromShiftEndTime: s.fromShiftEndTime,
          toShiftId: s.toShiftId,
          toShiftDate: s.toShiftDate,
          toShiftStartTime: s.toShiftStartTime,
          toShiftEndTime: s.toShiftEndTime,
          date: s.fromShiftDate ? `${s.fromShiftDate} (${fromTime})` : '',
          requesterName: s.fromStaffName || 'Nhân viên',
          targetStaffName: s.toStaffName || '',
          shiftInfo: `Ca: ${s.fromShiftDate} (${fromTime}) ⇄ ${s.toShiftDate} (${toTime})`,
          content: `${s.fromStaffName} muốn đổi ca (${s.fromShiftDate} ${fromTime}) với ca (${s.toShiftDate} ${toTime}) của ${s.toStaffName}`,
          description: `${s.fromStaffName} muốn đổi ca (${s.fromShiftDate} ${fromTime}) với ca (${s.toShiftDate} ${toTime}) của ${s.toStaffName}`,
          reason: 'Hoán đổi ca làm việc giữa 2 nhân sự',
          createdAt: s.createdAt || null,
          employeeRespondedAt: s.employeeRespondedAt,
          approvedById: s.approvedById,
          approvedByName: s.approvedByName,
          reviewedAt: s.reviewedAt,
          managerNote: s.managerNote,
          cancelledAt: s.cancelledAt,
          cancelledById: s.cancelledById,
          cancelledByName: s.cancelledByName,
          isRealSwap: true,
        });
      });
    }
  } catch (err) {
    console.log('Error fetching swap requests from backend:', err.message);
  }

  return allRequests.filter((request) => {
    if (request.isRealSwap) {
      return String(request.fromStaffId) === String(currentUserId) || String(request.toStaffId) === String(currentUserId);
    }
    return String(request.requesterId) === String(currentUserId) &&
      (!storeId || !request.storeId || String(request.storeId) === String(storeId));
  }).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
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

  // 2. Real Swap Request via /api/users/me/swaps
  if ((requestData.type === 'SWAP' || requestData.typeCategory === 'swap') && requestData.fromShiftId && requestData.toStaffId && requestData.toShiftId) {
    const res = await api.post('/users/me/swaps', {
      fromShiftId: requestData.fromShiftId,
      toStaffId: requestData.toStaffId,
      toShiftId: requestData.toShiftId,
    });
    return res.data;
  }
  if (requestData.type === 'SWAP' || requestData.typeCategory === 'swap') {
    throw new Error('Vui lòng chọn ca của bạn và ca được phân công cho đồng nghiệp để đổi ca.');
  }

  // 2. Generic staff requests (SWAP, ABSENT, SUPPORT, etc.) -> POST /api/requests
  const category = (requestData.typeCategory || requestData.type || 'support').toLowerCase();
  let defaultRequestType = 'Yêu cầu hỗ trợ';
  if (category === 'swap') defaultRequestType = 'Yêu cầu đổi ca';
  else if (category === 'absent' || category === 'absence') defaultRequestType = 'Yêu cầu xin vắng';
  else if (category === 'leave') defaultRequestType = 'Yêu cầu xin nghỉ';

  const todayIso = vietnamDateKey();
  const startIso = requestData.startDate ? toIsoDate(requestData.startDate) : todayIso;
  const endIso = requestData.endDate ? toIsoDate(requestData.endDate) : startIso;

  const contentText = requestData.content || requestData.reason || requestData.description || 'Yêu cầu gửi tới Quản lý';

  const payload = {
    storeId: storeId || requestData.storeId,
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

export const cancelSwapRequest = (id) => api.post(`/swaps/${id}/cancel`);

// Display only persisted actors/timestamps. Legacy records may have no event time.
export const getRequestTimeline = (request) => {
  if (!request) return [];
  const status = request.status || 'PENDING';
  const approved = status === 'APPROVED';
  const rejected = status === 'REJECTED';
  const cancelled = status === 'CANCELLED';
  if (!request.isRealSwap) {
    return [
      { title: 'Đã gửi yêu cầu', state: 'done', actor: request.requesterName, at: request.createdAt },
      {
        title: approved ? 'Quản lý đã duyệt' : rejected ? 'Quản lý đã từ chối' : 'Chờ quản lý duyệt',
        state: approved ? 'done' : rejected ? 'error' : 'active',
        actor: request.approvedByName,
        at: request.reviewedAt,
        note: request.managerNote || request.rejectionReason,
      },
    ];
  }
  const accepted = !!request.employeeAccepted || approved;
  const managerReviewed = approved || !!request.approvedById || !!request.reviewedAt;
  const colleagueRejected = rejected && !accepted && !managerReviewed;
  return [
    {
      title: accepted ? 'Đồng nghiệp đã đồng ý' : colleagueRejected ? 'Đồng nghiệp đã từ chối' : 'Đồng nghiệp xác nhận',
      state: accepted ? 'done' : colleagueRejected ? 'error' : cancelled || managerReviewed ? 'waiting' : 'active',
      actor: request.toStaffName,
      at: request.employeeRespondedAt,
      note: !accepted && !rejected && !cancelled ? 'Chờ phản hồi từ đồng nghiệp nhận đổi ca.' : null,
    },
    {
      title: approved ? 'Quản lý đã duyệt' : rejected && managerReviewed ? 'Quản lý đã từ chối' : 'Quản lý phê duyệt',
      state: approved ? 'done' : rejected && managerReviewed ? 'error' : accepted && !cancelled && !rejected ? 'active' : 'waiting',
      actor: request.approvedByName,
      at: request.reviewedAt,
      note: request.managerNote,
    },
    {
      title: approved ? 'Đổi ca hoàn tất' : cancelled ? 'Yêu cầu đã hủy' : rejected ? 'Không thực hiện đổi ca' : 'Hoàn tất',
      state: approved ? 'done' : cancelled || rejected ? 'error' : 'waiting',
      actor: cancelled ? request.cancelledByName : null,
      at: cancelled ? request.cancelledAt : approved ? request.reviewedAt : null,
      note: approved ? 'Lịch làm của hai nhân viên đã được cập nhật.' : status === 'PENDING' ? 'Lịch làm được đổi sau khi quản lý phê duyệt.' : null,
    },
  ];
};
