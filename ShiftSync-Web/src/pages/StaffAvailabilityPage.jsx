import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllStores } from '../services/storeService';
import { getStaffByStore } from '../services/employmentService';
import { getSkillsByStore } from '../services/skillService';
import {
  getStoreStaffAvailability,
  getStaffAvailability,
  getMyAvailability,
  createAvailability,
  deleteAvailability,
} from '../services/availabilityService';
import { getShiftsForStore, createShift } from '../services/shiftService';
import { getMyProfile, getMyShifts } from '../services/employeeService';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Plus,
  ArrowRight,
  Sparkles,
  Send,
  CalendarCheck,
  Building2,
  CalendarDays,
  Briefcase,
  Lock,
  Unlock,
  Check,
  Info,
  ExternalLink,
  Printer
} from 'lucide-react';
import Avatar3DWeb from '../components/Avatar3DWeb';
import { getAvatarForEmployee } from '../components/avatarConfigs';
import './StaffAvailabilityPage.css';

const getRoleBadgeClass = (pos = '') => {
  const p = (pos || '').toLowerCase();
  if (p.includes('pha chế') || p.includes('barista')) return 'role-barista';
  if (p.includes('thu ngân') || p.includes('cashier')) return 'role-cashier';
  if (p.includes('bếp') || p.includes('kitchen') || p.includes('nấu')) return 'role-kitchen';
  if (p.includes('phục vụ') || p.includes('waiter') || p.includes('bàn')) return 'role-waiter';
  if (p.includes('quản lý') || p.includes('lead') || p.includes('trưởng')) return 'role-lead';
  return 'role-general';
};

