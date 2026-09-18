import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllStores } from '../services/storeService';
import { getEmployees } from '../services/employeeService';
import { getShiftsForStore } from '../services/shiftService';
import { getRequests } from '../services/requestService';
import { getStoreAttendance } from '../services/attendanceService';
import { getSkillsByStore } from '../services/skillService';
import { getStoreLayout, getStoreZones } from '../services/layoutService';
import DashboardSpatialSummary from '../components/spatial/DashboardSpatialSummary';
import Avatar3DWeb from '../components/Avatar3DWeb';
import { getAvatarForEmployee } from '../components/avatarConfigs';
import iconCalendar from '../assets/icons/icon-calendar.png';
import './DashboardPage.css';

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
  const [selectedStoreId, setSelectedStoreId] = useState(() => localStorage.getItem('selectedStoreId') || localStorage.getItem('storeId') || '');
  const [employees, setEmployees] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [attendanceList, setAttendanceList] = useState([]);
  const [storeLayout, setStoreLayout] = useState(null);
  const [storeZones, setStoreZones] = useState([]);
  const [requestsList, setRequestsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');

  // Section-specific filter states (No icons, independent per section)
  // Section 1: Lịch làm việc hôm nay
  const [filterS1DateMode, setFilterS1DateMode] = useState('today');
  const [filterS1CustomDate, setFilterS1CustomDate] = useState('');
  const [filterS1Employee, setFilterS1Employee] = useState('ALL');
  const [filterS1WeekOffset, setFilterS1WeekOffset] = useState(0);

  // Section 2: Thông báo chấm công
  const [filterS2DateMode, setFilterS2DateMode] = useState('today');
  const [filterS2CustomDate, setFilterS2CustomDate] = useState('');
  const [filterS2Employee, setFilterS2Employee] = useState('ALL');
  const [filterS2WeekOffset, setFilterS2WeekOffset] = useState(0);

  // Section 3: Tổng quan hôm nay
  const [filterS3DateMode, setFilterS3DateMode] = useState('today');
  const [filterS3CustomDate, setFilterS3CustomDate] = useState('');
  const [filterS3Employee, setFilterS3Employee] = useState('ALL');
  const [filterS3WeekOffset, setFilterS3WeekOffset] = useState(0);

  // Section 4: Ca làm việc được phân công
  const [filterS4DateMode, setFilterS4DateMode] = useState('week');
  const [filterS4CustomDate, setFilterS4CustomDate] = useState('');
  const [filterS4Employee, setFilterS4Employee] = useState('ALL');
  const [filterS4Position, setFilterS4Position] = useState('ALL');
  const [filterS4WeekOffset, setFilterS4WeekOffset] = useState(0);

  // Section 5: Dự báo lương
  const [filterS5DateMode, setFilterS5DateMode] = useState('week');
  const [filterS5CustomDate, setFilterS5CustomDate] = useState('');
  const [filterS5Employee, setFilterS5Employee] = useState('ALL');
  const [filterS5WeekOffset, setFilterS5WeekOffset] = useState(0);

  // Section 6: Yêu cầu
  const [filterS6DateMode, setFilterS6DateMode] = useState('today');
  const [filterS6CustomDate, setFilterS6CustomDate] = useState('');
  const [filterS6Employee, setFilterS6Employee] = useState('ALL');
  const [filterS6WeekOffset, setFilterS6WeekOffset] = useState(0);

  // Store skills map: { storeId: [{id, name, description(color)}] }
  const [storeSkillMap, setStoreSkillMap] = useState({});

  // Interactive Hover / Tooltip states
  const [hoveredBarIndex, setHoveredBarIndex] = useState(null);
  const [hoveredLineIndex, setHoveredLineIndex] = useState(null);

  const toastTimerRef = useRef(null);

  const today = useMemo(() => new Date(), []);
  const todayISO = fmtISO(today);

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
        const attRes = await getStoreAttendance(selectedStoreId);
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
  }, [selectedStoreId]);

  // Realtime WebSocket event listeners for instant dashboard sync
  const reloadDashboardData = useCallback(async () => {
    if (!selectedStoreId) return;
    try {
      const [shiftRes, attRes, reqRes] = await Promise.allSettled([
        getShiftsForStore(selectedStoreId),
        getStoreAttendance(selectedStoreId),
        getRequests(),
      ]);
      if (shiftRes.status === 'fulfilled') {
        const d = Array.isArray(shiftRes.value.data) ? shiftRes.value.data : (shiftRes.value.data?.content || []);
        setShifts(d);
      }
      if (attRes.status === 'fulfilled') {
        const d = Array.isArray(attRes.value.data) ? attRes.value.data : (attRes.value.data?.content || []);
        setAttendanceList(d);
      }
      if (reqRes.status === 'fulfilled') {
        setRequestsList(reqRes.value || []);
      }
    } catch {}
  }, [selectedStoreId]);

  useEffect(() => {
    window.addEventListener('store_shifts_updated', reloadDashboardData);
    window.addEventListener('store_attendance_updated', reloadDashboardData);
    window.addEventListener('store_requests_updated', reloadDashboardData);
    window.addEventListener('notification_received', reloadDashboardData);
    return () => {
      window.removeEventListener('store_shifts_updated', reloadDashboardData);
      window.removeEventListener('store_attendance_updated', reloadDashboardData);
      window.removeEventListener('store_requests_updated', reloadDashboardData);
      window.removeEventListener('notification_received', reloadDashboardData);
    };
  }, [reloadDashboardData]);

  // 3. Load skills for selected store → build skill color map
  useEffect(() => {
    if (!selectedStoreId) return;
    if (storeSkillMap[selectedStoreId]) return;
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
    try {
      const headers = ['Ngày', 'Lịch xếp (giờ)', 'Thực làm (giờ)'];
      const rows = salaryDates.map((d, i) => [d, scheduledPoints[i]?.hours || 0, actualPoints[i]?.hours || 0]);
      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Du_Bao_Luong_${selectedStoreId || 'store'}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      showToast('Đã xuất báo cáo dự báo lương (.csv) thành công!');
    } catch (e) {
      navigate('/payroll');
    }
  };

  const getPositionColor = useCallback((skillName) => {
    const sName = (skillName || '').toLowerCase().trim();

    // 1. Prioritize configured store skills (Image 2 - single source of truth)
    const skills = storeSkillMap[selectedStoreId] || [];
    const skill = skills.find((sk) => {
      const n = (sk.name || '').toLowerCase().trim();
      return n === sName || sName.includes(n) || n.includes(sName);
    });
    if (skill && skill.description && skill.description.startsWith('#')) {
      return skill.description;
    }

    // 2. Standard preset palette fallback
    const PRESET_COLORS = [
      '#8DD9CC', '#F4A8C4', '#A5B4FC', '#FDBA74',
      '#93C5FD', '#FDE68A', '#C4B5FD', '#86EFAC',
    ];
    if (sName && sName !== 'nhân viên' && sName !== 'staff') {
      return PRESET_COLORS[[...sName].reduce((a, c) => a + c.charCodeAt(0), 0) % PRESET_COLORS.length];
    }
    return skills[0]?.description && skills[0].description.startsWith('#') ? skills[0].description : PRESET_COLORS[0];
  }, [storeSkillMap, selectedStoreId]);

  /* ── Helper: Resolve Shift Position / Skill Name for Dashboard ── */
  const resolveDashboardPosition = useCallback((shift, assign = null) => {
    // 1. Direct assignment skillName if non-generic
    if (assign?.skillName && assign.skillName !== 'Nhân viên' && assign.skillName !== 'Staff') {
      return assign.skillName;
    }
    // 2. Lookup assignment's requiredSkillId in store skills
    const targetSkillId = assign?.requiredSkillId || assign?.skillId || shift?.skillId;
    const storeSkills = storeSkillMap[selectedStoreId] || [];
    if (targetSkillId && storeSkills.length > 0) {
      const found = storeSkills.find((sk) => String(sk.id) === String(targetSkillId));
      if (found?.name) return found.name;
    }
    // 3. Lookup in shift.skillRequirements
    if (Array.isArray(shift?.skillRequirements) && shift.skillRequirements.length > 0) {
      if (targetSkillId) {
        const foundReq = shift.skillRequirements.find((r) => String(r.skillId) === String(targetSkillId));
        if (foundReq?.skillName) return foundReq.skillName;
      }
      if (shift.skillRequirements.length === 1 && shift.skillRequirements[0]?.skillName) {
        return shift.skillRequirements[0].skillName;
      }
    }
    // 4. Primary skill name from shift
    if (shift?.skillName && shift.skillName !== 'Nhân viên' && shift.skillName !== 'Staff') {
      return shift.skillName;
    }
    // 5. Zone name if indicative of position
    const zone = assign?.zoneName || shift?.zoneName;
    if (zone) {
      const zLower = zone.toLowerCase();
      if (zLower.includes('pha chế') || zLower.includes('barista')) return 'Pha chế';
      if (zLower.includes('thu ngân') || zLower.includes('cashier')) return 'Thu ngân';
      if (zLower.includes('bếp') || zLower.includes('kitchen')) return 'Bếp';
      if (zLower.includes('phục vụ') || zLower.includes('sảnh') || zLower.includes('waiter')) return 'Phục vụ';
      return zone;
    }
    // 6. Check if matched employee has position in employees
    const staffId = assign?.staffId || shift?.staffId;
    if (staffId && Array.isArray(employees)) {
      const matched = employees.find((e) => e.id === staffId || e.staffId === staffId);
      if (matched?.position && matched.position !== 'Nhân viên') return matched.position;
      if (matched?.skillName && matched.skillName !== 'Nhân viên') return matched.skillName;
    }
    // Fallback: If store has skills, take the first skill name or 'Nhân viên'
    if (storeSkills.length > 0 && storeSkills[0]?.name) {
      return storeSkills[0].name;
    }
    return 'Nhân viên';
  }, [storeSkillMap, selectedStoreId, employees]);

  // =========================================================================
  // Section 1 Computations: Lịch làm việc hôm nay (Filtered by S1)
  // =========================================================================
  const s1DateISO = filterS1DateMode === 'today' ? todayISO : (filterS1CustomDate || todayISO);

  const timelineData = useMemo(() => {
    const activeDateShifts = shifts.filter(s => (s.shiftDate === s1DateISO || s.date === s1DateISO));
    const rows = [];

    activeDateShifts.forEach((shift) => {
      const startH = shift.startTime ? parseInt(shift.startTime.slice(0, 2), 10) : 6;
      const endH = shift.endTime ? parseInt(shift.endTime.slice(0, 2), 10) : 14;

      if (shift.shiftAssignments && shift.shiftAssignments.length > 0) {
        shift.shiftAssignments.forEach((assign, aIdx) => {
          const empName = assign.staffName || assign.employeeName || assign.userFullName || 'Nhân viên';
          const assignSkillName = resolveDashboardPosition(shift, assign);
          const assignColor = getPositionColor(assignSkillName);
          if (filterS1Employee !== 'ALL' && empName !== filterS1Employee) return;
          rows.push({
            id: `assign-${shift.id}-${aIdx}`,
            name: empName,
            avatarId: assign.avatarId || getAvatarForEmployee(empName),
            role: assignSkillName,
            startHour: Math.max(6, Math.min(19, startH)),
            endHour: Math.max(6, Math.min(19, endH)),
            color: assignColor,
            timeText: `${shift.startTime?.slice(0, 5) || '06:00'} - ${shift.endTime?.slice(0, 5) || '14:00'}`
          });
        });
      } else if (shift.staffName || shift.staffId) {
        const empName = shift.staffName || 'Nhân viên';
        const roleName = resolveDashboardPosition(shift, null);
        const roleColor = getPositionColor(roleName);
        if (filterS1Employee === 'ALL' || empName === filterS1Employee) {
          rows.push({
            id: `shift-${shift.id}`,
            name: empName,
            avatarId: shift.avatarId || getAvatarForEmployee(empName),
            role: roleName,
            startHour: Math.max(6, Math.min(19, startH)),
            endHour: Math.max(6, Math.min(19, endH)),
            color: roleColor,
            timeText: `${shift.startTime?.slice(0, 5) || '06:00'} - ${shift.endTime?.slice(0, 5) || '14:00'}`
          });
        }
      }
    });

    return rows;
  }, [shifts, s1DateISO, filterS1Employee, getPositionColor, resolveDashboardPosition]);

  // =========================================================================
  // Section 2 Computations: Thông báo chấm công (Filtered by S2)
  // =========================================================================
  const s2DateISO = filterS2DateMode === 'today' ? todayISO : (filterS2CustomDate || todayISO);

  const { todayAttendance, yesterdayAttendance } = useMemo(() => {
    const s2TargetDate = new Date(s2DateISO);
    const s2PrevDate = new Date(s2TargetDate);
    s2PrevDate.setDate(s2PrevDate.getDate() - 1);
    const s2PrevISO = fmtISO(s2PrevDate);

    let filteredAtt = attendanceList;
    if (filterS2Employee !== 'ALL') {
      filteredAtt = filteredAtt.filter(a => {
        const name = a.staffName || a.employeeName || '';
        return name === filterS2Employee;
      });
    }

    const todayItems = filteredAtt.filter(a => (a.shiftDate === s2DateISO || a.date === s2DateISO || a.attendanceDate === s2DateISO));
    const yestItems = filteredAtt.filter(a => (a.shiftDate === s2PrevISO || a.date === s2PrevISO || a.attendanceDate === s2PrevISO));

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
        id: att.id || `att-${idx}`,
        name: empName,
        avatarId: att.avatarId || getAvatarForEmployee(empName),
        type: typeLabel,
        statusClass,
        date: fmtDM(new Date(att.shiftDate || att.date || s2DateISO)),
        time: checkInFormatted ? `(lúc ${checkInFormatted})` : ''
      };
    };

    return {
      todayAttendance: todayItems.map(formatAttItem),
      yesterdayAttendance: yestItems.map(formatAttItem)
    };
  }, [attendanceList, s2DateISO, filterS2Employee]);

  // =========================================================================
  // Section 3 Computations: Tổng quan hôm nay (Filtered by S3)
  // =========================================================================
  const s3DateISO = filterS3DateMode === 'today' ? todayISO : (filterS3CustomDate || todayISO);

  const kpis = useMemo(() => {
    let dayShifts = shifts.filter(s => (s.shiftDate === s3DateISO || s.date === s3DateISO));
    if (filterS3Employee !== 'ALL') {
      dayShifts = dayShifts.filter(s => {
        if (s.staffName === filterS3Employee) return true;
        if (s.shiftAssignments?.some(a => (a.staffName || a.employeeName) === filterS3Employee)) return true;
        return false;
      });
    }

    let openShifts = 0;
    let totalRequired = 0;
    let totalAssigned = 0;
    let totalScheduledHours = 0;

    dayShifts.forEach(s => {
      const required = s.requiredStaff || 1;
      const assigned = (s.shiftAssignments && s.shiftAssignments.length) || (s.staffId ? 1 : 0);
      totalRequired += required;
      totalAssigned += assigned;
      if (assigned < required) {
        openShifts += (required - assigned);
      }

      if (s.startTime && s.endTime) {
        const startH = parseInt(s.startTime.slice(0, 2), 10);
        const endH = parseInt(s.endTime.slice(0, 2), 10);
        const dur = Math.max(0, endH - startH);
        totalScheduledHours += dur * Math.max(1, assigned);
      }
    });

    const shiftCoverage = totalRequired > 0 ? Math.round((totalAssigned / totalRequired) * 100) : 100;
    const laborCost = totalScheduledHours > 0 ? (totalScheduledHours * 30000).toLocaleString('vi-VN') + ' đ' : '0 đ';

    let todayAtt = attendanceList.filter(a => (a.shiftDate === s3DateISO || a.date === s3DateISO));
    if (filterS3Employee !== 'ALL') {
      todayAtt = todayAtt.filter(a => (a.staffName || a.employeeName) === filterS3Employee);
    }
    const lateAtt = todayAtt.filter(a => a.status === 'LATE');
    const absentAtt = todayAtt.filter(a => a.status === 'ABSENT');

    const lateRate = todayAtt.length > 0 ? ((lateAtt.length / todayAtt.length) * 100).toFixed(1) + '%' : '0.0%';
    const absentRate = totalAssigned > 0 ? ((absentAtt.length / totalAssigned) * 100).toFixed(1) + '%' : '0.0%';

    let filteredReqs = requestsList;
    if (filterS3Employee !== 'ALL') {
      filteredReqs = filteredReqs.filter(r => (r.staffName || r.employeeName || r.userFullName) === filterS3Employee);
    }
    const pendingRequests = filteredReqs.filter(r => r.status === 'Đang chờ phê duyệt' || r.status === 'PENDING').length;

    return {
      openShifts: `${openShifts} ca`,
      shiftCoverage: `${shiftCoverage}%`,
      laborCost,
      lateRate,
      absentRate,
      pendingRequests: `${pendingRequests} yêu cầu`
    };
  }, [shifts, attendanceList, requestsList, s3DateISO, filterS3Employee]);

  // =========================================================================
  // Section 4 Computations: Ca làm việc được phân công (Filtered by S4)
  // =========================================================================
  const currentStoreSkills = useMemo(() => {
    return (storeSkillMap[selectedStoreId] || []);
  }, [storeSkillMap, selectedStoreId]);

  const s4DateObj = useMemo(() => {
    const base = filterS4DateMode === 'custom' && filterS4CustomDate
      ? new Date(filterS4CustomDate)
      : new Date();
    const d = new Date(base);
    d.setDate(d.getDate() + filterS4WeekOffset * 7);
    return d;
  }, [filterS4DateMode, filterS4CustomDate, filterS4WeekOffset]);

  const s4WeekDates = useMemo(() => getWeekDates(s4DateObj), [s4DateObj]);

  const stackedChartDays = useMemo(() => {
    return s4WeekDates.map((dateObj) => {
      const dISO = fmtISO(dateObj);
      let dayShifts = shifts.filter(s => (s.shiftDate === dISO || s.date === dISO));

      if (filterS4Employee !== 'ALL') {
        dayShifts = dayShifts.filter(s => {
          if (s.staffName === filterS4Employee) return true;
          if (s.shiftAssignments?.some(a => (a.staffName || a.employeeName) === filterS4Employee)) return true;
          return false;
        });
      }

      const buckets = {};
      currentStoreSkills.forEach(sk => { buckets[sk.name] = 0; });
      const otherKey = '__other__';
      buckets[otherKey] = 0;

      dayShifts.forEach(s => {
        if (s.shiftAssignments && s.shiftAssignments.length > 0) {
          s.shiftAssignments.forEach(sa => {
            const empName = sa.staffName || sa.employeeName || sa.userFullName;
            if (filterS4Employee !== 'ALL' && empName !== filterS4Employee) return;

            const posName = resolveDashboardPosition(s, sa);
            if (filterS4Position !== 'ALL' && posName && !posName.toLowerCase().includes(filterS4Position.toLowerCase())) return;

            const matchedSkill = currentStoreSkills.find(sk => {
              const n = sk.name.toLowerCase();
              const q = posName.toLowerCase();
              return n === q || q.includes(n) || n.includes(q);
            });

            if (matchedSkill) {
              buckets[matchedSkill.name] = (buckets[matchedSkill.name] || 0) + 1;
            } else {
              buckets[otherKey] = (buckets[otherKey] || 0) + 1;
            }
          });
        } else if (s.skillRequirements && s.skillRequirements.length > 0) {
          s.skillRequirements.forEach(req => {
            const posName = req.skillName || req.name || resolveDashboardPosition(s, null);
            if (filterS4Position !== 'ALL' && posName && !posName.toLowerCase().includes(filterS4Position.toLowerCase())) return;

            const count = req.requiredStaff || req.requiredCount || req.quantity || 1;
            const matchedSkill = currentStoreSkills.find(sk => {
              const n = sk.name.toLowerCase();
              const q = posName.toLowerCase();
              return n === q || q.includes(n) || n.includes(q);
            });

            if (matchedSkill) {
              buckets[matchedSkill.name] = (buckets[matchedSkill.name] || 0) + count;
            } else {
              buckets[otherKey] = (buckets[otherKey] || 0) + count;
            }
          });
        } else {
          if (filterS4Employee !== 'ALL' && s.staffName !== filterS4Employee) return;
          const posName = resolveDashboardPosition(s, null);
          if (filterS4Position !== 'ALL' && posName && !posName.toLowerCase().includes(filterS4Position.toLowerCase())) return;

          const count = s.requiredStaff || 1;
          const matchedSkill = currentStoreSkills.find(sk => {
            const n = sk.name.toLowerCase();
            const q = posName.toLowerCase();
            return n === q || q.includes(n) || n.includes(q);
          });

          if (matchedSkill) {
            buckets[matchedSkill.name] = (buckets[matchedSkill.name] || 0) + count;
          } else {
            buckets[otherKey] = (buckets[otherKey] || 0) + count;
          }
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
  }, [shifts, s4WeekDates, currentStoreSkills, filterS4Employee, filterS4Position, getPositionColor]);

  // =========================================================================
  // Section 5 Computations: Dự báo lương (Filtered by S5)
  // =========================================================================
  const s5DateObj = useMemo(() => {
    const base = filterS5DateMode === 'custom' && filterS5CustomDate
      ? new Date(filterS5CustomDate)
      : new Date();
    const d = new Date(base);
    d.setDate(d.getDate() + filterS5WeekOffset * 7);
    return d;
  }, [filterS5DateMode, filterS5CustomDate, filterS5WeekOffset]);

  const s5WeekDates = useMemo(() => getWeekDates(s5DateObj), [s5DateObj]);

  const {
    salaryDates,
    scheduledPoints,
    actualPoints,
    scheduledSvgPath,
    actualSvgPath,
    totalSchedWeek,
    totalActualWeek
  } = useMemo(() => {
    const dates = s5WeekDates.map(d => fmtDM(d));
    let totalSched = 0;
    let totalAct = 0;

    const rawSched = s5WeekDates.map((dateObj) => {
      const dISO = fmtISO(dateObj);
      let dayShifts = shifts.filter(s => (s.shiftDate === dISO || s.date === dISO));
      if (filterS5Employee !== 'ALL') {
        dayShifts = dayShifts.filter(s => {
          if (s.staffName === filterS5Employee) return true;
          if (s.shiftAssignments?.some(a => (a.staffName || a.employeeName) === filterS5Employee)) return true;
          return false;
        });
      }
      let dayHours = 0;
      dayShifts.forEach(s => {
        if (s.startTime && s.endTime) {
          const startH = parseInt(s.startTime.slice(0, 2), 10);
          const endH = parseInt(s.endTime.slice(0, 2), 10);
          const dur = Math.max(0, endH - startH);
          const numAssigned = (s.shiftAssignments && s.shiftAssignments.length > 0)
            ? s.shiftAssignments.length
            : (s.staffId ? 1 : 1);
          dayHours += dur * numAssigned;
        }
      });
      totalSched += dayHours;
      return dayHours;
    });

    const rawActual = s5WeekDates.map((dateObj) => {
      const dISO = fmtISO(dateObj);
      let dayAtt = attendanceList.filter(a => (a.shiftDate === dISO || a.date === dISO));
      if (filterS5Employee !== 'ALL') {
        dayAtt = dayAtt.filter(a => (a.staffName || a.employeeName) === filterS5Employee);
      }
      let dayHours = 0;
      dayAtt.forEach(a => {
        if (a.checkInTime && a.checkOutTime) {
          const durMs = new Date(a.checkOutTime) - new Date(a.checkInTime);
          const h = Math.max(0, durMs / (1000 * 60 * 60));
          dayHours += h;
        } else if (a.status === 'PRESENT') {
          dayHours += 8;
        }
      });
      totalAct += dayHours;
      return Math.round(dayHours * 10) / 10;
    });

    const maxDataVal = Math.max(...rawSched, ...rawActual, 0);
    const maxVal = Math.max(8, Math.ceil((maxDataVal + 1) / 2) * 2);

    const getYCoord = (h) => {
      const topY = 30;
      const bottomY = 220;
      const clamped = Math.max(0, Math.min(maxVal, h));
      return bottomY - (clamped / maxVal) * (bottomY - topY);
    };

    const schedPts = rawSched.map((h, i) => ({
      x: 80 + i * 130,
      y: getYCoord(h),
      hours: h,
      date: dates[i]
    }));

    const actPts = rawActual.map((h, i) => ({
      x: 80 + i * 130,
      y: getYCoord(h),
      hours: h,
      date: dates[i]
    }));

    return {
      salaryDates: dates,
      scheduledPoints: schedPts,
      actualPoints: actPts,
      scheduledSvgPath: getSvgSmoothPath(schedPts),
      actualSvgPath: getSvgSmoothPath(actPts),
      totalSchedWeek: Math.round(totalSched),
      totalActualWeek: Math.round(totalAct)
    };
  }, [shifts, attendanceList, s5WeekDates, filterS5Employee]);

  // =========================================================================
  // Section 6 Computations: Yêu cầu (Filtered by S6)
  // =========================================================================
  const s6DateISO = filterS6DateMode === 'today' ? todayISO : (filterS6CustomDate || '');

  const requestCategoryCounts = useMemo(() => {
    let attendanceCount = 0;
    let leaveCount = 0;
    let swapCount = 0;
    let payrollCount = 0;

    let targetReqs = requestsList;
    if (filterS6Employee !== 'ALL') {
      targetReqs = targetReqs.filter(r => (r.staffName || r.employeeName || r.userFullName) === filterS6Employee);
    }
    if (s6DateISO) {
      targetReqs = targetReqs.filter(r => {
        const d = r.createdAt || r.date || r.shiftDate || '';
        return d.startsWith(s6DateISO);
      });
    }

    targetReqs.forEach(r => {
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
      { id: 'req-cat-1', title: 'Chấm công', pillClass: 'db-pill-pink', countClass: attendanceCount > 0 ? 'db-count-pink' : 'db-count-zero', desc: 'Điều chỉnh giờ, đi trễ, về sớm, tăng ca.', count: attendanceCount, filterKey: 'attendance' },
      { id: 'req-cat-2', title: 'Nghỉ phép', pillClass: 'db-pill-green', countClass: leaveCount > 0 ? 'db-count-green' : 'db-count-zero', desc: 'Nghỉ phép, nghỉ bệnh, báo vắng.', count: leaveCount, filterKey: 'leave' },
      { id: 'req-cat-3', title: 'Đổi ca', pillClass: 'db-pill-blue', countClass: swapCount > 0 ? 'db-count-blue' : 'db-count-zero', desc: 'Hoán đổi ca, nhận ca trống.', count: swapCount, filterKey: 'swap' },
      { id: 'req-cat-4', title: 'Lương & NS', pillClass: 'db-pill-yellow', countClass: payrollCount > 0 ? 'db-count-yellow' : 'db-count-zero', desc: 'Bảng lương, ứng lương, điều chuyển.', count: payrollCount, filterKey: 'payroll' }
    ];
  }, [requestsList, filterS6Employee, s6DateISO]);

  const currentStoreName = useMemo(() => {
    const s = stores.find(st => String(st.id) === String(selectedStoreId));
    return s ? s.name : '';
  }, [stores, selectedStoreId]);

  return (
    <div className="db-page">
      {toastMessage && <div className="black-toast">{toastMessage}</div>}

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

      <div className="db-container">
        {/* =================================================================
            1. Lịch làm việc hôm nay
            ================================================================= */}
        <section className="db-card" id="today-schedule">
          <div className="db-card-header">
            <h2 className="db-card-title">Lịch làm việc hôm nay</h2>
            <div className="db-card-controls">
              <div className="db-sec-filter">
                <button
                  type="button"
                  className={`db-sec-filter-btn ${filterS1DateMode === 'today' ? 'active' : ''}`}
                  onClick={() => { setFilterS1DateMode('today'); setFilterS1CustomDate(''); }}
                >
                  Hôm nay
                </button>
                <input
                  type="date"
                  className={`db-sec-filter-date ${filterS1DateMode === 'custom' ? 'active' : ''}`}
                  value={filterS1CustomDate}
                  onChange={(e) => {
                    setFilterS1CustomDate(e.target.value);
                    setFilterS1DateMode(e.target.value ? 'custom' : 'today');
                  }}
                  title="Chọn ngày tháng"
                />
                <select
                  className="db-sec-filter-select"
                  value={filterS1Employee}
                  onChange={(e) => setFilterS1Employee(e.target.value)}
                >
                  <option value="ALL">Tất cả nhân viên</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.fullName}>{emp.fullName}</option>
                  ))}
                </select>
              </div>

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
                    <th key={i} className="db-timeline-th-hour">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timelineData.length === 0 ? (
                  <tr>
                    <td colSpan={15} style={{ textAlign: 'center', padding: '36px', color: '#666671' }}>
                      Không có ca làm việc phù hợp với bộ lọc hiện tại.{' '}
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
                            <Avatar3DWeb avatarId={row.avatarId} name={row.name} size={32} className="db-timeline-avatar" />
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
                            {Array.from({ length: 14 }).map((_, idx) => <div key={idx} className="db-timeline-grid-col" />)}
                          </div>
                          <div
                            className="db-shift-bar"
                            style={{
                              left: `${leftPercent}%`,
                              width: `${widthPercent}%`,
                              background: `repeating-linear-gradient(
                                135deg,
                                ${row.color}cc,
                                ${row.color}cc 6px,
                                ${row.color}99 6px,
                                ${row.color}99 12px
                              )`,
                              boxShadow: `0 2px 6px ${row.color}55`,
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
            2. Thông báo chấm công
            ================================================================= */}
        <section className="db-card" id="attendance-notifications">
          <div className="db-card-header">
            <h2 className="db-card-title">Thông báo chấm công</h2>
            <div className="db-card-controls">
              <div className="db-sec-filter">
                <button
                  type="button"
                  className={`db-sec-filter-btn ${filterS2DateMode === 'today' ? 'active' : ''}`}
                  onClick={() => { setFilterS2DateMode('today'); setFilterS2CustomDate(''); }}
                >
                  Hôm nay
                </button>
                <input
                  type="date"
                  className={`db-sec-filter-date ${filterS2DateMode === 'custom' ? 'active' : ''}`}
                  value={filterS2CustomDate}
                  onChange={(e) => {
                    setFilterS2CustomDate(e.target.value);
                    setFilterS2DateMode(e.target.value ? 'custom' : 'today');
                  }}
                  title="Chọn ngày tháng"
                />
                <select
                  className="db-sec-filter-select"
                  value={filterS2Employee}
                  onChange={(e) => setFilterS2Employee(e.target.value)}
                >
                  <option value="ALL">Tất cả nhân viên</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.fullName}>{emp.fullName}</option>
                  ))}
                </select>
              </div>

              <button
                className="db-control-btn"
                onClick={() => navigate('/attendance')}
              >
                Mở bảng chấm công
              </button>
            </div>
          </div>

          <div className="db-att-section">
            <div className="db-att-group-title-bar">
              {filterS2DateMode === 'today' ? 'Hôm nay' : filterS2CustomDate}
            </div>
            {todayAttendance.length === 0 ? (
              <p style={{ color: '#666671', padding: '12px 18px', margin: '0 0 16px 0' }}>
                Không có thông báo chấm công nào cho ngày này.
              </p>
            ) : (
              <div className="db-att-cards-grid">
                {todayAttendance.map((item) => (
                  <div key={item.id} className="db-att-modern-card" onClick={() => navigate('/attendance')}>
                    <div className="db-att-card-avatar-wrap">
                      <Avatar3DWeb avatarId={item.avatarId} size={38} />
                      <span className={`db-att-status-dot dot-${item.statusClass}`} />
                    </div>

                    <div className="db-att-card-content">
                      <div className="db-att-card-top">
                        <span className="db-att-card-name">{item.name}</span>
                        <span className={`db-att-status-pill pill-${item.statusClass}`}>
                          {item.type}
                        </span>
                      </div>
                      <div className="db-att-card-bottom">
                        <span className="db-att-card-time">{item.date} {item.time}</span>
                      </div>
                    </div>
                    <div className="db-att-card-arrow">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="m9 18 6-6-6-6" />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="db-att-group-title-bar">Ngày trước đó</div>
            {yesterdayAttendance.length === 0 ? (
              <p style={{ color: '#666671', padding: '12px 18px', margin: 0 }}>
                Không có thông báo chấm công ngày trước đó.
              </p>
            ) : (
              <div className="db-att-cards-grid">
                {yesterdayAttendance.map((item) => (
                  <div key={item.id} className="db-att-modern-card" onClick={() => navigate('/attendance')}>
                    <div className="db-att-card-avatar-wrap">
                      <Avatar3DWeb avatarId={item.avatarId} size={38} />
                      <span className={`db-att-status-dot dot-${item.statusClass}`} />
                    </div>

                    <div className="db-att-card-content">
                      <div className="db-att-card-top">
                        <span className="db-att-card-name">{item.name}</span>
                        <span className={`db-att-status-pill pill-${item.statusClass}`}>
                          {item.type}
                        </span>
                      </div>
                      <div className="db-att-card-bottom">
                        <span className="db-att-card-time">{item.date} {item.time}</span>
                      </div>
                    </div>
                    <div className="db-att-card-arrow">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="m9 18 6-6-6-6" />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* =================================================================
            3. Tổng quan hôm nay
            ================================================================= */}
        <section className="db-card" id="today-overview">
          <div className="db-card-header">
            <h2 className="db-card-title">Tổng quan hôm nay</h2>
            <div className="db-card-controls">
              <div className="db-sec-filter">
                <button
                  type="button"
                  className={`db-sec-filter-btn ${filterS3DateMode === 'today' ? 'active' : ''}`}
                  onClick={() => { setFilterS3DateMode('today'); setFilterS3CustomDate(''); }}
                >
                  Hôm nay
                </button>
                <input
                  type="date"
                  className={`db-sec-filter-date ${filterS3DateMode === 'custom' ? 'active' : ''}`}
                  value={filterS3CustomDate}
                  onChange={(e) => {
                    setFilterS3CustomDate(e.target.value);
                    setFilterS3DateMode(e.target.value ? 'custom' : 'today');
                  }}
                  title="Chọn ngày tháng"
                />
                <select
                  className="db-sec-filter-select"
                  value={filterS3Employee}
                  onChange={(e) => setFilterS3Employee(e.target.value)}
                >
                  <option value="ALL">Tất cả nhân viên</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.fullName}>{emp.fullName}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="db-kpi-grid">
            <div className="db-kpi-card">
              <span className="db-kpi-label">Ca trống: {kpis.openShifts}</span>
              <button className="db-kpi-link" onClick={() => navigate('/schedule')}>Xem lịch trình &rarr;</button>
            </div>
            <div className="db-kpi-card">
              <span className="db-kpi-label">Độ phủ ca: {kpis.shiftCoverage}</span>
              <button className="db-kpi-link" onClick={() => navigate('/schedule')}>Xem lịch trình &rarr;</button>
            </div>
            <div className="db-kpi-card">
              <span className="db-kpi-label">Chi phí lao động: {kpis.laborCost}</span>
            </div>
            <div className="db-kpi-card">
              <span className="db-kpi-label">Tỷ lệ đi trễ: {kpis.lateRate}</span>
              <button className="db-kpi-link" onClick={() => navigate('/attendance')}>Xem chi tiết &rarr;</button>
            </div>
            <div className="db-kpi-card">
              <span className="db-kpi-label">Tỷ lệ vắng mặt: {kpis.absentRate}</span>
              <button className="db-kpi-link" onClick={() => navigate('/attendance')}>Xem chi tiết &rarr;</button>
            </div>
            <div className="db-kpi-card">
              <span className="db-kpi-label">Cần duyệt: {kpis.pendingRequests}</span>
              <button className="db-kpi-link" onClick={() => navigate('/requests')}>Xem yêu cầu &rarr;</button>
            </div>
          </div>
        </section>

        {/* =================================================================
            4. Ca làm việc được phân công
            ================================================================= */}
        <section className="db-card" id="assigned-shifts">
          <div className="db-card-header">
            <h2 className="db-card-title">Ca làm việc được phân công</h2>
            <div className="db-card-controls">
              <div className="db-sec-filter">
                <button
                  type="button"
                  className={`db-sec-filter-btn ${filterS4DateMode === 'today' ? 'active' : ''}`}
                  onClick={() => { setFilterS4DateMode('today'); setFilterS4CustomDate(''); }}
                >
                  Hôm nay
                </button>
                <input
                  type="date"
                  className={`db-sec-filter-date ${filterS4DateMode === 'custom' ? 'active' : ''}`}
                  value={filterS4CustomDate}
                  onChange={(e) => {
                    setFilterS4CustomDate(e.target.value);
                    setFilterS4DateMode(e.target.value ? 'custom' : 'today');
                  }}
                  title="Chọn tuần theo ngày"
                />
                <select
                  className="db-sec-filter-select"
                  value={filterS4Employee}
                  onChange={(e) => setFilterS4Employee(e.target.value)}
                >
                  <option value="ALL">Tất cả nhân viên</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.fullName}>{emp.fullName}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="db-assigned-layout">
            <div className="db-chart-left">
              <div className="db-stacked-chart-container">
                <div className="db-y-axis">
                  <span>9</span><span>7</span><span>5</span><span>3</span><span>2</span><span>1</span>
                </div>
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
                        {isHovered && (
                          <div className="db-bar-tooltip">
                            <div className="db-bar-tooltip-title">{col.date}</div>
                            {col.segments.map(seg => (
                              <div key={seg.key} className="db-bar-tooltip-item">
                                <span>{seg.key} :</span>
                                <strong>{seg.val}</strong>
                              </div>
                            ))}
                            {col.segments.length === 0 && <div className="db-bar-tooltip-item"><span>Chưa có ca nào</span></div>}
                          </div>
                        )}
                        <div className="db-stacked-bar" style={{ height: `${Math.max(16, totalHeightPx)}px` }}>
                          {col.segments.length === 0 ? (
                            <div className="db-bar-segment" style={{ height: '100%', backgroundColor: '#E2E8F0' }} />
                          ) : (
                            col.segments.map((seg, sIdx) => (
                              <div key={sIdx} className="db-bar-segment" style={{ height: `${seg.val * 28}px`, backgroundColor: seg.color }} />
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

            <div className="db-legend-box">
              <div className="db-legend-title-bar">Vị trí</div>
              <div className="db-legend-list">
                {currentStoreSkills.length > 0 ? (
                  currentStoreSkills.map((sk) => {
                    const color = (sk.description && sk.description.startsWith('#')) ? sk.description : getPositionColor(sk.name);
                    return (
                      <div
                        key={sk.id}
                        className={`db-legend-item ${filterS4Position === sk.name ? 'active-legend' : ''}`}
                        onClick={() => setFilterS4Position(filterS4Position === sk.name ? 'ALL' : sk.name)}
                        style={{ cursor: 'pointer' }}
                        title={`Lọc theo: ${sk.name}`}
                      >
                        <div className="db-legend-dot" style={{ backgroundColor: color }} />
                        <span>{sk.name}</span>
                      </div>
                    );
                  })
                ) : (
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
            5. Dự báo lương
            ================================================================= */}
        <section className="db-card" id="salary-forecast">
          <div className="db-card-header">
            <h2 className="db-card-title">Dự báo lương</h2>
            <div className="db-card-controls">
              <div className="db-sec-filter">
                <button
                  type="button"
                  className={`db-sec-filter-btn ${filterS5DateMode === 'today' ? 'active' : ''}`}
                  onClick={() => { setFilterS5DateMode('today'); setFilterS5CustomDate(''); }}
                >
                  Hôm nay
                </button>
                <input
                  type="date"
                  className={`db-sec-filter-date ${filterS5DateMode === 'custom' ? 'active' : ''}`}
                  value={filterS5CustomDate}
                  onChange={(e) => {
                    setFilterS5CustomDate(e.target.value);
                    setFilterS5DateMode(e.target.value ? 'custom' : 'today');
                  }}
                  title="Chọn tuần theo ngày"
                />
                <select
                  className="db-sec-filter-select"
                  value={filterS5Employee}
                  onChange={(e) => setFilterS5Employee(e.target.value)}
                >
                  <option value="ALL">Tất cả nhân viên</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.fullName}>{emp.fullName}</option>
                  ))}
                </select>
              </div>
              <button className="db-export-btn" onClick={handleExportSalary}>Xuất</button>
            </div>
          </div>

          <div className="db-salary-stats-bar">
            <div className="db-salary-stat-item">Lịch xếp: {totalSchedWeek} giờ</div>
            <div className="db-salary-stat-item">Thực làm: {totalActualWeek} giờ</div>
          </div>

          <div className="db-salary-chart-wrap">
            <svg className="db-salary-svg" viewBox="0 0 920 300" preserveAspectRatio="none">
              {[
                { y: 30, val: 8 },
                { y: 77.5, val: 6 },
                { y: 125, val: 4 },
                { y: 172.5, val: 2 },
                { y: 220, val: 0 }
              ].map((grid, i) => (
                <g key={`grid-${i}`}>
                  <line x1="60" y1={grid.y} x2="880" y2={grid.y} stroke="rgba(188, 182, 183, 0.35)" strokeWidth={grid.val === 0 ? "1.5" : "1"} />
                  <text x="35" y={grid.y + 4} fill="#666671" fontSize="13" fontWeight="500" textAnchor="middle">{grid.val}</text>
                </g>
              ))}
              {scheduledSvgPath && <path d={scheduledSvgPath} fill="none" stroke="#469034" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
              {actualSvgPath && <path d={actualSvgPath} fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
              {scheduledPoints.map((pt, idx) => (
                <g key={`sched-pt-${idx}`} onMouseEnter={() => setHoveredLineIndex({ x: pt.x, y: pt.y, scheduled: pt.hours, date: pt.date })} onMouseLeave={() => setHoveredLineIndex(null)} style={{ cursor: 'pointer' }}>
                  <circle cx={pt.x} cy={pt.y} r={hoveredLineIndex?.date === pt.date ? 6 : 4.5} fill="#FFFFFF" stroke="#469034" strokeWidth="2.5" />
                </g>
              ))}
              {actualPoints.map((pt, idx) => (
                <g key={`act-pt-${idx}`} onMouseEnter={() => setHoveredLineIndex({ x: pt.x, y: pt.y, actual: pt.hours, date: pt.date })} onMouseLeave={() => setHoveredLineIndex(null)} style={{ cursor: 'pointer' }}>
                  <circle cx={pt.x} cy={pt.y} r={hoveredLineIndex?.date === pt.date ? 6 : 4.5} fill="#FFFFFF" stroke="#3B82F6" strokeWidth="2.5" />
                </g>
              ))}
              {salaryDates.map((dStr, idx) => {
                const xPos = 80 + idx * 130;
                return <text key={`date-lbl-${idx}`} x={xPos} y="262" fill="#666671" fontSize="14" fontWeight="500" textAnchor="middle">{dStr}</text>;
              })}
            </svg>
            {hoveredLineIndex && (
              <div className="db-line-tooltip" style={{ left: `${(hoveredLineIndex.x / 920) * 100}%`, top: `${(hoveredLineIndex.y / 300) * 100}%` }}>
                <div className="db-line-tooltip-date">{hoveredLineIndex.date}</div>
                {hoveredLineIndex.scheduled !== undefined && <div className="db-line-tooltip-row" style={{ color: '#469034' }}><span>Lịch xếp:</span><strong>{hoveredLineIndex.scheduled} giờ</strong></div>}
                {hoveredLineIndex.actual !== undefined && <div className="db-line-tooltip-row" style={{ color: '#3B82F6' }}><span>Thực làm:</span><strong>{hoveredLineIndex.actual} giờ</strong></div>}
              </div>
            )}
          </div>
        </section>

        {/* =================================================================
            6. Yêu cầu
            ================================================================= */}
        <section className="db-card" id="dashboard-requests">
          <div className="db-card-header">
            <h2 className="db-card-title">Yêu cầu</h2>
            <div className="db-card-controls">
              <div className="db-sec-filter">
                <button
                  type="button"
                  className={`db-sec-filter-btn ${filterS6DateMode === 'today' ? 'active' : ''}`}
                  onClick={() => { setFilterS6DateMode('today'); setFilterS6CustomDate(''); }}
                >
                  Hôm nay
                </button>
                <input
                  type="date"
                  className={`db-sec-filter-date ${filterS6DateMode === 'custom' ? 'active' : ''}`}
                  value={filterS6CustomDate}
                  onChange={(e) => {
                    setFilterS6CustomDate(e.target.value);
                    setFilterS6DateMode(e.target.value ? 'custom' : 'today');
                  }}
                  title="Chọn ngày tháng"
                />
                <select
                  className="db-sec-filter-select"
                  value={filterS6Employee}
                  onChange={(e) => setFilterS6Employee(e.target.value)}
                >
                  <option value="ALL">Tất cả nhân viên</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.fullName}>{emp.fullName}</option>
                  ))}
                </select>
              </div>
              <button className="db-control-btn" onClick={() => navigate('/requests')}>Quản lý yêu cầu</button>
            </div>
          </div>
          <div className="db-requests-list">
            {requestCategoryCounts.map((item) => (
              <div key={item.id} className="db-request-row" onClick={() => navigate(`/requests?tab=${item.filterKey}`)}>
                <div className="db-request-left">
                  <span className={`db-req-pill ${item.pillClass}`}>{item.title}</span>
                  <span className="db-req-desc">{item.desc}</span>
                </div>
                <div className={`db-req-count-circle ${item.countClass}`}>{item.count}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}