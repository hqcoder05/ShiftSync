import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getAllStores, getStoreDirectory } from '../services/storeService';
import { getEmployees } from '../services/employeeService';
import {
  getStoreLeaveRequests,
  getMyLeaveRequests,
  createLeaveRequest,
  approveLeaveRequest,
  rejectLeaveRequest,
  cancelLeaveRequest,
  updateLeaveReason,
} from '../services/leaveService';
import {
  getStoreSwapRequests,
  getMySwapRequests,
  createSwapRequest,
  respondToSwapRequest,
  approveSwapRequest,
  rejectSwapRequest,
} from '../services/swapService';
import {
  getStoreAdjustmentRequests,
  getMyAdjustmentRequests,
  createAdjustmentRequest,
  approveAdjustmentRequest,
  rejectAdjustmentRequest,
} from '../services/adjustmentService';
import {
  createWorkforceRequest,
  getOutgoingWorkforceRequests,
  getIncomingWorkforceRequests,
  cancelWorkforceRequest,
  rejectWorkforceRequest,
  createWorkforceProposal,
  getMyWorkforceProposals,
  respondToWorkforceProposal,
  getEligibleStaffForRequest,
} from '../services/workforceService';
import { getShiftsForStore } from '../services/shiftService';
import { getStaffByStore } from '../services/employmentService';
import { toast } from '../context/ToastContext';

import './RequestPage.css';