const DOW_VI = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
const DOW_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

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
  `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;

const fmtDateRangeText = (d) =>
  `${d.getDate()} Tháng ${d.getMonth() + 1}, ${d.getFullYear()}`;

const toISODate = (d) => {
  if (!d) return '';
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const fmtTime = (t) => {
  if (!t) return '00:00';
  if (typeof t === 'string') return t.slice(0, 5);
  return `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`;
};

const calcSlotHours = (startTime, endTime) => {
  const startStr = fmtTime(startTime);
  const endStr = fmtTime(endTime);
  const [sh, sm] = startStr.split(':').map(Number);
  const [eh, em] = endStr.split(':').map(Number);
  const diff = (eh * 60 + em) - (sh * 60 + sm);
  return diff > 0 ? (diff / 60) : 8;
};

export default function StaffAvailabilityPage() {
  const navigate = useNavigate();

  /* -- Store & Navigation state -- */
  const [stores, setStores] = useState([]);
  const [storeId, setStoreId] = useState(() => localStorage.getItem('selectedStoreId') || '');
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [viewTab, setViewTab] = useState('MATRIX'); // 'MATRIX' | 'TIMESLOT'
  const [activeTimeslotDow, setActiveTimeslotDow] = useState(1); // 1 = Thứ 2

  /* -- Data state -- */
  const [employees, setEmployees] = useState([]);
  const [skills, setSkills] = useState([]);
  const [availabilityMap, setAvailabilityMap] = useState({}); // { staffId: [slots] }
  const [assignedShifts, setAssignedShifts] = useState([]); // ShiftDTO list
  const [loading, setLoading] = useState(false);

  /* -- Filters -- */
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedSkillFilter, setSelectedSkillFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL'); // 'ALL' | 'SUBMITTED' | 'MISSING'

  const userRole = (localStorage.getItem('userRole') || 'STAFF').toUpperCase();
  const isManager = userRole === 'MANAGER' || userRole === 'ADMIN';
  const isStaff = !isManager;

  /* -- Registration Modal state for Staff -- */
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    dayOfWeek: 1,
    startTime: '08:00',
    endTime: '16:00',
  });

  /* -- Toast notification -- */
  const [toast, setToast] = useState(null);

  /* -- Quick Assign Modal & Shift Detail Modal state -- */
  const [quickAssignModal, setQuickAssignModal] = useState(null); // { emp, slot, date }
  const [shiftDetailModal, setShiftDetailModal] = useState(null); // { emp, slot, date, shift }
  const [assignForm, setAssignForm] = useState({ skillId: '', note: '' });

  const showToast = (title, message) => {
    setToast({ title, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleCreateAvailability = async (e) => {
    e.preventDefault();
    try {
      await createAvailability({
        dayOfWeek: Number(createForm.dayOfWeek),
        startTime: createForm.startTime.length === 5 ? `${createForm.startTime}:00` : createForm.startTime,
        endTime: createForm.endTime.length === 5 ? `${createForm.endTime}:00` : createForm.endTime,
      });
      showToast('Đăng ký thành công! ', 'Khung giờ rảnh đã được lưu vào hệ thống.');
      setShowCreateModal(false);
      loadData();
    } catch (err) {
      showToast('Lỗi đăng ký', err.response?.data?.message || 'Không thể lưu khung giờ rảnh.');
    }
  };

  const handleDeleteAvailability = async (slotId) => {
    if (!slotId) return;
    if (!window.confirm('Bạn có chắc chắn muốn xoá khung giờ rảnh này?')) return;
    try {
      await deleteAvailability(slotId);
      showToast('Đã xoá thành công! ', 'Khung giờ rảnh đã được gỡ bỏ.');
      loadData();
    } catch (err) {
      showToast('Lỗi xoá', err.response?.data?.message || 'Không thể xoá khung giờ rảnh.');
    }
  };

  /* ── Week Range ── */
  const weekDatesFull = useMemo(() => getWeekDates(currentDate), [currentDate]);

  /* ── Load Stores ── */
  useEffect(() => {
    getAllStores()
      .then((res) => {
        const list = res.data?.content || res.data?.data || (Array.isArray(res.data) ? res.data : []);
        setStores(list);
        if (list && list.length > 0 && !storeId) {
          const first = list[0].id;
          setStoreId(first);
          localStorage.setItem('selectedStoreId', String(first));
        }
      })
      .catch(() => {});
  }, []);

  /* ── Load Skills ── */
  useEffect(() => {
    if (!storeId) return;
    getSkillsByStore(storeId)
      .then((res) => {
        const data = res.data;
        setSkills(Array.isArray(data) ? data : (data.content || []));
      })
      .catch(() => setSkills([]));
  }, [storeId]);

  /* ── Main Data Loader ── */
  const loadData = async () => {
    setLoading(true);
    try {
      if (isStaff) {
        // 1. Load my profile
        let profile = null;
        try {
          const profileRes = await getMyProfile();
          profile = profileRes.data;
        } catch {
          profile = {
            id: localStorage.getItem('userId') || 'me',
            fullName: localStorage.getItem('userFullName') || 'Tôi',
          };
        }
        const staffObj = {
          id: profile.id,
          staffId: profile.id,
          fullName: profile.fullName || 'Tôi',
          staffFullName: profile.fullName || 'Tôi',
          contractTypeName: 'Nhân viên',
          position: 'Nhân viên',
        };
        setEmployees([staffObj]);

        // 2. Load my shifts for this week
        let shifts = [];
        try {
          const shiftsRes = await getMyShifts();
          const weekRangeIso = weekDatesFull.map(toISODate);
          shifts = (shiftsRes.data || []).filter((s) => weekRangeIso.includes(s.shiftDate));
        } catch (e) {
          // fallback
        }
        setAssignedShifts(shifts);

        // 3. Load my availability
        try {
          const availRes = await getMyAvailability();
          const list = Array.isArray(availRes.data) ? availRes.data : [];
          setAvailabilityMap({ [profile.id]: list });
        } catch {
          setAvailabilityMap({});
        }
        return;
      }

      if (!storeId) return;

      // 1. Load Store Staff
      // The availability matrix is an all-active-staff view (including staff
      // who have not submitted availability), not a paginated roster view.
      const staffRes = await getStaffByStore(storeId, 0, 100);
      const rawStaff = (staffRes.data.content || staffRes.data || []).filter(
        (emp) => (emp.systemRole || emp.role) !== 'MANAGER' && (emp.systemRole || emp.role) !== 'ADMIN'
      );
      const savedPositions = JSON.parse(localStorage.getItem(`emp_positions_${storeId}`) || '{}');
      const staff = rawStaff.map((emp) => {
        const id = emp.staffId || emp.id;
        const name = emp.staffFullName || emp.fullName || 'Nhân viên';
        const contractType = emp.contractType?.name || emp.employmentType || 'Part-Time';
        const pos = savedPositions[id] || emp.position || emp.jobTitle || emp.skillName || emp.skill?.name || 'Nhân viên';
        return {
          ...emp,
          id,
          staffId: id,
          fullName: name,
          staffFullName: name,
          contractTypeName: contractType,
          position: pos === contractType ? 'Nhân viên' : pos,
        };
      });
      setEmployees(staff);

      // 2. Load Shifts in Week
      const weekRangeIso = weekDatesFull.map(toISODate);
      const shiftsRes = await getShiftsForStore(storeId);
      const shifts = (shiftsRes.data || []).filter((s) => weekRangeIso.includes(s.shiftDate));
      setAssignedShifts(shifts);

      // 3. Load Availability
      let bulkAvail = [];
      try {
        const availRes = await getStoreStaffAvailability(storeId);
        bulkAvail = Array.isArray(availRes.data) ? availRes.data : [];
      } catch {
        // Fallback: per-employee fetch
        const results = await Promise.allSettled(
          staff.map((emp) => getStaffAvailability(emp.id).then((r) => r.data || []))
        );
        results.forEach((r) => {
          if (r.status === 'fulfilled' && Array.isArray(r.value)) {
            bulkAvail.push(...r.value);
          }
        });
      }

      // Group availability by staffId
      const map = {};
      bulkAvail.forEach((slot) => {
        const staffKey = slot.staffId || slot.userId;
        if (!staffKey) return;
        if (!map[staffKey]) map[staffKey] = [];
        map[staffKey].push(slot);
      });
      setAvailabilityMap(map);
    } catch (err) {
      console.error('Error loading staff availability:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [storeId, toISODate(weekDatesFull[0])]);

  /* ── Date navigation handlers ── */
  const handlePrevWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 7);
    setCurrentDate(d);
  };

  const handleNextWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 7);
    setCurrentDate(d);
  };

  const handleCurrentWeek = () => {
    setCurrentDate(new Date());
  };

  const handleStoreChange = (newStoreId) => {
    setStoreId(newStoreId);
    localStorage.setItem('selectedStoreId', String(newStoreId));
    window.dispatchEvent(new CustomEvent('storeChanged', { detail: { storeId: newStoreId } }));
  };

  /* ── Check if Employee has assigned shift on day ── */
  const getEmployeeShiftOnDate = (empId, dateIso) => {
    return assignedShifts.find((s) => {
      if (s.shiftDate !== dateIso) return false;
      if (s.staffId === empId || s.assignedStaffId === empId || s.employeeId === empId) return true;
      if (Array.isArray(s.shiftAssignments) && s.shiftAssignments.some((a) => a.staffId === empId)) {
        return true;
      }
      return false;
    });
  };

  /* ── Check employee weekly slot counts (free vs assigned) ── */
  const getEmployeeWeeklySlotStats = (empId) => {
    const empSlots = availabilityMap[empId] || [];
    let freeCount = 0;
    let assignedCount = 0;
    let declaredHours = 0;
    let assignedHours = 0;

    weekDatesFull.forEach((d) => {
      const dow = d.getDay();
      const dIso = toISODate(d);
      const daySlots = empSlots.filter((s) => s.dayOfWeek === dow);
      if (daySlots.length > 0) {
        const shift = getEmployeeShiftOnDate(empId, dIso);
        daySlots.forEach((slot) => {
          const h = calcSlotHours(slot.startTime, slot.endTime);
          declaredHours += h;
          if (shift) {
            assignedCount += 1;
            assignedHours += calcSlotHours(shift.startTime, shift.endTime);
          } else {
            freeCount += 1;
          }
        });
      }
    });

    return {
      hasSlots: empSlots.length > 0,
      freeCount,
      assignedCount,
      declaredHours,
      assignedHours,
      isFullyOccupied: empSlots.length > 0 && freeCount === 0 && assignedCount > 0,
      isPartiallyOrFullyFree: empSlots.length > 0 && freeCount > 0,
    };
  };

  /* ── Filtered Employees ── */
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const name = (emp.fullName || emp.staffFullName || '').toLowerCase();
      const pos = (emp.position || '').toLowerCase();
      const matchSearch =
        !searchKeyword ||
        name.includes(searchKeyword.toLowerCase().trim()) ||
        pos.includes(searchKeyword.toLowerCase().trim());

      if (!matchSearch) return false;

      if (selectedSkillFilter !== 'ALL') {
        const target = selectedSkillFilter.toLowerCase().trim();
        if (!pos.includes(target)) return false;
      }

      const stats = getEmployeeWeeklySlotStats(emp.id);

      if (selectedStatusFilter === 'SUBMITTED' && !stats.hasSlots) return false;
      if (selectedStatusFilter === 'MISSING' && stats.hasSlots) return false;
      if (selectedStatusFilter === 'STILL_FREE' && !stats.isPartiallyOrFullyFree) return false;
      if (selectedStatusFilter === 'OCCUPIED' && !stats.isFullyOccupied) return false;

      return true;
    });
  }, [employees, searchKeyword, selectedSkillFilter, selectedStatusFilter, availabilityMap, assignedShifts, weekDatesFull]);

  /* ── Overall KPI Analytics ── */
  const totalStaffCount = employees.length;
  const submittedCount = employees.filter((e) => (availabilityMap[e.id] || []).length > 0).length;
  const missingCount = Math.max(0, totalStaffCount - submittedCount);
  const submissionRate = totalStaffCount > 0 ? Math.round((submittedCount / totalStaffCount) * 100) : 0;

  // Real-time breakdown: Declared hours vs Assigned hours vs Remaining free hours
  const weeklyAnalytics = useMemo(() => {
    let declaredHours = 0;
    let assignedHours = 0;
    let freeSlotsCount = 0;
    let assignedSlotsCount = 0;
    let freeStaffCount = 0;
    let occupiedStaffCount = 0;

    employees.forEach((emp) => {
      const stats = getEmployeeWeeklySlotStats(emp.id);
      if (stats.hasSlots) {
        declaredHours += stats.declaredHours;
        assignedHours += stats.assignedHours;
        freeSlotsCount += stats.freeCount;
        assignedSlotsCount += stats.assignedCount;
        if (stats.isPartiallyOrFullyFree) freeStaffCount += 1;
        if (stats.isFullyOccupied) occupiedStaffCount += 1;
      }
    });

    const remainingFreeHours = Math.max(0, declaredHours - assignedHours);
    const assignedRate = declaredHours > 0 ? Math.round((assignedHours / declaredHours) * 100) : 0;

    return {
      declaredHours,
      assignedHours,
      remainingFreeHours,
      freeSlotsCount,
      assignedSlotsCount,
      freeStaffCount,
      occupiedStaffCount,
      assignedRate,
    };
  }, [employees, availabilityMap, assignedShifts, weekDatesFull]);

  /* ── Remind missing employees ── */
  const handleRemindMissing = () => {
    showToast(
      'Đã gửi thông báo nhắc nhở! ',
      `Hệ thống đã gửi thông báo đến ${missingCount} nhân viên chưa nộp lịch đăng ký tuần này.`
    );
  };

  /* ── Open Quick Assign Modal (For unassigned free slots) ── */
  const handleOpenAssignModal = (emp, slot, date) => {
    const matchedSkill = skills.find((sk) => sk.name.toLowerCase() === (emp.position || '').toLowerCase()) || skills[0];
    setAssignForm({
      skillId: matchedSkill?.id || '',
      note: `Phân ca theo lịch rảnh đã đăng ký (${fmtTime(slot.startTime)} - ${fmtTime(slot.endTime)})`,
    });
    setQuickAssignModal({ emp, slot, date });
  };

  /* ── Open Shift Detail Modal (For already occupied slots) ── */
  const handleOpenShiftDetailModal = (emp, slot, date, shift) => {
    setShiftDetailModal({ emp, slot, date, shift });
  };

  /* ── Submit Quick Shift Assignment ── */
  const handleSubmitQuickAssign = async (e) => {
    e.preventDefault();
    if (!quickAssignModal) return;
    const { emp, slot, date } = quickAssignModal;
    const shiftDateIso = toISODate(date);

    try {
      const selectedSkill = skills.find((s) => String(s.id) === String(assignForm.skillId));
      const payload = {
        storeId,
        shiftDate: shiftDateIso,
        startTime: fmtTime(slot.startTime),
        endTime: fmtTime(slot.endTime),
        staffId: emp.id,
        skillId: assignForm.skillId || null,
        skillName: selectedSkill?.name || emp.position || 'Nhân viên',
        note: assignForm.note,
        status: 'PUBLISHED',
      };
      await createShift(storeId, payload);
      showToast(
        'Phân ca thành công! ',
        `Đã xếp ca làm việc cho ${emp.fullName} vào ${DOW_VI[date.getDay()]} (${fmtTime(slot.startTime)} - ${fmtTime(slot.endTime)})`
      );
      setQuickAssignModal(null);
      loadData();
    } catch (err) {
      showToast('Lỗi phân ca', err.response?.data?.message || 'Không thể tạo ca làm việc.');
    }
  };

  return (
    <div className="avail-page">
      {/* ═══ TOPBAR: Title & Store Selector ═══ */}
      <div className="avail-topbar">
        <div className="avail-title-block">
          <div className="avail-badge-category">
            {isStaff ? 'LỊCH KHẢ DỤNG CỦA TÔI' : 'QUẢN LÝ LỊCH KHẢ DỤNG'}
          </div>
          <h1 className="avail-title">
            {isStaff ? 'Lịch Đăng Ký Rảnh Của Tôi' : 'Tổng Hợp Lịch Đăng Ký Rảnh Của Nhân Viên'}
          </h1>
          <p className="avail-subtitle">
            {isStaff
              ? 'Xem và đăng ký các khung giờ bạn sẵn sàng nhận ca trong tuần để quản lý sắp xếp lịch làm việc hợp lý.'
              : 'Theo dõi toàn bộ khung giờ làm việc nhân viên sẵn sàng nhận ca trong tuần, giúp quản lý phân công ca chính xác và không trùng lịch.'}
          </p>
        </div>

        <div className="avail-topbar-actions">
          {/* Store Switcher (Manager Only) */}
          {!isStaff && (
            <div className="avail-store-picker">
              <Building2 size={16} className="avail-store-icon" />
              <select
                value={storeId}
                onChange={(e) => handleStoreChange(e.target.value)}
                className="avail-store-select"
              >
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            className="avail-btn avail-btn-print"
            onClick={() => window.print()}
            title="In lịch làm việc hoặc lưu thành file PDF (giữ nguyên đầy đủ màu sắc)"
          >
            <Printer size={16} />
            <span>In Lịch / Xuất PDF</span>
          </button>

          {isStaff ? (
            <button
              type="button"
              className="avail-btn avail-btn-primary"
              onClick={() => setShowCreateModal(true)}
              title="Đăng ký thêm khung giờ bạn có thể đi làm"
            >
              <Plus size={16} />
              <span>+ Đăng Ký Lịch Rảnh</span>
            </button>
          ) : (
            <button
              type="button"
              className="avail-btn avail-btn-primary"
              onClick={() => navigate('/schedule')}
              title="Đến màn hình xếp ca làm việc"
            >
              <CalendarCheck size={16} />
              <span>Màn Hình Xếp Ca</span>
            </button>
          )}
        </div>
      </div>

      {/* ═══ STATS OVERVIEW CARDS ═══ */}
      <div className="avail-kpi-grid">
        <div className="avail-kpi-card">
          <div className="avail-kpi-header">
            <span className="avail-kpi-title">Tổng nhân sự</span>
            <div className="avail-kpi-icon-wrap blue">
              <Users size={18} />
            </div>
          </div>
          <div className="avail-kpi-number">{totalStaffCount}</div>
          <div className="avail-kpi-subtext">Nhân viên trực thuộc chi nhánh</div>
        </div>

        <div className="avail-kpi-card">
          <div className="avail-kpi-header">
            <span className="avail-kpi-title">Đã nộp lịch rảnh</span>
            <div className="avail-kpi-icon-wrap green">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="avail-kpi-number">
            {submittedCount} <span className="avail-kpi-unit">/ {totalStaffCount}</span>
          </div>
          <div className="avail-kpi-progress-bar">
            <div className="avail-kpi-progress-fill" style={{ width: `${submissionRate}%` }} />
          </div>
          <div className="avail-kpi-subtext">Tỷ lệ nộp: <strong>{submissionRate}%</strong> ({missingCount} chưa gửi)</div>
        </div>

        <div className="avail-kpi-card">
          <div className="avail-kpi-header">
            <span className="avail-kpi-title">Tổng giờ đăng ký tuần</span>
            <div className="avail-kpi-icon-wrap purple">
              <Clock size={18} />
            </div>
          </div>
          <div className="avail-kpi-number">
            {weeklyAnalytics.declaredHours} <span className="avail-kpi-unit">giờ</span>
          </div>
          <div className="avail-kpi-progress-bar">
            <div
              className="avail-kpi-progress-fill"
              style={{
                width: `${weeklyAnalytics.assignedRate}%`,
                background: weeklyAnalytics.assignedRate >= 100 ? '#10b981' : 'linear-gradient(90deg, #6366f1, #3b82f6)'
              }}
            />
          </div>
          <div className="avail-kpi-subtext">
            <strong>Đã xếp: {weeklyAnalytics.assignedHours}h</strong> • <span>Còn rảnh: {weeklyAnalytics.remainingFreeHours}h</span>
          </div>
        </div>

        <div className="avail-kpi-card">
          <div className="avail-kpi-header">
            <span className="avail-kpi-title">Tình trạng bố trí ca</span>
            <div className="avail-kpi-icon-wrap" style={{ background: weeklyAnalytics.freeSlotsCount === 0 ? '#ecfdf5' : '#fffbeb', color: weeklyAnalytics.freeSlotsCount === 0 ? '#059669' : '#d97706' }}>
              {weeklyAnalytics.freeSlotsCount === 0 ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            </div>
          </div>
          <div className="avail-kpi-number" style={{ color: weeklyAnalytics.freeSlotsCount === 0 ? '#16a34a' : '#2563eb' }}>
            {weeklyAnalytics.freeSlotsCount === 0 ? (
              <span>100% Kín Lịch</span>
            ) : (
              <>
                {weeklyAnalytics.freeSlotsCount} <span className="avail-kpi-unit">ca còn rảnh</span>
              </>
            )}
          </div>
          <div className="avail-kpi-subtext">
            {weeklyAnalytics.freeSlotsCount === 0 ? (
              <span style={{ color: '#16a34a', fontWeight: 600 }}>Toàn bộ ca đăng ký đã được phân công</span>
            ) : (
              <span>{weeklyAnalytics.freeStaffCount} nhân viên sẵn sàng nhận thêm ca</span>
            )}
          </div>
        </div>
      </div>

      {/* ═══ WEEK NAVIGATOR & TOOLBAR CONTROLS ═══ */}
      <div className="avail-toolbar">
        {/* Date navigator */}
        <div className="avail-week-nav">
          <button
            type="button"
            className="avail-nav-arrow"
            onClick={handlePrevWeek}
            title="Tuần trước"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="avail-nav-center">
            <Calendar size={16} className="avail-cal-icon" />
            <span className="avail-nav-dates">
              {fmtDateRangeText(weekDatesFull[0])}
            </span>
            <span className="avail-nav-sep">→</span>
            <span className="avail-nav-dates">
              {fmtDateRangeText(weekDatesFull[6])}
            </span>
          </div>

          <button
            type="button"
            className="avail-nav-arrow"
            onClick={handleNextWeek}
            title="Tuần sau"
          >
            <ChevronRight size={18} />
          </button>

          <button
            type="button"
            className="avail-today-btn"
            onClick={handleCurrentWeek}
          >
            Tuần này
          </button>
        </div>

        {/* View mode toggle */}
        <div className="avail-view-toggle">
          <button
            type="button"
            className={`avail-toggle-btn ${viewTab === 'MATRIX' ? 'active' : ''}`}
            onClick={() => setViewTab('MATRIX')}
          >
            <CalendarDays size={15} />
            <span>Ma Trận Tuần</span>
          </button>
          <button
            type="button"
            className={`avail-toggle-btn ${viewTab === 'TIMESLOT' ? 'active' : ''}`}
            onClick={() => setViewTab('TIMESLOT')}
          >
            <Clock size={15} />
            <span>Theo Khung Giờ</span>
          </button>
        </div>
      </div>

      {/* ═══ SEARCH & FILTER ROW ═══ */}
      <div className="avail-filter-strip">
        <div className="avail-search-box">
          <Search size={16} className="avail-search-icon" />
          <input
            type="text"
            placeholder="Tìm tên nhân viên, vị trí..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="avail-search-input"
          />
          {searchKeyword && (
            <button
              type="button"
              className="avail-search-clear"
              onClick={() => setSearchKeyword('')}
            >&times;</button>
          )}
        </div>

        <div className="avail-filter-group">
          <Filter size={15} className="avail-filter-label-icon" />

          {/* Skill / Position filter */}
          <select
            value={selectedSkillFilter}
            onChange={(e) => setSelectedSkillFilter(e.target.value)}
            className="avail-select-filter"
          >
            <option value="ALL">Tất cả vị trí / vai trò</option>
            {skills.map((sk) => (
              <option key={sk.id} value={sk.name}>
                {sk.name}
              </option>
            ))}
          </select>

          {/* Availability Status filter (Clarified Free vs Occupied) */}
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="avail-select-filter"
          >
            <option value="ALL">Tất cả trạng thái ({employees.length} NV)</option>
            <option value="STILL_FREE">THỰC SỰ CÒN RẢNH ({weeklyAnalytics.freeStaffCount} NV có ca trống)</option>
            <option value="OCCUPIED">ĐÃ KÍN LỊCH ({weeklyAnalytics.occupiedStaffCount} NV đã có ca)</option>
            <option value="SUBMITTED">Đã đăng ký lịch rảnh ({submittedCount} NV)</option>
            <option value="MISSING">Chưa nộp lịch ({missingCount} NV)</option>
          </select>
        </div>

        <div className="avail-filter-count">
          Hiển thị <strong>{filteredEmployees.length}</strong> / {employees.length} nhân viên
        </div>
      </div>

      {/* ═══ TAB 1: WEEKLY MATRIX VIEW (Ma Trận Tuần) ═══ */}
      {viewTab === 'MATRIX' && (
        <div className="avail-table-container">
          <div className="avail-table-wrap">
            <table className="avail-matrix-table">
              <thead>
                <tr>
                  <th className="avail-th-emp">Nhân viên</th>
                  {weekDatesFull.map((d) => {
                    const dow = d.getDay();
                    const isToday = toISODate(d) === toISODate(new Date());
                    const dIso = toISODate(d);

                    // Employees who registered a slot on this day of week
                    const staffWithSlots = employees.filter((emp) => {
                      const slots = availabilityMap[emp.id] || [];
                      return slots.some((s) => s.dayOfWeek === dow);
                    });

                    // Real-time split: Who is STILL FREE vs Who is OCCUPIED (has assigned shift)
                    const freeStaff = staffWithSlots.filter((emp) => !getEmployeeShiftOnDate(emp.id, dIso));
                    const assignedStaff = staffWithSlots.filter((emp) => !!getEmployeeShiftOnDate(emp.id, dIso));

                    return (
                      <th key={dIso} className={`avail-th-day ${isToday ? 'is-today' : ''}`}>
                        <div className="avail-th-dow-wrap">
                          <span className="avail-th-dow">{DOW_VI[dow]}</span>
                          {isToday && <span className="avail-th-today-badge">Hôm nay</span>}
                        </div>
                        <div className="avail-th-dm">{fmtDM(d)}</div>

                        {staffWithSlots.length === 0 ? (
                          <div className="avail-th-avail-count empty" title="Không có nhân viên nào đăng ký ngày này">
                            0 người đăng ký
                          </div>
                        ) : freeStaff.length > 0 ? (
                          <div className="avail-th-count-stack">
                            <div className="avail-th-avail-count free" title={`${freeStaff.length} nhân viên còn rảnh chưa xếp ca`}>
                              {freeStaff.length} người còn rảnh
                            </div>
                            {assignedStaff.length > 0 && (
                              <div className="avail-th-sub-count" title={`${assignedStaff.length} nhân viên đã có ca`}>
                                {assignedStaff.length} đã có ca
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="avail-th-avail-count full" title={`Tất cả ${assignedStaff.length} nhân viên đã được xếp ca kín lịch`}>
                            Đã kín lịch ({assignedStaff.length}/{staffWithSlots.length})
                          </div>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="avail-loading-cell">
                      <div className="avail-spinner" />
                      <span>Đang tải lịch rảnh của nhân viên...</span>
                    </td>
                  </tr>
                ) : filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="avail-empty-cell">
                      Không tìm thấy nhân viên nào phù hợp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => {
                    const empSlots = availabilityMap[emp.id] || [];
                    const hasSubmitted = empSlots.length > 0;
                    const empStats = getEmployeeWeeklySlotStats(emp.id);

                    return (
                      <tr key={emp.id} className="avail-row">
                        {/* Employee Card Cell */}
                        <td className="avail-td-emp">
                          <div className="avail-emp-card">
                            <div className="avail-emp-avatar-wrap">
                              <Avatar3DWeb avatarId={emp.avatarId || getAvatarForEmployee(emp)} size={40} />
                              {hasSubmitted ? (
                                <span className="avail-emp-status-dot submitted" title="Đã nộp lịch rảnh" />
                              ) : (
                                <span className="avail-emp-status-dot missing" title="Chưa nộp lịch rảnh" />
                              )}
                            </div>
                            <div className="avail-emp-meta">
                              <div className="avail-emp-name">{emp.fullName}</div>
                              <div className="avail-emp-pos-row">
                                <span className={`avail-emp-pos-tag ${getRoleBadgeClass(emp.position)}`}>
                                  {emp.position || 'Nhân viên'}
                                </span>
                                <span className="avail-emp-contract">{emp.contractTypeName}</span>
                              </div>
                              <div className="avail-emp-hours-badge">
                                {hasSubmitted ? (
                                  <div className="avail-emp-stats-line">
                                    <span className="avail-hours-text">
                                      Đăng ký: <strong>{empSlots.length} ca</strong> ({empStats.declaredHours}h)
                                    </span>
                                    {empStats.isFullyOccupied ? (
                                      <span className="avail-emp-tag occupied">Đã kín lịch</span>
                                    ) : (
                                      <span className="avail-emp-tag free">Còn {empStats.freeCount} ca rảnh</span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="avail-missing-text">Chưa gửi lịch rảnh</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 7 Day Cells */}
                        {weekDatesFull.map((d) => {
                          const dow = d.getDay();
                          const dIso = toISODate(d);
                          const daySlots = empSlots.filter((s) => s.dayOfWeek === dow);
                          const assignedShift = getEmployeeShiftOnDate(emp.id, dIso);

                          return (
                            <td key={dIso} className="avail-td-cell">
                              {daySlots.length === 0 ? (
                                <div
                                  className="avail-slot-empty"
                                  style={isStaff ? { cursor: 'pointer' } : {}}
                                  onClick={() => {
                                    if (isStaff) {
                                      setCreateForm({
                                        dayOfWeek: dow,
                                        startTime: '08:00',
                                        endTime: '16:00',
                                      });
                                      setShowCreateModal(true);
                                    }
                                  }}
                                  title={isStaff ? "Bấm để đăng ký khung giờ rảnh ngày này" : "Không có lịch đăng ký rảnh ngày này"}
                                >
                                  <span className="avail-dash">{isStaff ? "+ Thêm" : "—"}</span>
                                </div>
                              ) : (
                                <div className="avail-slots-container">
                                  {daySlots.map((slot) => {
                                    const timeStr = `${fmtTime(slot.startTime)} – ${fmtTime(slot.endTime)}`;
                                    const hours = calcSlotHours(slot.startTime, slot.endTime);
                                    const isAssigned = !!assignedShift;

                                    return (
                                      <div
                                        key={slot.id || `${slot.dayOfWeek}-${slot.startTime}`}
                                        className={`avail-slot-card ${isAssigned ? 'assigned' : 'available'}`}
                                        onClick={() => {
                                          if (isAssigned) {
                                            handleOpenShiftDetailModal(emp, slot, d, assignedShift);
                                          } else if (isStaff) {
                                            handleDeleteAvailability(slot.id);
                                          } else {
                                            handleOpenAssignModal(emp, slot, d);
                                          }
                                        }}
                                        title={
                                          isAssigned
                                            ? `Đã có ca: ${fmtTime(assignedShift.startTime)} - ${fmtTime(assignedShift.endTime)} (Đã bận / Kín lịch). Bấm xem chi tiết ca.`
                                            : isStaff
                                              ? `Khung giờ rảnh (${timeStr}). Bấm để xoá.`
                                              : `Còn rảnh (${timeStr}). Bấm để xếp ca làm việc cho ${emp.fullName}.`
                                        }
                                      >
                                        <div className="avail-slot-card-top">
                                          {isAssigned ? (
                                            <Lock size={12} className="avail-slot-lock" />
                                          ) : (
                                            <Clock size={12} className="avail-slot-clock" />
                                          )}
                                          <span className="avail-slot-time-text">{timeStr}</span>
                                          <span className="avail-slot-duration">({hours}h)</span>
                                        </div>

                                        {isAssigned ? (
                                          <div className="avail-slot-assigned-badge">
                                            <span className="avail-lock-text">Đã có ca: {fmtTime(assignedShift.startTime)} - {fmtTime(assignedShift.endTime)}</span>
                                            <span className="avail-busy-pill">Kín lịch</span>
                                          </div>
                                        ) : (
                                          <div className="avail-slot-free-badge">
                                            <span className="avail-free-dot" />
                                            <span>Còn rảnh • Gán ca</span>
                                            <Plus size={11} className="avail-plus-icon" />
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* Table Footer: Summary */}
              {!loading && filteredEmployees.length > 0 && (
                <tfoot>
                  <tr className="avail-tfoot-row">
                    <td className="avail-tfoot-label">
                      <div className="avail-tfoot-title">Tổng hợp trạng thái ngày:</div>
                      <div className="avail-tfoot-sub">Còn rảnh • Đã có ca</div>
                    </td>
                    {weekDatesFull.map((d) => {
                      const dow = d.getDay();
                      const dIso = toISODate(d);
                      const staffWithSlots = filteredEmployees.filter((emp) => {
                        const slots = availabilityMap[emp.id] || [];
                        return slots.some((s) => s.dayOfWeek === dow);
                      });
                      const freeStaff = staffWithSlots.filter((emp) => !getEmployeeShiftOnDate(emp.id, dIso));
                      const assignedStaff = staffWithSlots.filter((emp) => !!getEmployeeShiftOnDate(emp.id, dIso));

                      return (
                        <td key={dIso} className="avail-tfoot-cell">
                          {staffWithSlots.length === 0 ? (
                            <span className="avail-tfoot-pill empty">—</span>
                          ) : freeStaff.length > 0 ? (
                            <div className="avail-tfoot-pill-group">
                              <span className="avail-tfoot-pill free">{freeStaff.length} còn rảnh</span>
                              {assignedStaff.length > 0 && (
                                <span className="avail-tfoot-pill assigned">{assignedStaff.length} có ca</span>
                              )}
                            </div>
                          ) : (
                            <span className="avail-tfoot-pill full" title="Tất cả nhân sự đăng ký ngày này đã được phân ca">
                              0 rảnh • {assignedStaff.length} có ca
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* ═══ TAB 2: TIME-SLOT HEATMAP VIEW (Theo khung giờ trong ngày) ═══ */}
      {viewTab === 'TIMESLOT' && (
        <div className="avail-timeslot-container">
          {/* Day selection tabs */}
          <div className="avail-timeslot-day-nav">
            <span className="avail-timeslot-nav-label">Chọn ngày trong tuần để xem chi tiết:</span>
            <div className="avail-timeslot-day-buttons">
              {weekDatesFull.map((d) => {
                const dow = d.getDay();
                const isActive = activeTimeslotDow === dow;
                const dIso = toISODate(d);
                const count = employees.filter((e) => (availabilityMap[e.id] || []).some((s) => s.dayOfWeek === dow)).length;

                return (
                  <button
                    key={dIso}
                    type="button"
                    className={`avail-timeslot-day-btn ${isActive ? 'active' : ''}`}
                    onClick={() => setActiveTimeslotDow(dow)}
                  >
                    <span className="avail-ts-dow">{DOW_VI[dow]}</span>
                    <span className="avail-ts-date">{fmtDM(d)}</span>
                    <span className="avail-ts-badge">{count} NV</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time buckets for selected day */}
          {(() => {
            const selectedDateObj = weekDatesFull.find((d) => d.getDay() === activeTimeslotDow) || weekDatesFull[0];
            const dateIso = toISODate(selectedDateObj);

            // Group staff into Morning (start <= 11:00), Afternoon (start >= 12:00), Full day
            const availableStaffForDay = [];
            filteredEmployees.forEach((emp) => {
              const slots = (availabilityMap[emp.id] || []).filter((s) => s.dayOfWeek === activeTimeslotDow);
              if (slots.length > 0) {
                const assigned = getEmployeeShiftOnDate(emp.id, dateIso);
                availableStaffForDay.push({ emp, slots, assigned });
              }
            });

            const morningStaff = availableStaffForDay.filter((item) =>
              item.slots.some((s) => {
                const hour = typeof s.startTime === 'string' ? Number(s.startTime.slice(0, 2)) : s.startTime.hour;
                return hour < 12;
              })
            );

            const afternoonStaff = availableStaffForDay.filter((item) =>
              item.slots.some((s) => {
                const hour = typeof s.startTime === 'string' ? Number(s.startTime.slice(0, 2)) : s.startTime.hour;
                return hour >= 12;
              })
            );

            const morningFreeCount = morningStaff.filter((i) => !i.assigned).length;
            const morningAssignedCount = morningStaff.filter((i) => !!i.assigned).length;
            const afternoonFreeCount = afternoonStaff.filter((i) => !i.assigned).length;
            const afternoonAssignedCount = afternoonStaff.filter((i) => !!i.assigned).length;

            return (
              <div className="avail-timeslot-grid">
                {/* Ca Sáng */}
                <div className="avail-timeslot-column">
                  <div className="avail-timeslot-col-header morning">
                    <div className="avail-col-header-left">
                      <span className="avail-col-icon"></span>
                      <div>
                        <h3 className="avail-col-title">Ca Sáng (06:00 – 14:00)</h3>
                        <span className="avail-col-sub">
                          {morningStaff.length} đăng ký • {morningFreeCount} còn rảnh • {morningAssignedCount} có ca
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="avail-timeslot-cards-list">
                    {morningStaff.length === 0 ? (
                      <div className="avail-ts-empty">Chưa có nhân viên nào đăng ký ca sáng ngày này.</div>
                    ) : (
                      morningStaff.map(({ emp, slots, assigned }) => {
                        const mSlot = slots.find((s) => {
                          const h = typeof s.startTime === 'string' ? Number(s.startTime.slice(0, 2)) : s.startTime.hour;
                          return h < 12;
                        }) || slots[0];

                        return (
                          <div key={emp.id} className={`avail-ts-card ${assigned ? 'occupied' : 'free'}`}>
                            <div className="avail-ts-card-left">
                              <Avatar3DWeb avatarId={emp.avatarId || getAvatarForEmployee(emp.fullName)} name={emp.fullName} size={32} className="avail-ts-avatar" />
                              <div>
                                <div className="avail-ts-emp-name">{emp.fullName}</div>
                                <div className={`avail-ts-emp-pos ${getRoleBadgeClass(emp.position)}`}>{emp.position || 'Nhân viên'}</div>
                                <div className="avail-ts-time-pill">
                                  <Clock size={11} />
                                  <span>{fmtTime(mSlot.startTime)} – {fmtTime(mSlot.endTime)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="avail-ts-card-right">
                              {assigned ? (
                                <button
                                  type="button"
                                  className="avail-ts-status-tag assigned"
                                  onClick={() => handleOpenShiftDetailModal(emp, mSlot, selectedDateObj, assigned)}
                                  title="Đã kín lịch. Bấm xem chi tiết ca"
                                >
                                  Đã có ca ({fmtTime(assigned.startTime)} - {fmtTime(assigned.endTime)})
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="avail-ts-assign-btn"
                                  onClick={() => handleOpenAssignModal(emp, mSlot, selectedDateObj)}
                                  title="Bấm để xếp ca làm việc"
                                >
                                  + Phân ca ngay
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Ca Chiều / Tối */}
                <div className="avail-timeslot-column">
                  <div className="avail-timeslot-col-header afternoon">
                    <div className="avail-col-header-left">
                      <span className="avail-col-icon"></span>
                      <div>
                        <h3 className="avail-col-title">Ca Chiều & Tối (14:00 – 22:00)</h3>
                        <span className="avail-col-sub">
                          {afternoonStaff.length} đăng ký • {afternoonFreeCount} còn rảnh • {afternoonAssignedCount} có ca
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="avail-timeslot-cards-list">
                    {afternoonStaff.length === 0 ? (
                      <div className="avail-ts-empty">Chưa có nhân viên nào đăng ký ca chiều/tối ngày này.</div>
                    ) : (
                      afternoonStaff.map(({ emp, slots, assigned }) => {
                        const aSlot = slots.find((s) => {
                          const h = typeof s.startTime === 'string' ? Number(s.startTime.slice(0, 2)) : s.startTime.hour;
                          return h >= 12;
                        }) || slots[0];

                        return (
                          <div key={emp.id} className={`avail-ts-card ${assigned ? 'occupied' : 'free'}`}>
                            <div className="avail-ts-card-left">
                              <Avatar3DWeb avatarId={emp.avatarId || getAvatarForEmployee(emp.fullName)} name={emp.fullName} size={32} className="avail-ts-avatar" />
                              <div>
                                <div className="avail-ts-emp-name">{emp.fullName}</div>
                                <div className={`avail-ts-emp-pos ${getRoleBadgeClass(emp.position)}`}>{emp.position || 'Nhân viên'}</div>
                                <div className="avail-ts-time-pill">
                                  <Clock size={11} />
                                  <span>{fmtTime(aSlot.startTime)} – {fmtTime(aSlot.endTime)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="avail-ts-card-right">
                              {assigned ? (
                                <button
                                  type="button"
                                  className="avail-ts-status-tag assigned"
                                  onClick={() => handleOpenShiftDetailModal(emp, aSlot, selectedDateObj, assigned)}
                                  title="Đã kín lịch. Bấm xem chi tiết ca"
                                >
                                  Đã có ca ({fmtTime(assigned.startTime)} - {fmtTime(assigned.endTime)})
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="avail-ts-assign-btn"
                                  onClick={() => handleOpenAssignModal(emp, aSlot, selectedDateObj)}
                                  title="Bấm để xếp ca làm việc"
                                >
                                  + Phân ca ngay
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ═══ MODAL: Quick Shift Assignment (For Free Slots) ═══ */}
      {quickAssignModal && (
        <div className="avail-modal-overlay" onClick={() => setQuickAssignModal(null)}>
          <div className="avail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="avail-modal-header">
              <div className="avail-modal-header-info">
                <Avatar3DWeb
                  avatarId={quickAssignModal.emp.avatarId || getAvatarForEmployee(quickAssignModal.emp.fullName)}
                  name={quickAssignModal.emp.fullName}
                  size={44}
                  className="avail-modal-avatar"
                />
                <div>
                  <h3 className="avail-modal-title">Phân Công Ca Theo Lịch Đăng Ký Rảnh</h3>
                  <p className="avail-modal-sub">
                    Gán ca làm việc cho <strong>{quickAssignModal.emp.fullName}</strong> vào{' '}
                    <strong>{DOW_VI[quickAssignModal.date.getDay()]} ({fmtDM(quickAssignModal.date)})</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="avail-modal-close"
                onClick={() => setQuickAssignModal(null)}
              >&times;</button>
            </div>

            <form onSubmit={handleSubmitQuickAssign} className="avail-modal-form">
              <div className="avail-modal-summary-box">
                <div className="avail-summary-row">
                  <span className="avail-summary-label">Khung giờ rảnh:</span>
                  <span className="avail-summary-val highlight">
                    {fmtTime(quickAssignModal.slot.startTime)} – {fmtTime(quickAssignModal.slot.endTime)}
                  </span>
                </div>
                <div className="avail-summary-row">
                  <span className="avail-summary-label">Vị trí hiện tại:</span>
                  <span className="avail-summary-val">{quickAssignModal.emp.position || 'Nhân viên'}</span>
                </div>
              </div>

              <div className="avail-form-group">
                <label className="avail-form-label">Vị trí / Kỹ năng đảm nhiệm trong ca:</label>
                <select
                  className="avail-form-select"
                  value={assignForm.skillId}
                  onChange={(e) => setAssignForm({ ...assignForm, skillId: e.target.value })}
                  required
                >
                  <option value="">-- Chọn vị trí --</option>
                  {skills.map((sk) => (
                    <option key={sk.id} value={sk.id}>
                      {sk.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="avail-form-group">
                <label className="avail-form-label">Ghi chú ca làm việc:</label>
                <textarea
                  className="avail-form-textarea"
                  rows={2}
                  value={assignForm.note}
                  onChange={(e) => setAssignForm({ ...assignForm, note: e.target.value })}
                  placeholder="Ghi chú phân công..."
                />
              </div>

              <div className="avail-modal-actions">
                <button
                  type="button"
                  className="avail-modal-btn cancel"
                  onClick={() => setQuickAssignModal(null)}
                >
                  Huỷ
                </button>
                <button type="submit" className="avail-modal-btn confirm">
                  <CheckCircle2 size={16} />
                  <span>Xác Nhận Phân Ca</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ MODAL: Occupied Shift Details (For Busy Slots) ═══ */}
      {shiftDetailModal && (
        <div className="avail-modal-overlay" onClick={() => setShiftDetailModal(null)}>
          <div className="avail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="avail-modal-header">
              <div className="avail-modal-header-info">
                <Avatar3DWeb
                  avatarId={shiftDetailModal.emp.avatarId || getAvatarForEmployee(shiftDetailModal.emp.fullName)}
                  name={shiftDetailModal.emp.fullName}
                  size={44}
                  className="avail-modal-avatar"
                />
                <div>
                  <h3 className="avail-modal-title">Chi Tiết Ca Làm Việc Đã Phân Công</h3>
                  <p className="avail-modal-sub">
                    <strong>{shiftDetailModal.emp.fullName}</strong> • {shiftDetailModal.emp.position || 'Nhân viên'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="avail-modal-close"
                onClick={() => setShiftDetailModal(null)}
              >&times;</button>
            </div>

            <div className="avail-modal-form">
              <div className="avail-occupied-banner">
                <Lock size={16} className="avail-occupied-banner-icon" />
                <div>
                  <div className="avail-occupied-banner-title">Nhân viên đã kín lịch (Đang làm ca này)</div>
                  <div className="avail-occupied-banner-desc">
                    Khung giờ đăng ký rảnh đã được xếp ca làm việc chính thức, hiện tại nhân viên không còn rảnh trong giờ này.
                  </div>
                </div>
              </div>

              <div className="avail-modal-summary-box">
                <div className="avail-summary-row">
                  <span className="avail-summary-label">Ngày làm việc:</span>
                  <span className="avail-summary-val">
                    {DOW_VI[shiftDetailModal.date.getDay()]}, {fmtDM(shiftDetailModal.date)}
                  </span>
                </div>
                <div className="avail-summary-row">
                  <span className="avail-summary-label">Ca làm việc thực tế:</span>
                  <span className="avail-summary-val highlight">
                    {fmtTime(shiftDetailModal.shift.startTime)} – {fmtTime(shiftDetailModal.shift.endTime)}
                  </span>
                </div>
                <div className="avail-summary-row">
                  <span className="avail-summary-label">Giờ rảnh đã đăng ký:</span>
                  <span className="avail-summary-val">
                    {fmtTime(shiftDetailModal.slot.startTime)} – {fmtTime(shiftDetailModal.slot.endTime)}
                  </span>
                </div>
                <div className="avail-summary-row">
                  <span className="avail-summary-label">Vị trí đảm nhiệm:</span>
                  <span className="avail-summary-val">
                    {shiftDetailModal.shift.skillName || shiftDetailModal.emp.position || 'Nhân viên'}
                  </span>
                </div>
                <div className="avail-summary-row">
                  <span className="avail-summary-label">Trạng thái:</span>
                  <span className="avail-summary-val" style={{ color: '#16a34a', fontWeight: 700 }}>
                    ĐÃ BỐ TRÍ CA (PUBLISHED)
                  </span>
                </div>
                {shiftDetailModal.shift.note && (
                  <div className="avail-summary-row">
                    <span className="avail-summary-label">Ghi chú:</span>
                    <span className="avail-summary-val">{shiftDetailModal.shift.note}</span>
                  </div>
                )}
              </div>

              <div className="avail-modal-actions">
                <button
                  type="button"
                  className="avail-modal-btn cancel"
                  onClick={() => setShiftDetailModal(null)}
                >
                  Đóng
                </button>
                <button
                  type="button"
                  className="avail-modal-btn schedule-link"
                  onClick={() => {
                    setShiftDetailModal(null);
                    navigate('/schedule');
                  }}
                >
                  <ExternalLink size={15} />
                  <span>Xem Trên Màn Hình Xếp Ca</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL: Staff Create Availability ═══ */}
      {showCreateModal && (
        <div className="avail-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="avail-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="avail-modal-header">
              <h3 className="avail-modal-title">Đăng Ký Khung Giờ Rảnh</h3>
              <button
                type="button"
                className="avail-modal-close"
                onClick={() => setShowCreateModal(false)}
              >&times;</button>
            </div>
            <form onSubmit={handleCreateAvailability} className="avail-modal-form">
              <div className="avail-form-group">
                <label className="avail-form-label">Thứ trong tuần:</label>
                <select
                  className="avail-form-select"
                  value={createForm.dayOfWeek}
                  onChange={(e) => setCreateForm({ ...createForm, dayOfWeek: Number(e.target.value) })}
                >
                  <option value={1}>Thứ Hai</option>
                  <option value={2}>Thứ Ba</option>
                  <option value={3}>Thứ Tư</option>
                  <option value={4}>Thứ Năm</option>
                  <option value={5}>Thứ Sáu</option>
                  <option value={6}>Thứ Bảy</option>
                  <option value={0}>Chủ Nhật</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div className="avail-form-group" style={{ flex: 1 }}>
                  <label className="avail-form-label">Giờ bắt đầu:</label>
                  <input
                    type="time"
                    className="avail-form-select"
                    value={createForm.startTime}
                    onChange={(e) => setCreateForm({ ...createForm, startTime: e.target.value })}
                    required
                  />
                </div>
                <div className="avail-form-group" style={{ flex: 1 }}>
                  <label className="avail-form-label">Giờ kết thúc:</label>
                  <input
                    type="time"
                    className="avail-form-select"
                    value={createForm.endTime}
                    onChange={(e) => setCreateForm({ ...createForm, endTime: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="avail-modal-actions">
                <button
                  type="button"
                  className="avail-modal-btn cancel"
                  onClick={() => setShowCreateModal(false)}
                >
                  Huỷ
                </button>
                <button type="submit" className="avail-modal-btn confirm">
                  <CheckCircle2 size={16} />
                  <span>Lưu Lịch Rảnh</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ TOAST NOTIFICATION ═══ */}
      {toast && (
        <div className="avail-toast">
          
          <div className="avail-toast-body">
            <div className="avail-toast-title">{toast.title}</div>
            <div className="avail-toast-msg">{toast.message}</div>
          </div>
        </div>
      )}
    </div>
  );
}
