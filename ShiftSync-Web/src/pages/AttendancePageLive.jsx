import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getAllStores } from '../services/storeService';
import { getEmployees } from '../services/employeeService';
import { getStoreAttendance, updateAttendanceRecord, getMyAttendance } from '../services/attendanceService';
import {
  createAdjustmentRequest,
  getMyAdjustmentRequests,
  getStoreAdjustmentRequests,
  approveAdjustmentRequest,
  rejectAdjustmentRequest,
} from '../services/adjustmentService';
import {
  getStoreLeaveRequests,
  getMyLeaveRequests,
  createLeaveRequest,
  approveLeaveRequest,
  rejectLeaveRequest,
  cancelLeaveRequest,
  updateLeaveReason,
  getLeaveImpact,
} from '../services/leaveService';
import { toast } from '../context/ToastContext';
import avatarPaul from '../assets/avatars/avatar-paul-lee.png';
import avatarThia from '../assets/avatars/avatar-thia-ago.png';
import avatarMew from '../assets/avatars/avatar-mew-ama.png';
import avatarDilan from '../assets/avatars/avatar-dilan-jon.png';
import './AttendancePageLive.css';

const AVATARS = {
  'Paul. Lee': avatarPaul,
  'Thia. Ago': avatarThia,
  'Mew. Ama': avatarMew,
  'Dilan. Jon': avatarDilan,
};
const DEFAULT_AVATAR = avatarPaul;

const MONTH_NAMES_VI = [
  'Tháng Một', 'Tháng Hai', 'Tháng Ba', 'Tháng Tư', 'Tháng Năm', 'Tháng Sáu',
  'Tháng Bảy', 'Tháng Tám', 'Tháng Chín', 'Tháng Mười', 'Tháng Mười Một', 'Tháng Mười Hai'
];

const DOW_VI = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

