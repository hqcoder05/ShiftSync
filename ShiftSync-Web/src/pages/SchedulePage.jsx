import { useState, useEffect, useRef } from 'react';
import { getAllStores } from '../services/storeService';
import { getStaffByStore, assignStaffToStore } from '../services/employmentService';
import { getSkillsByStore } from '../services/skillService';
import { getEmployees, updateEmployee } from '../services/employeeService';
import { getShiftsForStore, createShift, updateShift, deleteShift } from '../services/shiftService';
import { getStaffAvailability } from '../services/availabilityService';
import iconCard from '../assets/icons/icon-credit-card.png';
import iconAi from '../assets/icons/icon-ai.png';
import iconUser from '../assets/icons/icon-user.png';
import iconLocation from '../assets/icons/location_on.png';
import avatarPaul from '../assets/avatars/avatar-paul-lee.png';
import avatarThia from '../assets/avatars/avatar-thia-ago.png';
import avatarMew from '../assets/avatars/avatar-mew-ama.png';
import avatarDilan from '../assets/avatars/avatar-dilan-jon.png';
import './SchedulePage.css';

/* ── Helpers ────────────────────────────────────────────── */
// Colour palette matching the reference screenshots
const SHIFT_COLORS = [
  '#5BC8B8', // teal/green
  '#D97FB2', // pink
  '#D98080', // salmon/red
  '#C8C84A', // yellow-green
  '#7AA8D9', // blue
];

const colorFor = (name = '') =>
  SHIFT_COLORS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % SHIFT_COLORS.length];

// Avatar map — khớp với EmployeesPage
const AVATAR_MAP = {
  'Paul. Lee': avatarPaul,
  'Thia. Ago': avatarThia,
  'Mew. Ama': avatarMew,
  'Dilan. Jon': avatarDilan,
};
const DEFAULT_AVATAR = avatarPaul; // fallback khi không khớp tên

const getAvatar = (name = '') => AVATAR_MAP[name] || DEFAULT_AVATAR;

// DOW labels in Vietnamese
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

