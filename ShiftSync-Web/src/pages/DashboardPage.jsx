import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllStores } from '../services/storeService';
import { getEmployees } from '../services/employeeService';
import { getShiftsForStore } from '../services/shiftService';
import { getRequests } from '../services/requestService';
import { getStoreAttendance } from '../services/attendanceService';
import { getSkillsByStore } from '../services/skillService';

import avatarPaul from '../assets/avatars/avatar-paul-lee.png';
import avatarThia from '../assets/avatars/avatar-thia-ago.png';
import avatarMew from '../assets/avatars/avatar-mew-ama.png';
import avatarDilan from '../assets/avatars/avatar-dilan-jon.png';
import iconCalendar from '../assets/icons/icon-calendar.png';
import './DashboardPage.css';

const AVATAR_MAP = {
  'Paul. Lee': avatarPaul,
  'Thia. Ago': avatarThia,
  'Mew. Ama': avatarMew,
  'Dilan. Jon': avatarDilan,
};

const DEFAULT_AVATAR = avatarPaul;
const getAvatar = (name) => AVATAR_MAP[name] || DEFAULT_AVATAR;

const TIMELINE_HOURS = [
  '6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM',
  '11:00 AM', '12:00 AM', '13:00 PM', '14:00 PM', '15:00 PM',
  '16:00 PM', '17:00 PM', '18:00 PM', '19:00 PM'
];

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

const fmtISO = (d) => d.toISOString().slice(0, 10);
const fmtDM = (d) => `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}`;

/**
 * Generate a smooth cubic bezier SVG path that passes EXACTLY through all given points.
 */
function getSvgSmoothPath(points) {
  if (!points || points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x},${points[0].y}`;

  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? i : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;

    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2.x},${p2.y}`;
  }
  return d;
}

