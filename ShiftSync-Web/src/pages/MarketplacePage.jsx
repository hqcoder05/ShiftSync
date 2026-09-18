import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getAllStores } from '../services/storeService';
import {
  getMarketplaceShifts,
  publishShiftToMarketplace,
  unpublishShiftFromMarketplace,
  claimMarketplaceShift,
} from '../services/marketplaceService';
import { getShiftsForStore, assignStaffToShift, getEligibleStaffForShift } from '../services/shiftService';
import { getStaffByStore } from '../services/employmentService';
import { getRequests, updateRequestStatus } from '../services/requestService';
import {
  getStoreSwapRequests,
  approveSwapRequest,
  rejectSwapRequest,
  cancelSwapRequest,
} from '../services/swapService';
import {
  getStoreAdjustmentRequests,
  approveAdjustmentRequest,
  rejectAdjustmentRequest,
} from '../services/adjustmentService';
import {
  createWorkforceRequest,
  getIncomingWorkforceRequests,
  getOutgoingWorkforceRequests,
  rejectWorkforceRequest,
  cancelWorkforceRequest,
  createWorkforceProposal,
  getEligibleStaffForRequest,
} from '../services/workforceService';
import { getPositions } from '../services/headcountQuotaService';
import Avatar3DWeb from '../components/Avatar3DWeb';
import { getAvatarForEmployee } from '../components/avatarConfigs';
import './MarketplacePage.css';

const toISODate = (d) => d.toISOString().slice(0, 10);

const calcShiftDurationHours = (start, end) => {
  if (!start || !end) return 8.0;
  try {
    const [h1, m1] = start.split(':').map(Number);
    const [h2, m2] = end.split(':').map(Number);
    let diff = h2 * 60 + m2 - (h1 * 60 + m1);
    if (diff < 0) diff += 24 * 60;
    return Math.round((diff / 60) * 10) / 10;
  } catch {
    return 8.0;
  }
};

const cleanText = (str) => {
  if (!str) return '';
  let result = str;
  try {
    let s = str;
    for (let round = 0; round < 3; round++) {
      if (!/[ÃÂâêìíîïñòóôõö÷øùúûüýþÿ]/.test(s)) break;
      try {
        const decoded = decodeURIComponent(
          escape(s.replace(/[\u0080-\u009F]/g, ''))
        );
        if (decoded && decoded !== s) {
          s = decoded;
          continue;
        }
      } catch (e) {}
      break;
    }
    result = s;
  } catch {}

  // Safe fallback clean for multi-encoded characters in legacy database records
  if (result.includes('Ã') || result.includes('Â') || result.includes('„')) {
    result = result
      .replace(/Y[ÃÂƒ]+.*?[Ã„]+.*?ca/gi, 'Yêu cầu đổi ca')
      .replace(/Ca T[ÃÂ][\s\S]*?S[ÃÂ]ng/gi, 'Ca Tối sang Ca Sáng')
      .replace(/Ca Chi[ÃÂ][\s\S]*?S[ÃÂ]ng/gi, 'Ca Chiều sang Ca Sáng')
      .replace(/K[ÃÂƒ]+.*?[Ã¡]+.*?[Ã¡]+.*?Qu[ÃÂƒ]+.*?[Ã¡]+/gi, 'Kính gửi Quản lý')
      .replace(/[ÃÂƒâ€š]+.*?/g, '');
  }
  return result;
};

const getRequestTypeTitle = (req) => {
  if (req.typeCategory === 'swap' || (req.requestType && (req.requestType.includes('Ã') || req.requestType.toLowerCase().includes('ca')))) {
    return 'Yêu cầu đổi ca làm việc';
  }
  if (req.typeCategory === 'leave') return 'Yêu cầu xin nghỉ phép';
  if (req.typeCategory === 'support') return 'Yêu cầu hỗ trợ nhân sự';
  return cleanText(req.requestType) || 'Yêu cầu điều phối';
};

const getRequestShiftTitle = (req) => {
  const info = req.shiftInfo || '';
  if (info.includes('T') && (info.includes('S') || info.includes('SÃ'))) {
    return 'Ca Tối (18:00 - 23:00) -> Ca Sáng (06:00 - 14:00)';
  }
  if (info.includes('Chi') && (info.includes('S') || info.includes('SÃ'))) {
    return 'Ca Chiều (14:00 - 22:00) -> Ca Sáng (06:00 - 14:00)';
  }
  return cleanText(info) || req.startDate || 'Theo ca đăng ký';
};

const fmtDateVN = (dStr) => {
  if (!dStr) return '—';
  try {
    const d = new Date(`${dStr}T00:00:00`);
    const dow = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][d.getDay()];
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${dow}, ${day}/${month}/${d.getFullYear()}`;
  } catch {
    return dStr;
  }
};

const fmtDateTimeVN = (isoStr) => {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${mins} ${day}/${month}/${year}`;
  } catch {
    return isoStr;
  }
};