const getInitials = (name) => {
  if (!name) return 'SS';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const getAvatarColor = (name) => {
  const colors = [
    { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' },
    { bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
    { bg: '#e0e7ff', text: '#3730a3', border: '#c7d2fe' },
    { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' },
    { bg: '#f3e8ff', text: '#6b21a8', border: '#e9d5ff' },
    { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd' },
    { bg: '#ffedd5', text: '#c2410c', border: '#fed7aa' },
  ];
  if (!name) return colors[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

function UserAvatar({ name, size = 32 }) {
  const c = getAvatarColor(name);
  const initials = getInitials(name);
  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        background: c.bg,
        color: c.text,
        border: `1.5px solid ${c.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: `${Math.round(size * 0.38)}px`,
        fontWeight: 700,
        flexShrink: 0,
        textTransform: 'uppercase',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
      }}
    >
      {initials}
    </div>
  );
}

const fmtDate = (dStr) => {
  if (!dStr) return '—';
  try {
    const d = new Date(dStr);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  } catch {
    return dStr;
  }
};

const fmtDateTime = (dStr) => {
  if (!dStr) return '—';
  try {
    const d = new Date(dStr);
    const date = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    return `${time} ${date}`;
  } catch {
    return dStr;
  }
};

const toISODate = (d) => {
  if (!d) return '';
  const dateObj = d instanceof Date ? d : new Date(d);
  return dateObj.toISOString().slice(0, 10);
};

export default function RequestPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  const initialTab = (rawTab && rawTab !== 'general') ? rawTab : 'leave';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Global Context
  const [stores, setStores] = useState([]);
  const [partnerStores, setPartnerStores] = useState([]);
  const [storeId, setStoreId] = useState(() => localStorage.getItem('selectedStoreId') || '');
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, PENDING, APPROVED, REJECTED
  const [toastMsg, setToastMsg] = useState('');

  // Role info
  const userRole = (localStorage.getItem('userRole') || 'STAFF').toUpperCase();
  const isAdmin = userRole === 'ADMIN';
  const isManager = userRole === 'MANAGER' || userRole === 'ADMIN';

  // Data states for tabs
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [swapRequests, setSwapRequests] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [outgoingWorkforce, setOutgoingWorkforce] = useState([]);
  const [incomingWorkforce, setIncomingWorkforce] = useState([]);
  const [myProposals, setMyProposals] = useState([]);
  const [workforceSubTab, setWorkforceSubTab] = useState('incoming');
  const [showWorkforceModal, setShowWorkforceModal] = useState(false);
  const [showProposeModal, setShowProposeModal] = useState(false);
  const [selectedWorkforceReq, setSelectedWorkforceReq] = useState(null);
  const [storeShifts, setStoreShifts] = useState([]);
  const [workforceForm, setWorkforceForm] = useState({
    targetStoreId: '',
    shiftId: '',
    note: '',
  });
  const [selectedStaffToPropose, setSelectedStaffToPropose] = useState('');
  const [storeStaffList, setStoreStaffList] = useState([]);

  // Modals
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Forms
  const [leaveForm, setLeaveForm] = useState({
    leaveType: 'ANNUAL',
    startDate: '',
    endDate: '',
    reason: '',
  });

  const [swapForm, setSwapForm] = useState({
    fromShiftId: '',
    toStaffId: '',
    toShiftId: '',
  });

  const [adjustmentForm, setAdjustmentForm] = useState({
    shiftId: '',
    shiftDate: toISODate(new Date()),
    requestedCheckIn: '08:00',
    requestedCheckOut: '17:00',
    reason: '',
  });

  const getActiveStoreId = () => {
    return storeId || localStorage.getItem('selectedStoreId') || (stores.length > 0 ? String(stores[0].id) : '');
  };

  const showToastMsg = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
    toast.success(msg);
  };

  const openCreateSwapModal = async () => {
    setShowSwapModal(true);
    if (storeId) {
      try {
        const res = await getShiftsForStore(storeId);
        const list = Array.isArray(res.data) ? res.data : [];
        setStoreShifts(list);
        if (list.length > 0 && !swapForm.fromShiftId) {
          setSwapForm((prev) => ({ ...prev, fromShiftId: String(list[0].id) }));
        }
      } catch (e) {
        console.error('Error loading shifts for swap:', e);
      }
    }
  };

  const openCreateAdjustmentModal = async () => {
    setShowAdjustmentModal(true);
    if (storeId) {
      try {
        const res = await getShiftsForStore(storeId);
        const list = Array.isArray(res.data) ? res.data : [];
        setStoreShifts(list);
        if (list.length > 0 && !adjustmentForm.shiftId) {
          const first = list[0];
          setAdjustmentForm((prev) => ({
            ...prev,
            shiftId: String(first.id),
            shiftDate: first.shiftDate || prev.shiftDate,
            requestedCheckIn: first.startTime ? first.startTime.slice(0, 5) : prev.requestedCheckIn,
            requestedCheckOut: first.endTime ? first.endTime.slice(0, 5) : prev.requestedCheckOut,
          }));
        }
      } catch (e) {
        console.error('Error loading shifts for adjustment:', e);
      }
    }
  };

  // Sync tab with URL
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Load stores & employees
  useEffect(() => {
    getAllStores()
      .then((res) => {
        const list = res.data?.content || res.data?.data || (Array.isArray(res.data) ? res.data : []);
        setStores(list);
        if (list.length > 0) {
          const saved = localStorage.getItem('selectedStoreId');
          const matched = (saved && list.find((s) => String(s.id) === String(saved))) || list[0];
          setStoreId(String(matched.id));
          localStorage.setItem('selectedStoreId', String(matched.id));
        }
      })
      .catch((err) => console.info('Store load info:', err.message));

    getStoreDirectory()
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : (res.data?.content || []);
        setPartnerStores(list);
      })
      .catch(() => setPartnerStores([]));

    getEmployees(0, 100)
      .then((res) => {
        const list = res.data?.content || res.data || [];
        setEmployees(list);
      })
      .catch(() => setEmployees([]));
  }, []);

  const resolveStaffName = (staffId, directName) => {
    if (directName) return directName;
    if (!staffId) return 'Nhân viên';
    const emp = employees.find(
      (e) => String(e.staffId || e.id || e.userId) === String(staffId)
    );
    if (emp) return emp.fullName || emp.name;
    return `Nhân viên #${String(staffId).slice(0, 6)}`;
  };

  const notifyRequestUpdated = (sId) => window.dispatchEvent(new CustomEvent('store_requests_updated', { detail: { storeId: sId } }));
  const notifyShiftsUpdated = (sId) => window.dispatchEvent(new CustomEvent('store_shifts_updated', { detail: { storeId: sId } }));
  const notifyAttendanceUpdated = (sId) => window.dispatchEvent(new CustomEvent('store_attendance_updated', { detail: { storeId: sId } }));

  // Listen to store change from Header
  useEffect(() => {
    const handleStoreChanged = (e) => {
      const newId = e.detail?.storeId;
      if (newId) setStoreId(String(newId));
    };
    window.addEventListener('storeChanged', handleStoreChanged);
    return () => window.removeEventListener('storeChanged', handleStoreChanged);
  }, []);

  // Listen to real-time status updates across components
  useEffect(() => {
    const handleSync = () => {
      if (activeTab === 'leave') refreshLeaveRequests();
      else if (activeTab === 'swaps') refreshSwapRequests();
      else if (activeTab === 'adjustments') refreshAdjustmentRequests();
      else if (activeTab === 'workforce' && isManager) fetchWorkforceData(storeId);
      else if (activeTab === 'proposals' && !isManager) {
        getMyWorkforceProposals().then((res) => setMyProposals(Array.isArray(res.data) ? res.data : []));
      }
    };
    window.addEventListener('store_requests_updated', handleSync);
    return () => window.removeEventListener('store_requests_updated', handleSync);
  }, [storeId, activeTab, isManager]);

  const fetchWorkforceData = async (targetId = storeId) => {
    if (!targetId) return;
    try {
      const [outRes, inRes] = await Promise.all([
        getOutgoingWorkforceRequests(targetId),
        getIncomingWorkforceRequests(targetId)
      ]);
      const outList = Array.isArray(outRes.data) ? outRes.data : [];
      const inList = Array.isArray(inRes.data) ? inRes.data : [];
      setOutgoingWorkforce(outList);
      setIncomingWorkforce(inList);
    } catch (err) {
      console.error('Error fetching workforce requests:', err);
    }
  };

  // Load tab data
  useEffect(() => {
    if (!isManager && activeTab === 'workforce') {
      setActiveTab('leave');
      return;
    }
    if (!storeId) return;
    setLoading(true);

    if (isManager) {
      fetchWorkforceData(storeId);
    } else {
      getMyWorkforceProposals()
        .then((res) => setMyProposals(Array.isArray(res.data) ? res.data : []))
        .catch(() => setMyProposals([]));
    }

    if (activeTab === 'leave') {
      const fetchPromise = isManager ? getStoreLeaveRequests(storeId) : getMyLeaveRequests(storeId);
      fetchPromise
        .then((res) => setLeaveRequests(Array.isArray(res.data) ? res.data : []))
        .catch(() => setLeaveRequests([]))
        .finally(() => setLoading(false));
    } else if (activeTab === 'swaps') {
      const fetchPromise = isManager ? getStoreSwapRequests(storeId) : getMySwapRequests();
      fetchPromise
        .then((res) => setSwapRequests(Array.isArray(res.data) ? res.data : []))
        .catch(() => setSwapRequests([]))
        .finally(() => setLoading(false));
    } else if (activeTab === 'adjustments') {
      const fetchPromise = isManager ? getStoreAdjustmentRequests(storeId) : getMyAdjustmentRequests(storeId);
      fetchPromise
        .then((res) => setAdjustments(Array.isArray(res.data) ? res.data : []))
        .catch(() => setAdjustments([]))
        .finally(() => setLoading(false));
    } else if (activeTab === 'workforce' && isManager) {
      fetchWorkforceData(storeId).finally(() => setLoading(false));
    } else if (activeTab === 'proposals' && !isManager) {
      getMyWorkforceProposals()
        .then((res) => setMyProposals(Array.isArray(res.data) ? res.data : []))
        .catch(() => setMyProposals([]))
        .finally(() => setLoading(false));
    }
  }, [storeId, activeTab, isManager]);


  const refreshLeaveRequests = async () => {
    if (!storeId) return;
    try {
      const res = isManager ? await getStoreLeaveRequests(storeId) : await getMyLeaveRequests(storeId);
      setLeaveRequests(Array.isArray(res.data) ? res.data : []);
    } catch {
      setLeaveRequests([]);
    }
  };

  const refreshSwapRequests = async () => {
    try {
      const res = isManager ? await getStoreSwapRequests(storeId) : await getMySwapRequests();
      setSwapRequests(Array.isArray(res.data) ? res.data : []);
    } catch {
      setSwapRequests([]);
    }
  };

  const refreshAdjustmentRequests = async () => {
    if (!storeId) return;
    try {
      const res = isManager ? await getStoreAdjustmentRequests(storeId) : await getMyAdjustmentRequests(storeId);
      setAdjustments(Array.isArray(res.data) ? res.data : []);
    } catch {
      setAdjustments([]);
    }
  };

  // Realtime updates for requests
  useEffect(() => {
    const handleRequestsUpdated = () => {
      refreshLeaveRequests();
      refreshSwapRequests();
      refreshAdjustmentRequests();
      if (isManager) fetchWorkforceData(storeId);
    };
    window.addEventListener('store_requests_updated', handleRequestsUpdated);
    return () => window.removeEventListener('store_requests_updated', handleRequestsUpdated);
  }, [storeId, isManager]);

  // Leave Handlers
  const handleCreateLeave = async (e) => {
    e.preventDefault();
    const sId = storeId || getActiveStoreId();
    if (!sId) {
      toast.warning('Vui lòng chọn chi nhánh trước khi gửi đơn.');
      return;
    }
    if (!leaveForm.startDate || !leaveForm.endDate) {
      toast.warning('Vui lòng chọn ngày bắt đầu và kết thúc.');
      return;
    }
    setActionLoading(true);
    try {
      await createLeaveRequest(sId, {
        leaveType: leaveForm.leaveType,
        startDate: leaveForm.startDate,
        endDate: leaveForm.endDate,
        reason: leaveForm.reason || 'Nghỉ phép',
      });
      setShowLeaveModal(false);
      setLeaveForm({ leaveType: 'ANNUAL', startDate: '', endDate: '', reason: '' });
      showToastMsg('Đã nộp đơn xin nghỉ phép thành công.');
      await refreshLeaveRequests();
      notifyRequestUpdated(sId);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể tạo đơn xin nghỉ.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveLeave = async (id, reqStoreId) => {
    const sId = reqStoreId || storeId || getActiveStoreId();
    if (!sId) return;
    setActionLoading(true);
    try {
      await approveLeaveRequest(sId, id);
      showToastMsg('Đã phê duyệt đơn nghỉ phép.');
      await refreshLeaveRequests();
      notifyRequestUpdated(sId);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi duyệt đơn nghỉ phép.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectLeave = async (id, reqStoreId) => {
    const sId = reqStoreId || storeId || getActiveStoreId();
    if (!sId) return;
    const reason = prompt('Lý do từ chối (tùy chọn):') || '';
    setActionLoading(true);
    try {
      await rejectLeaveRequest(sId, id, { reason });
      showToastMsg('Đã từ chối đơn nghỉ phép.');
      await refreshLeaveRequests();
      notifyRequestUpdated(sId);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi từ chối đơn.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelLeave = async (id, reqStoreId) => {
    const sId = reqStoreId || storeId || getActiveStoreId();
    if (!sId) return;
    if (!window.confirm('Bạn có chắc muốn hủy đơn xin nghỉ này?')) return;
    setActionLoading(true);
    try {
      await cancelLeaveRequest(sId, id);
      showToastMsg('Đã hủy đơn xin nghỉ.');
      await refreshLeaveRequests();
      notifyRequestUpdated(sId);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể hủy đơn.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditLeaveReason = async (id, currentReason, reqStoreId) => {
    const sId = reqStoreId || storeId || getActiveStoreId();
    if (!sId) return;
    const newReason = prompt('Nhập lý do xin nghỉ mới:', currentReason || '');
    if (newReason === null) return;
    const trimmed = newReason.trim();
    if (trimmed === '' || trimmed === currentReason) return;
    setActionLoading(true);
    try {
      await updateLeaveReason(sId, id, trimmed);
      showToastMsg('Đã cập nhật lý do và lưu vào cơ sở dữ liệu thành công.');
      await refreshLeaveRequests();
      notifyRequestUpdated(sId);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể cập nhật lý do.');
    } finally {
      setActionLoading(false);
    }
  };

  // Swap Handlers
  const handleCreateSwap = async (e) => {
    e.preventDefault();
    if (!swapForm.fromShiftId || !swapForm.toStaffId) {
      toast.warning('Vui lòng điền đủ mã ca làm và đồng nghiệp muốn đổi.');
      return;
    }
    setActionLoading(true);
    try {
      await createSwapRequest({
        fromShiftId: swapForm.fromShiftId,
        toStaffId: swapForm.toStaffId,
        toShiftId: swapForm.toShiftId || null,
      });
      setShowSwapModal(false);
      setSwapForm({ fromShiftId: '', toStaffId: '', toShiftId: '' });
      showToastMsg('Đã gửi đề xuất đổi ca tới đồng nghiệp.');
      await refreshSwapRequests();
      notifyRequestUpdated(storeId);
      notifyShiftsUpdated(storeId);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể gửi đề xuất đổi ca.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRespondSwap = async (id, accept) => {
    setActionLoading(true);
    try {
      await respondToSwapRequest(id, { accept });
      showToastMsg(accept ? 'Đã đồng ý yêu cầu đổi ca.' : 'Đã từ chối yêu cầu đổi ca.');
      await refreshSwapRequests();
      notifyRequestUpdated(storeId);
      notifyShiftsUpdated(storeId);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi phản hồi đổi ca.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleManagerApproveSwap = async (id) => {
    setActionLoading(true);
    try {
      await approveSwapRequest(id);
      showToastMsg('Quản lý đã phê duyệt và hoán đổi ca thành công.');
      await refreshSwapRequests();
      notifyRequestUpdated(storeId);
      notifyShiftsUpdated(storeId);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi duyệt đổi ca.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleManagerRejectSwap = async (id) => {
    setActionLoading(true);
    try {
      await rejectSwapRequest(id);
      showToastMsg('Đã từ chối yêu cầu đổi ca.');
      await refreshSwapRequests();
      notifyRequestUpdated(storeId);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi từ chối đổi ca.');
    } finally {
      setActionLoading(false);
    }
  };

  // Adjustment Handlers
  const handleApproveAdjustment = async (id, reqStoreId) => {
    const sId = reqStoreId || storeId || getActiveStoreId();
    if (!sId) return;
    setActionLoading(true);
    try {
      await approveAdjustmentRequest(sId, id);
      showToastMsg('Đã phê duyệt điều chỉnh giờ chấm công.');
      await refreshAdjustmentRequests();
      notifyRequestUpdated(sId);
      notifyAttendanceUpdated(sId);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi duyệt điều chỉnh.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectAdjustment = async (id, reqStoreId) => {
    const sId = reqStoreId || storeId || getActiveStoreId();
    if (!sId) return;
    setActionLoading(true);
    try {
      await rejectAdjustmentRequest(sId, id);
      showToastMsg('Đã từ chối điều chỉnh giờ chấm công.');
      await refreshAdjustmentRequests();
      notifyRequestUpdated(sId);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi từ chối điều chỉnh.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateAdjustment = async (e) => {
    e.preventDefault();
    const sId = storeId || getActiveStoreId();
    if (!sId) {
      toast.warning('Vui lòng chọn chi nhánh trước khi gửi đơn.');
      return;
    }
    if (!adjustmentForm.shiftId) {
      toast.warning('Vui lòng chọn ca làm việc cần giải trình.');
      return;
    }
    if (!adjustmentForm.reason?.trim()) {
      toast.warning('Vui lòng nhập lý do giải trình.');
      return;
    }
    setActionLoading(true);
    try {
      const shiftDate = adjustmentForm.shiftDate || toISODate(new Date());
      const reqIn = adjustmentForm.requestedCheckIn ? `${shiftDate}T${adjustmentForm.requestedCheckIn}:00+07:00` : null;
      const reqOut = adjustmentForm.requestedCheckOut ? `${shiftDate}T${adjustmentForm.requestedCheckOut}:00+07:00` : null;

      await createAdjustmentRequest(sId, {
        shiftId: adjustmentForm.shiftId,
        requestedCheckIn: reqIn,
        requestedCheckOut: reqOut,
        reason: adjustmentForm.reason.trim(),
      });
      setShowAdjustmentModal(false);
      setAdjustmentForm({
        shiftId: '',
        shiftDate: toISODate(new Date()),
        requestedCheckIn: '08:00',
        requestedCheckOut: '17:00',
        reason: '',
      });
      showToastMsg('Đã nộp giải trình chấm công thành công.');
      await refreshAdjustmentRequests();
      notifyRequestUpdated(sId);
      notifyAttendanceUpdated(sId);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể gửi giải trình chấm công.');
    } finally {
      setActionLoading(false);
    }
  };

  // Workforce Handlers
  const openCreateWorkforceModal = async () => {
    setShowWorkforceModal(true);
    const sId = storeId || getActiveStoreId();
    if (!sId) return;
    try {
      const res = await getShiftsForStore(sId);
      const list = Array.isArray(res.data) ? res.data : [];
      setStoreShifts(list);
      const availableTargets = (partnerStores.length > 0 ? partnerStores : stores).filter((s) => String(s.id) !== String(sId));
      setWorkforceForm({
        targetStoreId: availableTargets.length > 0 ? String(availableTargets[0].id) : '',
        shiftId: list.length > 0 ? String(list[0].id) : '',
        note: '',
      });
    } catch (e) {
      console.error('Error loading shifts for workforce request:', e);
    }
  };

  const handleCreateWorkforce = async (e) => {
    e.preventDefault();
    const sId = storeId || getActiveStoreId();
    if (!sId) {
      toast.warning('Vui lòng chọn chi nhánh trước.');
      return;
    }
    if (!workforceForm.targetStoreId || !workforceForm.shiftId) {
      toast.warning('Vui lòng chọn cửa hàng cần mượn và ca làm việc cần hỗ trợ.');
      return;
    }
    setActionLoading(true);
    try {
      await createWorkforceRequest(sId, {
        targetStoreId: workforceForm.targetStoreId,
        shiftId: workforceForm.shiftId,
      });
      setShowWorkforceModal(false);
      showToastMsg('Đã tạo yêu cầu mượn nhân viên gửi tới chi nhánh khác thành công!');
      fetchWorkforceData(sId);
      notifyRequestUpdated(sId);
      notifyShiftsUpdated(sId);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi tạo yêu cầu mượn nhân sự.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelWorkforce = async (id, reqStoreId) => {
    const sId = reqStoreId || storeId || getActiveStoreId();
    if (!sId) return;
    if (!window.confirm('Bạn có chắc muốn hủy yêu cầu mượn nhân viên này?')) return;
    setActionLoading(true);
    try {
      await cancelWorkforceRequest(sId, id);
      showToastMsg('Đã hủy yêu cầu mượn nhân sự.');
      fetchWorkforceData(sId);
      notifyRequestUpdated(sId);
      notifyShiftsUpdated(sId);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể hủy yêu cầu.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectWorkforce = async (id, reqStoreId) => {
    const sId = reqStoreId || storeId || getActiveStoreId();
    if (!sId) return;
    if (!window.confirm('Bạn có chắc muốn từ chối yêu cầu mượn nhân viên từ chi nhánh này?')) return;
    setActionLoading(true);
    try {
      await rejectWorkforceRequest(sId, id);
      showToastMsg('Đã từ chối yêu cầu mượn nhân sự.');
      fetchWorkforceData(sId);
      notifyRequestUpdated(sId);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể từ chối yêu cầu.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenProposeModal = async (req) => {
    const sId = storeId || getActiveStoreId();
    setSelectedWorkforceReq(req);
    setShowProposeModal(true);
    setStoreStaffList([]);
    setSelectedStaffToPropose('');
    if (!sId) return;
    try {
      const res = await getEligibleStaffForRequest(sId, req.id);
      const staffList = Array.isArray(res.data) ? res.data : [];
      setStoreStaffList(staffList);
      if (staffList.length > 0) {
        setSelectedStaffToPropose(String(staffList[0].staffId));
      } else {
        setSelectedStaffToPropose('');
      }
    } catch (err) {
      console.error('Error loading eligible staff for proposal:', err);
      toast.error(err.response?.data?.message || 'Lỗi khi tải danh sách nhân viên khả dụng.');
    }
  };

  const handleProposeStaff = async (e) => {
    e.preventDefault();
    const sId = storeId || getActiveStoreId();
    if (!sId) return;
    if (!selectedStaffToPropose || !selectedWorkforceReq) {
      toast.warning('Vui lòng chọn nhân viên muốn cử sang hỗ trợ.');
      return;
    }
    setActionLoading(true);
    try {
      await createWorkforceProposal(sId, selectedWorkforceReq.id, {
        staffId: selectedStaffToPropose,
      });
      setShowProposeModal(false);
      showToastMsg('Đã cử nhân sự hỗ trợ chi nhánh bạn!');
      fetchWorkforceData(sId);
      notifyRequestUpdated(sId);
      notifyShiftsUpdated(sId);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi đề xuất nhân sự.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRespondProposal = async (proposalId, accepted) => {
    setActionLoading(true);
    try {
      await respondToWorkforceProposal(proposalId, { accepted });
      showToastMsg(accepted ? '✓ Bạn đã đồng ý nhận ca chi viện liên chi nhánh!' : 'Đã từ chối ca chi viện.');
      const res = await getMyWorkforceProposals();
      setMyProposals(Array.isArray(res.data) ? res.data : []);
      notifyRequestUpdated(storeId);
      notifyShiftsUpdated(storeId);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Thao tác thất bại.');
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered lists
  const filteredLeave = useMemo(() => {
    return leaveRequests.filter((r) => {
      const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
      const matchSearch = !search || (r.staffName || '').toLowerCase().includes(search.toLowerCase()) || (r.reason || '').toLowerCase().includes(search.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [leaveRequests, statusFilter, search]);

  const filteredSwaps = useMemo(() => {
    return swapRequests.filter((r) => {
      const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
      return matchStatus;
    });
  }, [swapRequests, statusFilter]);

  const filteredAdjustments = useMemo(() => {
    return adjustments.filter((r) => {
      const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
      const matchSearch = !search || (r.staffName || '').toLowerCase().includes(search.toLowerCase()) || (r.reason || '').toLowerCase().includes(search.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [adjustments, statusFilter, search]);


  const filteredOutgoingWorkforce = useMemo(() => {
    return outgoingWorkforce.filter((r) => {
      const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
      const matchSearch =
        !search ||
        (r.targetStoreName || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.shiftDate || '').toLowerCase().includes(search.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [outgoingWorkforce, statusFilter, search]);

  const filteredIncomingWorkforce = useMemo(() => {
    return incomingWorkforce.filter((r) => {
      const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
      const matchSearch =
        !search ||
        (r.requestingStoreName || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.creatorName || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.shiftDate || '').toLowerCase().includes(search.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [incomingWorkforce, statusFilter, search]);

  const currentStore = stores.find((s) => String(s.id) === String(storeId));

  return (
    <div className="req-container">
      {/* ═══ LEFT SIDEBAR ═══ */}
      <aside className="req-sidebar">
        <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{isManager ? 'Xét duyệt Đơn từ' : 'Đơn từ của tôi'}</span>
            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '999px', background: isManager ? '#e0f2fe' : '#dcfce7', color: isManager ? '#0369a1' : '#15803d', fontWeight: 600 }}>
              {isManager ? 'QUẢN LÝ' : 'NHÂN VIÊN'}
            </span>
          </div>

          <label style={{ display: 'block', fontSize: '11.5px', color: '#64748b', fontWeight: 600, marginBottom: '4px' }}>
            Chi nhánh làm việc
          </label>
          {isAdmin && stores.length > 1 ? (
            <select
              value={storeId}
              onChange={(e) => {
                const newId = e.target.value;
                setStoreId(newId);
                localStorage.setItem('selectedStoreId', newId);
                window.dispatchEvent(new CustomEvent('storeChanged', { detail: { storeId: newId } }));
              }}
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: '8px',
                border: '1.5px solid #cbd5e1',
                fontSize: '12.5px',
                fontWeight: 600,
                color: '#0f172a',
                background: '#fff',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {stores.map((st) => (
                <option key={st.id} value={st.id}>
                  🏬 {st.name}
                </option>
              ))}
            </select>
          ) : (
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', background: '#f8fafc', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              🏬 {currentStore?.name || (stores.length > 0 ? stores[0].name : 'Chi nhánh hiện tại')}
            </div>
          )}
        </div>

        {/* Search */}
        <div className="req-search-box">
          <input
            type="text"
            className="req-search-input"
            placeholder="Tìm theo tên hoặc lý do..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <svg
            className="req-search-svg"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          {search && (
            <button type="button" className="req-search-clear" onClick={() => setSearch('')}>✕</button>
          )}
        </div>

        {/* Status Filter */}
        <div className="req-filter-section">
          <div className="req-filter-section-title">Trạng thái</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
            {[
              { key: 'ALL', label: 'Tất cả trạng thái' },
              { key: 'PENDING', label: 'Đang chờ duyệt' },
              { key: 'APPROVED', label: 'Đã phê duyệt' },
              { key: 'REJECTED', label: 'Đã từ chối' },
            ].map((st) => (
              <button
                key={st.key}
                type="button"
                className={`req-filter-pill ${statusFilter === st.key ? 'active' : ''}`}
                onClick={() => setStatusFilter(st.key)}
                style={{
                  textAlign: 'left',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: statusFilter === st.key ? '1px solid #16a34a' : '1px solid #e5e7eb',
                  background: statusFilter === st.key ? '#f0fdf4' : '#ffffff',
                  color: statusFilter === st.key ? '#16a34a' : '#374151',
                  fontWeight: statusFilter === st.key ? 600 : 400,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Primary Action Button based on Tab */}
        {(!isManager || activeTab === 'workforce') && (
          <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
            {activeTab === 'leave' && !isManager && (
              <button
                type="button"
                className="req-btn-create"
                onClick={() => setShowLeaveModal(true)}
                style={{ width: '100%', background: '#16a34a', color: '#fff', padding: '12px', borderRadius: '10px', fontWeight: 600, border: 'none', cursor: 'pointer' }}
              >
                + Nộp đơn xin nghỉ
              </button>
            )}

            {activeTab === 'swaps' && !isManager && (
              <button
                type="button"
                className="req-btn-create"
                onClick={openCreateSwapModal}
                style={{ width: '100%', background: '#2563eb', color: '#fff', padding: '12px', borderRadius: '10px', fontWeight: 600, border: 'none', cursor: 'pointer' }}
              >
                + Đề xuất đổi ca
              </button>
            )}

            {activeTab === 'adjustments' && !isManager && (
              <button
                type="button"
                className="req-btn-create"
                onClick={openCreateAdjustmentModal}
                style={{ width: '100%', background: '#d97706', color: '#fff', padding: '12px', borderRadius: '10px', fontWeight: 600, border: 'none', cursor: 'pointer' }}
              >
                + Gửi giải trình chấm công
              </button>
            )}

            {activeTab === 'workforce' && isManager && (
              <button
                type="button"
                className="req-btn-create"
                onClick={openCreateWorkforceModal}
                style={{ width: '100%', background: '#0284c7', color: '#fff', padding: '12px', borderRadius: '10px', fontWeight: 600, border: 'none', cursor: 'pointer' }}
              >
                + Mượn nhân viên chi nhánh khác
              </button>
            )}
          </div>
        )}
      </aside>

      {/* ═══ MAIN CONTENT AREA ═══ */}
      <main className="req-main" style={{ flex: 1, overflowX: 'auto' }}>
        {/* Role Header Banner */}
        <div style={{
          background: isManager ? 'linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%)' : 'linear-gradient(135deg, #f8fafc 0%, #f0fdf4 100%)',
          padding: '16px 20px',
          borderRadius: '12px',
          marginBottom: '16px',
          border: isManager ? '1px solid #bae6fd' : '1px solid #bbf7d0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                {isManager ? 'Trung tâm Xét duyệt & Quản lý Đơn từ' : 'Đơn từ & Yêu cầu của tôi'}
              </h2>
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 9px',
                borderRadius: '999px',
                background: isManager ? (userRole === 'ADMIN' ? '#fef3c7' : '#dbeafe') : '#dcfce7',
                color: isManager ? (userRole === 'ADMIN' ? '#92400e' : '#1d4ed8') : '#15803d',
                border: isManager ? (userRole === 'ADMIN' ? '1px solid #fde68a' : '1px solid #bfdbfe') : '1px solid #bbf7d0'
              }}>
                {isManager ? (userRole === 'ADMIN' ? 'ADMIN HỆ THỐNG' : 'QUẢN LÝ CỬA HÀNG') : 'NHÂN VIÊN (STAFF)'}
              </span>
            </div>
            <p style={{ fontSize: '13px', color: '#475569', margin: '4px 0 0 0' }}>
              {isManager
                ? 'Tiếp nhận, kiểm tra và phê duyệt các đơn xin nghỉ phép, đổi ca, giải trình chấm công và điều phối mượn nhân sự liên chi nhánh.'
                : 'Theo dõi tình trạng các đơn xin nghỉ phép, đề xuất đổi ca và giải trình chấm công của cá nhân bạn.'}
            </p>
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', textAlign: 'right', display: 'none', md: 'block' }}>
            <div>Chi nhánh: <strong style={{ color: '#0f172a' }}>{currentStore?.name || 'Chi nhánh'}</strong></div>
            <div>Tài khoản: <strong style={{ color: '#0f172a' }}>{userRole}</strong></div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="req-header-tabs">
          <button
            type="button"
            className={`req-tab-btn ${activeTab === 'leave' ? 'active' : ''}`}
            onClick={() => handleTabChange('leave')}
          >
            {isManager ? 'Đơn nghỉ phép nhân viên' : 'Đơn xin nghỉ của tôi'}
            {leaveRequests.filter(r => r.status === 'PENDING').length > 0 && (
              <span className="req-badge-count">{leaveRequests.filter(r => r.status === 'PENDING').length}</span>
            )}
          </button>

          <button
            type="button"
            className={`req-tab-btn ${activeTab === 'swaps' ? 'active' : ''}`}
            onClick={() => handleTabChange('swaps')}
          >
            {isManager ? 'Yêu cầu đổi ca' : 'Đề xuất đổi ca của tôi'}
            {swapRequests.filter(r => r.status === 'PENDING' || r.status === 'PENDING_MANAGER').length > 0 && (
              <span className="req-badge-count">{swapRequests.filter(r => r.status === 'PENDING' || r.status === 'PENDING_MANAGER').length}</span>
            )}
          </button>

          <button
            type="button"
            className={`req-tab-btn ${activeTab === 'adjustments' ? 'active' : ''}`}
            onClick={() => handleTabChange('adjustments')}
          >
            {isManager ? 'Giải trình chấm công' : 'Giải trình chấm công của tôi'}
            {adjustments.filter(r => r.status === 'PENDING').length > 0 && (
              <span className="req-badge-count">{adjustments.filter(r => r.status === 'PENDING').length}</span>
            )}
          </button>

          {isManager && (
            <button
              type="button"
              className={`req-tab-btn ${activeTab === 'workforce' ? 'active' : ''}`}
              onClick={() => handleTabChange('workforce')}
            >
              Mượn nhân sự liên chi nhánh
              {(incomingWorkforce.filter(r => r.status === 'PENDING').length + outgoingWorkforce.filter(r => r.status === 'PROPOSAL_SENT').length) > 0 && (
                <span className="req-badge-count">
                  {incomingWorkforce.filter(r => r.status === 'PENDING').length + outgoingWorkforce.filter(r => r.status === 'PROPOSAL_SENT').length}
                </span>
              )}
            </button>
          )}

          {!isManager && (
            <button
              type="button"
              className={`req-tab-btn ${activeTab === 'proposals' ? 'active' : ''}`}
              onClick={() => handleTabChange('proposals')}
            >
              Lời mời chi viện chi nhánh khác
              {myProposals.filter(p => p.status === 'PENDING').length > 0 && (
                <span className="req-badge-count" style={{ background: '#ef4444', color: '#fff' }}>
                  {myProposals.filter(p => p.status === 'PENDING').length}
                </span>
              )}
            </button>
          )}
        </div>

        {/* ── TAB 1: LEAVE REQUESTS ── */}
        {activeTab === 'leave' && (
          <div className="req-table-card" style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '16px', overflowX: 'auto' }}>
            <table className="req-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f3f4f6', textAlign: 'left', color: '#6b7280', fontSize: '12.5px' }}>
                  <th style={{ padding: '12px' }}>{isManager ? 'Nhân viên' : 'Người nộp'}</th>
                  <th style={{ padding: '12px' }}>Loại nghỉ</th>
                  <th style={{ padding: '12px' }}>Thời gian</th>
                  <th style={{ padding: '12px' }}>Lý do</th>
                  <th style={{ padding: '12px' }}>Trạng thái</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeave.map((r) => {
                  const isPending = r.status === 'PENDING';
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6', fontSize: '13.5px' }}>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <UserAvatar name={r.staffName} size={32} />
                          <strong>{isManager ? (r.staffName || 'Nhân viên') : 'Tôi (Bạn)'}</strong>
                        </div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, background: r.leaveType === 'SICK' ? '#fee2e2' : r.leaveType === 'EMERGENCY' ? '#fef3c7' : '#e0e7ff', color: r.leaveType === 'SICK' ? '#991b1b' : r.leaveType === 'EMERGENCY' ? '#92400e' : '#3730a3' }}>
                          {r.leaveType === 'SICK' ? 'Nghỉ ốm' : r.leaveType === 'EMERGENCY' ? 'Khẩn cấp' : 'Phép năm'}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        {fmtDate(r.startDate)} → {fmtDate(r.endDate)}
                      </td>
                      <td style={{ padding: '12px', color: '#4b5563', maxWidth: '260px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <span>{r.reason || '—'}</span>
                          {!isManager && isPending && (
                            <button
                              type="button"
                              title="Chỉnh sửa lý do và lưu vào database"
                              onClick={() => handleEditLeaveReason(r.id, r.reason, r.storeId)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.6, fontSize: '13px', padding: '2px 4px' }}
                              onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                              onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
                            >
                              ✏️
                            </button>
                          )}
                        </div>
                        {r.rejectionReason && (
                          <div style={{ fontSize: '11.5px', color: '#dc2626', marginTop: '4px', fontStyle: 'italic' }}>
                            Lý do từ chối: {r.rejectionReason}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span className={`pay-status-pill ${r.status?.toLowerCase()}`}>
                          {r.status === 'APPROVED' ? 'Đã duyệt' : r.status === 'REJECTED' ? 'Từ chối' : 'Chờ duyệt'}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        {isPending && isManager && (
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              onClick={() => handleApproveLeave(r.id, r.storeId)}
                              disabled={actionLoading}
                              style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}
                            >
                              Duyệt
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRejectLeave(r.id, r.storeId)}
                              disabled={actionLoading}
                              style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}
                            >
                              Từ chối
                            </button>
                          </div>
                        )}
                        {isPending && !isManager && (
                          <button
                            type="button"
                            onClick={() => handleCancelLeave(r.id, r.storeId)}
                            disabled={actionLoading}
                            style={{ background: '#6b7280', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                          >
                            Hủy đơn
                          </button>
                        )}
                        {!isPending && <span style={{ color: '#9ca3af', fontSize: '12px' }}>Đã hoàn tất</span>}
                      </td>
                    </tr>
                  );
                })}

                {filteredLeave.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: '#9ca3af' }}>
                      {loading ? 'Đang tải dữ liệu...' : 'Không có đơn xin nghỉ phép nào.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── TAB 2: SHIFT SWAP REQUESTS ── */}
        {activeTab === 'swaps' && (
          <div className="req-table-card" style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '16px', overflowX: 'auto' }}>
            <table className="req-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f3f4f6', textAlign: 'left', color: '#6b7280', fontSize: '12.5px' }}>
                  <th style={{ padding: '12px' }}>Người gửi</th>
                  <th style={{ padding: '12px' }}>Đồng nghiệp đổi ca</th>
                  <th style={{ padding: '12px' }}>Trạng thái</th>
                  <th style={{ padding: '12px' }}>Đồng nghiệp đồng ý?</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredSwaps.map((s) => {
                  const fromName = resolveStaffName(s.fromStaffId, s.fromStaffName);
                  const toName = resolveStaffName(s.toStaffId, s.toStaffName);
                  return (
                    <tr key={s.id} style={{ borderBottom: '1px solid #f3f4f6', fontSize: '13.5px' }}>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <UserAvatar name={fromName} size={32} />
                          <div>
                            <strong>{fromName}</strong>
                            {s.fromShiftDate && (
                              <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                                Ca: {fmtDate(s.fromShiftDate)} ({s.fromShiftStartTime?.slice(0, 5)} - {s.fromShiftEndTime?.slice(0, 5)})
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <UserAvatar name={toName} size={32} />
                          <div>
                            <span>{toName}</span>
                            {s.toShiftDate ? (
                              <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                                Ca: {fmtDate(s.toShiftDate)} ({s.toShiftStartTime?.slice(0, 5)} - {s.toShiftEndTime?.slice(0, 5)})
                              </div>
                            ) : (
                              <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>(Nhận ca / Không đổi chéo)</div>
                            )}
                          </div>
                        </div>
                      </td>
                    <td style={{ padding: '12px' }}>
                      <span className={`pay-status-pill ${s.status?.toLowerCase()}`}>
                        {s.status === 'APPROVED' ? 'Đã duyệt' : s.status === 'REJECTED' ? 'Từ chối' : s.status === 'PENDING_MANAGER' ? 'Chờ Quản lý duyệt' : 'Chờ đồng nghiệp đồng ý'}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      {s.employeeAccepted ? (
                        <span style={{ color: '#16a34a', fontWeight: 600 }}>Đã đồng ý</span>
                      ) : (
                        <span style={{ color: '#d97706', fontWeight: 500 }}>Chưa phản hồi</span>
                      )}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      {/* Peer Action: If current user is toStaff and not accepted yet */}
                      {!s.employeeAccepted && s.status === 'PENDING' && (
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            onClick={() => handleRespondSwap(s.id, true)}
                            disabled={actionLoading}
                            style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}
                          >
                            Đồng ý đổi
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRespondSwap(s.id, false)}
                            disabled={actionLoading}
                            style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                          >
                            Từ chối
                          </button>
                        </div>
                      )}

                      {/* Manager Action: If both peers accepted, Manager approves */}
                      {isManager && (s.status === 'PENDING_MANAGER' || (s.employeeAccepted && s.status === 'PENDING')) && (
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            onClick={() => handleManagerApproveSwap(s.id)}
                            disabled={actionLoading}
                            style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}
                          >
                            Duyệt đổi ca
                          </button>
                          <button
                            type="button"
                            onClick={() => handleManagerRejectSwap(s.id)}
                            disabled={actionLoading}
                            style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                          >
                            Từ chối
                          </button>
                        </div>
                      )}

                      {s.status === 'APPROVED' && <span style={{ color: '#16a34a', fontSize: '12px' }}>Hoán đổi hoàn tất</span>}
                      {s.status === 'REJECTED' && <span style={{ color: '#dc2626', fontSize: '12px' }}>Đã hủy</span>}
                    </td>
                  </tr>
                );
              })}

                {filteredSwaps.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '32px', color: '#9ca3af' }}>
                      {loading ? 'Đang tải dữ liệu...' : 'Không có yêu cầu đổi ca nào.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── TAB 3: ATTENDANCE ADJUSTMENTS ── */}
        {activeTab === 'adjustments' && (
          <div className="req-table-card" style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '16px', overflowX: 'auto' }}>
            <table className="req-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f3f4f6', textAlign: 'left', color: '#6b7280', fontSize: '12.5px' }}>
                  <th style={{ padding: '12px' }}>{isManager ? 'Nhân viên' : 'Người gửi'}</th>
                  <th style={{ padding: '12px' }}>Giờ Check-In đề xuất</th>
                  <th style={{ padding: '12px' }}>Giờ Check-Out đề xuất</th>
                  <th style={{ padding: '12px' }}>Lý do giải trình</th>
                  <th style={{ padding: '12px' }}>Trạng thái</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredAdjustments.map((a) => {
                  const isPending = a.status === 'PENDING';
                  return (
                    <tr key={a.id} style={{ borderBottom: '1px solid #f3f4f6', fontSize: '13.5px' }}>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <UserAvatar name={a.staffName} size={32} />
                          <strong>{isManager ? (a.staffName || 'Nhân viên') : 'Tôi (Bạn)'}</strong>
                        </div>
                      </td>
                      <td style={{ padding: '12px' }}>{fmtDateTime(a.requestedCheckIn)}</td>
                      <td style={{ padding: '12px' }}>{fmtDateTime(a.requestedCheckOut)}</td>
                      <td style={{ padding: '12px', color: '#4b5563', maxWidth: '240px' }}>
                        {a.reason || 'Quên quẹt thẻ'}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span className={`pay-status-pill ${a.status?.toLowerCase()}`}>
                          {a.status === 'APPROVED' ? 'Đã duyệt' : a.status === 'REJECTED' ? 'Từ chối' : 'Chờ duyệt'}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        {isPending && isManager && (
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              onClick={() => handleApproveAdjustment(a.id, a.storeId)}
                              disabled={actionLoading}
                              style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}
                            >
                              Duyệt giờ
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRejectAdjustment(a.id, a.storeId)}
                              disabled={actionLoading}
                              style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                            >
                              Bác bỏ
                            </button>
                          </div>
                        )}
                        {isPending && !isManager && (
                          <span style={{ color: '#d97706', fontSize: '12px', fontWeight: 500 }}>
                            Chờ Quản lý duyệt
                          </span>
                        )}
                        {!isPending && (
                          <span style={{ color: a.status === 'APPROVED' ? '#16a34a' : '#dc2626', fontSize: '12px' }}>
                            {a.status === 'APPROVED' ? 'Đã duyệt' : 'Đã từ chối'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {filteredAdjustments.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: '#9ca3af' }}>
                      {loading ? 'Đang tải dữ liệu...' : 'Không có yêu cầu điều chỉnh chấm công nào.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── TAB 4: WORKFORCE SHARING (MANAGER ONLY) ── */}
        {activeTab === 'workforce' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Attention Banner if there are incoming pending requests */}
            {incomingWorkforce.filter((r) => r.status === 'PENDING').length > 0 && (
              <div style={{
                background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                border: '1.5px solid #f59e0b',
                borderRadius: '12px',
                padding: '14px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                boxShadow: '0 2px 8px rgba(245, 158, 11, 0.12)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '26px' }}>🚨</span>
                  <div>
                    <div style={{ fontWeight: 700, color: '#92400e', fontSize: '14.5px' }}>
                      Chi nhánh bạn có {incomingWorkforce.filter((r) => r.status === 'PENDING').length} yêu cầu mượn nhân sự cần xử lý ngay!
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#b45309', marginTop: '2px' }}>
                      Chi nhánh đối tác đang cần hỗ trợ nhân lực. Vui lòng bấm <strong>"Cử nhân viên"</strong> hoặc <strong>"Từ chối"</strong> ở bảng bên dưới.
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setWorkforceSubTab('incoming')}
                  style={{
                    background: '#d97706',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Xem yêu cầu ({incomingWorkforce.filter((r) => r.status === 'PENDING').length}) →
                </button>
              </div>
            )}

            {/* Success Banner if partner has proposed staff */}
            {outgoingWorkforce.some((r) => r.status === 'PROPOSAL_SENT') && (
              <div style={{
                background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                border: '1.5px solid #10b981',
                borderRadius: '12px',
                padding: '14px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.12)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '26px' }}>🎉</span>
                  <div>
                    <div style={{ fontWeight: 700, color: '#065f46', fontSize: '14.5px' }}>
                      Chi nhánh đối tác đã cử nhân sự chi viện cho bạn!
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#047857', marginTop: '2px' }}>
                      Đối tác đã phân công nhân sự hỗ trợ ca làm việc bạn gửi đi. Vui lòng bấm tab <strong>"Bạn mượn chi nhánh khác"</strong> để xem chi tiết.
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setWorkforceSubTab('outgoing')}
                  style={{
                    background: '#059669',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Xem nhân sự cử sang ({outgoingWorkforce.filter((r) => r.status === 'PROPOSAL_SENT').length}) →
                </button>
              </div>
            )}

            {/* Sub-toolbar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#fff',
              padding: '12px 18px',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
            }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setWorkforceSubTab('incoming')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '13.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: 'none',
                    background: workforceSubTab === 'incoming' ? '#0284c7' : '#f1f5f9',
                    color: workforceSubTab === 'incoming' ? '#ffffff' : '#475569',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <span>📥 Chi nhánh khác mượn bạn (Yêu cầu nhận được)</span>
                  {incomingWorkforce.filter((r) => r.status === 'PENDING').length > 0 ? (
                    <span style={{
                      background: '#ef4444',
                      color: '#ffffff',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      fontSize: '11px',
                      fontWeight: 800,
                      animation: 'pulse 2s infinite'
                    }}>
                      {incomingWorkforce.filter((r) => r.status === 'PENDING').length} cần cử người
                    </span>
                  ) : (
                    <span style={{
                      background: workforceSubTab === 'incoming' ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                      color: workforceSubTab === 'incoming' ? '#ffffff' : '#334155',
                      padding: '1px 7px',
                      borderRadius: '999px',
                      fontSize: '11px',
                      fontWeight: 700
                    }}>
                      {incomingWorkforce.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setWorkforceSubTab('outgoing')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '13.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: 'none',
                    background: workforceSubTab === 'outgoing' ? '#0284c7' : '#f1f5f9',
                    color: workforceSubTab === 'outgoing' ? '#ffffff' : '#475569',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <span>📤 Bạn mượn chi nhánh khác (Yêu cầu gửi đi)</span>
                  {outgoingWorkforce.some((r) => r.status === 'PROPOSAL_SENT') ? (
                    <span style={{
                      background: '#10b981',
                      color: '#ffffff',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      fontSize: '11px',
                      fontWeight: 800
                    }}>
                      {outgoingWorkforce.filter((r) => r.status === 'PROPOSAL_SENT').length} đã có người cử sang
                    </span>
                  ) : (
                    <span style={{
                      background: workforceSubTab === 'outgoing' ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                      color: workforceSubTab === 'outgoing' ? '#ffffff' : '#334155',
                      padding: '1px 7px',
                      borderRadius: '999px',
                      fontSize: '11px',
                      fontWeight: 700
                    }}>
                      {outgoingWorkforce.length}
                    </span>
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={openCreateWorkforceModal}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#0284c7',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '13.5px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 4px rgba(2, 132, 199, 0.2)'
                }}
              >
                <span>+ Tạo yêu cầu mượn nhân viên</span>
              </button>
            </div>

            {/* Table for Incoming (CHI NHÁNH BỊ MƯỢN / CẦN CỬ NHÂN VIÊN) */}
            {workforceSubTab === 'incoming' && (
              <div className="req-table-card" style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '16px', overflowX: 'auto' }}>
                <table className="req-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #f3f4f6', textAlign: 'left', color: '#6b7280', fontSize: '12.5px' }}>
                      <th style={{ padding: '12px' }}>Chi nhánh cần hỗ trợ</th>
                      <th style={{ padding: '12px' }}>Ca làm việc cần người</th>
                      <th style={{ padding: '12px' }}>Thời gian nhận</th>
                      <th style={{ padding: '12px' }}>Trạng thái xử lý</th>
                      <th style={{ padding: '12px' }}>Nhân sự chi viện</th>
                      <th style={{ padding: '12px', textAlign: 'right' }}>Thao tác của bạn</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredIncomingWorkforce.map((r) => {
                      const isPending = r.status === 'PENDING';
                      const proposedStaff = r.proposals && r.proposals.length > 0 ? r.proposals[0] : null;

                      return (
                        <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6', fontSize: '13.5px' }}>
                          <td style={{ padding: '12px' }}>
                            <strong style={{ color: '#0f172a' }}>{r.requestingStoreName || 'Chi nhánh yêu cầu'}</strong>
                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                              Người gửi: {r.creatorName || 'Quản lý'}
                            </div>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <div style={{ fontWeight: 600, color: '#1e293b' }}>{fmtDate(r.shiftDate)}</div>
                            <div style={{ fontSize: '12.5px', color: '#0284c7', fontWeight: 600, marginTop: '2px' }}>
                              {r.shiftStartTime?.slice(0, 5)} - {r.shiftEndTime?.slice(0, 5)}
                            </div>
                          </td>
                          <td style={{ padding: '12px', color: '#64748b', fontSize: '12.5px' }}>
                            {fmtDateTime(r.createdAt)}
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span style={{
                              padding: '5px 11px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 700,
                              background:
                                r.status === 'PENDING' ? '#fef3c7' :
                                r.status === 'PROPOSAL_SENT' ? '#e0f2fe' :
                                r.status === 'COMPLETED' ? '#dcfce7' :
                                r.status === 'MANAGER_REJECTED' ? '#fee2e2' : '#f1f5f9',
                              color:
                                r.status === 'PENDING' ? '#92400e' :
                                r.status === 'PROPOSAL_SENT' ? '#0369a1' :
                                r.status === 'COMPLETED' ? '#15803d' :
                                r.status === 'MANAGER_REJECTED' ? '#b91c1c' : '#475569',
                              border: r.status === 'PENDING' ? '1px solid #fde68a' : 'none'
                            }}>
                              {r.status === 'PENDING' ? '🚨 Cần bạn cử nhân sự' :
                               r.status === 'PROPOSAL_SENT' ? 'Đã cử NV (Chờ NV nhận)' :
                               r.status === 'COMPLETED' ? '✓ Hoàn tất' :
                               r.status === 'MANAGER_REJECTED' ? 'Bạn đã từ chối' :
                               r.status === 'CANCELLED' ? 'Chi nhánh đã hủy' : r.status}
                            </span>
                          </td>
                          <td style={{ padding: '12px' }}>
                            {proposedStaff ? (
                              <div>
                                <span style={{ fontWeight: 600, color: '#0284c7' }}>
                                  {proposedStaff.staffName || 'Nhân viên'}
                                </span>
                                {proposedStaff.status && (
                                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                    {proposedStaff.status === 'PENDING' ? '⏳ Chờ NV chấp thuận' :
                                     proposedStaff.status === 'ACCEPTED' ? '✓ Đã nhận ca' : '✕ Từ chối'}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: '#d97706', fontStyle: 'italic', fontSize: '12.5px' }}>
                                Chưa cử nhân viên
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right' }}>
                            {isPending ? (
                              <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => handleOpenProposeModal(r)}
                                  disabled={actionLoading}
                                  style={{
                                    padding: '7px 14px',
                                    fontSize: '12.5px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: '#0284c7',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    fontWeight: 700,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    boxShadow: '0 2px 4px rgba(2, 132, 199, 0.25)'
                                  }}
                                >
                                  <span>⚡</span>
                                  <span>Cử nhân viên</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRejectWorkforce(r.id)}
                                  disabled={actionLoading}
                                  style={{
                                    padding: '7px 12px',
                                    fontSize: '12.5px',
                                    borderRadius: '8px',
                                    border: '1px solid #fecaca',
                                    background: '#fff',
                                    color: '#dc2626',
                                    cursor: 'pointer',
                                    fontWeight: 600
                                  }}
                                >
                                  Từ chối
                                </button>
                              </div>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: '12px' }}>
                                {r.status === 'PROPOSAL_SENT' ? 'Đã cử người' :
                                 r.status === 'COMPLETED' ? 'Đã vào ca' :
                                 r.status === 'MANAGER_REJECTED' ? 'Đã từ chối' : '—'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                    {filteredIncomingWorkforce.length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                          Hiện không có chi nhánh nào gửi yêu cầu mượn nhân viên đến cửa hàng này.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Table for Outgoing (CHI NHÁNH ĐI MƯỢN) */}
            {workforceSubTab === 'outgoing' && (
              <div className="req-table-card" style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '16px', overflowX: 'auto' }}>
                <table className="req-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #f3f4f6', textAlign: 'left', color: '#6b7280', fontSize: '12.5px' }}>
                      <th style={{ padding: '12px' }}>Chi nhánh được nhờ hỗ trợ</th>
                      <th style={{ padding: '12px' }}>Ca làm việc cần người</th>
                      <th style={{ padding: '12px' }}>Thời gian gửi</th>
                      <th style={{ padding: '12px' }}>Tiến độ phản hồi</th>
                      <th style={{ padding: '12px' }}>Nhân sự được cử</th>
                      <th style={{ padding: '12px', textAlign: 'right' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOutgoingWorkforce.map((r) => {
                      const isPending = r.status === 'PENDING';
                      const isProposalSent = r.status === 'PROPOSAL_SENT';
                      const proposedStaff = r.proposals && r.proposals.length > 0 ? r.proposals[0] : null;

                      return (
                        <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6', fontSize: '13.5px' }}>
                          <td style={{ padding: '12px' }}>
                            <strong style={{ color: '#0f172a' }}>{r.targetStoreName || 'Chi nhánh khác'}</strong>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <div style={{ fontWeight: 600, color: '#1e293b' }}>{fmtDate(r.shiftDate)}</div>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>
                              {r.shiftStartTime?.slice(0, 5)} - {r.shiftEndTime?.slice(0, 5)}
                            </div>
                          </td>
                          <td style={{ padding: '12px', color: '#64748b', fontSize: '12.5px' }}>
                            {fmtDateTime(r.createdAt)}
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span style={{
                              padding: '5px 11px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 600,
                              background:
                                r.status === 'PENDING' ? '#fef3c7' :
                                r.status === 'PROPOSAL_SENT' ? '#e0f2fe' :
                                r.status === 'COMPLETED' ? '#dcfce7' :
                                r.status === 'MANAGER_REJECTED' ? '#fee2e2' : '#f1f5f9',
                              color:
                                r.status === 'PENDING' ? '#92400e' :
                                r.status === 'PROPOSAL_SENT' ? '#0369a1' :
                                r.status === 'COMPLETED' ? '#15803d' :
                                r.status === 'MANAGER_REJECTED' ? '#b91c1c' : '#475569'
                            }}>
                              {r.status === 'PENDING' ? `⏳ Đang chờ ${r.targetStoreName || 'chi nhánh đối tác'} phản hồi` :
                               r.status === 'PROPOSAL_SENT' ? 'Đối tác đã đề xuất nhân sự' :
                               r.status === 'COMPLETED' ? '✓ Đã có nhân sự vào ca' :
                               r.status === 'MANAGER_REJECTED' ? 'Đối tác từ chối chi viện' :
                               r.status === 'CANCELLED' ? 'Bạn đã hủy' : r.status}
                            </span>
                          </td>
                          <td style={{ padding: '12px' }}>
                            {proposedStaff ? (
                              <div>
                                <span style={{ fontWeight: 600, color: '#0284c7' }}>
                                  {proposedStaff.staffName || 'Nhân viên'}
                                </span>
                                {proposedStaff.status && (
                                  <span style={{ fontSize: '11px', marginLeft: '6px', color: '#64748b' }}>
                                    ({proposedStaff.status === 'PENDING' ? 'Chờ NV nhận' : proposedStaff.status === 'ACCEPTED' ? 'Đã nhận' : 'Từ chối'})
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: '#94a3b8' }}>Đang chờ cử người...</span>
                            )}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right' }}>
                            {(isPending || isProposalSent) ? (
                              <button
                                type="button"
                                onClick={() => handleCancelWorkforce(r.id)}
                                disabled={actionLoading}
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '12px',
                                  borderRadius: '6px',
                                  border: '1px solid #e2e8f0',
                                  background: '#fff',
                                  color: '#dc2626',
                                  cursor: 'pointer',
                                  fontWeight: 600
                                }}
                              >
                                Hủy yêu cầu
                              </button>
                            ) : (
                              <span style={{ color: '#cbd5e1' }}>—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                    {filteredOutgoingWorkforce.length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                          Bạn chưa tạo yêu cầu mượn nhân viên nào từ chi nhánh khác.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 5 (STAFF): PROPOSALS ── */}
        {!isManager && activeTab === 'proposals' && (
          <div className="req-table-card" style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '16px', overflowX: 'auto' }}>
            <div style={{ marginBottom: '14px', fontSize: '13.5px', color: '#475569' }}>
              Danh sách các lời mời điều phối đi chi viện hỗ trợ ca làm việc tại chi nhánh khác do Quản lý phân công:
            </div>
            <table className="req-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f3f4f6', textAlign: 'left', color: '#6b7280', fontSize: '12.5px' }}>
                  <th style={{ padding: '12px' }}>Người điều phối</th>
                  <th style={{ padding: '12px' }}>Thời gian gửi</th>
                  <th style={{ padding: '12px' }}>Trạng thái</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Hành động của bạn</th>
                </tr>
              </thead>
              <tbody>
                {myProposals.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6', fontSize: '13.5px' }}>
                    <td style={{ padding: '12px' }}>
                      <strong style={{ color: '#0f172a' }}>{p.proposedByName || 'Quản lý cửa hàng'}</strong>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                        Cử bạn đi chi viện ca làm việc tại chi nhánh đối tác
                      </div>
                    </td>
                    <td style={{ padding: '12px', color: '#64748b', fontSize: '12.5px' }}>
                      {fmtDateTime(p.createdAt)}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        background: p.status === 'PENDING' ? '#fef3c7' : p.status === 'ACCEPTED' ? '#dcfce7' : '#fee2e2',
                        color: p.status === 'PENDING' ? '#92400e' : p.status === 'ACCEPTED' ? '#15803d' : '#b91c1c'
                      }}>
                        {p.status === 'PENDING' ? '⏳ Chờ bạn phản hồi' : p.status === 'ACCEPTED' ? '✓ Đã đồng ý nhận ca' : 'Đã từ chối'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      {p.status === 'PENDING' ? (
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => handleRespondProposal(p.id, true)}
                            style={{
                              background: '#16a34a',
                              color: '#fff',
                              border: 'none',
                              padding: '7px 14px',
                              borderRadius: '8px',
                              fontWeight: 700,
                              fontSize: '12.5px',
                              cursor: 'pointer'
                            }}
                          >
                            ✓ Đồng ý nhận ca
                          </button>
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => handleRespondProposal(p.id, false)}
                            style={{
                              background: '#fee2e2',
                              color: '#dc2626',
                              border: '1px solid #fca5a5',
                              padding: '7px 14px',
                              borderRadius: '8px',
                              fontWeight: 600,
                              fontSize: '12.5px',
                              cursor: 'pointer'
                            }}
                          >
                            ✕ Từ chối
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '12.5px' }}>Đã phản hồi</span>
                      )}
                    </td>
                  </tr>
                ))}
                {myProposals.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                      Bạn hiện không có lời mời đi chi viện ca làm việc nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* ═══ MODAL 1: TẠO ĐƠN XIN NGHỈ PHÉP ═══ */}
      {showLeaveModal && (
        <div className="req-modal-overlay" onClick={() => setShowLeaveModal(false)}>
          <div className="req-create-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="req-create-header">
              <h2 className="req-create-title">Nộp đơn xin nghỉ phép</h2>
              <button type="button" className="req-btn-close-modal" onClick={() => setShowLeaveModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateLeave} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Loại nghỉ phép</label>
                <select
                  value={leaveForm.leaveType}
                  onChange={(e) => setLeaveForm({ ...leaveForm, leaveType: e.target.value })}
                  style={{ width: '100%', height: '40px', borderRadius: '8px', border: '1px solid #d1d5db', padding: '0 10px' }}
                >
                  <option value="ANNUAL">Phép năm (ANNUAL LEAVE)</option>
                  <option value="SICK">Nghỉ ốm (SICK LEAVE)</option>
                  <option value="EMERGENCY">Việc đột xuất khẩn cấp (EMERGENCY)</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Từ ngày</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.startDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                    style={{ width: '100%', height: '40px', borderRadius: '8px', border: '1px solid #d1d5db', padding: '0 10px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Đến ngày</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.endDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                    style={{ width: '100%', height: '40px', borderRadius: '8px', border: '1px solid #d1d5db', padding: '0 10px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Lý do xin nghỉ</label>
                <textarea
                  rows="3"
                  placeholder="Nhập lý do chi tiết..."
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  style={{ width: '100%', borderRadius: '8px', border: '1px solid #d1d5db', padding: '10px', fontSize: '13.5px' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowLeaveModal(false)} style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer' }}>
                  Hủy
                </button>
                <button type="submit" disabled={actionLoading} style={{ padding: '9px 18px', borderRadius: '8px', border: 'none', background: '#16a34a', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                  {actionLoading ? 'Đang gửi...' : 'Nộp đơn'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ MODAL 2: TẠO ĐỀ XUẤT ĐỔI CA ═══ */}
      {showSwapModal && (
        <div className="req-modal-overlay" onClick={() => setShowSwapModal(false)}>
          <div className="req-create-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="req-create-header">
              <h2 className="req-create-title">Đề xuất đổi ca làm việc</h2>
              <button type="button" className="req-btn-close-modal" onClick={() => setShowSwapModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateSwap} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Ca làm việc của bạn cần đổi <span style={{ color: '#dc2626' }}>*</span>
                </label>
                {storeShifts.length > 0 ? (
                  <select
                    required
                    value={swapForm.fromShiftId}
                    onChange={(e) => setSwapForm({ ...swapForm, fromShiftId: e.target.value })}
                    style={{ width: '100%', height: '40px', borderRadius: '8px', border: '1px solid #d1d5db', padding: '0 10px', fontSize: '13px' }}
                  >
                    <option value="">-- Chọn ca làm việc của bạn --</option>
                    {storeShifts.map((s) => (
                      <option key={s.id} value={s.id}>
                        📅 {fmtDate(s.shiftDate || s.date)}: {s.startTime?.slice(0, 5)} - {s.endTime?.slice(0, 5)} ({s.name || s.zoneName || 'Ca làm'})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="Nhập mã Shift ID..."
                    required
                    value={swapForm.fromShiftId}
                    onChange={(e) => setSwapForm({ ...swapForm, fromShiftId: e.target.value })}
                    style={{ width: '100%', height: '40px', borderRadius: '8px', border: '1px solid #d1d5db', padding: '0 10px' }}
                  />
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Chọn đồng nghiệp muốn đổi ca <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select
                  required
                  value={swapForm.toStaffId}
                  onChange={(e) => setSwapForm({ ...swapForm, toStaffId: e.target.value })}
                  style={{ width: '100%', height: '40px', borderRadius: '8px', border: '1px solid #d1d5db', padding: '0 10px', fontSize: '13px' }}
                >
                  <option value="">-- Chọn nhân viên --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.userId || emp.id}>
                      {emp.fullName || emp.name} ({emp.role || 'Nhân viên'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Ca làm muốn đổi của đồng nghiệp (Tùy chọn)
                </label>
                {storeShifts.length > 0 ? (
                  <select
                    value={swapForm.toShiftId}
                    onChange={(e) => setSwapForm({ ...swapForm, toShiftId: e.target.value })}
                    style={{ width: '100%', height: '40px', borderRadius: '8px', border: '1px solid #d1d5db', padding: '0 10px', fontSize: '13px' }}
                  >
                    <option value="">-- Chọn ca nhận lại nếu có (hoặc để trống) --</option>
                    {storeShifts.map((s) => (
                      <option key={s.id} value={s.id}>
                        📅 {fmtDate(s.shiftDate || s.date)}: {s.startTime?.slice(0, 5)} - {s.endTime?.slice(0, 5)} ({s.name || s.zoneName || 'Ca làm'})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="Mã ca của đồng nghiệp nếu có..."
                    value={swapForm.toShiftId}
                    onChange={(e) => setSwapForm({ ...swapForm, toShiftId: e.target.value })}
                    style={{ width: '100%', height: '40px', borderRadius: '8px', border: '1px solid #d1d5db', padding: '0 10px' }}
                  />
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowSwapModal(false)} style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer' }}>
                  Hủy
                </button>
                <button type="submit" disabled={actionLoading} style={{ padding: '9px 18px', borderRadius: '8px', border: 'none', background: '#2563eb', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                  {actionLoading ? 'Đang gửi...' : 'Gửi yêu cầu đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ MODAL 3: TẠO GIẢI TRÌNH CHẤM CÔNG (STAFF) ═══ */}
      {showAdjustmentModal && (
        <div className="req-modal-overlay" onClick={() => setShowAdjustmentModal(false)}>
          <div className="req-create-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="req-create-header">
              <h2 className="req-create-title">Gửi giải trình chấm công</h2>
              <button type="button" className="req-btn-close-modal" onClick={() => setShowAdjustmentModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateAdjustment} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Ca làm việc cần giải trình <span style={{ color: '#dc2626' }}>*</span>
                </label>
                {storeShifts.length > 0 ? (
                  <select
                    required
                    value={adjustmentForm.shiftId}
                    onChange={(e) => {
                      const sel = storeShifts.find((s) => String(s.id) === e.target.value);
                      setAdjustmentForm({
                        ...adjustmentForm,
                        shiftId: e.target.value,
                        shiftDate: sel?.shiftDate || sel?.date || adjustmentForm.shiftDate,
                        requestedCheckIn: sel?.startTime ? sel.startTime.slice(0, 5) : adjustmentForm.requestedCheckIn,
                        requestedCheckOut: sel?.endTime ? sel.endTime.slice(0, 5) : adjustmentForm.requestedCheckOut,
                      });
                    }}
                    style={{ width: '100%', height: '40px', borderRadius: '8px', border: '1px solid #d1d5db', padding: '0 10px', fontSize: '13px' }}
                  >
                    <option value="">-- Chọn ca làm việc cần giải trình --</option>
                    {storeShifts.map((s) => (
                      <option key={s.id} value={s.id}>
                        📅 {fmtDate(s.shiftDate || s.date)}: {s.startTime?.slice(0, 5)} - {s.endTime?.slice(0, 5)} ({s.name || s.zoneName || 'Ca làm'})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="Nhập mã ca làm việc (Shift ID)..."
                    required
                    value={adjustmentForm.shiftId}
                    onChange={(e) => setAdjustmentForm({ ...adjustmentForm, shiftId: e.target.value })}
                    style={{ width: '100%', height: '40px', borderRadius: '8px', border: '1px solid #d1d5db', padding: '0 10px' }}
                  />
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Ngày làm việc</label>
                <input
                  type="date"
                  required
                  value={adjustmentForm.shiftDate}
                  onChange={(e) => setAdjustmentForm({ ...adjustmentForm, shiftDate: e.target.value })}
                  style={{ width: '100%', height: '40px', borderRadius: '8px', border: '1px solid #d1d5db', padding: '0 10px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Giờ Check-in đề xuất</label>
                  <input
                    type="time"
                    required
                    value={adjustmentForm.requestedCheckIn}
                    onChange={(e) => setAdjustmentForm({ ...adjustmentForm, requestedCheckIn: e.target.value })}
                    style={{ width: '100%', height: '40px', borderRadius: '8px', border: '1px solid #d1d5db', padding: '0 10px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Giờ Check-out đề xuất</label>
                  <input
                    type="time"
                    required
                    value={adjustmentForm.requestedCheckOut}
                    onChange={(e) => setAdjustmentForm({ ...adjustmentForm, requestedCheckOut: e.target.value })}
                    style={{ width: '100%', height: '40px', borderRadius: '8px', border: '1px solid #d1d5db', padding: '0 10px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Lý do giải trình</label>
                <textarea
                  rows="3"
                  placeholder="Ví dụ: Quên quẹt thẻ do thiết bị lỗi, có xác nhận của đồng nghiệp..."
                  value={adjustmentForm.reason}
                  onChange={(e) => setAdjustmentForm({ ...adjustmentForm, reason: e.target.value })}
                  style={{ width: '100%', borderRadius: '8px', border: '1px solid #d1d5db', padding: '10px', fontSize: '13.5px' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowAdjustmentModal(false)} style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer' }}>
                  Hủy
                </button>
                <button type="submit" disabled={actionLoading} style={{ padding: '9px 18px', borderRadius: '8px', border: 'none', background: '#d97706', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                  {actionLoading ? 'Đang gửi...' : 'Gửi giải trình'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ MODAL 4: TẠO YÊU CẦU MƯỢN NHÂN VIÊN TỪ CHI NHÁNH KHÁC ═══ */}
      {showWorkforceModal && (
        <div className="req-modal-overlay" onClick={() => setShowWorkforceModal(false)}>
          <div className="req-create-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="req-create-header">
              <h2 className="req-create-title">Yêu cầu mượn nhân viên từ chi nhánh khác</h2>
              <button type="button" className="req-btn-close-modal" onClick={() => setShowWorkforceModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateWorkforce} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Cửa hàng cần mượn nhân sự
                </label>
                <select
                  required
                  value={workforceForm.targetStoreId}
                  onChange={(e) => setWorkforceForm({ ...workforceForm, targetStoreId: e.target.value })}
                  style={{ width: '100%', height: '40px', borderRadius: '8px', border: '1px solid #d1d5db', padding: '0 10px', fontSize: '13.5px' }}
                >
                  <option value="">-- Chọn cửa hàng --</option>
                  {(partnerStores.length > 0 ? partnerStores : stores)
                    .filter((s) => String(s.id) !== String(storeId))
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.address || 'Chi nhánh ShiftSync'})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Ca làm việc tại cửa hàng bạn cần hỗ trợ
                </label>
                <select
                  required
                  value={workforceForm.shiftId}
                  onChange={(e) => setWorkforceForm({ ...workforceForm, shiftId: e.target.value })}
                  style={{ width: '100%', height: '40px', borderRadius: '8px', border: '1px solid #d1d5db', padding: '0 10px', fontSize: '13.5px' }}
                >
                  <option value="">-- Chọn ca làm việc --</option>
                  {storeShifts.map((sh) => (
                    <option key={sh.id} value={sh.id}>
                      {fmtDate(sh.shiftDate)} • {sh.startTime?.slice(0, 5)} - {sh.endTime?.slice(0, 5)} {sh.skillName ? `(${sh.skillName})` : ''}
                    </option>
                  ))}
                </select>
                {storeShifts.length === 0 && (
                  <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>
                    Chưa tìm thấy ca làm việc nào cho cửa hàng này. Vui lòng tạo ca làm việc trước.
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Lý do / Mô tả nhu cầu cần chi nhánh khác hỗ trợ
                </label>
                <textarea
                  rows="3"
                  placeholder="Ví dụ: Giờ cao điểm cuối tuần đơn hàng tăng vọt, cần bổ sung nhân sự..."
                  value={workforceForm.note}
                  onChange={(e) => setWorkforceForm({ ...workforceForm, note: e.target.value })}
                  style={{ width: '100%', borderRadius: '8px', border: '1px solid #d1d5db', padding: '10px', fontSize: '13.5px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowWorkforceModal(false)}
                  style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !workforceForm.shiftId || !workforceForm.targetStoreId}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#0284c7',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {actionLoading ? 'Đang gửi...' : 'Gửi yêu cầu mượn'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ MODAL 5: ĐỀ XUẤT NHÂN VIÊN SANG HỖ TRỢ CHI NHÁNH BẠN ═══ */}
      {showProposeModal && selectedWorkforceReq && (
        <div className="req-modal-overlay" onClick={() => setShowProposeModal(false)}>
          <div className="req-create-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="req-create-header">
              <h2 className="req-create-title">Cử nhân viên sang chi nhánh hỗ trợ</h2>
              <button type="button" className="req-btn-close-modal" onClick={() => setShowProposeModal(false)}>✕</button>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', margin: '12px 0', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '13px', color: '#475569', marginBottom: '4px' }}>
                Chi nhánh cần hỗ trợ: <strong style={{ color: '#0f172a' }}>{selectedWorkforceReq.requestingStoreName}</strong>
              </div>
              <div style={{ fontSize: '13px', color: '#475569' }}>
                Ca làm việc: <strong style={{ color: '#0f172a' }}>{fmtDate(selectedWorkforceReq.shiftDate)} • {selectedWorkforceReq.shiftStartTime?.slice(0, 5)} - {selectedWorkforceReq.shiftEndTime?.slice(0, 5)}</strong>
              </div>
            </div>

            <form onSubmit={handleProposeStaff} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Chọn nhân viên có ca rảnh & đủ điều kiện
                </label>
                {storeStaffList.length > 0 ? (
                  <select
                    required
                    value={selectedStaffToPropose}
                    onChange={(e) => setSelectedStaffToPropose(e.target.value)}
                    style={{ width: '100%', height: '40px', borderRadius: '8px', border: '1px solid #d1d5db', padding: '0 10px', fontSize: '13.5px' }}
                  >
                    <option value="">-- Chọn nhân viên ({storeStaffList.length} nhân sự đủ điều kiện) --</option>
                    {storeStaffList.map((emp) => (
                      <option key={emp.staffId} value={emp.staffId}>
                        {emp.staffFullName || emp.staffEmail} ({emp.systemRole || 'STAFF'})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    padding: '12px',
                    color: '#991b1b',
                    fontSize: '13px',
                    lineHeight: '1.4'
                  }}>
                    ⚠️ <strong>Không có nhân sự khả dụng:</strong> Hiện không có nhân viên (STAFF) nào có lịch rảnh đăng ký khớp với ca làm này hoặc không bị trùng lịch/ngày nghỉ tại chi nhánh của bạn.
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowProposeModal(false)}
                  style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !selectedStaffToPropose || storeStaffList.length === 0}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    background: (storeStaffList.length === 0 || !selectedStaffToPropose) ? '#94a3b8' : '#0284c7',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: (storeStaffList.length === 0 || !selectedStaffToPropose) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {actionLoading ? 'Đang gửi...' : 'Xác nhận cử nhân viên'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMsg && (
        <div className="req-toast">
          <span>✓</span>
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}