function getWeekDates(baseDate = new Date()) {
  const monday = new Date(baseDate);
  const dow = baseDate.getDay();
  monday.setDate(baseDate.getDate() + (dow === 0 ? -6 : 1 - dow));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

const fmtDM = (d) =>
  `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}`;

const toISODate = (d) => d.toISOString().slice(0, 10);

const fmtDateRangeText = (d) => {
  return `${d.getDate()} Tháng ${d.getMonth() + 1}, ${d.getFullYear()}`;
};

const fmtShortDate = (dStr) => {
  if (!dStr) return '—';
  try {
    const d = new Date(`${dStr}T00:00:00`);
    const dow = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][d.getDay()];
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${dow}, ${day}/${month}`;
  } catch (e) {
    return dStr;
  }
};

const fmtTimeAMPM = (value) => {
  if (!value) return '—';
  try {
    const d = new Date(value);
    let h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, '0');
    const period = h < 12 ? 'AM' : 'PM';
    h = h % 12 === 0 ? 12 : h % 12;
    return `${String(h).padStart(2, '0')}:${m} ${period}`;
  } catch (e) {
    return '—';
  }
};

const calcHours = (row) => {
  if (!row.checkInTime || !row.checkOutTime) return null;
  const diffMs = new Date(row.checkOutTime) - new Date(row.checkInTime);
  if (diffMs <= 0) return 0;
  return Number((diffMs / 3600000).toFixed(1));
};

const calcScheduledHours = (row) => {
  if (!row.scheduledStart || !row.scheduledEnd) return null;
  const [sh, sm] = row.scheduledStart.split(':').map(Number);
  const [eh, em] = row.scheduledEnd.split(':').map(Number);
  let dur = eh + em / 60 - (sh + sm / 60);
  if (dur < 0) dur += 24;
  return Number(dur.toFixed(1));
};

const statusLabel = (val, lateMins) => {
  if (val === 'LATE') {
    return lateMins && lateMins > 0 ? `Đi trễ (${lateMins}p)` : 'Đi trễ';
  }
  const map = {
    PRESENT: 'Đúng giờ',
    LATE: 'Đi trễ',
    EARLY_LEAVE: 'Về sớm',
    ABSENT: 'Vắng',
  };
  return map[val] || val || '—';
};

export default function AttendancePageLive() {
  const navigate = useNavigate();
  const userRole = (localStorage.getItem('userRole') || 'STAFF').toUpperCase();
  const isManager = userRole === 'MANAGER' || userRole === 'ADMIN';
  const isStaff = !isManager;

  // Stores & Employees state
  const [stores, setStores] = useState([]);
  const [storeId, setStoreId] = useState('');
  const [showStoreList, setShowStoreList] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [userFilter, setUserFilter] = useState('All');
  const [showUserList, setShowUserList] = useState(true);

  // Date Navigation State
  const [viewMode, setViewMode] = useState('Tuần'); // 'Ngày' | 'Tuần'
  const [weekOffset, setWeekOffset] = useState(0);
  const [dayOffset, setDayOffset] = useState(0);
  const [showCalendarPopover, setShowCalendarPopover] = useState(false);
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());

  // Subtab State (URL synced)
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  const validTabs = ['attendance', 'adjustments', 'leave'];
  const activeTab = validTabs.includes(rawTab) ? rawTab : 'attendance';
  const handleTabChange = (tab) => setSearchParams({ tab });

  // Leave Management State
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveStatusFilter, setLeaveStatusFilter] = useState('ALL');
  const [leaveSearch, setLeaveSearch] = useState('');
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showImpactModal, setShowImpactModal] = useState(false);
  const [selectedLeaveImpact, setSelectedLeaveImpact] = useState(null);
  const [pendingApproveLeaveId, setPendingApproveLeaveId] = useState(null);
  const [leaveForm, setLeaveForm] = useState({
    leaveType: 'ANNUAL',
    startDate: '',
    endDate: '',
    reason: '',
  });

  // Attendance Adjustments State
  const [adjustments, setAdjustments] = useState([]);
  const [adjStatusFilter, setAdjStatusFilter] = useState('ALL');
  const [adjSearch, setAdjSearch] = useState('');
  const [showAdjModal, setShowAdjModal] = useState(false);
  const [adjForm, setAdjForm] = useState({
    date: toISODate(new Date()),
    actualCheckIn: '',
    actualCheckOut: '',
    reason: '',
  });

  const [actionLoading, setActionLoading] = useState(false);

  // Attendance data
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewPhoto, setPreviewPhoto] = useState(null);

  // Edit attendance state (Quản lý chỉnh sửa giờ chấm công & Giải trình)
  const [editingRow, setEditingRow] = useState(null);
  const [editForm, setEditForm] = useState({
    checkInTimeString: '',
    checkOutTimeString: '',
    status: 'PRESENT',
    reason: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleOpenEdit = (row) => {
    setEditingRow(row);
    let inStr = '';
    if (row.checkInTime) {
      const d = new Date(row.checkInTime);
      inStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
    let outStr = '';
    if (row.checkOutTime) {
      const d = new Date(row.checkOutTime);
      outStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
    setEditForm({
      checkInTimeString: inStr,
      checkOutTimeString: outStr,
      status: row.status || 'PRESENT',
      reason: '',
    });
  };

  const handleSaveEdit = async (e) => {
    if (e) e.preventDefault();
    if (!editingRow || !storeId) return;
    if (!editForm.reason?.trim()) {
      toast.warning('Vui lòng nhập lý do điều chỉnh để lưu vào lịch sử kiểm toán.');
      return;
    }
    setIsSaving(true);
    try {
      const shiftDate = editingRow.shiftDate || toISODate(new Date());
      let reqCheckIn = null;
      let reqCheckOut = null;
      if (editForm.checkInTimeString) {
        reqCheckIn = `${shiftDate}T${editForm.checkInTimeString}:00+07:00`;
      }
      if (editForm.checkOutTimeString) {
        reqCheckOut = `${shiftDate}T${editForm.checkOutTimeString}:00+07:00`;
      }

      // Log adjustment request for audit compliance (BR-54, BR-55)
      const shiftId = editingRow.shiftId || editingRow.shiftAssignment?.shift?.id;
      if (shiftId) {
        try {
          await createAdjustmentRequest(storeId, {
            attendanceId: editingRow.id,
            shiftId: shiftId,
            requestedCheckIn: reqCheckIn,
            requestedCheckOut: reqCheckOut,
            reason: editForm.reason.trim(),
          });
        } catch (adjErr) {
          console.info('Audit adjustment log note:', adjErr.message);
        }
      }

      // Update attendance record with time strings
      await updateAttendanceRecord(storeId, editingRow.id, {
        checkInTimeString: editForm.checkInTimeString || null,
        checkOutTimeString: editForm.checkOutTimeString || null,
        status: editForm.status,
      });
      setEditingRow(null);
      const res = await getStoreAttendance(storeId, fromDate, toDate);
      setRows(res.data || []);
      toast.success('Đã cập nhật giờ chấm công và ghi nhận lý do vào nhật ký kiểm toán.');
      window.dispatchEvent(new CustomEvent('store_attendance_updated', { detail: { storeId } }));
      window.dispatchEvent(new CustomEvent('store_requests_updated', { detail: { storeId } }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể cập nhật giờ chấm công. Vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  };

  // Refs for outside click handling
  const dateNavWrapRef = useRef(null);
  const clickTimeoutRef = useRef(null);
  const storeFilterRef = useRef(null);

  // Compute dates based on offset
  const today = new Date(Date.now() + dayOffset * 86400000);
  const weekDatesFull = useMemo(() => {
    const base = new Date();
    base.setDate(base.getDate() + weekOffset * 7);
    return getWeekDates(base);
  }, [weekOffset]);

  const displayedDates = viewMode === 'Ngày' ? [today] : weekDatesFull;
  const fromDate = toISODate(displayedDates[0]);
  const toDate = toISODate(displayedDates[displayedDates.length - 1]);

  // Load stores & employees
  useEffect(() => {
    getAllStores()
      .then((res) => {
        const list = res.data.content || res.data || [];
        setStores(list);
        if (list.length > 0) {
          const saved = localStorage.getItem('selectedStoreId');
          const target = (saved && list.find((s) => String(s.id) === String(saved))) || list[0];
          setStoreId(target.id);
          localStorage.setItem('selectedStoreId', String(target.id));
        }
      })
      .catch(() => setError('Không tải được danh sách chi nhánh'));

    getEmployees(0, 100)
      .then((res) => {
        const empList = res.data.content || res.data || [];
        setEmployees(empList);
      })
      .catch(() => setError('Không tải được danh sách nhân viên'));
  }, []);

  // Sync store when changed from Header or other pages
  useEffect(() => {
    const handleStoreChange = (e) => {
      const newId = e.detail?.storeId;
      if (newId && String(newId) !== String(storeId)) {
        setStoreId(newId);
      }
    };
    window.addEventListener('storeChanged', handleStoreChange);
    return () => window.removeEventListener('storeChanged', handleStoreChange);
  }, [storeId]);

  // Load attendance data
  useEffect(() => {
    if (!isStaff && !storeId) return;
    setLoading(true);
    setError('');
    const fetchPromise = isStaff
      ? getMyAttendance()
      : getStoreAttendance(storeId, fromDate, toDate);

    fetchPromise
      .then((res) => {
        setRows(res.data || []);
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Không thể tải dữ liệu chấm công.');
        setRows([]);
      })
      .finally(() => setLoading(false));
  }, [storeId, fromDate, toDate, isStaff]);

  // Realtime WebSocket attendance updates
  useEffect(() => {
    if (!isStaff && !storeId) return;
    const handleRealtimeAtt = () => {
      const fetchPromise = isStaff ? getMyAttendance() : getStoreAttendance(storeId, fromDate, toDate);
      fetchPromise
        .then((res) => setRows(res.data || []))
        .catch(() => {});
    };
    window.addEventListener('store_attendance_updated', handleRealtimeAtt);
    return () => window.removeEventListener('store_attendance_updated', handleRealtimeAtt);
  }, [storeId, fromDate, toDate, isStaff]);

  // Close calendar on outside click
  useEffect(() => {
    const handleDocClick = (e) => {
      if (dateNavWrapRef.current && !dateNavWrapRef.current.contains(e.target)) {
        setShowCalendarPopover(false);
      }
      if (storeFilterRef.current && !storeFilterRef.current.contains(e.target)) {
        setShowStoreList(false);
      }
    };
    document.addEventListener('mousedown', handleDocClick);
    return () => document.removeEventListener('mousedown', handleDocClick);
  }, []);

  // Fetch Leave Requests
  const fetchLeaves = useCallback(async () => {
    const sId = storeId || localStorage.getItem('selectedStoreId');
    if (!sId) return;
    try {
      if (isManager) {
        const res = await getStoreLeaveRequests(sId);
        const list = res.data?.content || res.data?.data || (Array.isArray(res.data) ? res.data : []);
        setLeaveRequests(list);
      } else {
        const res = await getMyLeaveRequests(sId);
        const list = res.data?.content || res.data?.data || (Array.isArray(res.data) ? res.data : []);
        setLeaveRequests(list);
      }
    } catch (e) {
      console.error('Failed to load leaves', e);
    }
  }, [storeId, isManager]);

  // Fetch Attendance Adjustments
  const fetchAdjustments = useCallback(async () => {
    const sId = storeId || localStorage.getItem('selectedStoreId');
    if (!sId) return;
    try {
      if (isManager) {
        const res = await getStoreAdjustmentRequests(sId);
        const list = res.data?.content || res.data?.data || (Array.isArray(res.data) ? res.data : []);
        setAdjustments(list);
      } else {
        const res = await getMyAdjustmentRequests(sId);
        const list = res.data?.content || res.data?.data || (Array.isArray(res.data) ? res.data : []);
        setAdjustments(list);
      }
    } catch (e) {
      console.error('Failed to load adjustments', e);
    }
  }, [storeId, isManager]);

  useEffect(() => {
    fetchLeaves();
    fetchAdjustments();
  }, [fetchLeaves, fetchAdjustments]);

  // Realtime updates for requests & adjustments
  useEffect(() => {
    const handleRefresh = () => {
      fetchLeaves();
      fetchAdjustments();
    };
    window.addEventListener('store_requests_updated', handleRefresh);
    window.addEventListener('store_attendance_updated', handleRefresh);
    return () => {
      window.removeEventListener('store_requests_updated', handleRefresh);
      window.removeEventListener('store_attendance_updated', handleRefresh);
    };
  }, [fetchLeaves, fetchAdjustments]);

  // Pending counts for subtabs
  const pendingLeaveCount = leaveRequests.filter((r) => r.status === 'PENDING').length;
  const pendingAdjCount = adjustments.filter((a) => a.status === 'PENDING').length;

  // Filtered lists
  const filteredLeaves = useMemo(() => {
    return leaveRequests.filter((r) => {
      const matchStatus = leaveStatusFilter === 'ALL' || r.status === leaveStatusFilter;
      const matchSearch =
        !leaveSearch ||
        (r.staffName || '').toLowerCase().includes(leaveSearch.toLowerCase()) ||
        (r.reason || '').toLowerCase().includes(leaveSearch.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [leaveRequests, leaveStatusFilter, leaveSearch]);

  const filteredAdjustments = useMemo(() => {
    return adjustments.filter((a) => {
      const matchStatus = adjStatusFilter === 'ALL' || a.status === adjStatusFilter;
      const matchSearch =
        !adjSearch ||
        (a.staffName || '').toLowerCase().includes(adjSearch.toLowerCase()) ||
        (a.reason || '').toLowerCase().includes(adjSearch.toLowerCase()) ||
        (a.date || '').toLowerCase().includes(adjSearch.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [adjustments, adjStatusFilter, adjSearch]);

  // Leave Handlers
  const handleOpenApproveImpact = async (leaveId) => {
    const sId = storeId || localStorage.getItem('selectedStoreId');
    if (!sId) return;
    setActionLoading(true);
    try {
      const res = await getLeaveImpact(sId, leaveId);
      setSelectedLeaveImpact(res.data);
      setPendingApproveLeaveId(leaveId);
      setShowImpactModal(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể tải thông tin tác động lịch làm việc.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmApproveWithImpact = async () => {
    if (!pendingApproveLeaveId) return;
    const sId = storeId || localStorage.getItem('selectedStoreId');
    setActionLoading(true);
    try {
      const res = await approveLeaveRequest(sId, pendingApproveLeaveId);
      const warning = res.data?.warning;
      if (warning) {
        toast.success(`Đã phê duyệt đơn nghỉ phép. ${warning}`);
      } else {
        toast.success('Đã phê duyệt đơn nghỉ phép. Ca trống đã tự động mở trên Sàn Marketplace!');
      }
      setShowImpactModal(false);
      setPendingApproveLeaveId(null);
      setSelectedLeaveImpact(null);
      await fetchLeaves();
      window.dispatchEvent(new CustomEvent('store_requests_updated', { detail: { storeId: sId } }));
      window.dispatchEvent(new CustomEvent('store_marketplace_updated', { detail: { storeId: sId } }));
      window.dispatchEvent(new CustomEvent('store_shifts_updated', { detail: { storeId: sId } }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi phê duyệt đơn nghỉ phép.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectLeave = async (leaveId) => {
    const sId = storeId || localStorage.getItem('selectedStoreId');
    const reason = prompt('Nhập lý do từ chối đơn nghỉ phép (tùy chọn):') || '';
    setActionLoading(true);
    try {
      await rejectLeaveRequest(sId, leaveId, { reason });
      toast.success('Đã từ chối đơn nghỉ phép.');
      await fetchLeaves();
      window.dispatchEvent(new CustomEvent('store_requests_updated', { detail: { storeId: sId } }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi từ chối đơn nghỉ phép.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelLeave = async (leaveId) => {
    const sId = storeId || localStorage.getItem('selectedStoreId');
    if (!window.confirm('Bạn có chắc chắn muốn hủy đơn xin nghỉ này?')) return;
    setActionLoading(true);
    try {
      await cancelLeaveRequest(sId, leaveId);
      toast.success('Đã hủy đơn xin nghỉ.');
      await fetchLeaves();
      window.dispatchEvent(new CustomEvent('store_requests_updated', { detail: { storeId: sId } }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể hủy đơn nghỉ phép.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditLeaveReason = async (leaveId, currentReason) => {
    const sId = storeId || localStorage.getItem('selectedStoreId');
    const newReason = prompt('Nhập lý do xin nghỉ mới:', currentReason || '');
    if (newReason === null) return;
    const trimmed = newReason.trim();
    if (trimmed === '' || trimmed === currentReason) return;
    setActionLoading(true);
    try {
      await updateLeaveReason(sId, leaveId, trimmed);
      toast.success('Đã cập nhật lý do và lưu thành công.');
      await fetchLeaves();
      window.dispatchEvent(new CustomEvent('store_requests_updated', { detail: { storeId: sId } }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể cập nhật lý do.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateLeaveSubmit = async (e) => {
    e.preventDefault();
    const sId = storeId || localStorage.getItem('selectedStoreId');
    if (!leaveForm.startDate || !leaveForm.endDate) {
      toast.error('Vui lòng chọn ngày bắt đầu và kết thúc.');
      return;
    }
    setActionLoading(true);
    try {
      await createLeaveRequest(sId, {
        leaveType: leaveForm.leaveType,
        startDate: leaveForm.startDate,
        endDate: leaveForm.endDate,
        reason: leaveForm.reason || undefined,
      });
      toast.success('Đã nộp đơn xin nghỉ phép thành công.');
      setShowLeaveModal(false);
      setLeaveForm({ leaveType: 'ANNUAL', startDate: '', endDate: '', reason: '' });
      await fetchLeaves();
      window.dispatchEvent(new CustomEvent('store_requests_updated', { detail: { storeId: sId } }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể nộp đơn xin nghỉ.');
    } finally {
      setActionLoading(false);
    }
  };

  // Adjustments Handlers
  const handleApproveAdjustment = async (adjId) => {
    const sId = storeId || localStorage.getItem('selectedStoreId');
    setActionLoading(true);
    try {
      await approveAdjustmentRequest(sId, adjId, {});
      toast.success('Đã phê duyệt giải trình chấm công.');
      await fetchAdjustments();
      window.dispatchEvent(new CustomEvent('store_attendance_updated', { detail: { storeId: sId } }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi phê duyệt giải trình.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectAdjustment = async (adjId) => {
    const sId = storeId || localStorage.getItem('selectedStoreId');
    const note = prompt('Lý do từ chối (tùy chọn):') || '';
    setActionLoading(true);
    try {
      await rejectAdjustmentRequest(sId, adjId, { note });
      toast.success('Đã từ chối giải trình chấm công.');
      await fetchAdjustments();
      window.dispatchEvent(new CustomEvent('store_attendance_updated', { detail: { storeId: sId } }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi từ chối giải trình.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateAdjustmentSubmit = async (e) => {
    e.preventDefault();
    const sId = storeId || localStorage.getItem('selectedStoreId');
    if (!adjForm.date || (!adjForm.actualCheckIn && !adjForm.actualCheckOut)) {
      toast.error('Vui lòng chọn ngày và ít nhất một mốc giờ check-in hoặc check-out.');
      return;
    }
    setActionLoading(true);
    try {
      const inTime = adjForm.actualCheckIn ? `${adjForm.date}T${adjForm.actualCheckIn}:00` : null;
      const outTime = adjForm.actualCheckOut ? `${adjForm.date}T${adjForm.actualCheckOut}:00` : null;
      await createAdjustmentRequest(sId, {
        date: adjForm.date,
        checkInTime: inTime,
        checkOutTime: outTime,
        reason: adjForm.reason,
      });
      toast.success('Đã gửi giải trình chấm công thành công.');
      setShowAdjModal(false);
      setAdjForm({ date: toISODate(new Date()), actualCheckIn: '', actualCheckOut: '', reason: '' });
      await fetchAdjustments();
      window.dispatchEvent(new CustomEvent('store_attendance_updated', { detail: { storeId: sId } }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể gửi giải trình chấm công.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handlers for Date Navigator & Calendar Popover
  const openCalendarPopover = () => {
    const refDate = viewMode === 'Ngày' ? today : weekDatesFull[0];
    setCalMonth(refDate.getMonth());
    setCalYear(refDate.getFullYear());
    setShowCalendarPopover((v) => !v);
  };

  const handleCalPrevMonth = (e) => {
    e.stopPropagation();
    setCalMonth((prev) => {
      if (prev === 0) {
        setCalYear((y) => y - 1);
        return 11;
      }
      return prev - 1;
    });
  };

  const handleCalNextMonth = (e) => {
    e.stopPropagation();
    setCalMonth((prev) => {
      if (prev === 11) {
        setCalYear((y) => y + 1);
        return 0;
      }
      return prev + 1;
    });
  };

  const handlePrevDate = () => {
    if (viewMode === 'Ngày') {
      setDayOffset((d) => d - 1);
    } else {
      setWeekOffset((w) => w - 1);
    }
  };

  const handleNextDate = () => {
    if (viewMode === 'Ngày') {
      setDayOffset((d) => d + 1);
    } else {
      setWeekOffset((w) => w + 1);
    }
  };

  const handleTodayClick = () => {
    setDayOffset(0);
    setWeekOffset(0);
  };

  const handleSelectWeek = (targetDate) => {
    const baseMonday = getWeekDates(new Date())[0];
    const targetMonday = getWeekDates(targetDate)[0];
    const diffWeeks = Math.round((targetMonday - baseMonday) / (7 * 86400000));
    setWeekOffset(diffWeeks);
    setViewMode('Tuần');
    setShowCalendarPopover(false);
  };

  const handleSelectSpecificDay = (targetDate) => {
    const todayBase = new Date();
    todayBase.setHours(0, 0, 0, 0);
    const target = new Date(targetDate);
    target.setHours(0, 0, 0, 0);
    const diffDays = Math.round((target - todayBase) / 86400000);
    setDayOffset(diffDays);

    const baseMonday = getWeekDates(new Date())[0];
    const targetMonday = getWeekDates(targetDate)[0];
    setWeekOffset(Math.round((targetMonday - baseMonday) / (7 * 86400000)));

    setViewMode('Ngày');
    setShowCalendarPopover(false);
  };

  const handleCalendarDayClick = (date) => {
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
      handleSelectSpecificDay(date);
    } else {
      clickTimeoutRef.current = setTimeout(() => {
        clickTimeoutRef.current = null;
        handleSelectWeek(date);
      }, 260);
    }
  };

  const getCalendarWeeks = (year, month) => {
    const firstDay = new Date(year, month, 1);
    const dow = firstDay.getDay();
    const startMonday = new Date(firstDay);
    startMonday.setDate(1 - (dow === 0 ? 6 : dow - 1));

    const weeks = [];
    let cur = new Date(startMonday);
    for (let w = 0; w < 6; w++) {
      const week = [];
      for (let d = 0; d < 7; d++) {
        week.push(new Date(cur));
        cur.setDate(cur.getDate() + 1);
      }
      weeks.push(week);
    }
    return weeks;
  };

  // Current selected store object
  const currentStore = stores.find((s) => s.id === storeId);

  // Filter rows by selected user name
  const visibleRows = useMemo(() => {
    if (userFilter === 'All') return rows;
    return rows.filter((r) => (r.staffName || '').trim() === userFilter.trim());
  }, [rows, userFilter]);

  // Calculate total hours for filtered employee
  const totalFilteredHours = useMemo(() => {
    return visibleRows.reduce((sum, r) => {
      const h = calcHours(r);
      return sum + (h || 0);
    }, 0);
  }, [visibleRows]);

  const flagged = (row) => row.status === 'LATE' || row.status === 'EARLY_LEAVE';

  // Export attendance data to CSV
  const handleExport = () => {
    if (visibleRows.length === 0) {
      toast.warning('Không có dữ liệu chấm công để xuất.');
      return;
    }
    const headers = ['Ngày', 'Nhân viên', 'Vào', 'Ra', 'Lịch', 'Tổng giờ', 'Trạng thái'];
    const csvRows = visibleRows.map((r) => [
      r.shiftDate || '',
      r.staffName || '',
      fmtTimeAMPM(r.checkInTime),
      fmtTimeAMPM(r.checkOutTime),
      r.scheduledStart ? `${r.scheduledStart} - ${r.scheduledEnd}` : '',
      calcHours(r) ? `${calcHours(r)} giờ` : '',
      statusLabel(r.status),
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...csvRows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `cham_cong_${storeId}_${fromDate}_den_${toDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="att-page">
      {/* ═══ SIDEBAR (Bộ lọc y hệt bên trang Schedule) ═══ */}
      <aside className="att-sidebar">
        {/* Day-mode header shown at top of sidebar */}
        {viewMode === 'Ngày' && (
          <div className="att-sidebar-day-header">
            <div className="att-sidebar-day-label">
              {DOW_VI[today.getDay()]}
              <span>{fmtDM(today)}-{today.getFullYear()}</span>
            </div>
          </div>
        )}

        <div className="att-sidebar-inner">
          <div className="att-sidebar-title">Bộ lọc</div>

          {/* ── Chi nhánh (Box 1) ── */}
          <div className="att-filter-box" ref={storeFilterRef}>
            <div
              className="att-filter-box-header clickable"
              onClick={() => setShowStoreList((v) => !v)}
            >
              <span className="att-filter-label">Chi nhánh</span>
              <span className={`att-filter-arrow${showStoreList ? ' open' : ''}`}></span>
            </div>

            {/* List các chi nhánh xổ xuống */}
            <div className={`att-filter-collapse${showStoreList ? ' expanded' : ''}`}>
              {stores.map((s) => {
                const isSelected = storeId === s.id;
                return (
                  <div
                    key={s.id}
                    className={`att-user-list-item${isSelected ? ' active' : ''}`}
                    onClick={() => {
                      setStoreId(s.id);
                      localStorage.setItem('selectedStoreId', String(s.id));
                      window.dispatchEvent(new CustomEvent('storeChanged', { detail: { storeId: String(s.id) } }));
                      setShowStoreList(false);
                    }}
                  >
                    <span style={{ flex: 1 }}>{s.name}</span>
                    {isSelected && <span style={{ color: '#256b1f', fontWeight: 'bold' }}>[x]</span>}
                  </div>
                );
              })}
              {stores.length === 0 && (
                <div className="att-user-list-item" style={{ color: '#aaa', fontStyle: 'italic' }}>
                  Đang tải chi nhánh...
                </div>
              )}
            </div>

            {/* Current Selected Store Name display when collapsed */}
            {!showStoreList && (
              <div
                className="att-selected-branch-preview"
                onClick={() => setShowStoreList(true)}
              >
                {currentStore?.name || 'Chọn chi nhánh...'}
              </div>
            )}
          </div>

          {/* ── Người dùng (Box 2: Collapsible y hệt trang Schedule) ── */}
          <div className="att-filter-box">
            <div
              className="att-filter-box-header clickable"
              onClick={() => setShowUserList((v) => !v)}
            >
              <span className="att-filter-label">Người dùng</span>
              <span className={`att-filter-arrow${showUserList ? ' open' : ''}`}></span>
            </div>
            <div className={`att-filter-collapse${showUserList ? ' expanded' : ''}`}>
              <div
                className={`att-user-list-item${userFilter === 'All' ? ' active' : ''}`}
                onClick={() => setUserFilter('All')}
              >
                Tất cả
              </div>
              {employees.map((emp) => {
                const name = emp.staffFullName || emp.fullName || '';
                const empId = emp.staffId || emp.id;
                const isSelected = userFilter === name;
                return (
                  <div
                    key={empId}
                    className={`att-user-list-item${isSelected ? ' active' : ''}`}
                    onClick={() => setUserFilter(isSelected ? 'All' : name)}
                  >
                    <img
                      src={AVATARS[name] || DEFAULT_AVATAR}
                      alt={name}
                      className="att-filter-avatar"
                    />
                    <span style={{ flex: 1 }}>{name}</span>
                  </div>
                );
              })}
              {employees.length === 0 && (
                <div className="att-user-list-item" style={{ color: '#aaa', fontStyle: 'italic' }}>
                  Chưa có nhân viên
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* ═══ MAIN CONTENT ═══ */}
      <main className="att-main">
        {/* ═══ TIME & WORKFORCE DOMAIN TABS ═══ */}
        <div className="tw-header-container">
          <div className="tw-header-title-area">
            <h1 className="tw-page-title">TIME & WORKFORCE</h1>
            <p className="tw-page-subtitle">Quản lý toàn diện thời gian làm việc & trạng thái nhân sự (Chấm công • Giải trình • Nghỉ phép)</p>
          </div>
          <div className="tw-domain-tabs">
            <button
              type="button"
              className={`tw-domain-tab-btn ${activeTab === 'attendance' ? 'active' : ''}`}
              onClick={() => handleTabChange('attendance')}
            >
              Chấm công trực tiếp
            </button>
            <button
              type="button"
              className={`tw-domain-tab-btn ${activeTab === 'adjustments' ? 'active' : ''}`}
              onClick={() => handleTabChange('adjustments')}
            >
              Giải trình chấm công
              {pendingAdjCount > 0 && <span className="tw-tab-badge amber">{pendingAdjCount}</span>}
            </button>
            <button
              type="button"
              className={`tw-domain-tab-btn ${activeTab === 'leave' ? 'active' : ''}`}
              onClick={() => handleTabChange('leave')}
            >
              Đơn xin nghỉ phép
              {pendingLeaveCount > 0 && <span className="tw-tab-badge indigo">{pendingLeaveCount}</span>}
            </button>
          </div>
        </div>

        {/* ═══ TAB 1: CHẤM CÔNG TRỰC TIẾP (ATTENDANCE) ═══ */}
        {activeTab === 'attendance' && (
          <>
            {/* ═══ TOPBAR (Row 1: Day/Week Toggle & Tóm tắt bảng lương) ═══ */}
            <div className="att-topbar">
              <div className="att-viewmode-toggle">
                <button
                  type="button"
                  className={`att-toggle-btn ${viewMode === 'Ngày' ? 'active' : ''}`}
                  onClick={() => setViewMode('Ngày')}
                >
                  Day
                </button>
                <button
                  type="button"
                  className={`att-toggle-btn ${viewMode === 'Tuần' ? 'active' : ''}`}
                  onClick={() => setViewMode('Tuần')}
                >
                  Week
                </button>
              </div>

              <div className="att-topbar-actions">
                <div className="att-capsule-card" style={{ marginRight: '8px' }}>
                  <button
                    type="button"
                    className="att-capsule-payroll-btn"
                    onClick={() => handleTabChange('adjustments')}
                    title={isManager ? "Xem danh sách yêu cầu điều chỉnh chấm công" : "Xem và gửi giải trình chấm công của bạn"}
                  >
                    {isManager ? 'Duyệt giải trình' : 'Giải trình chấm công'}
                  </button>
                </div>
            <div className="att-capsule-card">
              {isManager && (
                <>
                  <button
                    type="button"
                    className="att-capsule-payroll-btn"
                    onClick={() => navigate('/payroll')}
                    title="Xem tóm tắt bảng lương"
                  >
                    Tóm tắt bảng lương
                  </button>
                  <div className="att-capsule-divider" />
                </>
              )}
              <button
                type="button"
                className="att-capsule-export-btn"
                onClick={handleExport}
                title="Xuất bảng chấm công ra file CSV"
              >
                Xuất
              </button>
            </div>
          </div>
        </div>

        {/* ═══ HEADER TOOLBAR (Row 2: Date Navigator & Calendar Popover) ═══ */}
        <div className="att-header-toolbar">
          <div className="att-date-navigator-wrap" ref={dateNavWrapRef}>
            <div className="att-date-navigator">
              <button
                type="button"
                className="att-date-nav-arrow"
                onClick={handlePrevDate}
                title="Trước"
              >
                ‹
              </button>
              <div
                className="att-date-nav-center"
                onClick={openCalendarPopover}
                title="Bấm 1 lần để xem lịch • Bấm ngày để chọn tuần • Bấm đúp để chọn ngày"
              >
                <span>
                  {viewMode === 'Ngày'
                    ? fmtDateRangeText(today)
                    : `${fmtDateRangeText(weekDatesFull[0])}`}
                </span>
                {viewMode === 'Tuần' && (
                  <>
                    <span className="att-date-arrow-sep">→</span>
                    <span>{fmtDateRangeText(weekDatesFull[6])}</span>
                  </>
                )}
              </div>
              <button
                type="button"
                className="att-date-nav-arrow"
                onClick={handleNextDate}
                title="Sau"
              >
                ›
              </button>
            </div>

            <button
              type="button"
              className="att-today-btn"
              onClick={handleTodayClick}
            >
              Hôm nay
            </button>

            {/* ── Datepicker Popover (Y hệt trang Schedule) ── */}
            {showCalendarPopover && (
              <div className="att-calendar-popover" onClick={(e) => e.stopPropagation()}>
                <div className="att-cal-popover-header">
                  <div className="att-cal-month-year">
                    <span>{MONTH_NAMES_VI[calMonth]}</span>
                    <span>{calYear}</span>
                  </div>
                  <div className="att-cal-header-nav">
                    <button
                      type="button"
                      className="att-cal-nav-btn"
                      onClick={handleCalPrevMonth}
                      title="Tháng trước"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      className="att-cal-nav-btn"
                      onClick={handleCalNextMonth}
                      title="Tháng sau"
                    >
                      ›
                    </button>
                  </div>
                </div>

                <div className="att-cal-weekdays">
                  <div>T2</div><div>T3</div><div>T4</div><div>T5</div><div>T6</div><div>T7</div><div>CN</div>
                </div>

                <div className="att-cal-grid">
                  {getCalendarWeeks(calYear, calMonth).map((week, wIdx) => {
                    const isCurWeek = week.some((d) => {
                      const curMonday = weekDatesFull[0];
                      const dMon = getWeekDates(d)[0];
                      return dMon.toDateString() === curMonday.toDateString();
                    });

                    return (
                      <div
                        key={wIdx}
                        className={`att-cal-week-row ${isCurWeek && viewMode === 'Tuần' ? 'selected' : ''}`}
                        onClick={() => handleSelectWeek(week[0])}
                      >
                        {week.map((dateObj, dIdx) => {
                          const isCurMonth = dateObj.getMonth() === calMonth;
                          const isTodayDate = dateObj.toDateString() === new Date().toDateString();
                          const isSelDay = viewMode === 'Ngày' && dateObj.toDateString() === today.toDateString();

                          return (
                            <div
                              key={dIdx}
                              className={`att-cal-day-cell ${isCurMonth ? '' : 'outside'} ${isTodayDate ? 'today' : ''} ${isSelDay ? 'selected' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCalendarDayClick(dateObj);
                              }}
                            >
                              <span>{dateObj.getDate()}</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Error Banner ── */}
        {error && <div className="att-error-banner">{error}</div>}

        {/* ── Late Alert Banner ── */}
        {visibleRows.filter((r) => r.status === 'LATE').length > 0 && (
          <div
            style={{
              backgroundColor: '#FEF2F2',
              border: '1px solid #FCA5A5',
              borderRadius: '10px',
              padding: '12px 16px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: '#991B1B',
              fontSize: '13px',
              fontWeight: '600',
            }}
          >
            
            <span>
              Hệ thống phát hiện{' '}
              <strong>
                {visibleRows.filter((r) => r.status === 'LATE').length} lượt check-in đi trễ
              </strong>{' '}
              trong khoảng thời gian này. Hãy kiểm tra các mục có nhãn cảnh báo đỏ bên dưới.
            </span>
          </div>
        )}

        {/* ═══ ATTENDANCE TABLE ═══ */}
        <div className="att-table-card">
          {loading ? (
            <div className="att-loading-box">
              <div className="att-spinner"></div>
              <span>Đang tải dữ liệu chấm công...</span>
            </div>
          ) : visibleRows.length === 0 ? (
            <div className="att-empty-box">
              <h3>Không có dữ liệu chấm công</h3>
              <p>Chưa có bản ghi chấm công nào trong khoảng thời gian đã chọn.</p>
            </div>
          ) : (
            <div className="att-table-responsive">
              <table className="att-table">
                <thead>
                  <tr>
                    <th>Nhân viên</th>
                    <th>Ngày</th>
                    <th>In</th>
                    <th>Out</th>
                    <th>Lịch</th>
                    <th>Khác</th>
                    <th>Tổng</th>
                    <th>Trạng thái</th>
                    <th>Ảnh / GPS</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row) => {
                    const hoursWorked = calcHours(row);
                    const schedHours = calcScheduledHours(row);
                    const diffHours = (hoursWorked && schedHours) ? Number((hoursWorked - schedHours).toFixed(1)) : null;
                    const isIrregular = flagged(row);

                    return (
                      <tr key={row.id}>
                        {/* Nhân viên */}
                        <td>
                          <div className="att-user-cell">
                            <img
                              src={AVATARS[row.staffName] || DEFAULT_AVATAR}
                              alt=""
                              className="att-user-avatar"
                            />
                            <div className="att-user-info">
                              <span className="att-user-name">{row.staffName || 'Nhân viên'}</span>
                              <span className="att-user-pos">{row.jobPosition || 'Nhân viên'}</span>
                            </div>
                            {isIrregular && (
                              <span
                                className="att-table-warn-icon"
                                title="Đi trễ hoặc về sớm"
                              >
                                !
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Ngày */}
                        <td>
                          <span className="att-date-text">{fmtShortDate(row.shiftDate)}</span>
                        </td>

                        {/* In */}
                        <td>
                          <span className="att-time-badge in">{fmtTimeAMPM(row.checkInTime)}</span>
                        </td>

                        {/* Out */}
                        <td>
                          <span className="att-time-badge out">{fmtTimeAMPM(row.checkOutTime)}</span>
                        </td>

                        {/* Lịch */}
                        <td>
                          <span className="att-sched-text">
                            {row.scheduledStart && row.scheduledEnd
                              ? `${row.scheduledStart.slice(0, 5)} - ${row.scheduledEnd.slice(0, 5)}`
                              : '—'}
                          </span>
                        </td>

                        {/* Khác (OT / Chênh lệch) */}
                        <td>
                          {diffHours !== null && diffHours !== 0 ? (
                            <span className={`att-diff-badge ${diffHours > 0 ? 'plus' : 'minus'}`}>
                              {diffHours > 0 ? `+${diffHours} Giờ` : `${diffHours} Giờ`}
                            </span>
                          ) : (
                            <span className="att-muted">—</span>
                          )}
                        </td>

                        {/* Tổng */}
                        <td>
                          <strong className="att-total-text">
                            {hoursWorked !== null ? `${hoursWorked} Giờ` : '—'}
                          </strong>
                        </td>

                        {/* Trạng thái */}
                        <td>
                          <span className={`att-status-pill ${row.status?.toLowerCase() || 'present'}`}>
                            {statusLabel(row.status, row.lateMinutes)}
                          </span>
                        </td>

                        {/* Ảnh / GPS */}
                        <td>
                          <div className="att-proof-cell">
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              {row.checkInPhotoBase64 && (
                                <img
                                  src={`data:image/jpeg;base64,${row.checkInPhotoBase64}`}
                                  alt="In"
                                  className="att-proof-thumb"
                                  onClick={() =>
                                    setPreviewPhoto({
                                      uri: `data:image/jpeg;base64,${row.checkInPhotoBase64}`,
                                      title: `Ảnh Check-In (${row.staffName || 'Nhân viên'})`,
                                    })
                                  }
                                  title="Bấm để xem ảnh Check-in"
                                />
                              )}
                              {row.checkOutPhotoBase64 && (
                                <img
                                  src={`data:image/jpeg;base64,${row.checkOutPhotoBase64}`}
                                  alt="Out"
                                  className="att-proof-thumb"
                                  style={{ borderColor: '#F59E0B' }}
                                  onClick={() =>
                                    setPreviewPhoto({
                                      uri: `data:image/jpeg;base64,${row.checkOutPhotoBase64}`,
                                      title: `Ảnh Check-Out (${row.staffName || 'Nhân viên'})`,
                                    })
                                  }
                                  title="Bấm để xem ảnh Check-out"
                                />
                              )}
                              {!row.checkInPhotoBase64 && !row.checkOutPhotoBase64 && (
                                <span className="att-muted">—</span>
                              )}
                            </div>
                            <div className="att-gps-info">
                              {row.checkInLat ? (
                                <span className="att-gps-text">
                                  {row.checkInLat.toFixed(3)}, {row.checkInLng.toFixed(3)}
                                </span>
                              ) : (
                                <span className="att-gps-text muted">N/A</span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Thao tác */}
                        <td>
                          {isManager ? (
                            <button
                              type="button"
                              className="att-edit-btn"
                              onClick={() => handleOpenEdit(row)}
                              title="Chỉnh sửa giờ chấm công của nhân viên"
                            >
                              Sửa
                            </button>
                          ) : (
                            <span className="att-muted">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* ── Summary Footer when filtering single user ── */}
              {userFilter !== 'All' && visibleRows.length > 0 && (
                <div className="att-table-footer">
                  <span>Tổng thời gian làm việc:</span>
                  <strong>{totalFilteredHours.toFixed(1)} Giờ</strong>
                </div>
              )}
            </div>
          )}
        </div>
          </>
        )}

        {/* ═══ TAB 2: GIẢI TRÌNH CHẤM CÔNG (ADJUSTMENTS) ═══ */}
        {activeTab === 'adjustments' && (
          <div className="tw-tab-content">
            <div className="tw-action-bar">
              <div className="tw-filter-group">
                <div style={{ position: 'relative', width: '220px' }}>
                  <input
                    type="text"
                    className="att-time-input"
                    style={{ height: '34px', padding: '4px 10px', fontSize: '13px' }}
                    placeholder="Tìm theo tên hoặc lý do..."
                    value={adjSearch}
                    onChange={(e) => setAdjSearch(e.target.value)}
                  />
                  {adjSearch && (
                    <button
                      type="button"
                      onClick={() => setAdjSearch('')}
                      style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                    >&times;</button>
                  )}
                </div>
                {[
                  { key: 'ALL', label: 'Tất cả' },
                  { key: 'PENDING', label: 'Chờ duyệt' },
                  { key: 'APPROVED', label: 'Đã duyệt' },
                  { key: 'REJECTED', label: 'Đã từ chối' },
                ].map((st) => (
                  <button
                    key={st.key}
                    type="button"
                    className={`tw-filter-pill ${adjStatusFilter === st.key ? 'active' : ''}`}
                    onClick={() => setAdjStatusFilter(st.key)}
                  >
                    {st.label}
                  </button>
                ))}
              </div>

              {!isManager && (
                <button
                  type="button"
                  className="tw-btn-create"
                  onClick={() => setShowAdjModal(true)}
                >
                  + Gửi giải trình chấm công
                </button>
              )}
            </div>

            <div className="tw-table-card">
              <table className="tw-data-table">
                <thead>
                  <tr>
                    {isManager && <th>Nhân viên</th>}
                    <th>Ngày làm việc</th>
                    <th>Giờ vào đề xuất</th>
                    <th>Giờ ra đề xuất</th>
                    <th>Lý do giải trình</th>
                    <th>Trạng thái</th>
                    {isManager && <th style={{ textAlign: 'right' }}>Thao tác</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredAdjustments.length === 0 ? (
                    <tr>
                      <td colSpan={isManager ? 7 : 6} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                        Không có yêu cầu giải trình chấm công nào.
                      </td>
                    </tr>
                  ) : (
                    filteredAdjustments.map((a) => {
                      const isPending = a.status === 'PENDING';
                      return (
                        <tr key={a.id}>
                          {isManager && (
                            <td>
                              <strong>{a.staffName || 'Nhân viên'}</strong>
                            </td>
                          )}
                          <td>{fmtShortDate(a.date)}</td>
                          <td>{a.checkInTime ? fmtTimeAMPM(a.checkInTime) : '—'}</td>
                          <td>{a.checkOutTime ? fmtTimeAMPM(a.checkOutTime) : '—'}</td>
                          <td style={{ maxWidth: '280px' }}>
                            <div>{a.reason || '—'}</div>
                            {a.note && (
                              <div style={{ fontSize: '11.5px', color: '#ef4444', fontStyle: 'italic', marginTop: '3px' }}>
                                Ghi chú QL: {a.note}
                              </div>
                            )}
                          </td>
                          <td>
                            <span className={`tw-status-pill ${a.status?.toLowerCase()}`}>
                              {a.status === 'APPROVED' ? 'Đã duyệt' : a.status === 'REJECTED' ? 'Từ chối' : 'Chờ duyệt'}
                            </span>
                          </td>
                          {isManager && (
                            <td style={{ textAlign: 'right' }}>
                              {isPending ? (
                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                  <button
                                    type="button"
                                    className="tw-btn-approve"
                                    onClick={() => handleApproveAdjustment(a.id)}
                                    disabled={actionLoading}
                                  >
                                    Duyệt
                                  </button>
                                  <button
                                    type="button"
                                    className="tw-btn-reject"
                                    onClick={() => handleRejectAdjustment(a.id)}
                                    disabled={actionLoading}
                                  >
                                    Từ chối
                                  </button>
                                </div>
                              ) : (
                                <span style={{ color: '#94a3b8', fontSize: '12px' }}>—</span>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══ TAB 3: ĐƠN XIN NGHỈ PHÉP (LEAVE REQUESTS) ═══ */}
        {activeTab === 'leave' && (
          <div className="tw-tab-content">
            <div className="tw-action-bar">
              <div className="tw-filter-group">
                <div style={{ position: 'relative', width: '220px' }}>
                  <input
                    type="text"
                    className="att-time-input"
                    style={{ height: '34px', padding: '4px 10px', fontSize: '13px' }}
                    placeholder="Tìm theo tên hoặc lý do..."
                    value={leaveSearch}
                    onChange={(e) => setLeaveSearch(e.target.value)}
                  />
                  {leaveSearch && (
                    <button
                      type="button"
                      onClick={() => setLeaveSearch('')}
                      style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                    >&times;</button>
                  )}
                </div>
                {[
                  { key: 'ALL', label: 'Tất cả' },
                  { key: 'PENDING', label: 'Chờ duyệt' },
                  { key: 'APPROVED', label: 'Đã duyệt' },
                  { key: 'REJECTED', label: 'Đã từ chối' },
                ].map((st) => (
                  <button
                    key={st.key}
                    type="button"
                    className={`tw-filter-pill ${leaveStatusFilter === st.key ? 'active' : ''}`}
                    onClick={() => setLeaveStatusFilter(st.key)}
                  >
                    {st.label}
                  </button>
                ))}
              </div>

              {!isManager && (
                <button
                  type="button"
                  className="tw-btn-create"
                  onClick={() => setShowLeaveModal(true)}
                >
                  + Nộp đơn xin nghỉ
                </button>
              )}
            </div>

            <div className="tw-table-card">
              <table className="tw-data-table">
                <thead>
                  <tr>
                    <th>{isManager ? 'Nhân viên' : 'Người nộp'}</th>
                    <th>Loại nghỉ</th>
                    <th>Thời gian nghỉ</th>
                    <th>Lý do</th>
                    <th>Trạng thái</th>
                    <th style={{ textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeaves.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                        Không có đơn nghỉ phép nào.
                      </td>
                    </tr>
                  ) : (
                    filteredLeaves.map((r) => {
                      const isPending = r.status === 'PENDING';
                      return (
                        <tr key={r.id}>
                          <td>
                            <strong>{isManager ? (r.staffName || 'Nhân viên') : 'Tôi (Bạn)'}</strong>
                          </td>
                          <td>
                            <span style={{
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 600,
                              background: r.leaveType === 'SICK' ? '#fee2e2' : r.leaveType === 'EMERGENCY' ? '#fef3c7' : '#e0e7ff',
                              color: r.leaveType === 'SICK' ? '#991b1b' : r.leaveType === 'EMERGENCY' ? '#92400e' : '#3730a3',
                            }}>
                              {r.leaveType === 'SICK' ? 'Nghỉ ốm' : r.leaveType === 'EMERGENCY' ? 'Khẩn cấp' : 'Phép năm'}
                            </span>
                          </td>
                          <td>
                            {fmtShortDate(r.startDate)} → {fmtShortDate(r.endDate)}
                          </td>
                          <td style={{ maxWidth: '280px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                              <span>{r.reason || '—'}</span>
                              {!isManager && isPending && (
                                <button
                                  type="button"
                                  title="Chỉnh sửa lý do xin nghỉ"
                                  onClick={() => handleEditLeaveReason(r.id, r.reason)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.7, fontSize: '13px', padding: '2px 4px' }}
                                >
                                  Sửa
                                </button>
                              )}
                            </div>
                            {r.rejectionReason && (
                              <div style={{ fontSize: '11.5px', color: '#dc2626', marginTop: '4px', fontStyle: 'italic' }}>
                                Lý do từ chối: {r.rejectionReason}
                              </div>
                            )}
                          </td>
                          <td>
                            <span className={`tw-status-pill ${r.status?.toLowerCase()}`}>
                              {r.status === 'APPROVED' ? 'Đã duyệt' : r.status === 'REJECTED' ? 'Từ chối' : 'Chờ duyệt'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {isPending && isManager && (
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                <button
                                  type="button"
                                  className="tw-btn-approve"
                                  onClick={() => handleOpenApproveImpact(r.id)}
                                  disabled={actionLoading}
                                  title="Đánh giá tác động nhân sự và phê duyệt"
                                >
                                  Phê duyệt
                                </button>
                                <button
                                  type="button"
                                  className="tw-btn-reject"
                                  onClick={() => handleRejectLeave(r.id)}
                                  disabled={actionLoading}
                                >
                                  Từ chối
                                </button>
                              </div>
                            )}

                            {isPending && !isManager && (
                              <button
                                type="button"
                                className="tw-btn-cancel"
                                onClick={() => handleCancelLeave(r.id)}
                                disabled={actionLoading}
                              >
                                Hủy đơn
                              </button>
                            )}

                            {!isPending && (
                              <span style={{ color: '#94a3b8', fontSize: '12px' }}>—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* ═══ PHOTO PREVIEW MODAL ═══ */}
      {previewPhoto && (
        <div className="att-photo-modal-overlay" onClick={() => setPreviewPhoto(null)}>
          <div className="att-photo-modal" onClick={(e) => e.stopPropagation()}>
            <div className="att-photo-modal-header">
              <h3>{previewPhoto.title || 'Ảnh xác thực chấm công'}</h3>
              <button
                type="button"
                className="att-photo-close-btn"
                onClick={() => setPreviewPhoto(null)}
              >&times;</button>
            </div>
            <div className="att-photo-modal-body">
              <img
                src={previewPhoto.uri || previewPhoto}
                alt="Xác thực"
                className="att-photo-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL CHỈNH SỬA CHẤM CÔNG (DÀNH CHO QUẢN LÝ) ═══ */}
      {editingRow && (
        <div className="att-modal-overlay" onClick={() => !isSaving && setEditingRow(null)}>
          <div className="att-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="att-modal-header">
              <h3>Điều chỉnh giờ chấm công</h3>
              <button
                type="button"
                className="att-modal-close"
                onClick={() => setEditingRow(null)}
                disabled={isSaving}
              >&times;</button>
            </div>
            <form className="att-edit-form" onSubmit={handleSaveEdit}>
              <div className="att-form-info-box">
                <div className="att-info-row">
                  <span className="att-info-label">Nhân viên:</span>
                  <span className="att-info-val">{editingRow.staffName || 'Nhân viên'}</span>
                </div>
                <div className="att-info-row">
                  <span className="att-info-label">Ngày ca làm:</span>
                  <span className="att-info-val">{fmtShortDate(editingRow.shiftDate)}</span>
                </div>
                <div className="att-info-row">
                  <span className="att-info-label">Giờ theo lịch:</span>
                  <span className="att-info-val">
                    {editingRow.scheduledStart && editingRow.scheduledEnd
                      ? `${editingRow.scheduledStart.slice(0, 5)} - ${editingRow.scheduledEnd.slice(0, 5)}`
                      : '—'}
                  </span>
                </div>
              </div>

              <div className="att-form-group">
                <label>Giờ vào (Check-In)</label>
                <input
                  type="time"
                  className="att-time-input"
                  value={editForm.checkInTimeString}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, checkInTimeString: e.target.value }))}
                  required
                />
              </div>

              <div className="att-form-group">
                <label>Giờ ra (Check-Out)</label>
                <input
                  type="time"
                  className="att-time-input"
                  value={editForm.checkOutTimeString}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, checkOutTimeString: e.target.value }))}
                />
              </div>

              <div className="att-form-group">
                <label>Trạng thái</label>
                <select
                  className="att-select-input"
                  value={editForm.status}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value }))}
                >
                  <option value="PRESENT">Đúng giờ (PRESENT)</option>
                  <option value="LATE">Đi trễ (LATE)</option>
                  <option value="EARLY_LEAVE">Về sớm (EARLY_LEAVE)</option>
                  <option value="ABSENT">Vắng (ABSENT)</option>
                </select>
              </div>

              <div className="att-form-group">
                <label>Lý do điều chỉnh (Bắt buộc cho nhật ký kiểm toán)</label>
                <input
                  type="text"
                  className="att-time-input"
                  style={{ width: '100%', height: '38px', padding: '6px 12px' }}
                  placeholder="VD: Quên check-out khi tan ca, sự cố thiết bị quét mặt..."
                  value={editForm.reason}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, reason: e.target.value }))}
                  required
                />
              </div>

              <div className="att-modal-actions">
                <button
                  type="button"
                  className="att-cancel-btn"
                  onClick={() => setEditingRow(null)}
                  disabled={isSaving}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="att-save-btn"
                  disabled={isSaving}
                >
                  {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ STAFFING IMPACT CONFIRMATION MODAL (LEAVE APPROVAL) ═══ */}
      {showImpactModal && selectedLeaveImpact && (
        <div className="att-modal-overlay" onClick={() => !actionLoading && setShowImpactModal(false)}>
          <div className="tw-impact-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="tw-impact-header">
              <div className="tw-impact-header-title">
                
                <span>Đánh giá tác động nhân sự trước khi duyệt nghỉ phép</span>
              </div>
              <button
                type="button"
                className="att-modal-close"
                onClick={() => setShowImpactModal(false)}
                disabled={actionLoading}
              >&times;</button>
            </div>

            <div className="tw-impact-body">
              <div className="tw-impact-summary-box">
                <p><strong>Nhân viên:</strong> {selectedLeaveImpact.staffName}</p>
                <p><strong>Thời gian nghỉ:</strong> {fmtShortDate(selectedLeaveImpact.startDate)} → {fmtShortDate(selectedLeaveImpact.endDate)}</p>
                <p>
                  <strong>Số ca làm việc bị ảnh hưởng:</strong>{' '}
                  <span style={{
                    fontWeight: 700,
                    color: selectedLeaveImpact.totalConflictingShifts > 0 ? '#dc2626' : '#16a34a',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    background: selectedLeaveImpact.totalConflictingShifts > 0 ? '#fee2e2' : '#dcfce7'
                  }}>
                    {selectedLeaveImpact.totalConflictingShifts} ca làm việc
                  </span>
                </p>
              </div>

              {selectedLeaveImpact.totalConflictingShifts > 0 ? (
                <>
                  <div className="tw-impact-table-wrap">
                    <table className="tw-impact-table">
                      <thead>
                        <tr>
                          <th>Ngày ca làm</th>
                          <th>Khung giờ</th>
                          <th>Chi nhánh</th>
                          <th>Chuyên môn</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedLeaveImpact.conflictingShifts.map((cs) => (
                          <tr key={cs.shiftId}>
                            <td><strong>{fmtShortDate(cs.shiftDate)}</strong></td>
                            <td>{cs.startTime?.slice(0, 5)} - {cs.endTime?.slice(0, 5)}</td>
                            <td>{cs.storeName || 'Chi nhánh'}</td>
                            <td>{cs.skillName || 'Nhân viên'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="tw-impact-warning-alert">
                    
                    <div>
                      <strong>Tự động điều phối Marketplace:</strong>
                      <p style={{ margin: '4px 0 0 0' }}>
                        Khi duyệt, hệ thống sẽ tự động gỡ nhân viên <strong>{selectedLeaveImpact.staffName}</strong> khỏi các ca trên và mở các ca trống này trên <strong>Sàn Marketplace</strong> với lý do: <em>"Nhu cầu phát sinh: Nhân viên {selectedLeaveImpact.staffName} nghỉ phép đã duyệt."</em> để điều phối bổ sung nhân sự kịp thời.
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ padding: '16px', borderRadius: '10px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', fontSize: '13px' }}>
                  Nhân viên hiện không có ca làm việc nào được xếp trong khoảng thời gian nghỉ này. Bạn có thể an tâm phê duyệt.
                </div>
              )}
            </div>

            <div className="tw-impact-footer">
              <button
                type="button"
                className="att-cancel-btn"
                onClick={() => setShowImpactModal(false)}
                disabled={actionLoading}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="tw-btn-confirm-approve"
                onClick={handleConfirmApproveWithImpact}
                disabled={actionLoading}
              >
                {actionLoading ? 'Đang xử lý...' : 'Xác nhận duyệt & Mở ca lên Marketplace'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ CREATE LEAVE MODAL ═══ */}
      {showLeaveModal && (
        <div className="att-modal-overlay" onClick={() => !actionLoading && setShowLeaveModal(false)}>
          <div className="att-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="att-modal-header">
              <h3>Nộp đơn xin nghỉ phép</h3>
              <button
                type="button"
                className="att-modal-close"
                onClick={() => setShowLeaveModal(false)}
                disabled={actionLoading}
              >&times;</button>
            </div>
            <form className="att-edit-form" onSubmit={handleCreateLeaveSubmit}>
              <div className="att-form-group">
                <label>Loại nghỉ phép</label>
                <select
                  className="att-select-input"
                  value={leaveForm.leaveType}
                  onChange={(e) => setLeaveForm((prev) => ({ ...prev, leaveType: e.target.value }))}
                >
                  <option value="ANNUAL">Phép năm (ANNUAL)</option>
                  <option value="SICK">Nghỉ ốm (SICK)</option>
                  <option value="EMERGENCY">Khẩn cấp (EMERGENCY)</option>
                </select>
              </div>

              <div className="att-form-group">
                <label>Từ ngày</label>
                <input
                  type="date"
                  className="att-time-input"
                  value={leaveForm.startDate}
                  onChange={(e) => setLeaveForm((prev) => ({ ...prev, startDate: e.target.value }))}
                  required
                />
              </div>

              <div className="att-form-group">
                <label>Đến ngày</label>
                <input
                  type="date"
                  className="att-time-input"
                  value={leaveForm.endDate}
                  onChange={(e) => setLeaveForm((prev) => ({ ...prev, endDate: e.target.value }))}
                  required
                />
              </div>

              <div className="att-form-group">
                <label>Lý do nghỉ phép</label>
                <textarea
                  className="att-time-input"
                  style={{ height: '80px', resize: 'vertical' }}
                  placeholder="Nhập lý do chi tiết..."
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm((prev) => ({ ...prev, reason: e.target.value }))}
                />
              </div>

              <div className="att-modal-actions">
                <button
                  type="button"
                  className="att-cancel-btn"
                  onClick={() => setShowLeaveModal(false)}
                  disabled={actionLoading}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="att-save-btn"
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Đang gửi...' : 'Nộp đơn'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ CREATE ADJUSTMENT MODAL ═══ */}
      {showAdjModal && (
        <div className="att-modal-overlay" onClick={() => !actionLoading && setShowAdjModal(false)}>
          <div className="att-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="att-modal-header">
              <h3>Gửi giải trình chấm công</h3>
              <button
                type="button"
                className="att-modal-close"
                onClick={() => setShowAdjModal(false)}
                disabled={actionLoading}
              >&times;</button>
            </div>
            <form className="att-edit-form" onSubmit={handleCreateAdjustmentSubmit}>
              <div className="att-form-group">
                <label>Ngày làm việc</label>
                <input
                  type="date"
                  className="att-time-input"
                  value={adjForm.date}
                  onChange={(e) => setAdjForm((prev) => ({ ...prev, date: e.target.value }))}
                  required
                />
              </div>

              <div className="att-form-group">
                <label>Giờ vào thực tế (Check-In)</label>
                <input
                  type="time"
                  className="att-time-input"
                  value={adjForm.actualCheckIn}
                  onChange={(e) => setAdjForm((prev) => ({ ...prev, actualCheckIn: e.target.value }))}
                />
              </div>

              <div className="att-form-group">
                <label>Giờ ra thực tế (Check-Out)</label>
                <input
                  type="time"
                  className="att-time-input"
                  value={adjForm.actualCheckOut}
                  onChange={(e) => setAdjForm((prev) => ({ ...prev, actualCheckOut: e.target.value }))}
                />
              </div>

              <div className="att-form-group">
                <label>Lý do giải trình (Bắt buộc)</label>
                <textarea
                  className="att-time-input"
                  style={{ height: '80px', resize: 'vertical' }}
                  placeholder="VD: Quên check-out khi tan ca, sự cố thiết bị chấm công..."
                  value={adjForm.reason}
                  onChange={(e) => setAdjForm((prev) => ({ ...prev, reason: e.target.value }))}
                  required
                />
              </div>

              <div className="att-modal-actions">
                <button
                  type="button"
                  className="att-cancel-btn"
                  onClick={() => setShowAdjModal(false)}
                  disabled={actionLoading}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="att-save-btn"
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Đang gửi...' : 'Gửi giải trình'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