const fmtFull = (d) =>
  `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;

const toISODate = (d) => d.toISOString().slice(0, 10);

const fmtTimeAMPM = (t) => {
  const str =
    typeof t === 'string'
      ? t
      : `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`;
  const [h, m] = str.split(':').map(Number);
  const period = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
};

const MONTH_NAMES_VI = [
  'Tháng Một', 'Tháng Hai', 'Tháng Ba', 'Tháng Tư', 'Tháng Năm', 'Tháng Sáu',
  'Tháng Bảy', 'Tháng Tám', 'Tháng Chín', 'Tháng Mười', 'Tháng Mười Một', 'Tháng Mười Hai'
];

const fmtDateRangeText = (d) => {
  return `${d.getDate()} Tháng ${d.getMonth() + 1}, ${d.getFullYear()}`;
};

/* ── Component ──────────────────────────────────────────── */
export default function SchedulePage() {
  /* -- data state -- */
  const [stores, setStores] = useState([]);
  const [storeId, setStoreId] = useState('');
  const [employees, setEmployees] = useState([]);
  const [skills, setSkills] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [allShifts, setAllShifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /* -- navigation state -- */
  const [viewMode, setViewMode] = useState('Tuần');
  const [weekOffset, setWeekOffset] = useState(0);
  const [dayOffset, setDayOffset] = useState(0);

  /* -- filter state -- */
  const [userFilter, setUserFilter] = useState('All');
  const [skillFilter, setSkillFilter] = useState('All');
  const [showUserList, setShowUserList] = useState(true);
  const [showSkillList, setShowSkillList] = useState(false);

  /* -- popover for shift chip -- */
  const [menuFor, setMenuFor] = useState(null); // { empId, dateIso, shift }

  /* -- edit mode for shift modal -- */
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [editingShift, setEditingShift] = useState(null); // shift being edited

  /* -- "Tạo lịch" modal -- */
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    staffId: '',
    shiftDate: '',
    startTime: '06:00',
    endTime: '14:00',
    color: SHIFT_COLORS[0],
    location: '',
    branch: '',
    note: '',
    clockIn: true,
    clockOut: true,
    radius: 150,
  });

  /* -- "Add User" modal -- */
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [allEmployees, setAllEmployees] = useState([]);
  const [addUserForm, setAddUserForm] = useState({
    staffId: '',
    employmentType: 'PART_TIME',
    hourlyRate: '',
    joinedDate: '',
    skillId: '',
  });

  /* -- "Edit Employee" modal -- */
  const [showEditEmpModal, setShowEditEmpModal] = useState(false);
  const [editEmpForm, setEditEmpForm] = useState({
    id: '',
    fullName: '',
    email: '',
    phone: '',
    role: '',
    position: '',
  });

  /* -- "Xem ca làm việc" modal -- */
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingShift, setViewingShift] = useState(null);

  /* -- Cross-Store Dispatch Requests -- */
  const [crossStoreRequests, setCrossStoreRequests] = useState([]);
  const [showCrossStoreModal, setShowCrossStoreModal] = useState(false);

  /* -- In-app Toast Notification -- */
  const [toastNotification, setToastNotification] = useState(null);

  /* -- Custom Confirm Dialog -- */
  const [confirmDialog, setConfirmDialog] = useState(null);

  /* -- Staff registered availability modal -- */
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [selectedStaffForAvail, setSelectedStaffForAvail] = useState(null);
  const [staffAvailSlots, setStaffAvailSlots] = useState([]);
  const [loadingAvail, setLoadingAvail] = useState(false);

  const showToast = (title, desc) => {
    setToastNotification({ title, desc });
    setTimeout(() => {
      setToastNotification(null);
    }, 4500);
  };

  /* -- Datepicker Popover State -- */
  const [showCalendarPopover, setShowCalendarPopover] = useState(false);
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const dateNavWrapRef = useRef(null);
  const clickTimeoutRef = useRef(null);

  const menuRef = useRef(null);

  /* ── Computed dates ────────────────────────────── */
  const weekDatesFull = getWeekDates(new Date(Date.now() + weekOffset * 7 * 86400000));
  const today = new Date(Date.now() + dayOffset * 86400000);
  const displayedDates = viewMode === 'Ngày' ? [today] : weekDatesFull;

  /* ── Date Navigator & Calendar Popover Handlers ── */
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
      // Double click -> Xem ngày cụ thể
      handleSelectSpecificDay(date);
    } else {
      clickTimeoutRef.current = setTimeout(() => {
        clickTimeoutRef.current = null;
        // Single click -> Chọn cả tuần
        handleSelectWeek(date);
      }, 260);
    }
  };

  const getCalendarWeeks = (year, month) => {
    const firstDay = new Date(year, month, 1);
    const dow = firstDay.getDay(); // 0 Sun, 1 Mon...
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

  /* ── Close popover on outside click ───────────── */
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuFor(null);
      if (dateNavWrapRef.current && !dateNavWrapRef.current.contains(e.target)) {
        setShowCalendarPopover(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ── Load stores ───────────────────────────────── */
  useEffect(() => {
    getAllStores()
      .then((res) => {
        const list = res.data.content || res.data;
        setStores(list);
        if (list.length) setStoreId(list[0].id);
      })
      .catch(() => setError('Không tải được danh sách chi nhánh'));
  }, []);

  /* ── Load skills ───────────────────────────────── */
  useEffect(() => {
    if (!storeId) return;
    getSkillsByStore(storeId)
      .then((res) => {
        const data = res.data;
        // API có thể trả về array trực tiếp hoặc {content: []}
        setSkills(Array.isArray(data) ? data : (data.content || []));
      })
      .catch(() => setSkills([]));
  }, [storeId]);

  /* ── Load staff + shifts ───────────────────────── */
  const loadData = () => {
    if (!storeId) return;
    setLoading(true);
    setError('');
    Promise.all([getStaffByStore(storeId), getShiftsForStore(storeId)])
      .then(([staffRes, shiftsRes]) => {
        const rawStaff = staffRes.data.content || staffRes.data || [];
        const savedPositions = JSON.parse(localStorage.getItem(`emp_positions_${storeId}`) || '{}');
        const staff = rawStaff.map((emp) => {
          const id = emp.staffId || emp.id;
          const pos = savedPositions[id] || emp.position || emp.jobTitle || emp.skillName || emp.skill?.name || '';
          return {
            ...emp,
            position: pos,
            jobTitle: pos,
            skillName: pos,
          };
        });
        setEmployees(staff);

        const rangeIso = displayedDates.map(toISODate);
        const allShifts = shiftsRes.data || [];
        const shiftsInRange = allShifts.filter((s) => rangeIso.includes(s.shiftDate));

        const savedMeta = JSON.parse(localStorage.getItem(`shifts_meta_${storeId}`) || '{}');

        // Hiển thị shift theo staffId được assign (field staffId trong ShiftDTO hoặc meta)
        const map = {};
        shiftsInRange.forEach((shift) => {
          const meta = savedMeta[shift.id] || {};
          const mergedShift = {
            ...shift,
            ...meta,
            color: meta.color || shift.color,
            note: meta.note !== undefined ? meta.note : shift.note,
            skillId: meta.skillId || shift.skillId,
            location: meta.location || shift.location || shift.skillId,
            staffId: shift.staffId || meta.staffId,
          };
          const targetEmpId = mergedShift.staffId || shift.staffId || shift.assignedStaffId || shift.employeeId;
          if (targetEmpId) {
            if (!map[targetEmpId]) map[targetEmpId] = {};
            if (!map[targetEmpId][shift.shiftDate]) map[targetEmpId][shift.shiftDate] = [];
            if (!map[targetEmpId][shift.shiftDate].some((s) => s.id === shift.id)) {
              map[targetEmpId][shift.shiftDate].push(mergedShift);
            }
          }
        });
        setAssignments(map);
        setAllShifts(shiftsInRange);
      })
      .catch(() => setError('Không tải được lịch làm việc'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
    const allReqs = JSON.parse(localStorage.getItem('cross_store_requests') || '[]');
    setCrossStoreRequests(allReqs);
  }, [storeId, weekOffset, dayOffset, viewMode]); // eslint-disable-line

  const pendingCrossStoreRequests = crossStoreRequests.filter(
    (req) => req.targetStoreId === storeId && req.status === 'PENDING_APPROVAL'
  );

  /* ── Derived lists ─────────────────────────────── */
  const employeesWithShifts = employees.filter((e) => {
    const empId = e.staffId || e.id;
    return assignments[empId] && Object.keys(assignments[empId]).length > 0;
  });

  const visibleEmployees = employees.filter((e) => {
    const name = e.staffFullName || e.fullName || '';
    const matchUser = userFilter === 'All' || name === userFilter;
    if (!matchUser) return false;

    if (skillFilter === 'All') return true;

    const selectedSkill = skills.find((sk) => sk.id === skillFilter || sk.name === skillFilter);
    const selectedSkillName = selectedSkill ? selectedSkill.name.toLowerCase().trim() : skillFilter.toLowerCase().trim();
    const selectedSkillId = selectedSkill ? selectedSkill.id : skillFilter;

    // Check employee's assigned job position
    const empPos = (e.position || e.jobTitle || e.skillName || e.skill?.name || '').toLowerCase().trim();
    const empSkillId = e.skillId || e.skill?.id || e.jobPositionId;
    const empHasSkill =
      (empSkillId && empSkillId === selectedSkillId) ||
      (empPos && (empPos === selectedSkillName || empPos.includes(selectedSkillName) || (selectedSkillName && selectedSkillName.includes(empPos))));

    // Check employee's shifts
    const empId = e.staffId || e.id;
    const empShifts = assignments[empId] ? Object.values(assignments[empId]).flat() : [];
    const hasShiftWithSkill = empShifts.some((s) => {
      const sSkillId = s.skillId || s.location;
      const sLocationSkill = skills.find((sk) => sk.id === sSkillId || sk.name === sSkillId);
      const sName = (sLocationSkill ? sLocationSkill.name : (s.skillName || s.location || '')).toLowerCase().trim();
      return (
        sSkillId === selectedSkillId ||
        sSkillId === skillFilter ||
        (sName && (sName === selectedSkillName || sName.includes(selectedSkillName) || (selectedSkillName && selectedSkillName.includes(sName))))
      );
    });

    return empHasSkill || hasShiftWithSkill;
  });

  const alreadyInStoreIds = new Set(employees.map((e) => e.staffId || e.id));
  const availableToAdd = allEmployees.filter((e) => !alreadyInStoreIds.has(e.id));

  const getSkillColor = (skObj) => {
    if (!skObj) return null;
    if (skObj.description && skObj.description.startsWith('#')) return skObj.description;
    return colorFor(skObj.name);
  };

  const getEmpDefaultSkillAndColor = (targetEmpId) => {
    if (!targetEmpId) return { location: '', color: SHIFT_COLORS[0] };
    const emp = employees.find((e) => (e.staffId || e.id) === targetEmpId);
    if (!emp) return { location: '', color: SHIFT_COLORS[0] };

    const pos = emp.position || emp.jobTitle || emp.skillName || emp.skill?.name || '';
    const matchedSkill = skills.find(
      (sk) => (emp.skillId && sk.id === emp.skillId) || (pos && sk.name.toLowerCase() === pos.toLowerCase())
    );

    const locationVal = matchedSkill ? matchedSkill.id : '';
    const colorVal = matchedSkill ? getSkillColor(matchedSkill) : (pos ? colorFor(pos) : SHIFT_COLORS[0]);

    return {
      location: locationVal || '',
      color: colorVal || SHIFT_COLORS[0],
    };
  };

  /* ── Modal openers ─────────────────────────────── */
  const openRegisterModal = (empId, dateIso) => {
    setModalMode('create');
    setEditingShift(null);

    const defaults = getEmpDefaultSkillAndColor(empId);
    const currentStore = stores.find((store) => store.id === storeId);
    const defaultStartTime = currentStore?.openTime?.slice(0, 5) || '06:00';

    setRegisterForm({
      staffId: empId || '',
      shiftDate: dateIso || '',
      startTime: defaultStartTime,
      endTime: '14:00',
      color: defaults.color || SHIFT_COLORS[0],
      location: defaults.location || '',
      branch: storeId,
      note: '',
      clockIn: true,
      clockOut: true,
      radius: 150,
    });
    setShowRegisterModal(true);
    setMenuFor(null);
  };

  const openEditModal = (shift, empId) => {
    setModalMode('edit');
    setEditingShift(shift);
    const fmtT = (t) => {
      if (!t) return '06:00';
      if (typeof t === 'string') return t.slice(0, 5);
      return `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`;
    };
    setRegisterForm({
      staffId: empId || shift.staffId || '',
      shiftDate: shift.shiftDate || '',
      startTime: fmtT(shift.startTime),
      endTime: fmtT(shift.endTime),
      color: shift.color || SHIFT_COLORS[0],
      location: shift.location || '',
      branch: shift.storeId || storeId,
      note: shift.note || '',
      clockIn: shift.clockIn ?? true,
      clockOut: shift.clockOut ?? true,
      radius: shift.radius || 150,
    });
    setShowRegisterModal(true);
    setMenuFor(null);
  };

  const openViewShiftModal = (shift, empId) => {
    const emp = employees.find((e) => (e.staffId || e.id) === (empId || shift.staffId));
    const skObj = skills.find((s) => s.id === (shift.location || shift.skillId) || s.name === (shift.location || shift.skillId));
    const currentStoreObj = stores.find((s) => s.id === (shift.branch || shift.storeId || storeId));

    setViewingShift({
      ...shift,
      empId: empId || shift.staffId,
      staffName: emp?.staffFullName || emp?.fullName || 'Nhân viên',
      staffRole: emp?.position || emp?.jobTitle || emp?.skillName || 'Nhân viên',
      positionName: skObj?.name || shift.location || emp?.position || 'Nhân viên',
      positionColor: shift.color || (skObj ? getSkillColor(skObj) : colorFor(empId)),
      storeName: currentStoreObj?.name || 'Chi nhánh hiện tại',
    });
    setShowViewModal(true);
    setMenuFor(null);
  };

  const openAddUserModal = () => {
    setAddUserForm({
      staffId: '',
      employmentType: 'PART_TIME',
      hourlyRate: '',
      joinedDate: '',
      skillId: '',
    });
    setShowAddUserModal(true);
    if (allEmployees.length === 0) {
      getEmployees(0, 100)
        .then((res) => setAllEmployees(res.data.content || res.data))
        .catch(() => setAllEmployees([]));
    }
  };

  const openEditEmpModal = (emp) => {
    const empId = emp.staffId || emp.id;
    const savedPositions = JSON.parse(localStorage.getItem(`emp_positions_${storeId}`) || '{}');
    const pos = savedPositions[empId] || emp.position || emp.jobTitle || emp.skillName || emp.skill?.name || '';
    setEditEmpForm({
      id: empId,
      fullName: emp.staffFullName || emp.fullName || '',
      email: emp.email || '',
      phone: emp.phone || '',
      role: emp.role || 'STAFF',
      position: pos,
    });
    setShowEditEmpModal(true);
  };

  const handleOpenStaffAvailability = async (emp) => {
    if (!emp) return;
    const empId = emp.staffId || emp.id;
    const name = emp.staffFullName || emp.fullName || '';
    const pos = emp.position || emp.jobTitle || emp.skillName || emp.skill?.name || 'Nhân viên';
    setSelectedStaffForAvail({ ...emp, id: empId, name, position: pos });
    setShowAvailabilityModal(true);
    setLoadingAvail(true);
    try {
      const res = await getStaffAvailability(empId);
      setStaffAvailSlots(res.data || []);
    } catch (err) {
      console.log('Lỗi tải lịch đăng ký của nhân viên:', err.message);
      setStaffAvailSlots([]);
    } finally {
      setLoadingAvail(false);
    }
  };

  const handleAssignAvailSlot = async (slot) => {
    if (!selectedStaffForAvail) return;
    const empId = selectedStaffForAvail.id;
    const empName = selectedStaffForAvail.name;

    // Tìm ngày tương ứng với slot.dayOfWeek trong tuần đang xem
    // slot.dayOfWeek: 0 = CN, 1 = T2, 2 = T3, 3 = T4, 4 = T5, 5 = T6, 6 = T7
    const targetDateObj = weekDatesFull.find((d) => d.getDay() === slot.dayOfWeek) || weekDatesFull[0];
    const targetDateIso = toISODate(targetDateObj);

    const defaults = getEmpDefaultSkillAndColor(empId);
    const fmtT = (t) => {
      if (!t) return '06:00';
      if (typeof t === 'string') return t.slice(0, 5);
      return `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`;
    };

    const payload = {
      staffId: empId,
      shiftDate: targetDateIso,
      startTime: fmtT(slot.startTime),
      endTime: fmtT(slot.endTime),
      color: defaults.color || SHIFT_COLORS[0],
      skillId: defaults.location || null,
      note: `Phân công từ ca đăng ký rảnh (${DOW_VI[slot.dayOfWeek]})`,
    };

    try {
      await createShift(storeId, payload);
      showToast(
        'Phân công thành công! 🎉',
        `Đã gán ca ${DOW_VI[slot.dayOfWeek]} (${fmtT(slot.startTime)} - ${fmtT(slot.endTime)}) cho ${empName}. Thông báo đã được gửi đến nhân viên!`
      );
      loadData();
    } catch (err) {
      showToast('Lỗi phân công', err.response?.data?.message || 'Không thể phân công ca này');
    }
  };

  /* ── Handlers ──────────────────────────────────── */
  const handleSaveEmployee = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await updateEmployee(editEmpForm.id, {
        fullName: editEmpForm.fullName,
        email: editEmpForm.email,
        phone: editEmpForm.phone,
      });

      // Lưu position vào localStorage
      const savedPositions = JSON.parse(localStorage.getItem(`emp_positions_${storeId}`) || '{}');
      savedPositions[editEmpForm.id] = editEmpForm.position;
      localStorage.setItem(`emp_positions_${storeId}`, JSON.stringify(savedPositions));

      // Cập nhật vị trí và thông tin nhân viên trong state hiện tại
      setEmployees((prev) =>
        prev.map((emp) => {
          const id = emp.staffId || emp.id;
          if (id === editEmpForm.id) {
            return {
              ...emp,
              staffFullName: editEmpForm.fullName,
              fullName: editEmpForm.fullName,
              email: editEmpForm.email,
              phone: editEmpForm.phone,
              position: editEmpForm.position,
              jobTitle: editEmpForm.position,
            };
          }
          return emp;
        })
      );
      setShowEditEmpModal(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Cập nhật thông tin nhân viên thất bại');
    }
  };

  const handleCreateShift = async (e) => {
    e.preventDefault();
    setError('');

    const currentStore = stores.find((store) => store.id === storeId);
    const openTime = currentStore?.openTime?.slice(0, 5);
    const closeTime = currentStore?.closeTime?.slice(0, 5);
    if (openTime && registerForm.startTime < openTime) {
      setError(`Giờ bắt đầu phải từ ${openTime} trở đi (giờ mở cửa chi nhánh).`);
      return;
    }
    if (closeTime && registerForm.endTime > closeTime) {
      setError(`Giờ kết thúc phải trước hoặc bằng ${closeTime} (giờ đóng cửa chi nhánh).`);
      return;
    }
    if (registerForm.startTime >= registerForm.endTime) {
      setError('Giờ kết thúc phải sau giờ bắt đầu.');
      return;
    }

    try {
      // Nếu chọn chi nhánh làm việc khác với chi nhánh hiện tại -> Tạo yêu cầu điều phối liên chi nhánh
      if (registerForm.branch && registerForm.branch !== storeId) {
        const targetStore = stores.find((s) => s.id === registerForm.branch);
        const currentStore = stores.find((s) => s.id === storeId);
        const emp = employees.find((e) => (e.staffId || e.id) === registerForm.staffId);
        const skObj = skills.find((s) => s.id === registerForm.location);

        const newRequest = {
          id: 'csr_' + Date.now(),
          sourceStoreId: storeId,
          sourceStoreName: currentStore?.name || 'Chi nhánh hiện tại',
          targetStoreId: registerForm.branch,
          targetStoreName: targetStore?.name || 'Chi nhánh khác',
          staffId: registerForm.staffId,
          staffName: emp?.staffFullName || emp?.fullName || 'Nhân viên',
          position: skObj?.name || emp?.position || 'Nhân viên',
          skillId: registerForm.location,
          color: registerForm.color,
          shiftDate: registerForm.shiftDate,
          startTime: registerForm.startTime,
          endTime: registerForm.endTime,
          note: registerForm.note,
          clockIn: registerForm.clockIn,
          clockOut: registerForm.clockOut,
          radius: registerForm.radius,
          status: 'PENDING_APPROVAL',
          createdAt: new Date().toISOString(),
        };

        const allReqs = JSON.parse(localStorage.getItem('cross_store_requests') || '[]');
        allReqs.push(newRequest);
        localStorage.setItem('cross_store_requests', JSON.stringify(allReqs));
        setCrossStoreRequests(allReqs);

        showToast(
          'Đã gửi yêu cầu điều phối',
          `Lịch làm việc của nhân viên "${newRequest.staffName}" đã được gửi sang chi nhánh "${newRequest.targetStoreName}" để chờ duyệt.`
        );
        setShowRegisterModal(false);
        return;
      }

      const deadlineDate = new Date(registerForm.shiftDate + 'T00:00:00Z');
      deadlineDate.setUTCDate(deadlineDate.getUTCDate() - 1);
      deadlineDate.setUTCHours(23, 59, 59, 0);
      const registrationDeadline = deadlineDate.toISOString().replace('.000Z', 'Z');

      const res = await createShift(storeId, {
        shiftDate: registerForm.shiftDate,
        startTime: registerForm.startTime + ':00',
        endTime: registerForm.endTime + ':00',
        availabilityDeadline: registrationDeadline,
        staffId: registerForm.staffId || null,
        skillId: registerForm.location || null,
        note: registerForm.note || null,
        color: registerForm.color || null,
      });

      const shiftId = res.data.id;

      // Lưu metadata vào localStorage
      const savedMeta = JSON.parse(localStorage.getItem(`shifts_meta_${storeId}`) || '{}');
      savedMeta[shiftId] = {
        color: registerForm.color,
        staffId: registerForm.staffId,
        skillId: registerForm.location,
        location: registerForm.location,
        note: registerForm.note,
        clockIn: registerForm.clockIn,
        clockOut: registerForm.clockOut,
        radius: registerForm.radius,
      };
      localStorage.setItem(`shifts_meta_${storeId}`, JSON.stringify(savedMeta));

      // Optimistic update
      const newShift = {
        ...res.data,
        ...savedMeta[shiftId],
      };
      const empId = registerForm.staffId;
      const dateIso = registerForm.shiftDate;
      if (empId && dateIso) {
        setAssignments((prev) => {
          const next = JSON.parse(JSON.stringify(prev));
          if (!next[empId]) next[empId] = {};
          if (!next[empId][dateIso]) next[empId][dateIso] = [];
          if (!next[empId][dateIso].some((s) => s.id === newShift.id)) {
            next[empId][dateIso].push(newShift);
          }
          return next;
        });
      }
      setShowRegisterModal(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Tạo lịch thất bại');
    }
  };

  const handleUpdateShift = async (e) => {
    e.preventDefault();
    if (!editingShift) return;
    setError('');
    try {
      const res = await updateShift(storeId, editingShift.id, {
        shiftDate: registerForm.shiftDate,
        startTime: registerForm.startTime + ':00',
        endTime: registerForm.endTime + ':00',
        staffId: registerForm.staffId || null,
        skillId: registerForm.location || null,
        note: registerForm.note || null,
        color: registerForm.color || null,
      });

      // Lưu metadata
      const savedMeta = JSON.parse(localStorage.getItem(`shifts_meta_${storeId}`) || '{}');
      savedMeta[editingShift.id] = {
        color: registerForm.color,
        staffId: registerForm.staffId,
        skillId: registerForm.location,
        location: registerForm.location,
        note: registerForm.note,
        clockIn: registerForm.clockIn,
        clockOut: registerForm.clockOut,
        radius: registerForm.radius,
      };
      localStorage.setItem(`shifts_meta_${storeId}`, JSON.stringify(savedMeta));

      const updated = {
        ...editingShift,
        ...res.data,
        ...savedMeta[editingShift.id],
      };

      // Cập nhật optimistic vào state assignments
      setAssignments((prev) => {
        const next = JSON.parse(JSON.stringify(prev));
        Object.keys(next).forEach((eId) => {
          Object.keys(next[eId]).forEach((dIso) => {
            next[eId][dIso] = next[eId][dIso].filter((s) => s.id !== editingShift.id);
          });
        });
        const empId = registerForm.staffId || editingShift.staffId;
        const dateIso = registerForm.shiftDate;
        if (empId && dateIso) {
          if (!next[empId]) next[empId] = {};
          if (!next[empId][dateIso]) next[empId][dateIso] = [];
          next[empId][dateIso].push(updated);
        }
        return next;
      });
      setShowRegisterModal(false);
      setMenuFor(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Xóa ca làm việc thất bại');
    }
  };

  /* ── Cross-Store Request Handlers ───────────────── */
  const handleAcceptCrossStoreRequest = async (req) => {
    try {
      const deadlineDate = new Date(req.shiftDate + 'T00:00:00Z');
      deadlineDate.setUTCDate(deadlineDate.getUTCDate() - 1);
      deadlineDate.setUTCHours(23, 59, 59, 0);
      const registrationDeadline = deadlineDate.toISOString().replace('.000Z', 'Z');

      const res = await createShift(storeId, {
        shiftDate: req.shiftDate,
        startTime: req.startTime + ':00',
        endTime: req.endTime + ':00',
        availabilityDeadline: registrationDeadline,
        staffId: req.staffId,
        skillId: req.skillId,
        note: req.note,
        color: req.color,
      });

      const shiftId = res.data.id;

      // Lưu metadata
      const savedMeta = JSON.parse(localStorage.getItem(`shifts_meta_${storeId}`) || '{}');
      savedMeta[shiftId] = {
        color: req.color,
        staffId: req.staffId,
        skillId: req.skillId,
        location: req.skillId,
        note: req.note,
        clockIn: req.clockIn,
        clockOut: req.clockOut,
        radius: req.radius,
      };
      localStorage.setItem(`shifts_meta_${storeId}`, JSON.stringify(savedMeta));

      // Thêm nhân viên vào danh sách nhân viên của store nếu chưa có
      const empExists = employees.some((e) => (e.staffId || e.id) === req.staffId);
      if (!empExists) {
        const newEmp = {
          staffId: req.staffId,
          id: req.staffId,
          staffFullName: req.staffName,
          fullName: req.staffName,
          position: req.position,
          jobTitle: req.position,
          skillName: req.position,
        };
        setEmployees((prev) => [...prev, newEmp]);
      }

      // Thêm shift vào assignments
      const newShift = {
        ...res.data,
        ...savedMeta[shiftId],
      };
      const empId = req.staffId;
      const dateIso = req.shiftDate;
      if (empId && dateIso) {
        setAssignments((prev) => {
          const next = JSON.parse(JSON.stringify(prev));
          if (!next[empId]) next[empId] = {};
          if (!next[empId][dateIso]) next[empId][dateIso] = [];
          if (!next[empId][dateIso].some((s) => s.id === newShift.id)) {
            next[empId][dateIso].push(newShift);
          }
          return next;
        });
      }

      // Đánh dấu request là APPROVED
      const allReqs = JSON.parse(localStorage.getItem('cross_store_requests') || '[]');
      const updatedReqs = allReqs.map((r) => (r.id === req.id ? { ...r, status: 'APPROVED' } : r));
      localStorage.setItem('cross_store_requests', JSON.stringify(updatedReqs));
      setCrossStoreRequests(updatedReqs);

      showToast(
        'Phê duyệt thành công',
        `Đã thêm ca làm việc của nhân viên "${req.staffName}" vào lịch trình chi nhánh hiện tại.`
      );
    } catch (err) {
      showToast('Thao tác thất bại', err.response?.data?.message || 'Không thể chấp nhận yêu cầu');
    }
  };

  const handleRejectCrossStoreRequest = (req) => {
    setConfirmDialog({
      title: 'Từ chối yêu cầu điều phối',
      message: `Bạn có chắc chắn muốn từ chối yêu cầu điều phối nhân viên "${req.staffName}"?`,
      confirmText: 'Từ chối',
      isDanger: true,
      onConfirm: () => {
        setConfirmDialog(null);
        const allReqs = JSON.parse(localStorage.getItem('cross_store_requests') || '[]');
        const updatedReqs = allReqs.map((r) => (r.id === req.id ? { ...r, status: 'REJECTED' } : r));
        localStorage.setItem('cross_store_requests', JSON.stringify(updatedReqs));
        setCrossStoreRequests(updatedReqs);
        showToast('Đã từ chối', `Đã từ chối yêu cầu điều phối của nhân viên "${req.staffName}".`);
      },
    });
  };

  const handleDeleteShift = (shift) => {
    setConfirmDialog({
      title: 'Xóa ca làm việc',
      message: 'Bạn có chắc chắn muốn xóa ca làm việc này? Hành động này sẽ gỡ bỏ ca làm việc khỏi lịch trình.',
      confirmText: 'Xóa ca',
      isDanger: true,
      onConfirm: async () => {
        setConfirmDialog(null);
        setMenuFor(null);
        // Optimistic: xoá ngay khỏi UI
        setAssignments((prev) => {
          const next = JSON.parse(JSON.stringify(prev));
          Object.keys(next).forEach((eid) => {
            Object.keys(next[eid] || {}).forEach((date) => {
              next[eid][date] = (next[eid][date] || []).filter((s) => s.id !== shift.id);
            });
          });
          return next;
        });
        try {
          await deleteShift(storeId, shift.id);
          showToast('Đã xóa ca làm việc', 'Ca làm việc đã được xóa thành công.');
        } catch (err) {
          if (err.response?.status !== 404) {
            setError(err.response?.data?.message || 'Xoá thất bại');
            loadData();
          }
        }
      },
    });
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setError('');
    if (!addUserForm.staffId) { setError('Chọn nhân viên'); return; }
    try {
      await assignStaffToStore(storeId, {
        staffId: addUserForm.staffId,
        employmentType: addUserForm.employmentType,
        hourlyRate: Number(addUserForm.hourlyRate) || 0,
        joinedDate: addUserForm.joinedDate || toISODate(new Date()),
      });
      setShowAddUserModal(false);
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Thêm nhân viên thất bại');
    }
  };

  const handlePrint = () => window.print();

  /* ── Render ────────────────────────────────────── */
  return (
    <div className="sch-page">
      {/* ═══ SIDEBAR ═══ */}
      <aside className="sch-sidebar">
        {/* Day-mode header */}
        {viewMode === 'Ngày' && (
          <div className="sch-sidebar-day-header">
            <div className="sch-sidebar-day-label">
              {DOW_VI[today.getDay()]}
              <span>{fmtDM(today)}-{today.getFullYear()}</span>
            </div>
          </div>
        )}

        <div className="sch-sidebar-inner">
          <div className="sch-sidebar-title">Bộ lọc</div>

          {/* ── Chi nhánh ── */}
          <div className="sch-filter-box">
            <div className="sch-filter-box-header">
              <img src={iconLocation || iconCard} className="sch-filter-icon" alt="" />
              <span className="sch-filter-label">Chi nhánh</span>
            </div>
            <select
              className="sch-filter-select"
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* ── Vị trí công việc ── */}
          <div className="sch-filter-box">
            <div
              className="sch-filter-box-header clickable"
              onClick={() => setShowSkillList((v) => !v)}
            >
              <img src={iconCard} className="sch-filter-icon" alt="" />
              <span className="sch-filter-label">Vị trí công việc</span>
              <span className={`sch-filter-arrow${showSkillList ? ' open' : ''}`}>▾</span>
            </div>
            <div className={`sch-filter-collapse${showSkillList ? ' expanded' : ''}`}>
              <div
                className={`sch-user-list-item${skillFilter === 'All' ? ' active' : ''}`}
                onClick={() => setSkillFilter('All')}
              >
                Tất cả
              </div>
              {skills.map((sk) => {
                const isSelected = skillFilter === sk.id || skillFilter === sk.name;
                const skColor =
                  sk.description && sk.description.startsWith('#')
                    ? sk.description
                    : colorFor(sk.name);
                return (
                  <div
                    key={sk.id}
                    className={`sch-user-list-item${isSelected ? ' active' : ''}`}
                    onClick={() => setSkillFilter(isSelected ? 'All' : sk.id)}
                  >
                    <span
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: skColor,
                        display: 'inline-block',
                        marginRight: '8px',
                        flexShrink: 0,
                      }}
                    />
                    {sk.name}
                  </div>
                );
              })}
              {skills.length === 0 && (
                <div className="sch-user-list-item" style={{ color: '#aaa', fontStyle: 'italic' }}>
                  Chưa có vị trí
                </div>
              )}
            </div>
          </div>

          {/* ── Người dùng ── */}
          <div className="sch-filter-box">
            <div
              className="sch-filter-box-header clickable"
              onClick={() => setShowUserList((v) => !v)}
            >
              <img src={iconUser} className="sch-filter-icon" alt="" />
              <span className="sch-filter-label">Người dùng</span>
              <span className={`sch-filter-arrow${showUserList ? ' open' : ''}`}>▾</span>
            </div>
            <div className={`sch-filter-collapse${showUserList ? ' expanded' : ''}`}>
              <div
                className={`sch-user-list-item${userFilter === 'All' ? ' active' : ''}`}
                onClick={() => setUserFilter('All')}
              >
                Tất cả
              </div>
              {employees.map((emp) => {
                const name = emp.staffFullName || emp.fullName || '';
                const empId = emp.staffId || emp.id;
                return (
                  <div
                    key={empId}
                    className={`sch-user-list-item${userFilter === name ? ' active' : ''}`}
                    onClick={() => setUserFilter(name)}
                  >
                    <img
                      src={getAvatar(name)}
                      alt={name}
                      className="sch-filter-avatar"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenStaffAvailability(emp);
                      }}
                      title="Bấm để xem lịch đăng ký rảnh của nhân viên"
                    />
                    <span style={{ flex: 1, cursor: 'pointer' }} onClick={() => setUserFilter(name)}>{name}</span>
                    <button
                      type="button"
                      className="sch-filter-avail-badge-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenStaffAvailability(emp);
                      }}
                      title="Xem lịch đăng ký của nhân viên"
                    >
                      Lịch rảnh
                    </button>
                  </div>
                );
              })}
              {employees.length === 0 && (
                <div className="sch-user-list-item" style={{ color: '#aaa', fontStyle: 'italic' }}>Chưa có nhân viên</div>
              )}
            </div>
          </div>

          {/* Add schedule button */}
          <button className="sch-sidebar-add-btn" onClick={() => openRegisterModal('', '')}>
            + Thêm lịch
          </button>
        </div>
      </aside>

      {/* ═══ MAIN ═══ */}
      <main className="sch-main">
        {/* ═══ TOPBAR (Row 1: Day/Week Toggle - Ảnh 5) ═══ */}
        <div className="sch-topbar">
          <div className="sch-viewmode-toggle">
            <button
              type="button"
              className={`sch-toggle-btn ${viewMode === 'Ngày' ? 'active' : ''}`}
              onClick={() => setViewMode('Ngày')}
            >
              Day
            </button>
            <button
              type="button"
              className={`sch-toggle-btn ${viewMode === 'Tuần' ? 'active' : ''}`}
              onClick={() => setViewMode('Tuần')}
            >
              Week
            </button>
          </div>
        </div>

        {/* ═══ HEADER TOOLBAR (Row 2: Date Navigator & Publish - Ảnh 1 & 4) ═══ */}
        <div className="sch-header-toolbar">
          <div className="sch-header-left">
            {/* Date Navigator (Ảnh 1 & 2) */}
            <div className="sch-date-navigator-wrap" ref={dateNavWrapRef}>
              <div className="sch-date-navigator">
                <button
                  type="button"
                  className="sch-date-nav-arrow"
                  onClick={handlePrevDate}
                  title="Trước"
                >
                  ‹
                </button>
                <div
                  className="sch-date-nav-center"
                  onClick={openCalendarPopover}
                  title="Bấm 1 lần để xem lịch • Bấm ngày để chọn tuần • Bấm đúp để chọn ngày"
                >
                  <span className="sch-date-cal-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                  </span>
                  <span>
                    {viewMode === 'Ngày'
                      ? fmtDateRangeText(today)
                      : `${fmtDateRangeText(weekDatesFull[0])}`}
                  </span>
                  {viewMode === 'Tuần' && (
                    <>
                      <span className="sch-date-arrow-sep">→</span>
                      <span>{fmtDateRangeText(weekDatesFull[6])}</span>
                    </>
                  )}
                </div>
                <button
                  type="button"
                  className="sch-date-nav-arrow"
                  onClick={handleNextDate}
                  title="Sau"
                >
                  ›
                </button>
              </div>

              <button
                type="button"
                className="sch-today-btn"
                onClick={handleTodayClick}
              >
                Hôm nay
              </button>

              {/* ── Datepicker Popover (Ảnh 2) ── */}
              {showCalendarPopover && (
                <div className="sch-calendar-popover" onClick={(e) => e.stopPropagation()}>
                  <div className="sch-cal-popover-header">
                    <div className="sch-cal-month-year">
                      <span>{MONTH_NAMES_VI[calMonth]} ▾</span>
                      <span>{calYear} ▾</span>
                    </div>
                    <div className="sch-cal-header-nav">
                      <button
                        type="button"
                        className="sch-cal-nav-btn"
                        onClick={handleCalPrevMonth}
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        className="sch-cal-nav-btn"
                        onClick={handleCalNextMonth}
                      >
                        ›
                      </button>
                    </div>
                  </div>

                  <div className="sch-cal-weekdays">
                    <span>Mo</span>
                    <span>Tu</span>
                    <span>We</span>
                    <span>Th</span>
                    <span>Fr</span>
                    <span>Sa</span>
                    <span>Su</span>
                  </div>

                  <div className="sch-cal-grid">
                    {getCalendarWeeks(calYear, calMonth).map((week, wIdx) => {
                      const isWeekSelected = week.every((d) =>
                        weekDatesFull.some((wd) => toISODate(wd) === toISODate(d))
                      );

                      return (
                        <div
                          key={wIdx}
                          className={`sch-cal-week-row ${isWeekSelected ? 'selected' : ''}`}
                        >
                          {week.map((d, dIdx) => {
                            const isOutside = d.getMonth() !== calMonth;
                            const isToday = toISODate(d) === toISODate(new Date());
                            const isCurrentSelectedDay =
                              viewMode === 'Ngày' && toISODate(d) === toISODate(today);

                            return (
                              <div
                                key={dIdx}
                                className={`sch-cal-day-cell ${isOutside ? 'outside-month' : ''} ${
                                  isToday ? 'is-today' : ''
                                } ${isCurrentSelectedDay ? 'is-selected-day' : ''}`}
                                onClick={() => handleCalendarDayClick(d)}
                                title="Bấm 1 lần: chọn cả tuần • Bấm đúp: chọn ngày cụ thể"
                              >
                                {d.getDate()}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>

                  <div className="sch-cal-hint">
                    Bấm để chọn tuần • Bấm đúp để chọn ngày
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Toolbar Actions (Ảnh 1 & 4) */}
          <div className="sch-header-right">
            {/* Capsule widget */}
            <div className="sch-publish-card">
              <span className="sch-publish-status">
                Xuất bản lần cuối: Chưa xuất bản
              </span>
              <div className="sch-publish-divider" />
              {pendingCrossStoreRequests.length > 0 ? (
                <button
                  type="button"
                  className="sch-warnings-badge has-reqs"
                  onClick={() => setShowCrossStoreModal(true)}
                  title="Có yêu cầu điều phối nhân sự đang chờ duyệt"
                >
                  <span className="sch-badge-check">✓</span>
                  <span>{pendingCrossStoreRequests.length} Yêu cầu điều phối</span>
                </button>
              ) : (
                <div className="sch-warnings-badge">
                  <span className="sch-badge-check">✓</span>
                  <span>0 Cảnh báo</span>
                </div>
              )}
              <div className="sch-publish-divider" />
              <button
                type="button"
                className="sch-publish-btn"
                onClick={handlePrint}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
                <span>Lịch xuất bản</span>
              </button>
            </div>
          </div>
        </div>

        {error && <p className="sch-error">{error}</p>}

        {/* Schedule table */}
        <div className="sch-table-wrap">
          <table className="sch-table">
            <thead>
              <tr>
                <th className="sch-col-emp sch-th-center">Nhân viên</th>
                {displayedDates.map((d) => (
                  <th key={d.toISOString()} className="sch-th-center">{fmtDM(d)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td className="sch-loading-cell" colSpan={displayedDates.length + 1}>
                    Đang tải...
                  </td>
                </tr>
              )}

              {!loading &&
                visibleEmployees.map((emp) => {
                  const empId = emp.staffId || emp.id;
                  const name = emp.staffFullName || emp.fullName || '';
                  const color = colorFor(name);
                  const role = emp.position || emp.jobTitle || emp.employmentType || '';

                  return (
                    <tr key={empId}>
                      {/* Employee info cell */}
                      <td className="sch-col-emp">
                        <div
                          className="sch-emp-cell"
                          onClick={() => handleOpenStaffAvailability(emp)}
                          title="Bấm vào ảnh đại diện hoặc tên để xem lịch nhân viên đã đăng ký & phân công ca"
                        >
                          <div className="sch-emp-avatar-wrap">
                            <img
                              className="sch-emp-avatar"
                              src={getAvatar(name)}
                              alt={name}
                            />
                            <span
                              className="sch-emp-avatar-badge"
                              title="Xem lịch đăng ký rảnh"
                              aria-label="Có lịch đăng ký rảnh"
                            >
                              !
                            </span>
                          </div>
                          <div>
                            <div className="sch-emp-name">{name}</div>
                            <div className="sch-emp-role">{role || 'Nhân viên'}</div>
                          </div>
                        </div>
                      </td>

                      {/* Shift cells */}
                      {displayedDates.map((d) => {
                        const iso = toISODate(d);
                        const rawCellShifts = assignments[empId]?.[iso] || [];
                        const selectedSkillObj = skills.find((sk) => sk.id === skillFilter || sk.name === skillFilter);
                        const selectedSkillName = selectedSkillObj
                          ? selectedSkillObj.name.toLowerCase().trim()
                          : skillFilter !== 'All'
                          ? skillFilter.toLowerCase().trim()
                          : '';
                        const selectedSkillId = selectedSkillObj ? selectedSkillObj.id : skillFilter;

                        const cellShifts =
                          skillFilter === 'All'
                            ? rawCellShifts
                            : rawCellShifts.filter((s) => {
                                const sSkillId = s.skillId || s.location;
                                const sLocationSkill = skills.find((sk) => sk.id === sSkillId || sk.name === sSkillId);
                                const sName = (
                                  sLocationSkill
                                    ? sLocationSkill.name
                                    : s.skillName || s.location || ''
                                )
                                  .toLowerCase()
                                  .trim();
                                return (
                                  sSkillId === selectedSkillId ||
                                  sSkillId === skillFilter ||
                                  (selectedSkillName &&
                                    (sName === selectedSkillName ||
                                      sName.includes(selectedSkillName) ||
                                      selectedSkillName.includes(sName)))
                                );
                              });
                        const isEmpty = cellShifts.length === 0;

                        return (
                          <td key={iso} className="sch-cell">
                            {/* Shift chip với sọc chéo + badge giờ */}
                            {cellShifts.map((s, sIdx) => {
                              const chipColor = s.color || colorFor(empId);
                              const chipKey = s.id ? `${s.id}-${empId}-${iso}` : `shift-${empId}-${iso}-${sIdx}`;
                              const isMenuOpen = menuFor?.shift?.id === s.id && menuFor.empId === empId && menuFor.dateIso === iso;

                              return (
                                <div
                                  key={chipKey}
                                  className="sch-shift-wrap"
                                  ref={isMenuOpen ? menuRef : null}
                                >
                                  <div
                                    className="sch-shift-block"
                                    style={{
                                      background: `repeating-linear-gradient(
                                        135deg,
                                        ${chipColor},
                                        ${chipColor} 8px,
                                        rgba(255,255,255,0.18) 8px,
                                        rgba(255,255,255,0.18) 10px
                                      )`,
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (isMenuOpen) {
                                        setMenuFor(null);
                                      } else {
                                        setMenuFor({ empId, dateIso: iso, shift: s });
                                      }
                                    }}
                                  >
                                    <span className="sch-shift-time-badge">
                                      {fmtTimeAMPM(s.startTime)} – {fmtTimeAMPM(s.endTime)}
                                    </span>
                                  </div>

                                  {isMenuOpen && (
                                    <div
                                      className="sch-shift-menu"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <div
                                        className="sch-menu-item"
                                        onClick={() => openRegisterModal(empId, iso)}
                                      >
                                        Thêm ca
                                      </div>
                                      <div
                                        className="sch-menu-item"
                                        onClick={() => openViewShiftModal(s, empId)}
                                      >
                                        Xem ca làm
                                      </div>
                                      <div
                                        className="sch-menu-item"
                                        onClick={() => openEditModal(s, empId)}
                                      >
                                        Sửa lịch
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}

                            {/* Empty cell hover add */}
                            {isEmpty && (
                              <div className="sch-cell-inner">
                                <div
                                  className="sch-cell-hover-add"
                                  onClick={() => openRegisterModal(empId, iso)}
                                >
                                  +
                                </div>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}

              {/* Add User row — không có border cột, chỉ border ngang */}
              {!loading && (
                <tr className="sch-add-user-row">
                  <td
                    colSpan={displayedDates.length + 1}
                    className="sch-add-user-td"
                    onClick={openAddUserModal}
                  >
                    <span className="sch-add-user-plus">+</span> Add User
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* ═══ MODAL: Tạo lịch làm việc ═══ */}
      {showRegisterModal && (
        <div className="sch-modal-overlay" onClick={() => setShowRegisterModal(false)}>
          <form
            className="sch-modal"
            onClick={(e) => e.stopPropagation()}
            onSubmit={modalMode === 'edit' ? handleUpdateShift : handleCreateShift}
          >
            {/* Header */}
            <div className="sch-modal-header">
              <h2>{modalMode === 'edit' ? 'Sửa ca làm việc' : 'Tạo lịch làm việc'}</h2>
              <div className="sch-modal-header-right">
                <span className="sch-leave-tag">Nghỉ phép</span>
                <button
                  type="button"
                  className="sch-modal-close"
                  onClick={() => setShowRegisterModal(false)}
                >
                  ✕
                </button>
              </div>
            </div>

            {error && <p className="sch-error">{error}</p>}

            {/* 2-column grid */}
            <div className="sch-modal-grid">
              {/* Gán */}
              <label>
                Gán
                <select
                  value={registerForm.staffId}
                  onChange={(e) => {
                    const selectedEmpId = e.target.value;
                    const defaults = getEmpDefaultSkillAndColor(selectedEmpId);
                    setRegisterForm({
                      ...registerForm,
                      staffId: selectedEmpId,
                      location: defaults.location || registerForm.location,
                      color: defaults.color || registerForm.color,
                    });
                  }}
                  placeholder="Chọn nhân viên..."
                >
                  <option value="">Chọn nhân viên...</option>
                  {employees.map((e) => (
                    <option key={e.staffId || e.id} value={e.staffId || e.id}>
                      {e.staffFullName || e.fullName}
                    </option>
                  ))}
                </select>
              </label>

              {/* Màu */}
              <label>
                Màu
                <div className="sch-color-picker-row">
                  {SHIFT_COLORS.map((c) => (
                    <div
                      key={c}
                      className={`sch-color-dot${registerForm.color === c ? ' selected' : ''}`}
                      style={{ backgroundColor: c }}
                      onClick={() => setRegisterForm({ ...registerForm, color: c })}
                    />
                  ))}
                  {!SHIFT_COLORS.includes(registerForm.color) && registerForm.color && (
                    <div
                      className="sch-color-dot selected"
                      style={{ backgroundColor: registerForm.color }}
                      title="Màu mặc định vị trí"
                    />
                  )}
                </div>
              </label>

              {/* Thời gian làm việc */}
              <label>
                Thời gian làm việc
                <input
                  required
                  type="date"
                  value={registerForm.shiftDate}
                  onChange={(e) => setRegisterForm({ ...registerForm, shiftDate: e.target.value })}
                  placeholder="Chọn thời gian làm việc..."
                />
              </label>

              {/* Vị trí làm việc */}
              <label>
                Vị trí làm việc
                <select
                  value={registerForm.location}
                  onChange={(e) => {
                    const skId = e.target.value;
                    const skObj = skills.find((s) => s.id === skId);
                    let skColor = registerForm.color;
                    if (skObj) {
                      skColor = getSkillColor(skObj);
                    }
                    setRegisterForm({
                      ...registerForm,
                      location: skId,
                      color: skColor || registerForm.color,
                    });
                  }}
                >
                  <option value="">Chọn vị trí làm việc...</option>
                  {skills.map((sk) => (
                    <option key={sk.id} value={sk.id}>
                      {sk.name}
                    </option>
                  ))}
                </select>
              </label>

              {/* Start time */}
              <label>
                Giờ bắt đầu
                <input
                  required
                  type="time"
                  value={registerForm.startTime}
                  onChange={(e) => setRegisterForm({ ...registerForm, startTime: e.target.value })}
                />
              </label>

              {/* End time */}
              <label>
                Giờ kết thúc
                <input
                  required
                  type="time"
                  value={registerForm.endTime}
                  onChange={(e) => setRegisterForm({ ...registerForm, endTime: e.target.value })}
                />
              </label>
            </div>

            {/* Thêm chi tiết section */}
            <div className="sch-modal-section">
              <div className="sch-modal-section-title">Thêm chi tiết</div>

              <label>
                Chi nhánh
                <select
                  value={registerForm.branch || storeId}
                  onChange={(e) => setRegisterForm({ ...registerForm, branch: e.target.value })}
                >
                  <option value="">Chọn chi nhánh làm việc...</option>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Ghi chú
                <textarea
                  value={registerForm.note}
                  onChange={(e) => setRegisterForm({ ...registerForm, note: e.target.value })}
                  placeholder=""
                  rows={3}
                />
              </label>
            </div>

            {/* Thiết lập chấm công section */}
            <div className="sch-modal-section">
              <div className="sch-modal-section-title">Thiết lập chấm công</div>

              <p className="sch-checkbox-row">
                Nhân viên phải ở gần địa điểm để:&nbsp;
                <label>
                  <input
                    type="checkbox"
                    checked={registerForm.clockIn}
                    onChange={(e) => setRegisterForm({ ...registerForm, clockIn: e.target.checked })}
                  />
                  &nbsp;clock In
                </label>
                &nbsp;
                <label>
                  <input
                    type="checkbox"
                    checked={registerForm.clockOut}
                    onChange={(e) =>
                      setRegisterForm({ ...registerForm, clockOut: e.target.checked })
                    }
                  />
                  &nbsp;clock Out
                </label>
              </p>

              <p className="sch-checkbox-row">
                Nhân viên và người giám sát phải ở gần địa điểm mức độ nào?
              </p>
              <div className="sch-meters-group">
                <input
                  className="sch-meters-input"
                  type="number"
                  min={0}
                  value={registerForm.radius}
                  onChange={(e) =>
                    setRegisterForm({ ...registerForm, radius: Number(e.target.value) })
                  }
                />
                <span className="sch-meters-unit">Meters</span>
              </div>
            </div>

            {/* Actions */}
            <div className="sch-modal-actions" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              {modalMode === 'edit' ? (
                <button
                  type="button"
                  className="sch-delete-shift-btn"
                  onClick={() => {
                    if (editingShift) {
                      handleDeleteShift(editingShift);
                      setShowRegisterModal(false);
                    }
                  }}
                >
                  Xóa ca làm việc
                </button>
              ) : (
                <div />
              )}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="sch-cancel-btn"
                  onClick={() => {
                    setShowRegisterModal(false);
                    setEditingShift(null);
                  }}
                >
                  Huỷ
                </button>
                <button className="sch-save-btn" type="submit">
                  {modalMode === 'edit' ? 'Cập nhật' : 'Lưu'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ═══ MODAL: Add User to store ═══ */}
      {showAddUserModal && (
        <div className="sch-modal-overlay" onClick={() => setShowAddUserModal(false)}>
          <form
            className="sch-modal sch-adduser-modal"
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleAddUser}
          >
            <div className="sch-modal-header">
              <h2>Thêm người vào lịch</h2>
              <button
                type="button"
                className="sch-modal-close"
                onClick={() => setShowAddUserModal(false)}
              >
                ✕
              </button>
            </div>

            <label>
              Nhân viên
              <select
                required
                value={addUserForm.staffId}
                onChange={(e) => setAddUserForm({ ...addUserForm, staffId: e.target.value })}
              >
                <option value="">-- Chọn nhân viên --</option>
                {availableToAdd.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.fullName} ({e.email})
                  </option>
                ))}
              </select>
            </label>

            {availableToAdd.length === 0 && (
              <p style={{ fontSize: 13, color: '#b8860b' }}>
                Không còn nhân viên nào khác để thêm.
              </p>
            )}

            <label>
              Vị trí công việc
              <select
                value={addUserForm.skillId}
                onChange={(e) => setAddUserForm({ ...addUserForm, skillId: e.target.value })}
              >
                <option value="">-- Chọn vị trí --</option>
                {skills.map((sk) => (
                  <option key={sk.id} value={sk.id}>{sk.name}</option>
                ))}
              </select>
            </label>

            <label>
              Loại hình
              <select
                value={addUserForm.employmentType}
                onChange={(e) => setAddUserForm({ ...addUserForm, employmentType: e.target.value })}
              >
                <option value="FULL_TIME">Toàn thời gian</option>
                <option value="PART_TIME">Bán thời gian</option>
                <option value="SEASONAL">Thời vụ</option>
                <option value="INTERN">Thực tập</option>
              </select>
            </label>

            <label>
              Lương theo giờ (VNĐ)
              <input
                required
                type="number"
                min="0"
                value={addUserForm.hourlyRate}
                onChange={(e) => setAddUserForm({ ...addUserForm, hourlyRate: e.target.value })}
              />
            </label>

            <label>
              Ngày vào làm
              <input
                required
                type="date"
                value={addUserForm.joinedDate}
                onChange={(e) => setAddUserForm({ ...addUserForm, joinedDate: e.target.value })}
              />
            </label>

            <div className="sch-modal-actions">
              <button
                type="button"
                className="sch-cancel-btn"
                onClick={() => setShowAddUserModal(false)}
              >
                Huỷ
              </button>
              <button className="sch-save-btn" type="submit">
                Thêm
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ═══ MODAL: Chỉnh sửa thông tin nhân viên ═══ */}
      {showEditEmpModal && (
        <div className="sch-modal-overlay" onClick={() => setShowEditEmpModal(false)}>
          <form
            className="sch-modal"
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSaveEmployee}
          >
            <div className="sch-modal-header">
              <h2>Chỉnh sửa thông tin nhân viên</h2>
              <button
                type="button"
                className="sch-modal-close"
                onClick={() => setShowEditEmpModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="sch-modal-grid">
              <label>
                Họ và tên
                <input
                  required
                  type="text"
                  value={editEmpForm.fullName}
                  onChange={(e) => setEditEmpForm({ ...editEmpForm, fullName: e.target.value })}
                />
              </label>

              <label>
                Email
                <input
                  required
                  type="email"
                  value={editEmpForm.email}
                  onChange={(e) => setEditEmpForm({ ...editEmpForm, email: e.target.value })}
                />
              </label>

              <label>
                Số điện thoại
                <input
                  type="text"
                  value={editEmpForm.phone}
                  onChange={(e) => setEditEmpForm({ ...editEmpForm, phone: e.target.value })}
                />
              </label>

              <label>
                Vị trí công việc
                <select
                  value={editEmpForm.position}
                  onChange={(e) => setEditEmpForm({ ...editEmpForm, position: e.target.value })}
                >
                  <option value="">-- Chọn vị trí --</option>
                  {skills.map((sk) => (
                    <option key={sk.id} value={sk.name}>
                      {sk.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="sch-modal-actions">
              <button
                type="button"
                className="sch-cancel-btn"
                onClick={() => setShowEditEmpModal(false)}
              >
                Huỷ
              </button>
              <button className="sch-save-btn" type="submit">
                Lưu thay đổi
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ═══ MODAL: Xem Chi Tiết Ca Làm Việc ═══ */}
      {showViewModal && viewingShift && (
        <div className="sch-modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="sch-modal sch-view-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sch-modal-header">
              <h2>Thông tin ca làm việc</h2>
              <button
                type="button"
                className="sch-modal-close"
                onClick={() => setShowViewModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="sch-view-emp-header">
              <img
                src={getAvatar(viewingShift.staffName)}
                alt={viewingShift.staffName}
                className="sch-view-avatar"
              />
              <div>
                <div className="sch-view-emp-name">{viewingShift.staffName}</div>
                <div className="sch-view-emp-role">{viewingShift.staffRole}</div>
              </div>
            </div>

            <div className="sch-view-grid">
              <div className="sch-view-item">
                <span className="sch-view-item-label">Chi nhánh</span>
                <span className="sch-view-item-val">{viewingShift.storeName}</span>
              </div>
              <div className="sch-view-item">
                <span className="sch-view-item-label">Vị trí công việc</span>
                <span className="sch-view-item-val">
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: viewingShift.positionColor,
                      display: 'inline-block',
                    }}
                  />
                  {viewingShift.positionName}
                </span>
              </div>
              <div className="sch-view-item">
                <span className="sch-view-item-label">Ngày làm việc</span>
                <span className="sch-view-item-val">{viewingShift.shiftDate}</span>
              </div>
              <div className="sch-view-item">
                <span className="sch-view-item-label">Khung giờ</span>
                <span className="sch-view-item-val">
                  {fmtTimeAMPM(viewingShift.startTime)} – {fmtTimeAMPM(viewingShift.endTime)}
                </span>
              </div>
              <div className="sch-view-item" style={{ gridColumn: '1 / -1' }}>
                <span className="sch-view-item-label">Thiết lập chấm công</span>
                <span className="sch-view-item-val" style={{ fontWeight: 500 }}>
                  {viewingShift.clockIn ? 'Bắt buộc Clock In' : ''}
                  {viewingShift.clockIn && viewingShift.clockOut ? ' • ' : ''}
                  {viewingShift.clockOut ? 'Bắt buộc Clock Out' : ''}
                  &nbsp;(Bán kính {viewingShift.radius || 150}m)
                </span>
              </div>
            </div>

            {/* Ghi chú */}
            {viewingShift.note ? (
              <div className="sch-view-note-box">
                <div className="sch-view-note-title">Ghi chú</div>
                <div>{viewingShift.note}</div>
              </div>
            ) : (
              <div className="sch-view-note-box" style={{ fontStyle: 'italic', color: '#94a3b8' }}>
                Không có ghi chú
              </div>
            )}

            <div className="sch-modal-actions" style={{ justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
              <button
                type="button"
                className="sch-cancel-btn"
                onClick={() => {
                  setShowViewModal(false);
                  openEditModal(viewingShift, viewingShift.empId);
                }}
              >
                Sửa ca này
              </button>
              <button
                type="button"
                className="sch-save-btn"
                onClick={() => setShowViewModal(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL: Yêu Cầu Điều Phối Nhân Sự Liên Chi Nhánh ═══ */}
      {showCrossStoreModal && (
        <div className="sch-modal-overlay" onClick={() => setShowCrossStoreModal(false)}>
          <div className="sch-modal sch-cross-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sch-modal-header">
              <h2>Yêu cầu điều phối nhân sự</h2>
              <button
                type="button"
                className="sch-modal-close"
                onClick={() => setShowCrossStoreModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="sch-cross-list">
              {pendingCrossStoreRequests.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: '#64748b' }}>
                  Không có yêu cầu điều phối nào đang chờ duyệt.
                </div>
              ) : (
                pendingCrossStoreRequests.map((req) => (
                  <div key={req.id} className="sch-cross-card">
                    <div className="sch-cross-card-header">
                      <div className="sch-cross-user-info">
                        <img
                          src={getAvatar(req.staffName)}
                          alt={req.staffName}
                          className="sch-cross-avatar"
                        />
                        <div>
                          <div className="sch-cross-name">{req.staffName}</div>
                          <div className="sch-cross-from">
                            Từ chi nhánh: <strong>{req.sourceStoreName}</strong>
                          </div>
                        </div>
                      </div>
                      <span className="sch-status-badge">
                        Chờ duyệt
                      </span>
                    </div>

                    <div className="sch-cross-details">
                      <div className="sch-cross-detail-item">
                        <span className="sch-cross-detail-label">Vị trí</span>
                        <span className="sch-cross-detail-value">{req.position}</span>
                      </div>
                      <div className="sch-cross-detail-item">
                        <span className="sch-cross-detail-label">Ngày</span>
                        <span className="sch-cross-detail-value">{req.shiftDate}</span>
                      </div>
                      <div className="sch-cross-detail-item">
                        <span className="sch-cross-detail-label">Khung giờ</span>
                        <span className="sch-cross-detail-value">
                          {fmtTimeAMPM(req.startTime)} – {fmtTimeAMPM(req.endTime)}
                        </span>
                      </div>
                      <div className="sch-cross-detail-item">
                        <span className="sch-cross-detail-label">Chi nhánh nhận</span>
                        <span className="sch-cross-detail-value">{req.targetStoreName}</span>
                      </div>
                    </div>

                    {req.note && (
                      <div className="sch-cross-note">
                        <strong>Ghi chú:</strong> {req.note}
                      </div>
                    )}

                    <div className="sch-cross-actions">
                      <button
                        type="button"
                        className="sch-btn-reject"
                        onClick={() => handleRejectCrossStoreRequest(req)}
                      >
                        Từ chối
                      </button>
                      <button
                        type="button"
                        className="sch-btn-accept"
                        onClick={() => handleAcceptCrossStoreRequest(req)}
                      >
                        Chấp nhận
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="sch-modal-actions" style={{ justifyContent: 'flex-end', marginTop: '10px' }}>
              <button
                type="button"
                className="sch-save-btn"
                onClick={() => setShowCrossStoreModal(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL: Lịch đăng ký của nhân viên (Staff Registered Shifts / Availability) ═══ */}
      {showAvailabilityModal && selectedStaffForAvail && (
        <div className="sch-modal-overlay" onClick={() => setShowAvailabilityModal(false)}>
          <div className="sch-modal sch-avail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sch-modal-header">
              <div className="sch-avail-modal-emp-info">
                <img
                  src={getAvatar(selectedStaffForAvail.name)}
                  alt={selectedStaffForAvail.name}
                  className="sch-avail-modal-avatar"
                />
                <div>
                  <span className="sch-avail-modal-eyebrow">LỊCH KHẢ DỤNG</span>
                  <h2 className="sch-avail-modal-title">
                    Lịch đăng ký của {selectedStaffForAvail.name}
                  </h2>
                  <span className="sch-avail-modal-sub">
                    {selectedStaffForAvail.position} • Tuần: {fmtDM(weekDatesFull[0])} đến {fmtDM(weekDatesFull[6])}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="sch-modal-close"
                onClick={() => setShowAvailabilityModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="sch-avail-modal-body">
              {loadingAvail ? (
                <div style={{ textAlign: 'center', padding: '36px', color: '#666', fontSize: '14px' }}>
                  ⏳ Đang tải lịch đăng ký của nhân viên...
                </div>
              ) : staffAvailSlots.length === 0 ? (
                <div className="sch-avail-empty-box">
                  <div className="sch-avail-empty-icon" aria-hidden="true"><span /></div>
                  <p className="sch-avail-empty-title">
                    Chưa có khung giờ khả dụng
                  </p>
                  <p className="sch-avail-empty-description">
                    {selectedStaffForAvail.name} chưa gửi lịch rảnh cho tuần này. Bạn vẫn có thể tạo ca thủ công ngay tại đây.
                  </p>
                  <button
                    type="button"
                    className="sch-avail-empty-action"
                    onClick={() => {
                      setShowAvailabilityModal(false);
                      openRegisterModal(selectedStaffForAvail.id, toISODate(weekDatesFull[0]));
                    }}
                  >
                    Tạo ca thủ công
                  </button>
                </div>
              ) : (
                <div className="sch-avail-list">
                  <div className="sch-avail-guide">
                    Các khung giờ dưới đây được <strong>{selectedStaffForAvail.name}</strong> đăng ký khả dụng trên mobile. Chọn một khung giờ để thêm vào lịch tuần này.
                  </div>
                  {[1, 2, 3, 4, 5, 6, 0].map((dow) => {
                    const slotsForDow = staffAvailSlots.filter((s) => s.dayOfWeek === dow);
                    const targetDate = weekDatesFull.find((d) => d.getDay() === dow);
                    const targetIso = targetDate ? toISODate(targetDate) : '';
                    const assignedForThisDay = targetIso && assignments[selectedStaffForAvail.id]?.[targetIso]?.length > 0;

                    if (slotsForDow.length === 0) return null;

                    return (
                      <div key={dow} className="sch-avail-day-row">
                        <div className="sch-avail-day-title">
                          <span className="sch-avail-dow-badge">{DOW_VI[dow]}</span>
                          <span className="sch-avail-date-label">
                            ({targetDate ? fmtDM(targetDate) : ''})
                          </span>
                        </div>
                        <div className="sch-avail-slots-group">
                          {slotsForDow.map((slot) => {
                            const fmtT = (t) => {
                              if (!t) return '06:00';
                              if (typeof t === 'string') return t.slice(0, 5);
                              return `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`;
                            };
                            return (
                              <div key={slot.id} className="sch-avail-slot-card">
                                <div className="sch-avail-slot-info">
                                  <span className="sch-avail-slot-time">
                                    {fmtT(slot.startTime)} – {fmtT(slot.endTime)}
                                  </span>
                                  {assignedForThisDay ? (
                                    <span className="sch-avail-status-tag assigned">Đã có ca trên lịch</span>
                                  ) : (
                                    <span className="sch-avail-status-tag pending">Đã đăng ký rảnh</span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  className={`sch-avail-assign-btn${assignedForThisDay ? ' already' : ''}`}
                                  onClick={() => handleAssignAvailSlot(slot)}
                                >
                                  {assignedForThisDay ? 'Gán thêm ca' : 'Phân công ca'}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="sch-avail-modal-footer">
              <button
                type="button"
                className="sch-avail-footer-edit"
                onClick={() => {
                  setShowAvailabilityModal(false);
                  openEditEmpModal(selectedStaffForAvail);
                }}
              >
                Chỉnh sửa hồ sơ
              </button>
              <button
                type="button"
                className="sch-avail-footer-create"
                onClick={() => {
                  setShowAvailabilityModal(false);
                  openRegisterModal(selectedStaffForAvail.id, toISODate(weekDatesFull[0]));
                }}
              >
                Tạo ca tùy chỉnh
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ TOAST NOTIFICATION ═══ */}
      {toastNotification && (
        <div className="sch-toast">
          <div style={{ flex: 1 }}>
            <div className="sch-toast-title">{toastNotification.title}</div>
            <div className="sch-toast-desc">{toastNotification.desc}</div>
          </div>
          <button
            type="button"
            className="sch-toast-close"
            onClick={() => setToastNotification(null)}
          >
            ✕
          </button>
        </div>
      )}
      {/* ═══ CONFIRM DIALOG ═══ */}
      {confirmDialog && (
        <div className="sch-modal-overlay" onClick={() => setConfirmDialog(null)}>
          <div className="sch-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sch-confirm-title">{confirmDialog.title}</div>
            <div className="sch-confirm-desc">{confirmDialog.message}</div>
            <div className="sch-confirm-actions">
              <button
                type="button"
                className="sch-confirm-cancel-btn"
                onClick={() => setConfirmDialog(null)}
              >
                Hủy
              </button>
              <button
                type="button"
                className={confirmDialog.isDanger ? 'sch-confirm-danger-btn' : 'sch-confirm-primary-btn'}
                onClick={confirmDialog.onConfirm}
              >
                {confirmDialog.confirmText || 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