export default function DashboardPage() {
  const navigate = useNavigate();

  // Stores & Filter states
  const [stores, setStores] = useState([]);
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [employees, setEmployees] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [attendanceList, setAttendanceList] = useState([]);
  const [requestsList, setRequestsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');

  // Dashboard Filter Bar states
  const [filterDateMode, setFilterDateMode] = useState('today'); // 'today' | 'custom'
  const [filterCustomDate, setFilterCustomDate] = useState('');
  const [filterEmployee, setFilterEmployee] = useState('ALL');
  const [filterPosition, setFilterPosition] = useState('ALL');

  // Store skills map: { storeId: [{id, name, description(color)}] }
  const [storeSkillMap, setStoreSkillMap] = useState({});

  // Interactive Hover / Tooltip states
  const [hoveredBarIndex, setHoveredBarIndex] = useState(null);
  const [hoveredLineIndex, setHoveredLineIndex] = useState(null);

  const toastTimerRef = useRef(null);

  const currentWeekDates = useMemo(() => getWeekDates(new Date()), []);
  const today = useMemo(() => new Date(), []);
  const todayISO = fmtISO(today);

  const yesterday = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d;
  }, []);
  const yesterdayISO = fmtISO(yesterday);

  // Computed active date ISO for filtering
  const activeDateISO = filterDateMode === 'today' ? todayISO : (filterCustomDate || todayISO);

  // 1. Initial load stores & employees
  useEffect(() => {
    async function loadStoresData() {
      try {
        const storeRes = await getAllStores();
        const storeList = Array.isArray(storeRes.data) ? storeRes.data : (storeRes.data?.content || []);
        if (storeList && storeList.length > 0) {
          setStores(storeList);
          const savedStoreId = localStorage.getItem('selectedStoreId');
          const targetStore = (savedStoreId && storeList.find(s => String(s.id) === String(savedStoreId))) || storeList[0];
          setSelectedStoreId(String(targetStore.id));
          localStorage.setItem('selectedStoreId', String(targetStore.id));
        } else {
          setStores([]);
          setSelectedStoreId('');
        }
      } catch (err) {
        console.warn('Error loading stores:', err);
        setStores([]);
        setSelectedStoreId('');
      }

      try {
        const empRes = await getEmployees();
        const empList = Array.isArray(empRes.data) ? empRes.data : (empRes.data?.content || []);
        if (empList && empList.length > 0) {
          setEmployees(empList);
        } else {
          setEmployees([]);
        }
      } catch (err) {
        console.warn('Error loading employees:', err);
      }
    }

    loadStoresData();
  }, []);

  // 2. Load live shifts, attendance and requests for the selected store
  useEffect(() => {
    if (!selectedStoreId) return;

    async function loadStoreLiveData() {
      setLoading(true);

      // Load shifts
      try {
        const shiftRes = await getShiftsForStore(selectedStoreId);
        const shiftData = Array.isArray(shiftRes.data) ? shiftRes.data : (shiftRes.data?.content || []);
        setShifts(shiftData);
      } catch (e) {
        console.info('Backend getShiftsForStore API offline, using empty shifts:', e.message);
        setShifts([]);
      }

      // Load attendance
      try {
        const weekStart = fmtISO(currentWeekDates[0]);
        const weekEnd = fmtISO(currentWeekDates[6]);
        const attRes = await getStoreAttendance(selectedStoreId, weekStart, weekEnd);
        const attData = Array.isArray(attRes.data) ? attRes.data : (attRes.data?.content || []);
        setAttendanceList(attData);
      } catch (e) {
        console.info('Backend getStoreAttendance API offline, using empty attendance:', e.message);
        setAttendanceList([]);
      }

      // Load requests
      try {
        const reqData = await getRequests();
        setRequestsList(reqData || []);
      } catch (e) {
        console.info('Error loading requests:', e);
        setRequestsList([]);
      } finally {
        setLoading(false);
      }
    }

    loadStoreLiveData();
  }, [selectedStoreId, currentWeekDates]);

  // 3. Load skills for selected store → build skill color map
  useEffect(() => {
    if (!selectedStoreId) return;
    if (storeSkillMap[selectedStoreId]) return; // already cached
    getSkillsByStore(selectedStoreId)
      .then((res) => {
        const data = res.data;
        const list = Array.isArray(data) ? data : (data?.content || []);
        setStoreSkillMap((prev) => ({ ...prev, [selectedStoreId]: list }));
      })
      .catch(() => {});
  }, [selectedStoreId]);

  const showToast = useCallback((msg) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(msg);
    toastTimerRef.current = setTimeout(() => setToastMessage(''), 3000);
  }, []);

  const handleExportSalary = () => {
    showToast('Đang xuất bảng báo cáo dự báo lương (.xlsx / .csv)...');
  };

  // Helper: get skill color by name from current store
  const getPositionColor = useCallback((skillName) => {
    const skills = storeSkillMap[selectedStoreId] || [];
    const skill = skills.find((sk) => {
      const n = (sk.name || '').toLowerCase();
      const q = (skillName || '').toLowerCase();
      return n === q || q.includes(n) || n.includes(q);
    });
    if (skill && skill.description && skill.description.startsWith('#')) return skill.description;
    // Fallback palette
    const FALLBACK = ['#5BC8B8', '#D97FB2', '#D98080', '#C8C84A', '#7AA8D9', '#FFA726', '#AB47BC', '#26A69A'];
    const idx = [...(skillName || '')].reduce((a, c) => a + c.charCodeAt(0), 0) % FALLBACK.length;
    return FALLBACK[idx];
  }, [storeSkillMap, selectedStoreId]);

  // =========================================================================
  // Section 1 Computations: Today's Timeline Shifts
  // =========================================================================
  const timelineData = useMemo(() => {
    const activeDateShifts = shifts.filter(s => (s.shiftDate === activeDateISO || s.date === activeDateISO));
    const rows = [];

    activeDateShifts.forEach((shift) => {
      const startH = shift.startTime ? parseInt(shift.startTime.slice(0, 2), 10) : 6;
      const endH = shift.endTime ? parseInt(shift.endTime.slice(0, 2), 10) : 14;
      const skillName = shift.skillName || shift.requiredSkillName || '';
      const posColor = getPositionColor(skillName);

      const pushRow = (empName, rowId) => {
        // Filter by employee
        if (filterEmployee !== 'ALL' && empName !== filterEmployee) return;
        // Filter by position
        if (filterPosition !== 'ALL' && skillName && !skillName.toLowerCase().includes(filterPosition.toLowerCase())) return;
        rows.push({
          id: rowId,
          name: empName,
          avatar: getAvatar(empName),
          role: skillName || 'Staff',
          startHour: Math.max(6, Math.min(19, startH)),
          endHour: Math.max(6, Math.min(19, endH)),
          color: posColor,
          timeText: `${shift.startTime?.slice(0, 5) || '06:00'} - ${shift.endTime?.slice(0, 5) || '14:00'}`
        });
      };

      if (shift.shiftAssignments && shift.shiftAssignments.length > 0) {
        shift.shiftAssignments.forEach((assign, aIdx) => {
          const empName = assign.staffName || assign.employeeName || assign.userFullName || 'Nhân viên';
          pushRow(empName, `assign-${shift.id}-${aIdx}`);
        });
      } else if (shift.staffName || shift.staffId) {
        const empName = shift.staffName || 'Nhân viên';
        pushRow(empName, `shift-${shift.id}`);
      }
    });

    return rows;
  }, [shifts, activeDateISO, filterEmployee, filterPosition, getPositionColor]);

  // =========================================================================
  // Section 2 Computations: Attendance Notifications
  // =========================================================================
  const { todayAttendance, yesterdayAttendance } = useMemo(() => {
    const todayItems = attendanceList.filter(a => (a.shiftDate === todayISO || a.date === todayISO || a.attendanceDate === todayISO));
    const yestItems = attendanceList.filter(a => (a.shiftDate === yesterdayISO || a.date === yesterdayISO || a.attendanceDate === yesterdayISO));

    const formatAttItem = (att, idx) => {
      let statusClass = 'late';
      let typeLabel = 'Đi trễ';
      if (att.status === 'ABSENT') {
        statusClass = 'absent';
        typeLabel = 'Vắng mặt';
      } else if (att.status === 'EARLY_LEAVE') {
        statusClass = 'early';
        typeLabel = 'Về sớm';
      } else if (att.status === 'PRESENT') {
        statusClass = 'early';
        typeLabel = 'Đúng giờ';
      }

      const empName = att.staffName || att.employeeName || 'Nhân viên';
      const checkInFormatted = att.checkInTime ? new Date(att.checkInTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';

      return {
        id: `real-att-${att.id || idx}`,
        type: typeLabel,
        statusClass,
        name: empName,
        date: fmtDM(new Date(att.shiftDate || att.date || att.attendanceDate || todayISO)),
        time: checkInFormatted,
        avatar: getAvatar(empName)
      };
    };

    return {
      todayAttendance: todayItems.map(formatAttItem),
      yesterdayAttendance: yestItems.map(formatAttItem)
    };
  }, [attendanceList, todayISO, yesterdayISO]);

  // =========================================================================
  // Section 3 Computations: Real KPIs
  // =========================================================================
  const kpis = useMemo(() => {
    const todayShifts = shifts.filter(s => (s.shiftDate === todayISO || s.date === todayISO));
    let openShifts = 0;
    let totalRequired = 0;
    let totalAssigned = 0;
    let totalScheduledHours = 0;

    todayShifts.forEach(s => {
      const required = s.requiredStaff || 1;
      const assigned = (s.shiftAssignments && s.shiftAssignments.length > 0) 
        ? s.shiftAssignments.length 
        : (s.staffId ? 1 : 0);

      totalRequired += required;
      totalAssigned += assigned;
      if (assigned < required) {
        openShifts += (required - assigned);
      }

      if (s.startTime && s.endTime) {
        const startH = parseInt(s.startTime.slice(0, 2), 10);
        const endH = parseInt(s.endTime.slice(0, 2), 10);
        let diff = endH - startH;
        if (diff < 0) diff += 24;
        totalScheduledHours += diff * (assigned > 0 ? assigned : 1);
      }
    });

    const shiftCoverage = totalRequired > 0 ? Math.round((totalAssigned / totalRequired) * 100) : 100;
    const laborCost = totalScheduledHours > 0 ? (totalScheduledHours * 30000).toLocaleString('vi-VN') + ' đ' : '0 đ';

    const todayAtt = attendanceList.filter(a => (a.shiftDate === todayISO || a.date === todayISO));
    const lateAtt = todayAtt.filter(a => a.status === 'LATE');
    const absentAtt = todayAtt.filter(a => a.status === 'ABSENT');

    const lateRate = todayAtt.length > 0 ? ((lateAtt.length / todayAtt.length) * 100).toFixed(1) + '%' : '0.0%';
    const absentRate = totalAssigned > 0 ? ((absentAtt.length / totalAssigned) * 100).toFixed(1) + '%' : '0.0%';

    const pendingRequests = requestsList.filter(r => r.status === 'Đang chờ phê duyệt' || r.status === 'PENDING').length;

    return {
      openShifts: `${openShifts} ca`,
      shiftCoverage: `${shiftCoverage}%`,
      laborCost,
      lateRate,
      absentRate,
      pendingRequests: `${pendingRequests} yêu cầu`
    };
  }, [shifts, attendanceList, requestsList, todayISO]);

  // =========================================================================
  // Section 4 Computations: Stacked Bar Chart by Day & Position
  // =========================================================================
  // Build dynamic skill buckets from current store's skills
  const currentStoreSkills = useMemo(() => {
    return (storeSkillMap[selectedStoreId] || []);
  }, [storeSkillMap, selectedStoreId]);

  const stackedChartDays = useMemo(() => {
    return currentWeekDates.map((dateObj) => {
      const dISO = fmtISO(dateObj);
      const dayShifts = shifts.filter(s => (s.shiftDate === dISO || s.date === dISO));

      // Dynamic buckets per actual store skills
      const buckets = {};
      currentStoreSkills.forEach(sk => { buckets[sk.name] = 0; });
      const otherKey = '__other__';
      buckets[otherKey] = 0;

      dayShifts.forEach(s => {
        const count = (s.shiftAssignments && s.shiftAssignments.length > 0)
          ? s.shiftAssignments.length
          : (s.requiredStaff || 1);
        const skillName = s.skillName || s.requiredSkillName || '';
        // Filter by position if selected
        if (filterPosition !== 'ALL' && skillName && !skillName.toLowerCase().includes(filterPosition.toLowerCase())) return;
        const matchedSkill = currentStoreSkills.find(sk => {
          const n = sk.name.toLowerCase();
          const q = skillName.toLowerCase();
          return n === q || q.includes(n) || n.includes(q);
        });
        if (matchedSkill) {
          buckets[matchedSkill.name] = (buckets[matchedSkill.name] || 0) + count;
        } else {
          buckets[otherKey] += count;
        }
      });

      const total = Object.values(buckets).reduce((a, b) => a + b, 0);
      const breakdown = { ...buckets };

      const segments = [
        ...currentStoreSkills.map(sk => ({
          key: sk.name,
          color: (sk.description && sk.description.startsWith('#')) ? sk.description : getPositionColor(sk.name),
          val: buckets[sk.name] || 0,
        })),
        ...(buckets[otherKey] > 0 ? [{ key: 'other', color: '#A0AEC0', val: buckets[otherKey] }] : [])
      ].filter(seg => seg.val > 0);

      return { date: fmtDM(dateObj), total, breakdown, segments };
    });
  }, [shifts, currentWeekDates, currentStoreSkills, filterPosition, getPositionColor]);

  // =========================================================================
  // Section 5 Computations: Real Salary & Accurate Curve Placement
  // =========================================================================
  const {
    salaryDates,
    scheduledPoints,
    actualPoints,
    scheduledSvgPath,
    actualSvgPath,
    totalSchedWeek,
    totalActualWeek,
    maxScaleValue
  } = useMemo(() => {
    const dates = currentWeekDates.map(d => fmtDM(d));
    let totalSched = 0;
    let totalAct = 0;

    // 1. Calculate raw hours per day
    const rawSched = currentWeekDates.map((dateObj) => {
      const dISO = fmtISO(dateObj);
      const dayShifts = shifts.filter(s => (s.shiftDate === dISO || s.date === dISO));
      let dayHours = 0;
      dayShifts.forEach(s => {
        if (s.startTime && s.endTime) {
          const startH = parseInt(s.startTime.slice(0, 2), 10);
          const endH = parseInt(s.endTime.slice(0, 2), 10);
          let diff = endH - startH;
          if (diff < 0) diff += 24;
          const assignedCount = (s.shiftAssignments && s.shiftAssignments.length > 0)
            ? s.shiftAssignments.length
            : (s.staffId ? 1 : 1);
          dayHours += diff * assignedCount;
        }
      });
      totalSched += dayHours;
      return dayHours;
    });

    const rawAct = currentWeekDates.map((dateObj) => {
      const dISO = fmtISO(dateObj);
      const dayAtt = attendanceList.filter(a => (a.shiftDate === dISO || a.date === dISO));
      let actHours = 0;
      dayAtt.forEach(a => {
        if (a.checkInTime && a.checkOutTime) {
          const diffMs = new Date(a.checkOutTime) - new Date(a.checkInTime);
          if (diffMs > 0) actHours += diffMs / 3600000;
        }
      });
      totalAct += actHours;
      return actHours > 0 ? Number(actHours.toFixed(1)) : null;
    });

    // 2. Determine max scale dynamically (minimum 8)
    const maxVal = Math.max(8, ...rawSched, ...rawAct.filter(v => v !== null));

    // 3. Exact SVG coordinate calculations
    // SVG width: 920, height: 300
    // Plot area: X from 80 to 860 (step = 130), Y from 30 (maxVal) to 220 (0 hours)
    const plotHeight = 190;
    const baselineY = 220;

    const schedPts = currentWeekDates.map((_, idx) => {
      const x = 80 + idx * 130;
      const h = rawSched[idx];
      const y = Number((baselineY - (h / maxVal) * plotHeight).toFixed(2));
      return { x, y, hours: h, date: dates[idx] };
    });

    const actPts = [];
    currentWeekDates.forEach((_, idx) => {
      const actH = rawAct[idx];
      if (actH !== null && actH !== undefined) {
        const x = 80 + idx * 130;
        const y = Number((baselineY - (actH / maxVal) * plotHeight).toFixed(2));
        actPts.push({ x, y, hours: actH, date: dates[idx] });
      }
    });

    return {
      salaryDates: dates,
      scheduledPoints: schedPts,
      actualPoints: actPts,
      scheduledSvgPath: getSvgSmoothPath(schedPts),
      actualSvgPath: getSvgSmoothPath(actPts),
      totalSchedWeek: Math.round(totalSched),
      totalActualWeek: Math.round(totalAct),
      maxScaleValue: maxVal
    };
  }, [shifts, attendanceList, currentWeekDates]);

  // =========================================================================
  // Section 6 Computations: Real Requests by Category
  // =========================================================================
  const requestCategoryCounts = useMemo(() => {
    let attendanceCount = 0;
    let leaveCount = 0;
    let swapCount = 0;
    let payrollCount = 0;

    requestsList.forEach(r => {
      const cat = r.typeCategory || '';
      const type = (r.requestType || '').toLowerCase();
      if (cat === 'attendance' || type.includes('chấm công') || type.includes('điểm danh') || type.includes('tăng ca')) {
        attendanceCount++;
      } else if (cat === 'leave' || type.includes('nghỉ')) {
        leaveCount++;
      } else if (cat === 'swap' || type.includes('đổi ca') || type.includes('nhận ca')) {
        swapCount++;
      } else {
        payrollCount++;
      }
    });

    return [
      {
        id: 'req-cat-1',
        title: 'Chấm công & Điểm danh',
        pillClass: 'db-pill-pink',
        countClass: attendanceCount > 0 ? 'db-count-pink' : 'db-count-zero',
        desc: 'Quản lý các yêu cầu điều chỉnh giờ vào/ra ca, xin đi trễ, về sớm và đăng ký tăng ca.',
        count: attendanceCount,
        filterKey: 'attendance'
      },
      {
        id: 'req-cat-2',
        title: 'Nghỉ phép & Vắng mặt',
        pillClass: 'db-pill-green',
        countClass: leaveCount > 0 ? 'db-count-green' : 'db-count-zero',
        desc: 'Tiếp nhận các đơn xin nghỉ phép, nghỉ bệnh hoặc báo vắng mặt đột xuất.',
        count: leaveCount,
        filterKey: 'leave'
      },
      {
        id: 'req-cat-3',
        title: 'Lịch làm & Đổi ca',
        pillClass: 'db-pill-blue',
        countClass: swapCount > 0 ? 'db-count-blue' : 'db-count-zero',
        desc: 'Xử lý việc hoán đổi ca giữa các nhân viên, đăng ký ca trống và cập nhật lịch rảnh/bận.',
        count: swapCount,
        filterKey: 'swap'
      },
      {
        id: 'req-cat-4',
        title: 'Lương & Nhân sự',
        pillClass: 'db-pill-yellow',
        countClass: payrollCount > 0 ? 'db-count-yellow' : 'db-count-zero',
        desc: 'Tiếp nhận phản hồi bảng lương, xin ứng lương và yêu cầu điều chuyển chi nhánh.',
        count: payrollCount,
        filterKey: 'payroll'
      }
    ];
  }, [requestsList]);

  // Current store name for display
  const currentStoreName = useMemo(() => {
    const s = stores.find(st => String(st.id) === String(selectedStoreId));
    return s ? s.name : '';
  }, [stores, selectedStoreId]);

  return (
    <div className="db-page">
      {/* Black Toast Notification */}
      {toastMessage && <div className="black-toast">{toastMessage}</div>}

      {/* Sub-header Brand Strip */}
      <div className="db-brand-bar">
        <div className="db-brand-left">
          <div className="db-brand-logo-wrap">
            <img src={avatarPaul} alt="ShiftSync Logo" className="db-brand-logo-img" />
          </div>
          <span className="db-brand-title">ShiftSync</span>
          {currentStoreName && (
            <span className="db-brand-store-badge">{currentStoreName}</span>
          )}
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="db-filter-bar">
        {/* Bộ lọc ngày */}
        <div className="db-filter-group">
          <button
            id="filter-today-btn"
            className={`db-filter-btn ${filterDateMode === 'today' ? 'active' : ''}`}
            onClick={() => { setFilterDateMode('today'); setFilterCustomDate(''); }}
          >
            📅 Hôm nay
          </button>
          <div className="db-filter-date-wrap">
            <input
              id="filter-custom-date"
              type="date"
              className={`db-filter-date-input ${filterDateMode === 'custom' ? 'active' : ''}`}
              value={filterCustomDate}
              onChange={(e) => {
                setFilterCustomDate(e.target.value);
                setFilterDateMode(e.target.value ? 'custom' : 'today');
              }}
              title="Chọn ngày khác"
            />
          </div>
        </div>

        <div className="db-filter-divider" />

        {/* Lọc theo Nhân viên */}
        <div className="db-filter-group">
          <label className="db-filter-label">👤 Nhân viên</label>
          <select
            id="filter-employee-select"
            className="db-filter-select"
            value={filterEmployee}
            onChange={(e) => setFilterEmployee(e.target.value)}
          >
            <option value="ALL">Tất cả</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.fullName}>
                {emp.fullName}
              </option>
            ))}
          </select>
        </div>

        {/* Lọc theo Vị trí */}
        <div className="db-filter-group">
          <label className="db-filter-label">🏷️ Vị trí</label>
          <select
            id="filter-position-select"
            className="db-filter-select"
            value={filterPosition}
            onChange={(e) => setFilterPosition(e.target.value)}
          >
            <option value="ALL">Tất cả vị trí</option>
            {currentStoreSkills.map((sk) => (
              <option key={sk.id} value={sk.name}>
                {sk.name}
              </option>
            ))}
          </select>
        </div>

        {(filterEmployee !== 'ALL' || filterPosition !== 'ALL' || filterDateMode === 'custom') && (
          <button
            className="db-filter-clear"
            onClick={() => { setFilterEmployee('ALL'); setFilterPosition('ALL'); setFilterDateMode('today'); setFilterCustomDate(''); }}
          >
            ✕ Xoá bộ lọc
          </button>
        )}
      </div>

      <div className="db-container">
        {/* =================================================================
            1. Lịch làm việc hôm nay (Schedule Timeline)
            ================================================================= */}
        <section className="db-card" id="today-schedule">
          <div className="db-card-header">
            <h2 className="db-card-title">Lịch làm việc hôm nay</h2>
            <div className="db-card-controls">
              <button
                className="db-control-btn"
                onClick={() => navigate('/schedule')}
              >
                Xem chi tiết lịch
              </button>
            </div>
          </div>

          <div className="db-timeline-wrapper">
            <table className="db-timeline-table">
              <thead>
                <tr className="db-timeline-header-row">
                  <th className="db-timeline-th-name">Tên</th>
                  {TIMELINE_HOURS.map((h, i) => (
                    <th key={i} className="db-timeline-th-hour">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timelineData.length === 0 ? (
                  <tr>
                    <td colSpan={15} style={{ textAlign: 'center', padding: '36px', color: '#666671' }}>
                      Hôm nay chưa có ca làm việc nào được phân công tại chi nhánh này.{' '}
                      <button
                        className="db-kpi-link"
                        style={{ marginLeft: '8px' }}
                        onClick={() => navigate('/schedule')}
                      >
                        Phân công ca làm ngay &rarr;
                      </button>
                    </td>
                  </tr>
                ) : (
                  timelineData.map((row) => {
                    const startOffset = Math.max(0, row.startHour - 6);
                    const duration = Math.max(1, row.endHour - row.startHour);
                    const totalCols = 14;
                    const leftPercent = (startOffset / totalCols) * 100;
                    const widthPercent = (duration / totalCols) * 100;

                    return (
                      <tr key={row.id} className="db-timeline-row">
                        <td className="db-timeline-name-cell">
                          <div className="db-timeline-name-flex">
                            <img
                              src={row.avatar}
                              alt={row.name}
                              className="db-timeline-avatar"
                            />
                            <div>
                              <span>{row.name}</span>
                              <span className="db-timeline-role-badge" style={{ backgroundColor: row.color + '22', color: row.color, borderColor: row.color + '44' }}>
                                {row.role}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td colSpan={14} className="db-timeline-grid-cell">
                          <div className="db-timeline-grid-lines">
                            {Array.from({ length: 14 }).map((_, idx) => (
                              <div key={idx} className="db-timeline-grid-col" />
                            ))}
                          </div>
                          <div
                            className="db-shift-bar"
                            style={{
                              left: `${leftPercent}%`,
                              width: `${widthPercent}%`,
                              backgroundColor: row.color,
                              opacity: 0.85,
                            }}
                            onClick={() => navigate('/schedule')}
                            title={`${row.name} (${row.role}): ${row.timeText}`}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* =================================================================
            2. Thông báo chấm công (Attendance Notifications)
            ================================================================= */}
        <section className="db-card" id="attendance-notifications">
          <div className="db-card-header">
            <h2 className="db-card-title">Thông báo chấm công</h2>
            <div className="db-card-controls">
              <button className="db-control-btn">Hôm nay</button>
              <button
                className="db-cal-icon-btn"
                onClick={() => navigate('/attendance')}
                title="Mở bảng điểm danh"
              >
                <img src={iconCalendar} alt="Lịch" />
              </button>
            </div>
          </div>

          <div className="db-att-section">
            {/* Group: Hôm nay */}
            <div className="db-att-group-title-bar">Hôm nay</div>
            {todayAttendance.length === 0 ? (
              <p style={{ color: '#666671', padding: '12px 18px', margin: '0 0 16px 0' }}>
                Không có thông báo chấm công nào cho hôm nay.
              </p>
            ) : (
              <div className="db-att-cards-grid">
                {todayAttendance.map((item) => (
                  <div
                    key={item.id}
                    className="db-att-item-card"
                    onClick={() => navigate('/attendance')}
                  >
                    {item.avatar ? (
                      <img
                        src={item.avatar}
                        alt={item.name}
                        className="db-att-item-avatar"
                      />
                    ) : (
                      <div className="db-att-item-avatar-placeholder">
                        {item.name.slice(0, 2)}
                      </div>
                    )}
                    <div className="db-att-item-info">
                      <span className={`db-att-item-status ${item.statusClass}`}>
                        {item.type}
                      </span>
                      <span className="db-att-item-meta">
                        {item.name} {item.date} {item.time}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Group: Hôm qua */}
            <div className="db-att-group-title-bar">Hôm qua</div>
            {yesterdayAttendance.length === 0 ? (
              <p style={{ color: '#666671', padding: '12px 18px', margin: 0 }}>
                Không có thông báo vi phạm chấm công hôm qua.
              </p>
            ) : (
              <div className="db-att-cards-grid">
                {yesterdayAttendance.map((item) => (
                  <div
                    key={item.id}
                    className="db-att-item-card"
                    onClick={() => navigate('/attendance')}
                  >
                    {item.avatar ? (
                      <img
                        src={item.avatar}
                        alt={item.name}
                        className="db-att-item-avatar"
                      />
                    ) : (
                      <div className="db-att-item-avatar-placeholder">
                        {item.name.substring(0, 2)}
                      </div>
                    )}
                    <div className="db-att-item-info">
                      <span className={`db-att-item-status ${item.statusClass}`}>
                        {item.type}
                      </span>
                      <span className="db-att-item-meta">
                        {item.name} {item.date} {item.time}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* =================================================================
            3. Tổng quan hôm nay (Today's Overview / KPI Summary)
            ================================================================= */}
        <section className="db-card" id="today-overview">
          <div className="db-card-header">
            <h2 className="db-card-title">Tổng quan hôm nay</h2>
            <div className="db-card-controls">
              <button className="db-control-btn">Hôm nay</button>
              <button
                className="db-cal-icon-btn"
                onClick={() => navigate('/schedule')}
                title="Lịch"
              >
                <img src={iconCalendar} alt="Lịch" />
              </button>
            </div>
          </div>

          <div className="db-kpi-grid">
            {/* KPI 1 */}
            <div className="db-kpi-card">
              <span className="db-kpi-label">Ca trống chưa lấp: {kpis.openShifts}</span>
              <button
                className="db-kpi-link"
                onClick={() => navigate('/schedule')}
              >
                Xem lịch trình hôm nay
              </button>
            </div>

            {/* KPI 2 */}
            <div className="db-kpi-card">
              <span className="db-kpi-label">Độ phủ ca: {kpis.shiftCoverage}</span>
              <button
                className="db-kpi-link"
                onClick={() => navigate('/schedule')}
              >
                Xem lịch trình hôm nay
              </button>
            </div>

            {/* KPI 3 */}
            <div className="db-kpi-card">
              <span className="db-kpi-label">Chi phí lao động: {kpis.laborCost}</span>
            </div>

            {/* KPI 4 */}
            <div className="db-kpi-card">
              <span className="db-kpi-label">Tỷ lệ đi trễ: {kpis.lateRate}</span>
              <button
                className="db-kpi-link"
                onClick={() => navigate('/attendance')}
              >
                Xem lịch trình hôm nay
              </button>
            </div>

            {/* KPI 5 */}
            <div className="db-kpi-card">
              <span className="db-kpi-label">Tỷ lệ vắng mặt: {kpis.absentRate}</span>
              <button
                className="db-kpi-link"
                onClick={() => navigate('/attendance')}
              >
                Xem lịch trình hôm nay
              </button>
            </div>

            {/* KPI 6 */}
            <div className="db-kpi-card">
              <span className="db-kpi-label">Cần duyệt: {kpis.pendingRequests}</span>
              <button
                className="db-kpi-link"
                onClick={() => navigate('/requests')}
              >
                Xem yêu cầu đang chờ xử lý
              </button>
            </div>
          </div>
        </section>

        {/* =================================================================
            4. Ca làm việc được phân công (Assigned Shifts - Stacked Bar Chart)
            ================================================================= */}
        <section className="db-card" id="assigned-shifts">
          <div className="db-card-header">
            <h2 className="db-card-title">Ca làm việc được phân công</h2>
            <div className="db-card-controls">
              <button className="db-cal-icon-btn" title="Lọc ngày">
                <img src={iconCalendar} alt="Lịch" />
              </button>
              <span className="db-control-btn" style={{ cursor: 'default', opacity: 0.7 }}>
                {filterDateMode === 'today' ? 'Hôm nay' : filterCustomDate}
              </span>
            </div>
          </div>

          <div className="db-assigned-layout">
            {/* Chart Area */}
            <div className="db-chart-left">
              <div className="db-stacked-chart-container">
                {/* Y-Axis scale numbers */}
                <div className="db-y-axis">
                  <span>9</span>
                  <span>7</span>
                  <span>5</span>
                  <span>3</span>
                  <span>2</span>
                  <span>1</span>
                </div>

                {/* Bars */}
                <div className="db-bars-area">
                  {stackedChartDays.map((col, idx) => {
                    const isHovered = hoveredBarIndex === idx;
                    const totalSegmentsVal = col.segments.reduce((acc, s) => acc + s.val, 0);
                    const totalHeightPx = Math.min(220, Math.max(col.total * 24, totalSegmentsVal * 28));

                    return (
                      <div
                        key={col.date}
                        className="db-bar-column"
                        onMouseEnter={() => setHoveredBarIndex(idx)}
                        onMouseLeave={() => setHoveredBarIndex(null)}
                      >
                        <span className="db-bar-total-num">{col.total}</span>

                        {/* Tooltip on hover */}
                        {isHovered && (
                          <div className="db-bar-tooltip">
                            <div className="db-bar-tooltip-title">{col.date}</div>
                            <div className="db-bar-tooltip-item">
                              <span>Cashier :</span>
                              <strong>{col.breakdown.cashier}</strong>
                            </div>
                            <div className="db-bar-tooltip-item">
                              <span>Barista :</span>
                              <strong>{col.breakdown.barista}</strong>
                            </div>
                            <div className="db-bar-tooltip-item">
                              <span>Server :</span>
                              <strong>{col.breakdown.server}</strong>
                            </div>
                            <div className="db-bar-tooltip-item">
                              <span>Parking Staff :</span>
                              <strong>{col.breakdown.parking}</strong>
                            </div>
                          </div>
                        )}

                        <div
                          className="db-stacked-bar"
                          style={{ height: `${Math.max(16, totalHeightPx)}px` }}
                        >
                          {col.segments.length === 0 ? (
                            <div
                              className="db-bar-segment"
                              style={{ height: '100%', backgroundColor: '#E2E8F0' }}
                            />
                          ) : (
                            col.segments.map((seg, sIdx) => (
                              <div
                                key={sIdx}
                                className="db-bar-segment"
                                style={{
                                  height: `${seg.val * 28}px`,
                                  backgroundColor: seg.color
                                }}
                              />
                            ))
                          )}
                        </div>

                        <span className="db-bar-date-label">{col.date}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Legend Container — dynamic from store skills */}
            <div className="db-legend-box">
              <div className="db-legend-title-bar">Vị trí</div>
              <div className="db-legend-list">
                {currentStoreSkills.length > 0 ? (
                  currentStoreSkills.map((sk) => {
                    const color = (sk.description && sk.description.startsWith('#'))
                      ? sk.description
                      : getPositionColor(sk.name);
                    return (
                      <div
                        key={sk.id}
                        className={`db-legend-item ${filterPosition === sk.name ? 'active-legend' : ''}`}
                        onClick={() => setFilterPosition(filterPosition === sk.name ? 'ALL' : sk.name)}
                        style={{ cursor: 'pointer' }}
                        title={`Lọc: ${sk.name}`}
                      >
                        <div className="db-legend-dot" style={{ backgroundColor: color }} />
                        <span>{sk.name}</span>
                      </div>
                    );
                  })
                ) : (
                  // Fallback static legend nếu chưa load skills
                  ['#D97FB2', '#5BC8B8', '#C8C84A', '#D98080'].map((c, i) => (
                    <div key={i} className="db-legend-item">
                      <div className="db-legend-dot" style={{ backgroundColor: c }} />
                      <span>Vị trí {i + 1}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        {/* =================================================================
            5. Dự báo lương (Salary Forecast - Accurate Smooth SVG Chart)
            ================================================================= */}
        <section className="db-card" id="salary-forecast">
          <div className="db-card-header">
            <h2 className="db-card-title">Dự báo lương</h2>
            <div className="db-card-controls">
              <button className="db-cal-icon-btn" title="Chọn khoảng thời gian">
                <img src={iconCalendar} alt="Lịch" />
              </button>
              <button className="db-control-btn">Hôm nay</button>
              <button className="db-control-btn">Nhân Viên</button>
              <button className="db-export-btn" onClick={handleExportSalary}>
                Xuất
              </button>
            </div>
          </div>

          <div className="db-salary-stats-bar">
            <div className="db-salary-stat-item">Lịch xếp: {totalSchedWeek} giờ</div>
            <div className="db-salary-stat-item">Thực làm: {totalActualWeek} giờ</div>
          </div>

          {/* SVG Smooth Curve Line Chart */}
          <div className="db-salary-chart-wrap">
            <svg
              className="db-salary-svg"
              viewBox="0 0 920 300"
              preserveAspectRatio="none"
            >
              {/* Horizontal Grid lines */}
              {[
                { y: 30, val: 8 },
                { y: 77.5, val: 6 },
                { y: 125, val: 4 },
                { y: 172.5, val: 2 },
                { y: 220, val: 0 }
              ].map((grid, i) => (
                <g key={`grid-${i}`}>
                  <line
                    x1="60"
                    y1={grid.y}
                    x2="880"
                    y2={grid.y}
                    stroke="rgba(188, 182, 183, 0.35)"
                    strokeWidth={grid.val === 0 ? "1.5" : "1"}
                  />
                  <text
                    x="35"
                    y={grid.y + 4}
                    fill="#666671"
                    fontSize="13"
                    fontWeight="500"
                    textAnchor="middle"
                  >
                    {grid.val}
                  </text>
                </g>
              ))}

              {/* Green Line Path: Lịch xếp (Smoothly passes through EVERY scheduled point) */}
              {scheduledSvgPath && (
                <path
                  d={scheduledSvgPath}
                  fill="none"
                  stroke="#469034"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Blue Line Path: Thực làm (Smoothly passes through EVERY actual point) */}
              {actualSvgPath && (
                <path
                  d={actualSvgPath}
                  fill="none"
                  stroke="#3B82F6"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Green Data Point Circles (Mathematically on the green curve) */}
              {scheduledPoints.map((pt, idx) => (
                <g
                  key={`sched-pt-${idx}`}
                  onMouseEnter={() => setHoveredLineIndex({ x: pt.x, y: pt.y, scheduled: pt.hours, date: pt.date })}
                  onMouseLeave={() => setHoveredLineIndex(null)}
                  style={{ cursor: 'pointer' }}
                >
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={hoveredLineIndex?.date === pt.date ? 6 : 4.5}
                    fill="#FFFFFF"
                    stroke="#469034"
                    strokeWidth="2.5"
                  />
                </g>
              ))}

              {/* Blue Data Point Circles (Mathematically on the blue curve) */}
              {actualPoints.map((pt, idx) => (
                <g
                  key={`act-pt-${idx}`}
                  onMouseEnter={() => setHoveredLineIndex({ x: pt.x, y: pt.y, actual: pt.hours, date: pt.date })}
                  onMouseLeave={() => setHoveredLineIndex(null)}
                  style={{ cursor: 'pointer' }}
                >
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={hoveredLineIndex?.date === pt.date ? 6 : 4.5}
                    fill="#FFFFFF"
                    stroke="#3B82F6"
                    strokeWidth="2.5"
                  />
                </g>
              ))}

              {/* X Axis Date labels (Positioned cleanly at y=260, well below the 0 baseline line) */}
              {salaryDates.map((dStr, idx) => {
                const xPos = 80 + idx * 130;
                return (
                  <text
                    key={`date-lbl-${idx}`}
                    x={xPos}
                    y="262"
                    fill="#666671"
                    fontSize="14"
                    fontWeight="500"
                    textAnchor="middle"
                  >
                    {dStr}
                  </text>
                );
              })}
            </svg>

            {/* Hover Tooltip for Line Chart */}
            {hoveredLineIndex && (
              <div
                className="db-line-tooltip"
                style={{
                  left: `${(hoveredLineIndex.x / 920) * 100}%`,
                  top: `${(hoveredLineIndex.y / 300) * 100}%`
                }}
              >
                <div className="db-line-tooltip-date">{hoveredLineIndex.date}</div>
                {hoveredLineIndex.scheduled !== undefined && (
                  <div className="db-line-tooltip-row" style={{ color: '#469034' }}>
                    <span>Lịch xếp:</span>
                    <strong>{hoveredLineIndex.scheduled} giờ</strong>
                  </div>
                )}
                {hoveredLineIndex.actual !== undefined && (
                  <div className="db-line-tooltip-row" style={{ color: '#3B82F6' }}>
                    <span>Thực làm:</span>
                    <strong>{hoveredLineIndex.actual} giờ</strong>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="db-chart-legend-bottom">
            <div className="db-chart-legend-item">
              <div
                className="db-line-dot-indicator"
                style={{ backgroundColor: '#469034' }}
              />
              <span>Lịch xếp</span>
            </div>
            <div className="db-chart-legend-item">
              <div
                className="db-line-dot-indicator"
                style={{ backgroundColor: '#3B82F6' }}
              />
              <span>Thực làm</span>
            </div>
          </div>
        </section>

        {/* =================================================================
            6. Yêu cầu (Requests Breakdown)
            ================================================================= */}
        <section className="db-card" id="dashboard-requests">
          <div className="db-card-header">
            <h2 className="db-card-title">Yêu cầu</h2>
            <div className="db-card-controls">
              <button
                className="db-cal-icon-btn"
                onClick={() => navigate('/requests')}
                title="Lịch yêu cầu"
              >
                <img src={iconCalendar} alt="Lịch" />
              </button>
              <button className="db-control-btn">Hôm nay</button>
              <button className="db-control-btn">Nhân viên</button>
            </div>
          </div>

          <div className="db-requests-list">
            {requestCategoryCounts.map((item) => (
              <div
                key={item.id}
                className="db-request-row"
                onClick={() => navigate(`/requests?tab=${item.filterKey}`)}
              >
                <div className="db-request-left">
                  <span className={`db-req-pill ${item.pillClass}`}>
                    {item.title}
                  </span>
                  <span className="db-req-desc">{item.desc}</span>
                </div>
                <div className={`db-req-count-circle ${item.countClass}`}>
                  {item.count}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}