export default function MarketplacePage() {
  const [stores, setStores] = useState([]);
  const [storeId, setStoreId] = useState(() => localStorage.getItem('selectedStoreId') || localStorage.getItem('storeId') || '');
  const [employees, setEmployees] = useState([]);
  const [openShifts, setOpenShifts] = useState([]);
  const [storeShifts, setStoreShifts] = useState([]);
  const [requestsList, setRequestsList] = useState([]);
  const [storeSwapList, setStoreSwapList] = useState([]);
  const [adjustmentsList, setAdjustmentsList] = useState([]);
  const [incomingWorkforce, setIncomingWorkforce] = useState([]);
  const [outgoingWorkforce, setOutgoingWorkforce] = useState([]);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [mpActionLoadingId, setMpActionLoadingId] = useState(null);
  const [publishSubmitting, setPublishSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');

  // URL Tab parsing & synchronization
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = (searchParams.get('tab') || '').toUpperCase();
  const getInitialTab = () => {
    if (urlTab === 'WORKFORCE' || urlTab === 'CROSS_STORE') return 'WORKFORCE';
    if (urlTab === 'SWAP' || urlTab === 'SWAPS') return 'SWAP';
    if (urlTab === 'OPEN' || urlTab === 'OPEN_NEEDS') return 'OPEN';
    if (urlTab === 'FILLED') return 'FILLED';
    return 'OPEN';
  };

  // Tabs & Views
  const [activeTab, setActiveTab] = useState(getInitialTab); // 'OPEN' | 'SWAP' | 'WORKFORCE' | 'FILLED'
  const [workforceSubTab, setWorkforceSubTab] = useState('INCOMING'); // 'INCOMING' | 'OUTGOING'
  const [sortBy, setSortBy] = useState('URGENCY');
  const [showUrgentBanner, setShowUrgentBanner] = useState(true);
  const [shiftEligibleStaffMap, setShiftEligibleStaffMap] = useState({});

  useEffect(() => {
    if (urlTab === 'WORKFORCE' || urlTab === 'CROSS_STORE') setActiveTab('WORKFORCE');
    else if (urlTab === 'SWAP' || urlTab === 'SWAPS') setActiveTab('SWAP');
    else if (urlTab === 'OPEN' || urlTab === 'OPEN_NEEDS') setActiveTab('OPEN');
    else if (urlTab === 'FILLED') setActiveTab('FILLED');
  }, [urlTab]);

  // Eligible Candidates Modal (Calling backend ShiftAssignmentValidator)
  const [showEligibleCandidatesModal, setShowEligibleCandidatesModal] = useState(false);
  const [selectedShiftForEligibility, setSelectedShiftForEligibility] = useState(null);
  const [eligibleCandidatesList, setEligibleCandidatesList] = useState([]);
  const [loadingEligibleCandidates, setLoadingEligibleCandidates] = useState(false);
  const [assigningCandidateId, setAssigningCandidateId] = useState(null);

  // Sidebar Filters
  const [statusFilters, setStatusFilters] = useState({
    noApplicant: true,     // Chưa có ứng viên
    expiringSoon: true,    // Sắp hết hạn xử lý (<3h)
    otRisk: false,         // Có xung đột lịch / Rà soát OT
    hasApplicant: true,    // Đã có ứng viên chờ duyệt
  });
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('CURRENT');
  const [roleFilters, setRoleFilters] = useState({ all: true });
  const [selectedTimePeriod, setSelectedTimePeriod] = useState('ALL'); // 'ALL' | 'MORNING' | 'AFTERNOON' | 'NIGHT'

  // Modals
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [selectedShiftToPublish, setSelectedShiftToPublish] = useState('');
  const [publishBonus, setPublishBonus] = useState(50000);
  const [publishNote, setPublishNote] = useState('');
  const [publishPushNotif, setPublishPushNotif] = useState(true);
  const [publishCrossBranch, setPublishCrossBranch] = useState(true);

  const [showApplicantsModal, setShowApplicantsModal] = useState(false);
  const [selectedShiftForApplicants, setSelectedShiftForApplicants] = useState(null);

  const [showOtPolicyModal, setShowOtPolicyModal] = useState(false);
  const [showAuditLogModal, setShowAuditLogModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDetailShift, setSelectedDetailShift] = useState(null);

  // Propose Staff Modal (Workforce)
  const [showProposeStaffModal, setShowProposeStaffModal] = useState(false);
  const [selectedWorkforceReqForPropose, setSelectedWorkforceReqForPropose] = useState(null);
  const [eligibleStaffList, setEligibleStaffList] = useState([]);
  const [selectedEligibleStaffId, setSelectedEligibleStaffId] = useState('');
  const [proposingLoading, setProposingLoading] = useState(false);

  // Create Workforce Request Modal
  const [showCreateWorkforceModal, setShowCreateWorkforceModal] = useState(false);
  const [createWfTargetStoreId, setCreateWfTargetStoreId] = useState('');
  const [createWfShiftId, setCreateWfShiftId] = useState('');
  const [createWfSubmitting, setCreateWfSubmitting] = useState(false);

  // Record Detail Modal
  const [showRecordDetailModal, setShowRecordDetailModal] = useState(false);
  const [selectedDetailRecord, setSelectedDetailRecord] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const userRole = (localStorage.getItem('userRole') || 'MANAGER').toUpperCase();
  const isManager = userRole === 'MANAGER' || userRole === 'ADMIN';

  // 1. Fetch Stores
  useEffect(() => {
    getAllStores()
      .then((res) => {
        const list = res.data?.content || res.data?.data || (Array.isArray(res.data) ? res.data : []);
        setStores(list);
        if (list.length > 0 && !storeId) {
          const firstId = String(list[0].id);
          setStoreId(firstId);
          localStorage.setItem('selectedStoreId', firstId);
        }
      })
      .catch((err) => console.info('Marketplace store fetch:', err.message));
  }, []);

  // 2. Listen to store changed event
  useEffect(() => {
    const handleStoreChanged = (e) => {
      const newId = e.detail?.storeId;
      if (newId) setStoreId(String(newId));
    };
    window.addEventListener('storeChanged', handleStoreChanged);
    return () => window.removeEventListener('storeChanged', handleStoreChanged);
  }, []);

  // 2.1. Listen to real-time status updates across components
  useEffect(() => {
    const handleSyncUpdate = () => {
      loadData();
    };
    window.addEventListener('store_requests_updated', handleSyncUpdate);
    window.addEventListener('store_marketplace_updated', handleSyncUpdate);
    window.addEventListener('store_shifts_updated', handleSyncUpdate);
    window.addEventListener('store_attendance_updated', handleSyncUpdate);
    return () => {
      window.removeEventListener('store_requests_updated', handleSyncUpdate);
      window.removeEventListener('store_marketplace_updated', handleSyncUpdate);
      window.removeEventListener('store_shifts_updated', handleSyncUpdate);
      window.removeEventListener('store_attendance_updated', handleSyncUpdate);
    };
  }, [storeId]);

  // 3. Load all dynamic data from backend
  const loadData = () => {
    if (!storeId) return;
    setLoading(true);
    Promise.all([
      getMarketplaceShifts(storeId).catch(() => ({ data: [] })),
      getShiftsForStore(storeId).catch(() => ({ data: [] })),
      getStaffByStore(storeId, 0, 100).catch(() => ({ data: [] })),
      getRequests().catch(() => []),
      getPositions(storeId).catch(() => []),
      getStoreSwapRequests(storeId).catch(() => ({ data: [] })),
      getStoreAdjustmentRequests(storeId).catch(() => ({ data: [] })),
      getIncomingWorkforceRequests(storeId).catch(() => ({ data: [] })),
      getOutgoingWorkforceRequests(storeId).catch(() => ({ data: [] })),
    ])
      .then(([mpRes, shiftsRes, staffRes, reqList, posList, storeSwapsRes, adjRes, incWfRes, outWfRes]) => {
        const mpList = Array.isArray(mpRes.data) ? mpRes.data : (mpRes.data?.content || []);
        const shList = Array.isArray(shiftsRes.data) ? shiftsRes.data : (shiftsRes.data?.content || []);
        const rawStaff = Array.isArray(staffRes.data) ? staffRes.data : (staffRes.data?.content || []);
        const nonManagers = rawStaff.filter(
          (emp) => (emp.systemRole || emp.role) !== 'MANAGER' && (emp.systemRole || emp.role) !== 'ADMIN'
        );
        const rawSwaps = Array.isArray(storeSwapsRes?.data) ? storeSwapsRes.data : (storeSwapsRes?.data?.content || []);
        const rawAdjs = Array.isArray(adjRes?.data) ? adjRes.data : (adjRes?.data?.content || []);
        const rawIncWf = Array.isArray(incWfRes?.data) ? incWfRes.data : (incWfRes?.data?.content || []);
        const rawOutWf = Array.isArray(outWfRes?.data) ? outWfRes.data : (outWfRes?.data?.content || []);

        setOpenShifts(mpList);
        setStoreShifts(shList);
        setEmployees(nonManagers);
        setRequestsList(Array.isArray(reqList) ? reqList : (reqList?.content || []));
        setStoreSwapList(rawSwaps);
        setAdjustmentsList(rawAdjs);
        setIncomingWorkforce(rawIncWf);
        setOutgoingWorkforce(rawOutWf);
        setPositions(Array.isArray(posList) ? posList : []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [storeId]);

  const currentStore = stores.find((s) => String(s.id) === String(storeId));

  // 4. Dynamic Weekly Hours Calculation for all Staff
  const staffWeeklyHours = useMemo(() => {
    const map = {};
    employees.forEach((e) => {
      const id = e.staffId || e.id;
      map[id] = 0;
    });

    storeShifts.forEach((shift) => {
      const dur = calcShiftDurationHours(shift.startTime, shift.endTime);
      (shift.shiftAssignments || []).forEach((sa) => {
        if (map[sa.staffId] !== undefined) {
          map[sa.staffId] += dur;
        }
      });
    });

    return map;
  }, [employees, storeShifts]);

  // 5. Dynamic Overtime Risk Count (Staff with >= 40h or near limit >= 36h)
  const otRiskStaffCount = useMemo(() => {
    return Object.values(staffWeeklyHours).filter((h) => h >= 40).length;
  }, [staffWeeklyHours]);

  // 6. Dynamic Understaffed Shifts
  const understaffedShifts = useMemo(() => {
    const todayStr = toISODate(new Date());

    return storeShifts
      .map((s) => {
        const reqStaff =
          s.requiredStaff ||
          (s.skillRequirements || []).reduce((sum, r) => sum + (r.requiredStaff || 0), 0);
        const assignedStaff = (s.shiftAssignments || []).length;
        const missingCount = Math.max(0, reqStaff - assignedStaff);
        const duration = calcShiftDurationHours(s.startTime, s.endTime);

        // Chi tiết vị trí còn thiếu
        const missingRoles = [];
        (s.skillRequirements || []).forEach((req) => {
          const reqCount = req.requiredStaff || 1;
          const assignedWithSkill = (s.shiftAssignments || []).filter(
            (sa) =>
              sa.requiredSkillId === req.skillId ||
              (sa.skillName && req.skillName && sa.skillName.toLowerCase() === req.skillName.toLowerCase())
          ).length;
          if (assignedWithSkill < reqCount) {
            missingRoles.push(`${req.skillName || 'Nhân sự'} (thiếu ${reqCount - assignedWithSkill})`);
          }
        });

        // Vị trí trọng tâm cần tuyển
        const primarySkill =
          s.skillRequirements?.find((r) => (r.assignedCount || 0) < (r.requiredStaff || 1))?.skillName ||
          s.skillRequirements?.[0]?.skillName ||
          s.skillName ||
          'Nhân viên';

        // Độ khẩn cấp: ca hôm nay hoặc ngày mai
        const isUrgent = s.shiftDate === todayStr;

        // Thù lao ca làm việc theo đúng vị trí chuyên môn từ Backend (Barista: 28k, Cashier: 26k, Kitchen: 30k, Waiter: 25k)
        const matchedPos = positions.find((p) =>
          (p.name && primarySkill && p.name.toLowerCase() === primarySkill.toLowerCase()) ||
          (p.code && primarySkill && p.code.toLowerCase() === primarySkill.toLowerCase())
        );
        let baseRate = matchedPos?.hourlyRate;
        if (!baseRate || baseRate <= 0) {
          const lower = (primarySkill || '').toLowerCase();
          if (lower.includes('bếp') || lower.includes('kitchen')) baseRate = 30000;
          else if (lower.includes('barista') || lower.includes('pha chế')) baseRate = 28000;
          else if (lower.includes('thu ngân') || lower.includes('cashier')) baseRate = 26000;
          else if (lower.includes('waiter') || lower.includes('phục vụ')) baseRate = 25000;
          else if (lower.includes('leader') || lower.includes('trưởng ca')) baseRate = 35000;
          else baseRate = 28000;
        }
        const hourlyRate = baseRate;
        const rateMultiplier = isUrgent ? 1.25 : 1.0;
        const totalWage = Math.round(hourlyRate * rateMultiplier * duration);

        const startTimeStr = s.startTime?.slice(0, 5) || '08:00';
        const endTimeStr = s.endTime?.slice(0, 5) || '16:00';
        const timePeriod =
          startTimeStr < '14:00' ? 'MORNING' : startTimeStr < '22:00' ? 'AFTERNOON' : 'NIGHT';

        const isPublishedToMp = Boolean(s.isOpen || openShifts.some((os) => os.id === s.id));

        return {
          ...s,
          code: `#SH-${String(s.id).slice(0, 4).toUpperCase()}`,
          title: `${primarySkill} (${startTimeStr} – ${endTimeStr})`,
          primarySkill,
          storeName: currentStore?.name || 'Flagship Store',
          creator: `Quản lý ${currentStore?.name || 'cửa hàng'}`,
          reqStaff,
          assignedStaff,
          missingCount,
          missingRolesText: missingRoles.join(', ') || 'Chưa đủ định biên',
          duration,
          isUrgent,
          rateMultiplier,
          totalWage,
          hourlyRate,
          startTimeStr,
          endTimeStr,
          timePeriod,
          isPublishedToMp,
          skills: (s.skillRequirements || []).map((r) => r.skillName).filter(Boolean),
        };
      })
      .filter((s) => s.missingCount > 0)
      .sort((a, b) => {
        // Ưu tiên ca khẩn cấp hôm nay
        if (a.isUrgent && !b.isUrgent) return -1;
        if (!a.isUrgent && b.isUrgent) return 1;
        return (a.shiftDate || '').localeCompare(b.shiftDate || '');
      });
  }, [storeShifts, openShifts, currentStore, positions]);

  // 6.1. Danh sách ca thiếu quân số CHƯA từng được đăng lên Marketplace (Loại bỏ tuyệt đối ca đã đăng)
  const unpublishedUnderstaffedShifts = useMemo(() => {
    return understaffedShifts.filter((s) => !s.isPublishedToMp);
  }, [understaffedShifts]);

  // 6.2. Fetch eligible candidates from backend Source of Truth for open shifts
  useEffect(() => {
    if (!storeId || !understaffedShifts || understaffedShifts.length === 0) return;
    understaffedShifts.forEach((shift) => {
      if (shift?.id && !shiftEligibleStaffMap[shift.id]) {
        getEligibleStaffForShift(storeId, shift.id)
          .then((res) => {
            const list = Array.isArray(res.data) ? res.data : [];
            setShiftEligibleStaffMap((prev) => ({ ...prev, [shift.id]: list }));
          })
          .catch(() => {});
      }
    });
  }, [storeId, understaffedShifts]);

  // 8. Dynamic Swap Requests from /api/requests and /stores/{storeId}/swaps
  const allSwapRequests = useMemo(() => {
    // 8.1. From StaffRequests (/api/requests)
    const staffSwaps = (requestsList || [])
      .filter(
        (r) =>
          r.typeCategory === 'swap' ||
          (r.requestType && r.requestType.toLowerCase().includes('đổi ca'))
      )
      .map((r) => ({
        ...r,
        isShiftSwap: false,
        status: r.status || 'PENDING',
      }));

    // 8.2. From ShiftSwapRequest (/stores/{storeId}/swaps)
    const structuredSwaps = (storeSwapList || []).map((s) => ({
      id: s.id,
      isShiftSwap: true,
      requesterName: s.fromStaffName || 'Nhân sự',
      fromStaffName: s.fromStaffName,
      toStaffName: s.toStaffName || 'Nhân viên đối tác',
      fromStaffId: s.fromStaffId,
      toStaffId: s.toStaffId,
      fromShiftId: s.fromShiftId,
      toShiftId: s.toShiftId,
      employeeAccepted: Boolean(s.employeeAccepted),
      requestType: 'Yêu cầu hoán đổi ca làm',
      typeCategory: 'swap',
      status: s.status || 'PENDING',
      requestDate: s.fromShiftDate ? fmtDateVN(s.fromShiftDate) : 'Hôm nay',
      shiftInfo: `${s.fromShiftDate || ''} (${(s.fromShiftStartTime || '').slice(0, 5)} - ${(s.fromShiftEndTime || '').slice(0, 5)}) ⇄ ${s.toStaffName ? s.toStaffName + ' (' + (s.toShiftDate || '') + ' ' + (s.toShiftStartTime || '').slice(0, 5) + '-' + (s.toShiftEndTime || '').slice(0, 5) + ')' : 'Mở hoán đổi'}`,
      content: `Đề xuất đổi ca với ${s.toStaffName || 'đồng nghiệp'}. Trạng thái xác nhận từ đối tác: ${s.employeeAccepted ? 'Đã đồng ý' : 'Chờ phản hồi'}.`,
    }));

    return [...staffSwaps, ...structuredSwaps].sort((a, b) => {
      if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
      if (a.status !== 'PENDING' && b.status === 'PENDING') return 1;
      return 0;
    });
  }, [requestsList, storeSwapList]);

  // Backward compatibility reference for any existing filter
  const swapRequests = useMemo(() => {
    return allSwapRequests.filter((s) => s.status === 'PENDING');
  }, [allSwapRequests]);

  // 8.3. Badges and Counts for Operations Domains
  const pendingSwapCount = useMemo(() => {
    return allSwapRequests.filter((s) => s.status === 'PENDING').length;
  }, [allSwapRequests]);

  const pendingAdjustmentCount = useMemo(() => {
    return (adjustmentsList || []).filter((a) => a.status === 'PENDING').length;
  }, [adjustmentsList]);

  const pendingIncomingWorkforceCount = useMemo(() => {
    return (incomingWorkforce || []).filter((w) => w.status === 'PENDING' || w.status === 'PROPOSAL_SENT').length;
  }, [incomingWorkforce]);

  const totalPendingActionableCount = useMemo(() => {
    return pendingSwapCount + pendingIncomingWorkforceCount;
  }, [pendingSwapCount, pendingIncomingWorkforceCount]);

  // 9. Dynamic Filled / Assigned Shifts
  const filledShifts = useMemo(() => {
    return storeShifts
      .filter((s) => {
        const req =
          s.requiredStaff ||
          (s.skillRequirements || []).reduce((sum, r) => sum + (r.requiredStaff || 0), 0);
        return (s.shiftAssignments || []).length >= req && req > 0;
      })
      .sort((a, b) => (b.shiftDate || '').localeCompare(a.shiftDate || ''));
  }, [storeShifts]);

  // 10. Dynamic Skills List for Sidebar Filters
  const availableSkills = useMemo(() => {
    const sSet = new Set();
    storeShifts.forEach((s) => {
      (s.skillRequirements || []).forEach((r) => {
        if (r.skillName) sSet.add(r.skillName);
      });
    });
    return Array.from(sSet);
  }, [storeShifts]);

  // 11. Dynamic Counts for Sidebar
  const filterCounts = useMemo(() => {
    let noApplicant = 0;
    let expiringSoon = 0;
    let otRisk = 0;
    let hasApplicant = 0;
    let morning = 0;
    let afternoon = 0;
    let night = 0;
    const roleCounts = {};

    understaffedShifts.forEach((s) => {
      if (s.assignedStaff === 0) noApplicant++;
      else hasApplicant++;

      if (s.isUrgent) expiringSoon++;
      if (otRiskStaffCount > 0) otRisk++;

      if (s.timePeriod === 'MORNING') morning++;
      else if (s.timePeriod === 'AFTERNOON') afternoon++;
      else if (s.timePeriod === 'NIGHT') night++;

      const rName = s.primarySkill || 'Khác';
      roleCounts[rName] = (roleCounts[rName] || 0) + 1;
    });

    return {
      noApplicant,
      expiringSoon,
      otRisk,
      hasApplicant,
      morning,
      afternoon,
      night,
      roleCounts,
    };
  }, [understaffedShifts, otRiskStaffCount]);

  // 12. Filtering & Search logic
  const filteredShifts = useMemo(() => {
    return understaffedShifts.filter((s) => {
      if (search) {
        const q = search.toLowerCase();
        const match =
          s.code.toLowerCase().includes(q) ||
          s.title.toLowerCase().includes(q) ||
          (s.primarySkill || '').toLowerCase().includes(q) ||
          s.skills.some((sk) => sk.toLowerCase().includes(q));
        if (!match) return false;
      }

      if (!statusFilters.noApplicant && s.assignedStaff === 0) return false;
      if (!statusFilters.hasApplicant && s.assignedStaff > 0) return false;
      if (!statusFilters.expiringSoon && s.isUrgent) return false;

      if (!roleFilters.all) {
        const matchAnyRole = Object.entries(roleFilters).some(
          ([rName, checked]) => checked && rName !== 'all' && s.primarySkill.toLowerCase().includes(rName.toLowerCase())
        );
        if (!matchAnyRole) return false;
      }

      if (selectedTimePeriod !== 'ALL') {
        if (s.timePeriod !== selectedTimePeriod) return false;
      }

      return true;
    });
  }, [understaffedShifts, search, statusFilters, roleFilters, selectedTimePeriod]);

  // 13. Urgent understaffed shifts today
  const urgentUnderstaffedToday = useMemo(() => {
    return understaffedShifts.filter((s) => s.isUrgent);
  }, [understaffedShifts]);

  // 14. Real Actions
  const handleOpenEligibleCandidates = async (shift) => {
    setSelectedShiftForEligibility(shift);
    setShowEligibleCandidatesModal(true);
    setLoadingEligibleCandidates(true);
    try {
      const res = await getEligibleStaffForShift(storeId, shift.id);
      const list = Array.isArray(res.data) ? res.data : [];
      setEligibleCandidatesList(list);
    } catch (err) {
      setEligibleCandidatesList([]);
      showToast('Lỗi: Không thể tải danh sách ứng viên đủ điều kiện.');
    } finally {
      setLoadingEligibleCandidates(false);
    }
  };

  const handleAssignCandidateFromModal = async (staffId, staffName) => {
    if (!selectedShiftForEligibility) return;
    setAssigningCandidateId(staffId);
    try {
      await assignStaffToShift(storeId, selectedShiftForEligibility.id, staffId);
      showToast(`Đã phân công ${staffName} vào ca thành công.`);
      setShowEligibleCandidatesModal(false);
      loadData();
      window.dispatchEvent(new CustomEvent('store_shifts_updated', { detail: { storeId } }));
      window.dispatchEvent(new CustomEvent('store_marketplace_updated', { detail: { storeId } }));
    } catch (err) {
      showToast(`Lỗi: Lỗi phân công: ${err.response?.data?.message || err.message}`);
    } finally {
      setAssigningCandidateId(null);
    }
  };

  const handlePublishToMarketplaceAction = async (shiftId) => {
    setMpActionLoadingId(shiftId);
    try {
      await publishShiftToMarketplace(storeId, shiftId);
      showToast('Đã đưa ca làm việc lên sàn Marketplace!');
      loadData();
      window.dispatchEvent(new CustomEvent('store_marketplace_updated', { detail: { storeId } }));
      window.dispatchEvent(new CustomEvent('store_shifts_updated', { detail: { storeId } }));
    } catch (err) {
      showToast(`Lỗi: ${err.response?.data?.message || 'Không thể đăng ca lên sàn.'}`);
    } finally {
      setMpActionLoadingId(null);
    }
  };

  const handleUnpublishFromMarketplaceAction = async (shiftId) => {
    setMpActionLoadingId(shiftId);
    try {
      await unpublishShiftFromMarketplace(storeId, shiftId);
      showToast('Đã gỡ ca làm việc khỏi sàn Marketplace.');
      loadData();
      window.dispatchEvent(new CustomEvent('store_marketplace_updated', { detail: { storeId } }));
      window.dispatchEvent(new CustomEvent('store_shifts_updated', { detail: { storeId } }));
    } catch (err) {
      showToast(`Lỗi: ${err.response?.data?.message || 'Không thể gỡ ca.'}`);
    } finally {
      setMpActionLoadingId(null);
    }
  };

  // 15. Real Swap Actions (Approve & Reject)
  const handleApproveSwap = async (req) => {
    if (!req?.id) return;
    if (req.isShiftSwap && !req.employeeAccepted) {
      showToast('Lỗi: Chưa thể phê duyệt: Cần nhân viên đối tác chấp thuận trước khi quản lý phê duyệt.');
      return;
    }
    setActionLoadingId(req.id);
    try {
      if (req.isShiftSwap) {
        await approveSwapRequest(req.id);
        setStoreSwapList((prev) => prev.filter((s) => s.id !== req.id));
      } else {
        await updateRequestStatus(req.id, 'APPROVED');
        setRequestsList((prev) =>
          prev.map((r) => (r.id === req.id ? { ...r, status: 'APPROVED' } : r))
        );
      }
      showToast(`Đã phê duyệt yêu cầu đổi ca của ${cleanText(req.requesterName)}!`);
      loadData();
      window.dispatchEvent(new CustomEvent('store_requests_updated', { detail: { storeId } }));
      window.dispatchEvent(new CustomEvent('store_shifts_updated', { detail: { storeId } }));
    } catch (err) {
      showToast(`Lỗi: Lỗi phê duyệt: ${err.response?.data?.message || err.message || 'Không thể duyệt hoán đổi.'}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectSwap = async (req) => {
    if (!req?.id) return;
    setActionLoadingId(req.id);
    try {
      if (req.isShiftSwap) {
        await rejectSwapRequest(req.id);
        setStoreSwapList((prev) => prev.filter((s) => s.id !== req.id));
      } else {
        await updateRequestStatus(req.id, 'REJECTED');
        setRequestsList((prev) =>
          prev.map((r) => (r.id === req.id ? { ...r, status: 'REJECTED' } : r))
        );
      }
      showToast(`Lỗi: Đã từ chối yêu cầu đổi ca của ${cleanText(req.requesterName)}.`);
      loadData();
      window.dispatchEvent(new CustomEvent('store_requests_updated', { detail: { storeId } }));
    } catch (err) {
      showToast(`Lỗi: Lỗi từ chối: ${err.response?.data?.message || err.message || 'Không thể từ chối.'}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancelSwap = async (req) => {
    if (!req?.id) return;
    if (!window.confirm('Bạn có chắc muốn hủy yêu cầu hoán đổi ca này?')) return;
    setActionLoadingId(req.id);
    try {
      if (req.isShiftSwap) {
        await cancelSwapRequest(req.id);
        setStoreSwapList((prev) => prev.filter((s) => s.id !== req.id));
      } else {
        await updateRequestStatus(req.id, 'CANCELLED');
      }
      showToast('Đã hủy yêu cầu hoán đổi ca làm việc.');
      loadData();
      window.dispatchEvent(new CustomEvent('store_requests_updated', { detail: { storeId } }));
      window.dispatchEvent(new CustomEvent('store_shifts_updated', { detail: { storeId } }));
    } catch (err) {
      showToast(`Lỗi: Lỗi: ${err.response?.data?.message || err.message || 'Không thể hủy hoán đổi.'}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  // 16. Attendance Adjustment Actions
  const handleApproveAdjustment = async (req) => {
    if (!req?.id) return;
    setActionLoadingId(req.id);
    try {
      await approveAdjustmentRequest(storeId, req.id);
      showToast(`Đã phê duyệt giải trình chấm công của ${req.staffName || 'nhân viên'}!`);
      loadData();
      window.dispatchEvent(new CustomEvent('store_requests_updated', { detail: { storeId } }));
      window.dispatchEvent(new CustomEvent('store_attendance_updated', { detail: { storeId } }));
    } catch (err) {
      showToast(`Lỗi: Lỗi phê duyệt: ${err.response?.data?.message || err.message || 'Không thể duyệt.'}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectAdjustment = async (req) => {
    if (!req?.id) return;
    setActionLoadingId(req.id);
    try {
      await rejectAdjustmentRequest(storeId, req.id);
      showToast(`Lỗi: Đã từ chối giải trình chấm công của ${req.staffName || 'nhân viên'}.`);
      loadData();
      window.dispatchEvent(new CustomEvent('store_requests_updated', { detail: { storeId } }));
      window.dispatchEvent(new CustomEvent('store_attendance_updated', { detail: { storeId } }));
    } catch (err) {
      showToast(`Lỗi: Lỗi từ chối: ${err.response?.data?.message || err.message || 'Không thể từ chối.'}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  // 17. Workforce Request Actions
  const handleRejectWorkforce = async (req) => {
    if (!req?.id) return;
    setActionLoadingId(req.id);
    try {
      await rejectWorkforceRequest(storeId, req.id);
      showToast(`Đã từ chối yêu cầu chi viện nhân sự.`);
      loadData();
      window.dispatchEvent(new CustomEvent('store_requests_updated', { detail: { storeId } }));
    } catch (err) {
      showToast(`Lỗi: Lỗi: ${err.response?.data?.message || err.message || 'Thao tác thất bại.'}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancelWorkforce = async (req) => {
    if (!req?.id) return;
    setActionLoadingId(req.id);
    try {
      await cancelWorkforceRequest(storeId, req.id);
      showToast(`Đã hủy yêu cầu chi viện nhân sự.`);
      loadData();
      window.dispatchEvent(new CustomEvent('store_requests_updated', { detail: { storeId } }));
    } catch (err) {
      showToast(`Lỗi: Lỗi: ${err.response?.data?.message || err.message || 'Thao tác thất bại.'}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenProposeStaffModal = async (req) => {
    setSelectedWorkforceReqForPropose(req);
    setShowProposeStaffModal(true);
    try {
      const res = await getEligibleStaffForRequest(storeId, req.id);
      const list = Array.isArray(res.data) ? res.data : (res.data?.content || []);
      setEligibleStaffList(list.length > 0 ? list : employees);
      if (list.length > 0) {
        setSelectedEligibleStaffId(list[0].staffId || list[0].id);
      } else if (employees.length > 0) {
        setSelectedEligibleStaffId(employees[0].staffId || employees[0].id);
      }
    } catch {
      setEligibleStaffList(employees);
      if (employees.length > 0) {
        setSelectedEligibleStaffId(employees[0].staffId || employees[0].id);
      }
    }
  };

  const handleSubmitProposeStaff = async () => {
    if (!selectedWorkforceReqForPropose || !selectedEligibleStaffId) return;
    setProposingLoading(true);
    try {
      await createWorkforceProposal(storeId, selectedWorkforceReqForPropose.id, {
        staffId: selectedEligibleStaffId,
      });
      showToast(`Đã gửi đề xuất nhân sự chi viện thành công!`);
      setShowProposeStaffModal(false);
      loadData();
      window.dispatchEvent(new CustomEvent('store_requests_updated', { detail: { storeId } }));
    } catch (err) {
      showToast(`Lỗi: Lỗi đề xuất: ${err.response?.data?.message || err.message || 'Không thể đề xuất.'}`);
    } finally {
      setProposingLoading(false);
    }
  };

  const handleOpenCreateWorkforceModal = () => {
    const otherStores = stores.filter((s) => String(s.id) !== String(storeId));
    if (otherStores.length > 0) {
      setCreateWfTargetStoreId(String(otherStores[0].id));
    }
    if (storeShifts.length > 0) {
      setCreateWfShiftId(String(storeShifts[0].id));
    }
    setShowCreateWorkforceModal(true);
  };

  const handleSubmitCreateWorkforce = async (e) => {
    e.preventDefault();
    if (!createWfTargetStoreId || !createWfShiftId) {
      showToast('Vui lòng chọn chi nhánh đối tác và ca làm việc cần chi viện.');
      return;
    }
    setCreateWfSubmitting(true);
    try {
      await createWorkforceRequest(storeId, {
        targetStoreId: createWfTargetStoreId,
        shiftId: createWfShiftId,
      });
      showToast('Đã tạo yêu cầu mượn nhân sự gửi đến chi nhánh đối tác thành công!');
      setShowCreateWorkforceModal(false);
      loadData();
      window.dispatchEvent(new CustomEvent('store_requests_updated', { detail: { storeId } }));
    } catch (err) {
      showToast(`Lỗi: Lỗi tạo yêu cầu: ${err.response?.data?.message || err.message || 'Không thể tạo yêu cầu mượn nhân sự.'}`);
    } finally {
      setCreateWfSubmitting(false);
    }
  };

  const renderStatusBadge = (status, req = null) => {
    const st = (status || 'PENDING').toUpperCase();
    if (req && req.isShiftSwap && st === 'PENDING') {
      if (!req.employeeAccepted) {
        return (
          <span
            className="mp-status-badge"
            style={{
              background: '#fef3c7',
              color: '#92400e',
              border: '1px solid #fde68a',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '12px'
            }}
            title="Đang chờ nhân viên đối tác xác nhận đồng ý đổi ca"
          >
            Chờ NV đối tác đồng ý
          </span>
        );
      }
      return (
        <span
          className="mp-status-badge"
          style={{
            background: '#dbeafe',
            color: '#1e40af',
            border: '1px solid #bfdbfe',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 8px',
            borderRadius: '6px',
            fontWeight: 600,
            fontSize: '12px'
          }}
          title="Nhân viên đối tác đã đồng ý - Chờ Quản lý phê duyệt"
        >
          Chờ Quản lý duyệt
        </span>
      );
    }
    if (st === 'PENDING') {
      return <span className="mp-status-badge status-pending">Chờ duyệt</span>;
    }
    if (st === 'APPROVED' || st === 'ACCEPTED' || st === 'COMPLETED') {
      return <span className="mp-status-badge status-approved">Đã phê duyệt</span>;
    }
    if (st === 'REJECTED' || st === 'MANAGER_REJECTED' || st === 'STAFF_REJECTED' || st === 'DECLINED') {
      return <span className="mp-status-badge status-rejected">Đã từ chối</span>;
    }
    if (st === 'PROPOSAL_SENT' || st === 'PROPOSED') {
      return <span className="mp-status-badge status-proposal">Đã đề xuất</span>;
    }
    if (st === 'CANCELLED') {
      return <span className="mp-status-badge status-cancelled">Đã hủy</span>;
    }
    return <span className="mp-status-badge status-pending">{st}</span>;
  };

  return (
    <div className="mp-page-wrapper">
      {/* ── 1. Top Urgent Alert Banner ── */}
      {showUrgentBanner && urgentUnderstaffedToday.length > 0 && (
        <div className="mp-urgent-banner">
          <div className="mp-urgent-left">
            <div className="mp-urgent-icon-wrap" style={{ fontWeight: 700, fontSize: 11, background: "#ef4444", color: "#fff", padding: "2px 6px", borderRadius: 4 }}>CẢNH BÁO</div>
            <div className="mp-urgent-text">
              <div className="mp-urgent-title-row">
                <span>Cảnh báo điều phối</span>
                <span className="mp-urgent-dot">•</span>
                <span className="mp-urgent-countdown">
                  {urgentUnderstaffedToday.length} ca khẩn cấp cần phân bổ trong hôm nay
                </span>
              </div>
              <div>
                Có {urgentUnderstaffedToday.length} ca làm việc hôm nay đang thiếu nhân sự (
                {urgentUnderstaffedToday.map((s) => s.primarySkill).slice(0, 3).join(', ')}). Cửa hàng cần Store Manager chỉ định người thay thế để bảo đảm vận hành.
              </div>
            </div>
          </div>
          <div className="mp-urgent-actions">
            <button
              type="button"
              className="mp-btn-urgent-primary"
              onClick={() => {
                setStatusFilters((prev) => ({ ...prev, expiringSoon: true }));
                window.scrollTo({ top: 380, behavior: 'smooth' });
              }}
            >
              Xử lý ưu tiên ngay
            </button>
            <button
              type="button"
              className="mp-btn-urgent-dismiss"
              onClick={() => setShowUrgentBanner(false)}
            >
              Bỏ qua
            </button>
          </div>
        </div>
      )}

      {/* ── 2. Top 4 KPI Stat Cards (100% Dynamic) ── */}
      <div className="mp-kpi-grid">
        <div className="mp-kpi-card kpi-default">
          <div className="mp-kpi-number">{understaffedShifts.length}</div>
          <div className="mp-kpi-label">Tổng ca đang mở</div>
          <div className="mp-kpi-sub">
            {understaffedShifts.length} ca {currentStore?.name || 'chi nhánh hiện tại'}
          </div>
        </div>
        <div className="mp-kpi-card kpi-red">
          <div className="mp-kpi-number">{filterCounts.noApplicant}</div>
          <div className="mp-kpi-label">Chưa có ứng viên</div>
          <div className="mp-kpi-sub sub-red">Cần Store Manager chỉ định trực tiếp</div>
        </div>
        <div className="mp-kpi-card kpi-orange">
          <div className="mp-kpi-number">{totalPendingActionableCount}</div>
          <div className="mp-kpi-label">Yêu cầu cần xử lý</div>
          <div className="mp-kpi-sub">
            {totalPendingActionableCount > 0 ? `${totalPendingActionableCount} yêu cầu đang chờ duyệt` : 'Đã xử lý tất cả yêu cầu'}
          </div>
        </div>
        <div className="mp-kpi-card kpi-slate">
          <div className="mp-kpi-number">{otRiskStaffCount}</div>
          <div className="mp-kpi-label">Rủi ro Overtime (OT)</div>
          <div className="mp-kpi-sub">
            {otRiskStaffCount > 0 ? `Cảnh báo ${otRiskStaffCount} nhân sự đạt >= 40h` : 'An toàn: Không có nhân sự vượt 40h'}
          </div>
        </div>
      </div>

      {/* ── 3. Title & Header Action Row ── */}
      <div className="mp-header-row">
        <div className="mp-title-col">
          <h1 className="mp-title-main">
            Sàn Ca Mở & Điều Phối Nhân Sự
            <span className="mp-role-tag">(Store Manager Ops)</span>
            <span className="mp-pill-green">{understaffedShifts.length} ca đang mở</span>
            {urgentUnderstaffedToday.length > 0 && (
              <span className="mp-pill-red">{urgentUnderstaffedToday.length} ca khẩn cấp</span>
            )}
          </h1>
          <p className="mp-title-desc">
            Trung tâm điều lệnh quản lý ca làm việc tại <strong>{currentStore?.name || 'ShiftSync Flagship Store'}</strong>. Chủ động rà soát vi phạm OT, gợi ý nhân sự phù hợp và phê duyệt hoán đổi ca tức thời.
          </p>
        </div>
        <div className="mp-actions-right">
          <button
            type="button"
            className="mp-btn-header-secondary"
            onClick={() => setShowOtPolicyModal(true)}
          >
            Quy tắc & Giới hạn OT
          </button>
          <button
            type="button"
            className="mp-btn-header-secondary"
            onClick={() => setShowAuditLogModal(true)}
          >
            Nhật ký điều phối
          </button>
          {isManager && (
            <button
              type="button"
              className="mp-btn-header-primary"
              onClick={() => setShowPublishModal(true)}
            >
              + Đăng ca lên sàn
            </button>
          )}
        </div>
      </div>

      {/* ── 4. Main 2-Column Grid ── */}
      <div className="mp-layout-grid">
        {/* ══ CỘT TRÁI: BỘ LỌC ĐIỀU PHỐI (100% Dynamic) ══ */}
        <aside className="mp-sidebar">
          {/* Ô Tìm Kiếm */}
          <div className="mp-search-box">
            
            <input
              type="text"
              className="mp-search-input"
              placeholder="Tìm theo mã ca, tên nhân sự, vị trí..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Card Bộ Lọc Điều Phối */}
          <div className="mp-filter-card">
            <div className="mp-filter-head">
              <span className="mp-filter-head-title">Bộ lọc điều phối</span>
              <button
                type="button"
                className="mp-filter-reset-btn"
                onClick={() => {
                  setStatusFilters({ noApplicant: true, expiringSoon: true, otRisk: false, hasApplicant: true });
                  setRoleFilters({ all: true });
                  setSelectedTimePeriod('ALL');
                  setSearch('');
                }}
              >
                Đặt lại
              </button>
            </div>

            {/* Trạng thái xử lý ca */}
            <div className="mp-filter-group">
              <div className="mp-filter-group-title">Trạng thái xử lý ca</div>
              <label className="mp-filter-checkbox-item">
                <span className="mp-filter-cb-label">
                  <input
                    type="checkbox"
                    checked={statusFilters.noApplicant}
                    onChange={(e) => setStatusFilters({ ...statusFilters, noApplicant: e.target.checked })}
                  />
                  Chưa có ứng viên
                </span>
                <span className="mp-filter-badge-count count-red">{filterCounts.noApplicant}</span>
              </label>
              <label className="mp-filter-checkbox-item">
                <span className="mp-filter-cb-label">
                  <input
                    type="checkbox"
                    checked={statusFilters.expiringSoon}
                    onChange={(e) => setStatusFilters({ ...statusFilters, expiringSoon: e.target.checked })}
                  />
                  Sắp hết hạn xử lý (&lt;3h)
                </span>
                <span className="mp-filter-badge-count count-red">{filterCounts.expiringSoon}</span>
              </label>
              <label className="mp-filter-checkbox-item">
                <span className="mp-filter-cb-label">
                  <input
                    type="checkbox"
                    checked={statusFilters.otRisk}
                    onChange={(e) => setStatusFilters({ ...statusFilters, otRisk: e.target.checked })}
                  />
                  Có xung đột lịch / Rà soát OT
                </span>
                <span className="mp-filter-badge-count">{otRiskStaffCount}</span>
              </label>
              <label className="mp-filter-checkbox-item accent-green">
                <span className="mp-filter-cb-label">
                  <input
                    type="checkbox"
                    checked={statusFilters.hasApplicant}
                    onChange={(e) => setStatusFilters({ ...statusFilters, hasApplicant: e.target.checked })}
                  />
                  Đã có ứng viên chờ duyệt
                </span>
                <span className="mp-filter-badge-count">{filterCounts.hasApplicant}</span>
              </label>
            </div>

            {/* Chi nhánh cần hỗ trợ */}
            <div className="mp-filter-group">
              <div className="mp-filter-group-title">Chi nhánh cần hỗ trợ</div>
              <select
                className="mp-filter-select"
                value={storeId}
                onChange={(e) => {
                  setStoreId(e.target.value);
                  localStorage.setItem('selectedStoreId', e.target.value);
                }}
              >
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {String(s.id) === String(storeId) ? `(Thiếu ${understaffedShifts.length} ca)` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Vị trí chuyên môn (Dynamic từ database) */}
            <div className="mp-filter-group">
              <div className="mp-filter-group-title">Vị trí chuyên môn</div>
              <label className="mp-filter-checkbox-item accent-green">
                <span className="mp-filter-cb-label">
                  <input
                    type="checkbox"
                    checked={Boolean(roleFilters.all)}
                    onChange={(e) => {
                      const v = e.target.checked;
                      const next = { all: v };
                      availableSkills.forEach((sk) => {
                        next[sk] = v;
                      });
                      setRoleFilters(next);
                    }}
                  />
                  Tất cả vị trí
                </span>
              </label>
              {availableSkills.map((skName) => (
                <label key={skName} className="mp-filter-checkbox-item accent-green">
                  <span className="mp-filter-cb-label">
                    <input
                      type="checkbox"
                      checked={Boolean(roleFilters[skName])}
                      onChange={(e) =>
                        setRoleFilters({ ...roleFilters, [skName]: e.target.checked, all: false })
                      }
                    />
                    {skName}
                  </span>
                  <span className="mp-filter-badge-count">
                    {filterCounts.roleCounts[skName] || 0}
                  </span>
                </label>
              ))}
            </div>

            {/* Khung ca mong muốn */}
            <div className="mp-filter-group">
              <div className="mp-filter-group-title">Khung ca mong muốn</div>
              <div
                className={`mp-shift-time-filter-item ${selectedTimePeriod === 'MORNING' ? 'active' : ''}`}
                onClick={() => setSelectedTimePeriod(selectedTimePeriod === 'MORNING' ? 'ALL' : 'MORNING')}
              >
                <span>Ca Sáng (06:00 - 14:00)</span>
                <span className="mp-filter-badge-count">{filterCounts.morning} ca</span>
              </div>
              <div
                className={`mp-shift-time-filter-item ${selectedTimePeriod === 'AFTERNOON' ? 'active' : ''}`}
                onClick={() => setSelectedTimePeriod(selectedTimePeriod === 'AFTERNOON' ? 'ALL' : 'AFTERNOON')}
              >
                <span>Ca Chiều (14:00 - 22:00)</span>
                <span className="mp-filter-badge-count">{filterCounts.afternoon} ca</span>
              </div>
              <div
                className={`mp-shift-time-filter-item ${selectedTimePeriod === 'NIGHT' ? 'active' : ''}`}
                onClick={() => setSelectedTimePeriod(selectedTimePeriod === 'NIGHT' ? 'ALL' : 'NIGHT')}
              >
                <span>Ca Đêm (22:00 - 06:00)</span>
                <span className="mp-filter-badge-count">{filterCounts.night} ca</span>
              </div>
            </div>
          </div>

          {/* Thẻ Quy Chuẩn Điều Phối (Auto-Check) */}
          <div className="mp-policy-card">
            <div className="mp-policy-header">
              <div className="mp-policy-title">
                <span className="mp-policy-dot"></span>
                <span>Quy chuẩn điều phối</span>
              </div>
              <span className="mp-policy-tag">Auto-Check</span>
            </div>
            <p className="mp-policy-desc">
              Hệ thống kích hoạt thuật toán Smart Dispatching để bảo vệ giới hạn an toàn lao động (tối đa 40 giờ/tuần) và tránh chồng chéo ca.
            </p>
            <div className="mp-policy-metric-row">
              <span className="mp-policy-metric-label">Tổng nhân sự cửa hàng:</span>
              <span className="mp-policy-metric-val">{employees.length}</span>
            </div>
            <div className="mp-policy-metric-row">
              <span className="mp-policy-metric-label">Nhân sự an toàn (&lt;32h):</span>
              <span className="mp-policy-metric-val">
                {Object.values(staffWeeklyHours).filter((h) => h < 32).length}
              </span>
            </div>
            <div className="mp-policy-metric-row">
              <span className="mp-policy-metric-label">Cảnh báo OT (&gt;=40h):</span>
              <span className="mp-policy-metric-val" style={{ color: otRiskStaffCount > 0 ? '#dc2626' : '#16a34a' }}>
                {otRiskStaffCount}
              </span>
            </div>
            <div className="mp-policy-ot-box">
              <strong>Lưu ý Overtime:</strong> Ưu tiên chọn nhân viên dưới 32 giờ để có dự phòng trong ca đột xuất cuối tuần.
            </div>
          </div>
        </aside>

        {/* ══ CỘT PHẢI: TABS VÀ DANH SÁCH CA LÀM VIỆC ══ */}
        <main className="mp-main-content">
          {/* Thanh Tabs & Sort */}
          <div className="mp-tabs-bar">
            <div className="mp-tabs-group" style={{ flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`mp-tab-btn ${activeTab === 'OPEN' ? 'active' : ''}`}
                onClick={() => setActiveTab('OPEN')}
              >
                <span>Ca mở &amp; Đăng ca</span>
                <span className="mp-tab-badge">{understaffedShifts.length}</span>
              </button>
              <button
                type="button"
                className={`mp-tab-btn ${activeTab === 'SWAP' ? 'active' : ''}`}
                onClick={() => setActiveTab('SWAP')}
              >
                <span>Yêu cầu đổi ca</span>
                {pendingSwapCount > 0 ? (
                  <span className="mp-tab-badge badge-yellow">{pendingSwapCount} chờ xử lý</span>
                ) : (
                  <span className="mp-tab-badge">{allSwapRequests.length}</span>
                )}
              </button>

              <button
                type="button"
                className={`mp-tab-btn ${activeTab === 'WORKFORCE' ? 'active' : ''}`}
                onClick={() => setActiveTab('WORKFORCE')}
              >
                <span>Mượn nhân sự</span>
                {pendingIncomingWorkforceCount > 0 ? (
                  <span className="mp-tab-badge badge-blue">{pendingIncomingWorkforceCount} cần điều phối</span>
                ) : (
                  <span className="mp-tab-badge">{incomingWorkforce.length}</span>
                )}
              </button>

              <button
                type="button"
                className={`mp-tab-btn ${activeTab === 'FILLED' ? 'active' : ''}`}
                onClick={() => setActiveTab('FILLED')}
              >
                <span>Đã phân công</span>
                <span className="mp-tab-badge">{filledShifts.length}</span>
              </button>
            </div>

            {activeTab === 'OPEN' && (
              <div className="mp-sort-wrap">
                <span>Sắp xếp:</span>
                <select
                  className="mp-sort-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="URGENCY">Mức độ khẩn cấp (thời hạn &amp; thiếu nhân sự)</option>
                  <option value="TIME">Thời gian bắt đầu ca</option>
                  <option value="WAGE">Mức thù lao cao nhất</option>
                </select>
              </div>
            )}
          </div>

          {/* Tab 1: Danh Sách Ca Đang Mở (100% Dynamic từ CSDL) */}
          {activeTab === 'OPEN' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {loading && <div style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>Đang tải dữ liệu ca làm việc...</div>}

              {!loading && filteredShifts.length === 0 && (
                <div style={{ background: '#ffffff', padding: 32, borderRadius: 12, textAlign: 'center', border: '1px solid #e2e8f0' }}>
                  
                  <h3 style={{ margin: '0 0 6px', fontSize: 16 }}>Hiện không có ca nào đang thiếu người theo bộ lọc</h3>
                  <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>Toàn bộ các ca trong lịch đã được phân bổ đủ quân số an toàn.</p>
                </div>
              )}

              {filteredShifts.map((shift) => {
                const isUnderstaffed = (shift.missingCount || 0) > 0;

                return (
                  <div
                    key={shift.id}
                    className={`mp-shift-card ${shift.isUrgent ? 'card-urgent' : ''}`}
                  >
                    <div className="mp-card-main-row">
                      {/* Cột trái của Card */}
                      <div className="mp-card-left">
                        <div className="mp-card-tag-row">
                          {shift.note && shift.note.toLowerCase().includes('nghỉ phép') ? (
                            <span style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', padding: '3px 8px', borderRadius: '6px', fontWeight: 600, fontSize: '12px' }}>
                              Nhu cầu bù ca: Nghỉ phép
                            </span>
                          ) : (
                            <span style={{ background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', padding: '3px 8px', borderRadius: '6px', fontWeight: 600, fontSize: '12px' }}>
                              Định biên ca làm việc
                            </span>
                          )}
                          {shift.isUrgent && (
                            <span className="mp-tag-urgent">Khẩn cấp trong ngày</span>
                          )}
                          {shift.assignedStaff === 0 ? (
                            <span className="mp-tag-no-applicant">Chưa có nhân sự (Thiếu {shift.missingCount})</span>
                          ) : (
                            <span className="mp-tag-has-applicants">Đã gán {shift.assignedStaff}/{shift.reqStaff} (Thiếu {shift.missingCount})</span>
                          )}
                          <span className="mp-tag-meta-info">
                            {shift.storeName} • {fmtDateVN(shift.shiftDate)}
                          </span>
                        </div>

                        <h3 className="mp-card-title">
                          <span>{shift.title}</span>
                          <span className="mp-shift-code">{shift.code}</span>
                        </h3>

                        <p className="mp-card-note">
                          {shift.note || `Ca làm việc cần bổ sung nhân sự điều phối. Thiếu: ${shift.missingRolesText || (shift.primarySkill || 'Nhân sự')}.`}
                        </p>

                        <div className="mp-card-meta-line">
                          <span className="mp-meta-item">
                            Thời gian: <strong>{fmtDateVN(shift.shiftDate)}, {shift.startTimeStr} – {shift.endTimeStr}</strong>
                          </span>
                          <span className="mp-meta-item">
                            Thời lượng: <strong>{shift.duration} giờ</strong>
                          </span>
                          <span className="mp-meta-item">
                            Vị trí: <strong>{shift.primarySkill}</strong>
                          </span>
                        </div>

                        {shift.skills && shift.skills.length > 0 && (
                          <div className="mp-skills-list">
                            <span style={{ fontSize: '12px', color: '#64748b' }}>Kỹ năng yêu cầu:</span>
                            {shift.skills.map((sk, idx) => (
                              <span key={idx} className="mp-skill-badge">
                                {sk}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Cột phải của Card: Thù Lao & Tác Vụ */}
                      <div className="mp-card-right">
                        {shift.isUrgent ? (
                          <div className="mp-wage-rate-tag">Hệ số lương 1.25x</div>
                        ) : (
                          <div style={{ fontSize: '11.5px', color: '#64748b', marginBottom: '4px' }}>Mức thù lao chuẩn</div>
                        )}
                        <div className="mp-wage-amount">
                          {shift.totalWage.toLocaleString()} <small>đ/ca</small>
                        </div>
                        <div className="mp-wage-detail">
                          {shift.hourlyRate.toLocaleString()} đ/giờ × {shift.duration}h
                        </div>

                        {/* Primary Action Button */}
                        {isUnderstaffed ? (
                          <button
                            type="button"
                            onClick={() => handleOpenEligibleCandidates(shift)}
                            className="mp-btn-confirm-assign"
                            style={{ width: '100%', marginBottom: '10px' }}
                          >
                            Xem ứng viên
                          </button>
                        ) : (
                          <div style={{ padding: '8px 12px', borderRadius: '8px', background: '#f0fdf4', color: '#16a34a', fontWeight: 600, fontSize: '12.5px', textAlign: 'center', marginBottom: '10px', border: '1px solid #bbf7d0' }}>
                            Đã đủ nhân sự
                          </div>
                        )}

                        {/* Links phụ */}
                        <div className="mp-card-links-row">
                          <span
                            className="mp-card-link"
                            onClick={() => {
                              setSelectedDetailShift(shift);
                              setShowDetailModal(true);
                            }}
                          >
                            Xem chi tiết
                          </span>
                          {shift.isPublishedToMp ? (
                            <span
                              className="mp-card-link link-danger"
                              onClick={() => handleUnpublishFromMarketplaceAction(shift.id)}
                            >
                              Gỡ khỏi sàn
                            </span>
                          ) : (
                            <span
                              className="mp-card-link"
                              style={{ color: '#16a34a' }}
                              onClick={() => handlePublishToMarketplaceAction(shift.id)}
                            >
                              Đưa lên sàn
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tab 2: Yêu Cầu Hoán Đổi Ca Chờ Duyệt (100% Dynamic từ Backend) */}
          {activeTab === 'SWAP' && (
            <div className="mp-table-card">
              {allSwapRequests.length === 0 ? (
                <div style={{ background: '#ffffff', padding: 40, borderRadius: 12, textAlign: 'center' }}>
                  
                  <h3 style={{ margin: '0 0 6px', fontSize: 16, color: '#0f172a' }}>Không có yêu cầu đổi ca nào</h3>
                  <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>Toàn bộ các yêu cầu đổi ca của nhân sự đã được xử lý.</p>
                </div>
              ) : (
                <table className="mp-table">
                  <thead>
                    <tr>
                      <th>Người yêu cầu</th>
                      <th>Loại yêu cầu</th>
                      <th>Chi tiết ca đổi</th>
                      <th>Trạng thái</th>
                      <th>Ngày yêu cầu</th>
                      <th style={{ textAlign: 'right' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allSwapRequests.map((req) => {
                      const isPending = req.status === 'PENDING';
                      return (
                        <tr key={req.id}>
                          <td>
                            <div className="mp-user-cell">
                              <div style={{ width: 34, height: 34, flexShrink: 0 }}>
                                <Avatar3DWeb avatarId={req.avatarId || getAvatarForEmployee(req.requesterName || req.fromStaffName)} size={34} />
                              </div>
                              <div>
                                <div className="mp-user-name">{cleanText(req.requesterName || req.fromStaffName || 'Nhân sự')}</div>
                                <div className="mp-user-sub">{req.isShiftSwap ? 'Đổi ca trực tiếp' : 'Đề xuất đổi ca'}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span style={{ fontWeight: 600, color: '#334155' }}>
                              {getRequestTypeTitle(req)}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontSize: 13, color: '#1e293b', fontWeight: 500 }}>
                              {req.shiftInfo || getRequestShiftTitle(req)}
                            </div>
                            {req.content && (
                              <div style={{ fontSize: 12, color: '#64748b', marginTop: 3, maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {cleanText(req.content)}
                              </div>
                            )}
                          </td>
                          <td>{renderStatusBadge(req.status, req)}</td>
                          <td style={{ fontSize: 13, color: '#64748b' }}>
                            {req.requestDate || (req.createdAt ? fmtDateTimeVN(req.createdAt) : 'Hôm nay')}
                          </td>
                          <td>
                            <div className="mp-table-actions">
                              {isPending ? (
                                <>
                                  <button
                                    type="button"
                                    className="mp-btn-action-cancel"
                                    style={{
                                      padding: '6px 11px',
                                      borderRadius: '6px',
                                      border: '1px solid #cbd5e1',
                                      background: '#ffffff',
                                      color: '#64748b',
                                      fontSize: '12px',
                                      fontWeight: 600,
                                      cursor: 'pointer'
                                    }}
                                    disabled={actionLoadingId === req.id}
                                    onClick={() => handleCancelSwap(req)}
                                    title="Hủy yêu cầu đổi ca"
                                  >
                                    Hủy
                                  </button>
                                  <button
                                    type="button"
                                    className="mp-btn-action-reject"
                                    disabled={actionLoadingId === req.id}
                                    onClick={() => handleRejectSwap(req)}
                                    title="Từ chối yêu cầu đổi ca"
                                  >
                                    {actionLoadingId === req.id ? 'Đang xử lý...' : 'Từ chối'}
                                  </button>
                                  {req.isShiftSwap && !req.employeeAccepted ? (
                                    <button
                                      type="button"
                                      className="mp-btn-action-approve"
                                      disabled
                                      style={{
                                        opacity: 0.6,
                                        cursor: 'not-allowed',
                                        background: '#94a3b8',
                                        borderColor: '#94a3b8',
                                        color: '#ffffff'
                                      }}
                                      title="Cần nhân viên đối tác chấp thuận trước khi quản lý phê duyệt"
                                    >
                                      Chờ đối tác đồng ý
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      className="mp-btn-action-approve"
                                      disabled={actionLoadingId === req.id}
                                      onClick={() => handleApproveSwap(req)}
                                      title="Phê duyệt hoán đổi ca"
                                    >
                                      {actionLoadingId === req.id ? 'Đang duyệt...' : 'Phê duyệt'}
                                    </button>
                                  )}
                                </>
                              ) : (
                                <button
                                  type="button"
                                  className="mp-btn-action-detail"
                                  onClick={() => {
                                    setSelectedDetailRecord({
                                      ...req,
                                      recordDomain: 'SWAP',
                                      domainTitle: 'Yêu cầu hoán đổi ca làm việc',
                                    });
                                    setShowRecordDetailModal(true);
                                  }}
                                >
                                  Xem chi tiết
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Tab 3: Mượn Nhân Sự Liên Chi Nhánh (/workforce-requests) */}
          {activeTab === 'WORKFORCE' && (
            <div>
              <div className="mp-subtab-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className={`mp-subtab-btn ${workforceSubTab === 'INCOMING' ? 'active' : ''}`}
                    onClick={() => setWorkforceSubTab('INCOMING')}
                  >
                    <span>Yêu cầu nhận chi viện (Incoming)</span>
                    <span className="mp-tab-badge badge-blue">{incomingWorkforce.length}</span>
                  </button>
                  <button
                    type="button"
                    className={`mp-subtab-btn ${workforceSubTab === 'OUTGOING' ? 'active' : ''}`}
                    onClick={() => setWorkforceSubTab('OUTGOING')}
                  >
                    <span>Yêu cầu gửi đi (Outgoing)</span>
                    <span className="mp-tab-badge">{outgoingWorkforce.length}</span>
                  </button>
                </div>
                {isManager && (
                  <button
                    type="button"
                    className="mp-btn-urgent-primary"
                    style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    onClick={handleOpenCreateWorkforceModal}
                  >
                    <span>+</span> Tạo yêu cầu mượn nhân sự
                  </button>
                )}
              </div>

              <div className="mp-table-card">
                {workforceSubTab === 'INCOMING' ? (
                  incomingWorkforce.length === 0 ? (
                    <div style={{ background: '#ffffff', padding: 40, borderRadius: 12, textAlign: 'center' }}>
                      
                      <h3 style={{ margin: '0 0 6px', fontSize: 16, color: '#0f172a' }}>Không có yêu cầu mượn nhân sự nào</h3>
                      <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>Các chi nhánh khác hiện không có yêu cầu chi viện tới cửa hàng này.</p>
                    </div>
                  ) : (
                    <table className="mp-table">
                      <thead>
                        <tr>
                          <th>Đơn vị yêu cầu</th>
                          <th>Loại yêu cầu</th>
                          <th>Chi tiết ca cần người</th>
                          <th>Trạng thái</th>
                          <th>Thời điểm tạo</th>
                          <th style={{ textAlign: 'right' }}>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {incomingWorkforce.map((wf) => {
                          const isPending = wf.status === 'PENDING';
                          return (
                            <tr key={wf.id}>
                              <td>
                                <div className="mp-user-cell">
                                  <div className="mp-avatar-circle" style={{ background: '#dbeafe', color: '#1e40af' }}>
                                    
                                  </div>
                                  <div>
                                    <div className="mp-user-name">{wf.requestingStoreName || 'Chi nhánh đối tác'}</div>
                                    <div className="mp-user-sub">Người tạo: {wf.creatorName || 'Quản lý'}</div>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <span style={{ fontWeight: 600, color: '#1e40af' }}>Chi viện liên chi nhánh</span>
                              </td>
                              <td>
                                <div style={{ fontSize: 13, color: '#1e293b', fontWeight: 500 }}>
                                  Ngày: <strong>{fmtDateVN(wf.shiftDate)}</strong>
                                </div>
                                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                                  Khung giờ: {String(wf.shiftStartTime || '').slice(0, 5)} – {String(wf.shiftEndTime || '').slice(0, 5)}
                                </div>
                              </td>
                              <td>{renderStatusBadge(wf.status)}</td>
                              <td style={{ fontSize: 13, color: '#64748b' }}>
                                {fmtDateTimeVN(wf.createdAt)}
                              </td>
                              <td>
                                <div className="mp-table-actions">
                                  {isPending ? (
                                    <>
                                      <button
                                        type="button"
                                        className="mp-btn-action-reject"
                                        disabled={actionLoadingId === wf.id}
                                        onClick={() => handleRejectWorkforce(wf)}
                                      >
                                        {actionLoadingId === wf.id ? 'Đang xử lý...' : 'Từ chối'}
                                      </button>
                                      <button
                                        type="button"
                                        className="mp-btn-action-propose"
                                        onClick={() => handleOpenProposeStaffModal(wf)}
                                      >
                                        Đề xuất NV
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      type="button"
                                      className="mp-btn-action-detail"
                                      onClick={() => {
                                        setSelectedDetailRecord({
                                          ...wf,
                                          requesterName: wf.requestingStoreName,
                                          recordDomain: 'WORKFORCE',
                                          domainTitle: 'Yêu cầu mượn nhân sự liên chi nhánh',
                                          shiftInfo: `Ca ngày: ${fmtDateVN(wf.shiftDate)} (${wf.shiftStartTime} - ${wf.shiftEndTime})`,
                                          content: `Chi nhánh yêu cầu: ${wf.requestingStoreName} gửi đến ${wf.targetStoreName}. Trạng thái: ${wf.status}. Đề xuất: ${(wf.proposals || []).length} nhân sự.`,
                                        });
                                        setShowRecordDetailModal(true);
                                      }}
                                    >
                                      Xem chi tiết
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )
                ) : (
                  outgoingWorkforce.length === 0 ? (
                    <div style={{ background: '#ffffff', padding: 40, borderRadius: 12, textAlign: 'center' }}>
                      <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>Chưa có yêu cầu chi viện nhân sự nào được gửi đi.</p>
                    </div>
                  ) : (
                    <table className="mp-table">
                      <thead>
                        <tr>
                          <th>Chi nhánh hỗ trợ</th>
                          <th>Loại yêu cầu</th>
                          <th>Chi tiết ca cần người</th>
                          <th>Trạng thái</th>
                          <th>Thời điểm tạo</th>
                          <th style={{ textAlign: 'right' }}>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {outgoingWorkforce.map((wf) => {
                          const isPending = wf.status === 'PENDING';
                          return (
                            <tr key={wf.id}>
                              <td>
                                <div className="mp-user-cell">
                                  <div className="mp-avatar-circle" style={{ background: '#f1f5f9', color: '#475569' }}>
                                    
                                  </div>
                                  <div>
                                    <div className="mp-user-name">{wf.targetStoreName || 'Chi nhánh lân cận'}</div>
                                    <div className="mp-user-sub">Gửi bởi: {wf.creatorName || 'Tôi'}</div>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <span style={{ fontWeight: 600, color: '#475569' }}>Yêu cầu mượn nhân sự</span>
                              </td>
                              <td>
                                <div style={{ fontSize: 13, color: '#1e293b', fontWeight: 500 }}>
                                  Ngày: <strong>{fmtDateVN(wf.shiftDate)}</strong>
                                </div>
                                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                                  Khung giờ: {String(wf.shiftStartTime || '').slice(0, 5)} – {String(wf.shiftEndTime || '').slice(0, 5)}
                                </div>
                              </td>
                              <td>{renderStatusBadge(wf.status)}</td>
                              <td style={{ fontSize: 13, color: '#64748b' }}>
                                {fmtDateTimeVN(wf.createdAt)}
                              </td>
                              <td>
                                <div className="mp-table-actions">
                                  {(wf.status === 'PENDING' || wf.status === 'PROPOSAL_SENT') ? (
                                    <button
                                      type="button"
                                      className="mp-btn-action-reject"
                                      disabled={actionLoadingId === wf.id}
                                      onClick={() => handleCancelWorkforce(wf)}
                                    >
                                      {actionLoadingId === wf.id ? 'Đang hủy...' : 'Hủy yêu cầu'}
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      className="mp-btn-action-detail"
                                      onClick={() => {
                                        setSelectedDetailRecord({
                                          ...wf,
                                          requesterName: wf.requestingStoreName,
                                          recordDomain: 'WORKFORCE',
                                          domainTitle: 'Yêu cầu mượn nhân sự gửi đi',
                                          shiftInfo: `Ca ngày: ${fmtDateVN(wf.shiftDate)} (${wf.shiftStartTime} - ${wf.shiftEndTime})`,
                                          content: `Yêu cầu gửi đến: ${wf.targetStoreName}. Trạng thái: ${wf.status}.`,
                                        });
                                        setShowRecordDetailModal(true);
                                      }}
                                    >
                                      Xem chi tiết
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )
                )}
              </div>
            </div>
          )}

          {/* Tab 6: Đã Phân Công Xong (100% Dynamic từ CSDL) */}
          {activeTab === 'FILLED' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {filledShifts.length === 0 ? (
                <div style={{ background: '#ffffff', padding: 32, borderRadius: 12, textAlign: 'center', border: '1px solid #e2e8f0' }}>
                  <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>Chưa có ca nào được phân bổ đủ quân số.</p>
                </div>
              ) : (
                filledShifts.map((s) => (
                  <div key={s.id} className="mp-shift-card" style={{ opacity: 0.95 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span className="mp-tag-has-applicants">Đã lấp ca • 100% ({(s.shiftAssignments || []).length} nhân sự)</span>
                        <h3 style={{ margin: '8px 0 4px', fontSize: 16 }}>
                          {s.skillName || 'Ca làm việc'} ({s.startTime?.slice(0, 5)} – {s.endTime?.slice(0, 5)})
                        </h3>
                        <div style={{ fontSize: 12.5, color: '#64748b' }}>
                          Ngày: <strong>{fmtDateVN(s.shiftDate)}</strong> • Nhân sự trực:{' '}
                          <strong>
                            {(s.shiftAssignments || []).map((sa) => sa.staffName).join(', ')}
                          </strong>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#16a34a' }}>Đã đồng bộ</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>Trên lịch trình tuần</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </main>
      </div>

      {/* ── 5. Modals ── */}

      {/* Modal 1: Đăng ca lên sàn (100% Dynamic & Không đăng lại ca đã mở) */}
      {showPublishModal && (() => {
        // Lấy danh sách ca thiếu CHƯA ĐĂNG (loại bỏ tuyệt đối ca đã có trên sàn)
        const currentPublishShift =
          unpublishedUnderstaffedShifts.find((s) => s.id === selectedShiftToPublish) ||
          unpublishedUnderstaffedShifts[0] ||
          null;

        const shiftHourlyRate = currentPublishShift?.hourlyRate || 0;
        const shiftDuration = currentPublishShift?.duration || 0;
        const baseShiftTotal = shiftHourlyRate * shiftDuration;
        const bonusVal = Number(publishBonus) || 0;
        const totalEstimated = baseShiftTotal + bonusVal;

        // Đếm số ca khẩn cấp trong ngày CHƯA ĐĂNG
        const urgentUnpublishedCount = unpublishedUnderstaffedShifts.filter((s) => s.isUrgent).length;

        // Đếm nhân viên khả dụng thực tế (dưới 40h/tuần)
        const availableStaff = employees.filter(
          (e) => (staffWeeklyHours[e.staffId || e.id] || 0) < 40
        ).length;

        const BONUS_PRESETS = [
          { label: '+30.000 đ', value: 30000 },
          { label: '+50.000 đ (Chuẩn)', value: 50000 },
          { label: '+100.000 đ (Cực gấp)', value: 100000 },
          { label: '0 đ (Không phụ cấp)', value: 0 },
        ];

        // Gắn tag nhanh tương ứng với vị trí chuyên môn thực tế của ca
        const getSkillQuickTags = (skill) => {
          const lower = (skill || '').toLowerCase();
          if (lower.includes('barista') || lower.includes('pha chế')) {
            return ['+ Thành thạo pha chế', '+ Có thể chốt ca tối', '+ Đã qua đào tạo Barista'];
          }
          if (lower.includes('thu ngân') || lower.includes('cashier')) {
            return ['+ Thành thạo máy POS', '+ Nhanh nhẹn, cẩn thận', '+ Có thể chốt ca'];
          }
          if (lower.includes('bếp') || lower.includes('kitchen')) {
            return ['+ Thành thạo bếp nóng', '+ Đạt chuẩn ATVSTP', '+ Có thể tăng ca'];
          }
          if (lower.includes('waiter') || lower.includes('phục vụ')) {
            return ['+ Giao tiếp tốt', '+ Nhanh nhẹn, niềm nở', '+ Ưu tiên Part-time'];
          }
          return ['+ Đúng giờ', '+ Có thể chốt ca', '+ Đã qua thử việc'];
        };

        const dynamicQuickTags = getSkillQuickTags(currentPublishShift?.primarySkill);

        const handleAddTag = (tag) => {
          const clean = tag.replace(/^\+\s*/, '');
          if (!publishNote.includes(clean)) {
            setPublishNote((prev) => (prev ? `${prev.trim()} • ${clean}` : clean));
          }
        };

        // Danh sách các chi nhánh khác thực tế từ CSDL
        const otherStores = stores.filter((st) => String(st.id) !== String(storeId));
        const otherStoreNamesText = otherStores.length > 0
          ? ` (${otherStores.map((st) => st.name).slice(0, 2).join(', ')})`
          : '';

        const hasShiftsToPublish = unpublishedUnderstaffedShifts.length > 0;

        return (
          <div className="mp-modal-backdrop" onClick={() => setShowPublishModal(false)}>
            <div className="mp-publish-modal-card" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="mp-publish-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div className="mp-publish-icon-box">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                  </div>
                  <div>
                    <h3 className="mp-publish-title">Đăng Ca Làm Việc Lên Sàn Điều Phối</h3>
                    <div className="mp-publish-meta-row">
                      <span className="mp-publish-ai-pill">
                        <span className="mp-publish-ai-dot"></span>
                        ShiftSync Dispatch AI
                      </span>
                      <span>•</span>
                      <span>Chi nhánh: <strong>{currentStore?.name || 'Chi nhánh hiện tại'}</strong></span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="mp-modal-close-btn"
                  onClick={() => setShowPublishModal(false)}
                >&times;</button>
              </div>

              {/* Form Body */}
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!hasShiftsToPublish) {
                    showToast('Không có ca nào chưa đăng.');
                    return;
                  }
                  const targetShiftId = selectedShiftToPublish || unpublishedUnderstaffedShifts[0]?.id;
                  if (!targetShiftId) {
                    showToast('Vui lòng chọn ca làm việc cần đăng.');
                    return;
                  }
                  setPublishSubmitting(true);
                  try {
                    await handlePublishToMarketplaceAction(targetShiftId);
                    setShowPublishModal(false);
                  } finally {
                    setPublishSubmitting(false);
                  }
                }}
              >
                <div className="mp-publish-body">
                  {/* Field 1: Chọn ca (Chỉ hiển thị các ca CHƯA đăng) */}
                  <div>
                    <div className="mp-publish-label-row">
                      <label className="mp-publish-label">
                        Chọn ca đang thiếu nhân sự trong lịch cửa hàng <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <span className="mp-publish-badge-urgent">
                        {urgentUnpublishedCount > 0 ? `${urgentUnpublishedCount} ca cần bổ sung gấp` : `${unpublishedUnderstaffedShifts.length} ca chờ mở sàn`}
                      </span>
                    </div>

                    {!hasShiftsToPublish ? (
                      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '14px', textAlign: 'center', color: '#166534', fontSize: '13px' }}>
                        Toàn bộ các ca thiếu nhân sự trong tuần đã được đăng lên Sàn điều phối. Hiện không còn ca nào chưa đăng.
                      </div>
                    ) : (
                      <>
                        <div className="mp-publish-select-wrap">
                          <select
                            className="mp-publish-select"
                            value={selectedShiftToPublish || unpublishedUnderstaffedShifts[0]?.id || ''}
                            onChange={(e) => setSelectedShiftToPublish(e.target.value)}
                            required
                          >
                            {unpublishedUnderstaffedShifts.map((s) => {
                              const shiftTypeLabel =
                                s.timePeriod === 'MORNING'
                                  ? 'Ca Sáng'
                                  : s.timePeriod === 'AFTERNOON'
                                  ? 'Ca Chiều'
                                  : 'Ca Tối';
                              return (
                                <option key={s.id} value={s.id}>
                                  {shiftTypeLabel}: {s.primarySkill} ({s.startTimeStr} – {s.endTimeStr}) • {fmtDateVN(s.shiftDate)} • Thiếu {s.missingCount} NV
                                </option>
                              );
                            })}
                          </select>
                          <span className="mp-publish-select-arrow"></span>
                        </div>

                        {/* Sub banner định mức lương cơ bản */}
                        {currentPublishShift && (
                          <div className="mp-publish-wage-banner">
                            <div className="mp-publish-wage-left">
                              <span className="mp-publish-green-dot"></span>
                              <span>
                                Định mức lương cơ bản: <strong>{shiftHourlyRate.toLocaleString()} đ/giờ ({shiftDuration} giờ = {baseShiftTotal.toLocaleString()} đ)</strong>
                              </span>
                            </div>
                            <span className="mp-publish-priority-pill">
                              {currentPublishShift.isUrgent ? 'Ưu tiên: 2 giờ tới' : 'Ưu tiên: Trong tuần'}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Field 2: Mức thưởng nhận ca khẩn cấp */}
                  <div>
                    <div className="mp-publish-label-row">
                      <label className="mp-publish-label">
                        Mức thưởng nhận ca khẩn cấp (Phụ cấp VND)
                      </label>
                      <span className="mp-publish-label-sub">
                        Khuyến khích nhân sự chốt nhận nhanh
                      </span>
                    </div>
                    <div className="mp-publish-bonus-box">
                      <div className="mp-publish-currency-icon">$</div>
                      <input
                        type="number"
                        step="5000"
                        min="0"
                        className="mp-publish-bonus-input"
                        value={publishBonus}
                        onChange={(e) => setPublishBonus(Math.max(0, Number(e.target.value)))}
                      />
                      <span className="mp-publish-currency-label">VNĐ</span>
                    </div>

                    {/* Preset Chips */}
                    <div className="mp-publish-preset-row">
                      <span className="mp-publish-preset-title">Gợi ý mốc:</span>
                      {BONUS_PRESETS.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className={`mp-publish-chip ${publishBonus === preset.value ? 'active' : ''}`}
                          onClick={() => setPublishBonus(preset.value)}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    <div className="mp-publish-footnote">
                      * Phụ cấp nhận ca sẽ được hạch toán trực tiếp vào phiếu lương chu kỳ tuần này của nhân viên sau khi hoàn thành ca hợp lệ.
                    </div>
                  </div>

                  {/* Field 3: Ghi chú từ Quản lý */}
                  <div>
                    <div className="mp-publish-label-row">
                      <label className="mp-publish-label">Ghi chú từ Quản lý:</label>
                    </div>
                    <textarea
                      rows={3}
                      className="mp-publish-textarea"
                      placeholder="Nhập ghi chú yêu cầu kỹ năng đặc thù hoặc lưu ý vận hành cho nhân sự nhận ca..."
                      value={publishNote}
                      onChange={(e) => setPublishNote(e.target.value)}
                    />
                    {/* Quick Tags tương ứng với vị trí */}
                    <div className="mp-publish-preset-row" style={{ marginTop: '8px' }}>
                      <span className="mp-publish-preset-title">Gắn tag nhanh:</span>
                      {dynamicQuickTags.map((tag, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className="mp-publish-tag-btn"
                          onClick={() => handleAddTag(tag)}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Field 4: Push notifications & Multi-branch options */}
                  <div className="mp-publish-options-box">
                    <div
                      className="mp-publish-option-row"
                      onClick={() => setPublishPushNotif(!publishPushNotif)}
                    >
                      <div className="mp-publish-option-left">
                        <span style={{ fontSize: '15px' }}></span>
                        <span>Đẩy thông báo Push tức thì đến {availableStaff} nhân viên khả dụng</span>
                      </div>
                      <div className={`mp-publish-checkbox ${publishPushNotif ? 'checked' : ''}`}>
                        {publishPushNotif && <span>[x]</span>}
                      </div>
                    </div>

                    <div
                      className="mp-publish-option-row"
                      onClick={() => setPublishCrossBranch(!publishCrossBranch)}
                    >
                      <div className="mp-publish-option-left">
                        <span style={{ fontSize: '15px' }}></span>
                        <span>Mở quyền nhận ca chéo cho các chi nhánh lân cận{otherStoreNamesText}</span>
                      </div>
                      <div className={`mp-publish-checkbox ${publishCrossBranch ? 'checked' : ''}`}>
                        {publishCrossBranch && <span>[x]</span>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="mp-publish-footer">
                  <div>
                    <div className="mp-publish-cost-label">Tổng chi trả dự kiến ca này:</div>
                    <div className="mp-publish-cost-row">
                      <span className="mp-publish-cost-amount">
                        {hasShiftsToPublish ? totalEstimated.toLocaleString() : 0} đ
                      </span>
                      {hasShiftsToPublish && (
                        <span className="mp-publish-cost-breakdown">
                          ({Math.round(baseShiftTotal / 1000)}k lương + {Math.round(bonusVal / 1000)}k phụ cấp)
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                      type="button"
                      className="mp-publish-btn-cancel"
                      onClick={() => setShowPublishModal(false)}
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="mp-publish-btn-submit"
                      disabled={!hasShiftsToPublish || publishSubmitting}
                      style={!hasShiftsToPublish || publishSubmitting ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                    >
                      {publishSubmitting ? 'Đang đăng ca...' : 'Xác nhận Đăng Ca'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Modal 2: Quy tắc & Giới hạn OT */}
      {showOtPolicyModal && (
        <div className="mp-modal-backdrop" onClick={() => setShowOtPolicyModal(false)}>
          <div className="mp-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="mp-modal-header">
              <h3 className="mp-modal-title">Quy Chuẩn Điều Phối & Giới Hạn Overtime (OT)</h3>
              <button
                type="button"
                className="mp-modal-close-btn"
                onClick={() => setShowOtPolicyModal(false)}
              >&times;</button>
            </div>
            <div className="mp-modal-body" style={{ fontSize: 13, lineHeight: 1.6, color: '#334155' }}>
              <h4 style={{ margin: '0 0 6px', color: '#0f172a' }}>1. Khung giờ làm việc an toàn:</h4>
              <p style={{ margin: '0 0 12px' }}>
                - Định mức tiêu chuẩn: <strong>40 giờ/tuần</strong> cho nhân sự Full-Time và <strong>25 giờ/tuần</strong> cho Part-Time.
                - Ngưỡng cảnh báo mềm: <strong>32 giờ</strong> (hệ thống tự động gắn nhãn <em>Khuyến dùng</em> cho nhân sự dưới 32 giờ để dự phòng ca đột xuất).
              </p>

              <h4 style={{ margin: '0 0 6px', color: '#0f172a' }}>2. Chế tài vi phạm vượt giờ:</h4>
              <p style={{ margin: '0 0 12px' }}>
                - Khi nhân viên đạt từ 40 giờ trở lên nếu nhận thêm ca, nút chỉ định trực tiếp sẽ tự động bị <strong>Khóa (Disabled)</strong> kèm cảnh báo đỏ nhằm tuân thủ Bộ Luật Lao Động.
              </p>

              <h4 style={{ margin: '0 0 6px', color: '#0f172a' }}>3. Điều phối thông minh (Smart Dispatching):</h4>
              <p style={{ margin: 0 }}>
                - Hệ thống tính toán độ khớp chuyên môn và tổng quỹ giờ tuần của toàn bộ {employees.length} nhân viên để đề xuất ứng viên tối ưu nhất.
              </p>
            </div>
            <div className="mp-modal-footer">
              <button
                type="button"
                className="mp-btn-urgent-primary"
                onClick={() => setShowOtPolicyModal(false)}
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Nhật ký điều phối */}
      {showAuditLogModal && (
        <div className="mp-modal-backdrop" onClick={() => setShowAuditLogModal(false)}>
          <div className="mp-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="mp-modal-header">
              <h3 className="mp-modal-title">Nhật Ký Điều Phối & Phân Công Ca (Audit Log)</h3>
              <button
                type="button"
                className="mp-modal-close-btn"
                onClick={() => setShowAuditLogModal(false)}
              >&times;</button>
            </div>
            <div className="mp-modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                <div style={{ padding: '8px 12px', borderLeft: '3px solid #16a34a', background: '#f8fafc' }}>
                  <strong>Hệ thống hoạt động:</strong> Đang giám sát {understaffedShifts.length} ca thiếu nhân sự tại {currentStore?.name}.
                </div>
                <div style={{ padding: '8px 12px', borderLeft: '3px solid #3b82f6', background: '#f8fafc' }}>
                  <strong>Rà soát OT tuần:</strong> {employees.length} nhân sự trong danh bạ, {otRiskStaffCount} nhân sự chạm ngưỡng 40h.
                </div>
              </div>
            </div>
            <div className="mp-modal-footer">
              <button
                type="button"
                className="mp-btn-header-secondary"
                onClick={() => setShowAuditLogModal(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Chi tiết ca */}
      {showDetailModal && selectedDetailShift && (
        <div className="mp-modal-backdrop" onClick={() => setShowDetailModal(false)}>
          <div className="mp-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="mp-modal-header">
              <h3 className="mp-modal-title">Chi Tiết Ca Làm Việc ({selectedDetailShift.code})</h3>
              <button
                type="button"
                className="mp-modal-close-btn"
                onClick={() => setShowDetailModal(false)}
              >&times;</button>
            </div>
            <div className="mp-modal-body" style={{ fontSize: 13 }}>
              <div><strong>Vị trí:</strong> {selectedDetailShift.primarySkill}</div>
              <div><strong>Ngày làm việc:</strong> {fmtDateVN(selectedDetailShift.shiftDate)}</div>
              <div><strong>Khung giờ:</strong> {selectedDetailShift.startTimeStr} – {selectedDetailShift.endTimeStr} ({selectedDetailShift.duration} giờ)</div>
              <div><strong>Chi nhánh:</strong> {selectedDetailShift.storeName}</div>
              <div><strong>Tình trạng định biên:</strong> Đã gán {selectedDetailShift.assignedStaff}/{selectedDetailShift.reqStaff} (Thiếu {selectedDetailShift.missingCount})</div>
              <div><strong>Thù lao dự kiến:</strong> {selectedDetailShift.totalWage?.toLocaleString()} đ/ca</div>
              <div><strong>Ghi chú:</strong> {selectedDetailShift.note || 'Không có ghi chú.'}</div>
            </div>
            <div className="mp-modal-footer">
              <button
                type="button"
                className="mp-btn-header-secondary"
                onClick={() => setShowDetailModal(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 5: Đề Xuất Nhân Sự Chi Viện (Workforce Proposal) */}
      {showProposeStaffModal && selectedWorkforceReqForPropose && (
        <div className="mp-modal-backdrop" onClick={() => setShowProposeStaffModal(false)}>
          <div className="mp-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="mp-modal-header">
              <h3 className="mp-modal-title">Đề Xuất Nhân Sự Chi Viện</h3>
              <button
                type="button"
                className="mp-modal-close-btn"
                onClick={() => setShowProposeStaffModal(false)}
              >&times;</button>
            </div>
            <div className="mp-modal-body" style={{ fontSize: 13, lineHeight: 1.6 }}>
              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, marginBottom: 14 }}>
                <div>Đơn vị yêu cầu: <strong>{selectedWorkforceReqForPropose.requestingStoreName}</strong></div>
                <div>Ca chi viện: <strong>{fmtDateVN(selectedWorkforceReqForPropose.shiftDate)}</strong> ({String(selectedWorkforceReqForPropose.shiftStartTime || '').slice(0, 5)} – {String(selectedWorkforceReqForPropose.shiftEndTime || '').slice(0, 5)})</div>
              </div>

              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>
                Chọn nhân sự đề xuất chi viện:
              </label>
              <select
                className="mp-quick-assign-select"
                style={{ width: '100%', marginBottom: 14 }}
                value={selectedEligibleStaffId}
                onChange={(e) => setSelectedEligibleStaffId(e.target.value)}
              >
                {eligibleStaffList.map((emp) => {
                  const empId = emp.staffId || emp.id;
                  const name = emp.staffFullName || emp.fullName || emp.name || 'Nhân sự';
                  const role = emp.position || emp.jobTitle || 'Nhân viên';
                  return (
                    <option key={empId} value={empId}>
                      {name} ({role})
                    </option>
                  );
                })}
              </select>

              <div style={{ fontSize: 12, color: '#64748b' }}>
                * Nhân viên được đề xuất sẽ nhận thông báo trên ứng dụng để xác nhận đồng ý hỗ trợ chi viện chi nhánh bạn.
              </div>
            </div>
            <div className="mp-modal-footer">
              <button
                type="button"
                className="mp-btn-header-secondary"
                onClick={() => setShowProposeStaffModal(false)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="mp-btn-urgent-primary"
                disabled={proposingLoading || !selectedEligibleStaffId}
                onClick={handleSubmitProposeStaff}
              >
                {proposingLoading ? 'Đang gửi đề xuất...' : 'Xác nhận đề xuất'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 5.1: Tạo Yêu Cầu Mượn Nhân Sự (Workforce Create Request) */}
      {showCreateWorkforceModal && (
        <div className="mp-modal-backdrop" onClick={() => setShowCreateWorkforceModal(false)}>
          <div className="mp-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="mp-modal-header">
              <h3 className="mp-modal-title">Tạo Yêu Cầu Mượn Nhân Sự</h3>
              <button
                type="button"
                className="mp-modal-close-btn"
                onClick={() => setShowCreateWorkforceModal(false)}
              >&times;</button>
            </div>
            <form onSubmit={handleSubmitCreateWorkforce}>
              <div className="mp-modal-body" style={{ fontSize: 13, lineHeight: 1.6 }}>
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                  <div style={{ fontWeight: 600, color: '#166534' }}>Chi nhánh yêu cầu: {currentStore?.name}</div>
                  <div style={{ fontSize: 12, color: '#15803d', marginTop: 2 }}>
                    Gửi đề nghị chi viện nhân sự đến cửa hàng đối tác trong cùng hệ thống.
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>
                    Chọn chi nhánh đối tác cần mượn nhân sự:
                  </label>
                  <select
                    className="mp-quick-assign-select"
                    style={{ width: '100%' }}
                    value={createWfTargetStoreId}
                    onChange={(e) => setCreateWfTargetStoreId(e.target.value)}
                    required
                  >
                    {stores
                      .filter((s) => String(s.id) !== String(storeId))
                      .map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.name} {st.address ? `(${st.address})` : ''}
                        </option>
                      ))}
                  </select>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>
                    Chọn ca làm việc cần chi viện nhân sự:
                  </label>
                  <select
                    className="mp-quick-assign-select"
                    style={{ width: '100%' }}
                    value={createWfShiftId}
                    onChange={(e) => setCreateWfShiftId(e.target.value)}
                    required
                  >
                    {storeShifts.map((sh) => {
                      const reqCount = sh.requiredStaff || (sh.skillRequirements || []).reduce((acc, r) => acc + (r.requiredStaff || 0), 0);
                      const assigned = (sh.shiftAssignments || []).length;
                      const missing = Math.max(0, reqCount - assigned);
                      const posName = sh.skillRequirements?.[0]?.skillName || 'Nhân sự';
                      return (
                        <option key={sh.id} value={sh.id}>
                          {fmtDateVN(sh.shiftDate)} • {sh.startTime?.slice(0, 5)} - {sh.endTime?.slice(0, 5)} • {posName} (Đã có {assigned}/{reqCount} {missing > 0 ? `- Thiếu ${missing}` : ''})
                        </option>
                      );
                    })}
                  </select>
                  {storeShifts.length === 0 && (
                    <div style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>
                      Chi nhánh hiện chưa có ca làm việc nào được thiết lập.
                    </div>
                  )}
                </div>

                <div style={{ fontSize: 12, color: '#64748b' }}>
                  * Quản lý chi nhánh đối tác sẽ nhận được yêu cầu mượn nhân sự này trên hệ thống để rà soát danh sách nhân sự đủ điều kiện và đề xuất người phù hợp.
                </div>
              </div>
              <div className="mp-modal-footer">
                <button
                  type="button"
                  className="mp-btn-header-secondary"
                  onClick={() => setShowCreateWorkforceModal(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="mp-btn-urgent-primary"
                  disabled={createWfSubmitting || !createWfTargetStoreId || !createWfShiftId}
                >
                  {createWfSubmitting ? 'Đang gửi yêu cầu...' : 'Gửi yêu cầu mượn nhân sự'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 6: Xem Chi Tiết Yêu Cầu / Đề Xuất */}
      {showRecordDetailModal && selectedDetailRecord && (
        <div className="mp-modal-backdrop" onClick={() => setShowRecordDetailModal(false)}>
          <div className="mp-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="mp-modal-header">
              <h3 className="mp-modal-title">
                Chi Tiết {selectedDetailRecord.domainTitle || 'Yêu Cầu'}
              </h3>
              <button
                type="button"
                className="mp-modal-close-btn"
                onClick={() => setShowRecordDetailModal(false)}
              >&times;</button>
            </div>
            <div className="mp-modal-body" style={{ fontSize: 13, lineHeight: 1.6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  Mã: #{String(selectedDetailRecord.id).slice(0, 8).toUpperCase()}
                </span>
                {renderStatusBadge(selectedDetailRecord.status)}
              </div>

              <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, marginBottom: 14 }}>
                <div>Người yêu cầu / Đơn vị: <strong>{cleanText(selectedDetailRecord.requesterName || selectedDetailRecord.staffName || selectedDetailRecord.creatorName || 'Nhân sự')}</strong></div>
                {selectedDetailRecord.recipient && (
                  <div>Nơi nhận: <strong>{selectedDetailRecord.recipient}</strong></div>
                )}
                {selectedDetailRecord.shiftInfo && (
                  <div>Thông tin ca / Thời gian: <strong>{selectedDetailRecord.shiftInfo}</strong></div>
                )}
                {selectedDetailRecord.createdAt && (
                  <div>Thời điểm gửi: <strong>{fmtDateTimeVN(selectedDetailRecord.createdAt)}</strong></div>
                )}
              </div>

              {selectedDetailRecord.content && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Nội dung chi tiết:</div>
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, color: '#334155', whiteSpace: 'pre-wrap' }}>
                    {cleanText(selectedDetailRecord.content)}
                  </div>
                </div>
              )}

              {selectedDetailRecord.reason && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Lý do giải trình:</div>
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, color: '#334155' }}>
                    {cleanText(selectedDetailRecord.reason)}
                  </div>
                </div>
              )}
            </div>
            <div className="mp-modal-footer">
              <button
                type="button"
                className="mp-btn-header-secondary"
                onClick={() => setShowRecordDetailModal(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 6: Xem Ứng Viên Đủ Điều Kiện (Grounded via Backend ShiftAssignmentValidator) */}
      {showEligibleCandidatesModal && selectedShiftForEligibility && (
        <div className="mp-modal-backdrop" onClick={() => setShowEligibleCandidatesModal(false)}>
          <div className="mp-modal-card" style={{ maxWidth: '640px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
            <div className="mp-modal-header">
              <div>
                <h3 className="mp-modal-title">Ứng viên cho ca: {selectedShiftForEligibility.code} - {selectedShiftForEligibility.primarySkill}</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                  Danh sách nhân sự đủ điều kiện nhận ca theo quy chuẩn phân công của hệ thống.
                </p>
              </div>
              <button
                type="button"
                className="mp-modal-close-btn"
                onClick={() => setShowEligibleCandidatesModal(false)}
              >&times;</button>
            </div>

            <div className="mp-modal-body" style={{ maxHeight: '450px', overflowY: 'auto' }}>
              <div style={{
                background: '#f8fafc',
                padding: '12px 16px',
                borderRadius: '8px',
                marginBottom: '16px',
                border: '1px solid #e2e8f0',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '8px',
                fontSize: '12.5px'
              }}>
                <div><strong>Vị trí:</strong> {selectedShiftForEligibility.primarySkill}</div>
                <div><strong>Ngày làm:</strong> {fmtDateVN(selectedShiftForEligibility.shiftDate)}</div>
                <div><strong>Khung giờ:</strong> {selectedShiftForEligibility.startTimeStr} - {selectedShiftForEligibility.endTimeStr}</div>
                <div><strong>Thiếu quân số:</strong> <span style={{ color: '#dc2626', fontWeight: 700 }}>{selectedShiftForEligibility.missingCount} nhân sự</span></div>
              </div>

              {loadingEligibleCandidates ? (
                <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                  <div style={{ fontSize: '14px', marginBottom: '8px', fontWeight: 600 }}>Đang kiểm tra danh sách ứng viên đủ điều kiện...</div>
                </div>
              ) : eligibleCandidatesList.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fee2e2' }}>
                  <h4 style={{ margin: '0 0 4px 0', color: '#991b1b', fontSize: '15px' }}>Không có nhân viên đủ điều kiện nhận ca</h4>
                  <p style={{ margin: 0, color: '#b91c1c', fontSize: '12.5px' }}>
                    Tất cả nhân sự trong chi nhánh đều đã có lịch làm việc, nghỉ phép hoặc chạm giới hạn giờ làm việc trong tuần.
                  </p>
                  <div style={{ marginTop: '12px' }}>
                    <button
                      type="button"
                      className="mp-btn-action-detail"
                      onClick={() => {
                        setShowEligibleCandidatesModal(false);
                        setActiveTab('WORKFORCE');
                      }}
                      style={{ padding: '8px 14px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Chuyển sang Điều phối liên chi nhánh
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Tìm thấy {eligibleCandidatesList.length} nhân viên đủ điều kiện nhận ca:
                  </div>

                  {eligibleCandidatesList.map((c) => {
                    const cId = c.staffId || c.id;
                    const cName = c.staffFullName || c.fullName || 'Nhân sự';
                    const isAssigning = assigningCandidateId === cId;
                    return (
                      <div
                        key={cId}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 14px',
                          borderRadius: '8px',
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            background: '#e0f2fe',
                            color: '#0284c7',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '14px'
                          }}>
                            {cName[0]?.toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '13.5px' }}>
                              {cName}
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>
                              {c.staffEmail || 'Chưa cập nhật email'} • {c.contractType?.name || 'Hợp đồng chuẩn'}
                            </div>
                            <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                              <span style={{ fontSize: '11px', background: '#dcfce7', color: '#15803d', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                Đủ điều kiện
                              </span>
                              <span style={{ fontSize: '11px', background: '#f1f5f9', color: '#475569', padding: '1px 6px', borderRadius: '4px' }}>
                                {c.systemRole || 'STAFF'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={isAssigning}
                          onClick={() => handleAssignCandidateFromModal(cId, cName)}
                          style={{
                            padding: '8px 14px',
                            borderRadius: '6px',
                            border: 'none',
                            background: '#16a34a',
                            color: '#ffffff',
                            fontWeight: 600,
                            fontSize: '12.5px',
                            cursor: isAssigning ? 'not-allowed' : 'pointer',
                            opacity: isAssigning ? 0.6 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          {isAssigning ? 'Đang phân công...' : 'Phân công'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mp-modal-footer">
              <button
                type="button"
                className="mp-btn-header-secondary"
                onClick={() => setShowEligibleCandidatesModal(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast thông báo */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: '#0f172a',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: '10px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
            zIndex: 9999,
            fontSize: '13.5px',
            fontWeight: 600,
          }}
        >
          {toast}
        </div>
      )}

      {/* ── 6. Chân Trang OPS ── */}
      <footer className="mp-footer-bar">
        <div>
          ShiftSync™ Enterprise OPS • Store Manager Command Center • {currentStore?.name || 'Store'} Active
        </div>
        <div className="mp-footer-links">
          <span className="mp-footer-link" onClick={() => setShowAuditLogModal(true)}>
            Trung tâm điều lệnh quản lý
          </span>
          <span className="mp-footer-link" onClick={() => setShowOtPolicyModal(true)}>
            Chính sách giới hạn Overtime
          </span>
          <span className="mp-footer-link" onClick={() => showToast('Đang kết nối bộ phận hỗ trợ kỹ thuật...')}>
            Hỗ trợ kỹ thuật 24/7
          </span>
        </div>
      </footer>
    </div>
  );
}
