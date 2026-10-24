import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import StaffAvailabilityPage from './StaffAvailabilityPage';
import ShiftRegistrationForm from '../components/ShiftRegistrationForm';
import { getAllStores } from '../services/storeService';
import { getStaffByStore, assignStaffToStore } from '../services/employmentService';
import { getContractTypes } from '../services/contractTypeService';
import { getSkillsByStore, getStaffSkills } from '../services/skillService';
import { getEmployees, updateEmployee } from '../services/employeeService';
import { getShiftsForStore, createShift, updateShift, deleteShift, publishShifts } from '../services/shiftService';
import { getStaffAvailability } from '../services/availabilityService';
import { getStoreLayout, getStoreZones, allocateZonesForShift } from '../services/layoutService';
import Store3DCanvas from '../components/spatial/Store3DCanvas';
import CompactDropdownFilter from '../components/CompactDropdownFilter';
import DemandPlanningModal from '../components/demand-planning/DemandPlanningModal';
import { Compass, Clock, Users } from 'lucide-react';
import iconCard from '../assets/icons/icon-credit-card.png';
import iconAi from '../assets/icons/icon-ai.png';
import iconUser from '../assets/icons/icon-user.png';
import iconLocation from '../assets/icons/location_on.png';
import Avatar3DWeb from '../components/Avatar3DWeb';
import { getAvatarForEmployee } from '../components/avatarConfigs';
import './SchedulePage.css';
import './schedule-redesign.css';
import './shift-form.css';
import api from '../services/api';
import {getStoreConfiguration} from '../services/storeConfigService';
import {newShiftDefaults,validateShiftForm,shiftRegistrationDeadline} from '../utils/shiftForm.js';
import SchedulePlanner from '../features/schedule-planner/SchedulePlanner.jsx';
import AutoSchedulerVisualization from '../features/auto-scheduler/AutoSchedulerVisualization.jsx';
import {shiftsInWindow} from '../features/auto-scheduler/visualizationModel.js';

/* ── Helpers ────────────────────────────────────────────── */
// Pastel colour palette for schedule views
export const PRESET_COLORS = [
  '#8DD9CC', // Pastel Mint / Teal (Barista / Primary)
  '#F4A8C4', // Pastel Rose / Blush Pink (Cashier)
  '#A5B4FC', // Pastel Periwinkle / Lavender (Waiter / Service)
  '#FDBA74', // Pastel Apricot / Soft Peach (Kitchen)
  '#93C5FD', // Pastel Sky Blue (Supervisor / General)
  '#FDE68A', // Pastel Warm Butter Yellow
  '#C4B5FD', // Pastel Soft Violet
  '#86EFAC', // Pastel Soft Sage Green
];
export const SHIFT_COLORS = PRESET_COLORS;

export const ROLE_PASTEL_MAP = {
  barista: '#8DD9CC',
  'pha chế': '#8DD9CC',
  cashier: '#F4A8C4',
  'thu ngân': '#F4A8C4',
  waiter: '#A5B4FC',
  waitress: '#A5B4FC',
  'phục vụ': '#A5B4FC',
  service: '#A5B4FC',
  kitchen: '#FDBA74',
  'bếp': '#FDBA74',
  cook: '#FDBA74',
  supervisor: '#93C5FD',
  'quản lý': '#93C5FD',
  manager: '#93C5FD',
};

export const PASTEL_COLOR_MAP = {
  // Teal / Cyan -> Pastel Mint
  '#5bc8b8': '#8DD9CC',
  '#0d9488': '#8DD9CC',
  '#0f766e': '#8DD9CC',
  '#14b8a6': '#8DD9CC',
  '#059669': '#86EFAC',
  '#10b981': '#86EFAC',
  '#26a69a': '#86EFAC',
  // Pink / Rose / Salmon -> Pastel Rose & Coral
  '#d97fb2': '#F4A8C4',
  '#d98080': '#FDA4AF',
  '#f43f5e': '#FDA4AF',
  '#e11d48': '#FDA4AF',
  // Yellow / Olive / Green-yellow -> Pastel Butter
  '#c8c84a': '#FDE68A',
  '#eab308': '#FDE68A',
  '#ca8a04': '#FDE68A',
  // Blue -> Pastel Sky Blue & Periwinkle
  '#7aa8d9': '#93C5FD',
  '#2563eb': '#93C5FD',
  '#1d4ed8': '#93C5FD',
  '#3b82f6': '#93C5FD',
  '#6ba5e7': '#93C5FD',
  // Orange / Amber -> Pastel Apricot / Peach
  '#ffa726': '#FDBA74',
  '#ea580c': '#FDBA74',
  '#c2410c': '#FDBA74',
  '#f97316': '#FDBA74',
  '#f68e5f': '#FDBA74',
  '#dc2626': '#FCA5A5',
  '#ef4444': '#FCA5A5',
  '#f87171': '#FCA5A5',
  // Purple / Violet -> Pastel Lavender & Periwinkle
  '#ab47bc': '#C4B5FD',
  '#7c3aed': '#C4B5FD',
  '#6d28d9': '#C4B5FD',
  '#8b5cf6': '#C4B5FD',
  '#a284e0': '#C4B5FD',
  '#4f46e5': '#A5B4FC',
  '#6366f1': '#A5B4FC',
  '#818cf8': '#A5B4FC',
};

export const toPastelColor = (hex) => {
  if (!hex || typeof hex !== 'string') return PRESET_COLORS[0];
  const lower = hex.toLowerCase().trim();
  if (PASTEL_COLOR_MAP[lower]) return PASTEL_COLOR_MAP[lower];
  return hex;
};

export const defaultColorFor = (name = '') => {
  if (!name) return PRESET_COLORS[0];
  const lower = name.toLowerCase().trim();
  for (const [key, val] of Object.entries(ROLE_PASTEL_MAP)) {
    if (lower === key || lower.includes(key) || key.includes(lower)) {
      return val;
    }
  }
  return PRESET_COLORS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % PRESET_COLORS.length];
};

export const getSkillColor = (sk) => {
  if (!sk) return PRESET_COLORS[0];
  if (sk.description && sk.description.startsWith('#')) return toPastelColor(sk.description);
  return defaultColorFor(sk.name);
};

const colorFor = (name = '') => defaultColorFor(name);

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

const toISODate = (d) => {
  if (!d) return '';
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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

/* ── Helper: Resolve Shift Position / Skill Name ── */
export const resolveShiftPositionName = (shift, assignment, storeSkills = [], employeeObj = null) => {
  // 1. Direct assignment skillName if non-generic
  if (assignment?.skillName && assignment.skillName !== 'Nhân viên' && assignment.skillName !== 'Staff') {
    return assignment.skillName;
  }
  // 2. Lookup assignment's requiredSkillId in storeSkills
  const skillId = assignment?.requiredSkillId || assignment?.skillId || shift?.skillId;
  if (skillId && Array.isArray(storeSkills) && storeSkills.length > 0) {
    const found = storeSkills.find((sk) => String(sk.id) === String(skillId));
    if (found?.name) return found.name;
  }
  // 3. Lookup in shift.skillRequirements
  if (Array.isArray(shift?.skillRequirements) && shift.skillRequirements.length > 0) {
    if (skillId) {
      const foundReq = shift.skillRequirements.find((r) => String(r.skillId) === String(skillId));
      if (foundReq?.skillName) return foundReq.skillName;
    }
    // If shift has only 1 requirement, all staff in this shift do that position
    if (shift.skillRequirements.length === 1 && shift.skillRequirements[0]?.skillName) {
      return shift.skillRequirements[0].skillName;
    }
    // Match employee skill or position
    if (employeeObj) {
      const empSkillId = employeeObj.skillId;
      const empPos = (employeeObj.position || employeeObj.skillName || '').toLowerCase();
      const matchedReq = shift.skillRequirements.find((r) =>
        (empSkillId && String(r.skillId) === String(empSkillId)) ||
        (r.skillName && empPos.includes(r.skillName.toLowerCase()))
      );
      if (matchedReq?.skillName) return matchedReq.skillName;
    }
    if (shift.skillRequirements[0]?.skillName) {
      return shift.skillRequirements[0].skillName;
    }
  }
  // 4. Primary skill name from shift
  if (shift?.skillName && shift.skillName !== 'Nhân viên' && shift.skillName !== 'Staff') {
    return shift.skillName;
  }
  // 5. Shift location if matching a skill in storeSkills
  if (shift?.location && Array.isArray(storeSkills) && storeSkills.length > 0) {
    const foundByLoc = storeSkills.find((sk) =>
      String(sk.id) === String(shift.location) ||
      sk.name.toLowerCase() === String(shift.location).toLowerCase()
    );
    if (foundByLoc?.name) return foundByLoc.name;
  }
  // 6. Zone name if indicative of position
  const zone = assignment?.zoneName || shift?.zoneName;
  if (zone) {
    const zLower = zone.toLowerCase();
    if (zLower.includes('pha chế') || zLower.includes('barista') || zLower.includes('bar')) return 'Barista';
    if (zLower.includes('thu ngân') || zLower.includes('cashier') || zLower.includes('pos')) return 'Cashier';
    if (zLower.includes('bếp') || zLower.includes('kitchen')) return 'Bếp';
    if (zLower.includes('phục vụ') || zLower.includes('waitress') || zLower.includes('waiter') || zLower.includes('sảnh')) return 'Waitress';
    return zone;
  }
  // 7. Employee position if available
  if (employeeObj) {
    const pos = employeeObj.position || employeeObj.jobTitle || employeeObj.skillName || employeeObj.skill?.name;
    if (pos && pos !== 'Nhân viên' && pos !== 'Staff' && pos !== employeeObj.contractTypeName && pos !== employeeObj.employmentType) {
      return pos;
    }
  }
  // 8. If employee matches any skill name in storeSkills
  if (Array.isArray(storeSkills) && storeSkills.length > 0) {
    if (employeeObj) {
      const empStr = JSON.stringify(employeeObj).toLowerCase();
      const matched = storeSkills.find((sk) => empStr.includes(sk.name.toLowerCase()));
      if (matched) return matched.name;
    }
    if (storeSkills.length === 1) return storeSkills[0].name;
  }
  return 'Nhân viên';
};

/* ── Helper: Resolve Position Color ── */
export const getShiftPositionColor = (shift, emp, storeSkills = []) => {
  // 1. Resolve position name first
  let posName = shift?.positionName || shift?.skillName;
  if (!posName || posName === 'Nhân viên' || posName === 'Staff') {
    posName = resolveShiftPositionName(shift, null, storeSkills, emp);
  }

  // 1.1 Direct match against standard pastel role names
  if (posName && posName !== 'Nhân viên' && posName !== 'Staff') {
    const pLower = posName.toLowerCase().trim();
    for (const [key, val] of Object.entries(ROLE_PASTEL_MAP)) {
      if (pLower === key || pLower.includes(key) || key.includes(pLower)) {
        return val;
      }
    }
  }

  // 2. Look up in storeSkills (from getSkillsByStore) - PRIMARY SOURCE OF TRUTH
  if (Array.isArray(storeSkills) && storeSkills.length > 0) {
    const sSkillId = shift?.skillId || shift?.requiredSkillId || shift?.location;
    if (sSkillId) {
      const foundById = storeSkills.find((sk) => String(sk.id) === String(sSkillId));
      if (foundById) {
        if (foundById.description && foundById.description.startsWith('#')) {
          return toPastelColor(foundById.description);
        }
        return defaultColorFor(foundById.name);
      }
    }
    if (posName && posName !== 'Nhân viên') {
      const pLower = posName.toLowerCase().trim();
      const foundByName = storeSkills.find((sk) => {
        const skLower = sk.name.toLowerCase().trim();
        return skLower === pLower || pLower.includes(skLower) || skLower.includes(pLower);
      });
      if (foundByName) {
        if (foundByName.description && foundByName.description.startsWith('#')) {
          return toPastelColor(foundByName.description);
        }
        return defaultColorFor(foundByName.name);
      }
    }
  }

  // 3. Fallback to shift custom color if valid
  if (shift?.color && shift.color.startsWith('#')) {
    return toPastelColor(shift.color);
  }

  // 4. Default color for position name using PRESET_COLORS
  if (posName && posName !== 'Nhân viên') {
    return defaultColorFor(posName);
  }

  // 5. Fallback to first skill in store
  if (Array.isArray(storeSkills) && storeSkills.length > 0) {
    const firstSk = storeSkills[0];
    if (firstSk.description && firstSk.description.startsWith('#')) return toPastelColor(firstSk.description);
    return defaultColorFor(firstSk.name);
  }

  return PRESET_COLORS[0];
};

/* ── Component ────────────────────────────────────────────── */
export default function SchedulePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const userRole = localStorage.getItem('userRole') || 'STAFF';
  const isManager = userRole === 'MANAGER' || userRole === 'ADMIN';

  /* -- Sub-tab: "Lập lịch" vs "Khả dụng nhân viên" -- */
  const [scheduleSubTab, setScheduleSubTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') === 'availability' ? 'availability' : 'board';
  });

  // Sync subtab when URL changes (e.g. from Header alias click)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab === 'availability') setScheduleSubTab('availability');
    else if (!tab) setScheduleSubTab('board');
  }, [location.search]);

  /* -- data state -- */
  const [stores, setStores] = useState([]);
  const [storeId, setStoreId] = useState(() => localStorage.getItem('selectedStoreId') || localStorage.getItem('storeId') || '');
  const [employees, setEmployees] = useState([]);
  const [skills, setSkills] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [allShifts, setAllShifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');


  /* -- Demand Planning Modal state -- */
  const [showDemandModal, setShowDemandModal] = useState(false);
  const [demandTargetDate, setDemandTargetDate] = useState('');

  /* -- Auto Schedule AI Modal state -- */
  const [showAutoScheduleModal, setShowAutoScheduleModal] = useState(false);

  const [autoScheduleDates, setAutoScheduleDates] = useState({
    startDate: '',
    endDate: '',
  });
  const [autoVisualization, setAutoVisualization] = useState(null);
  const autoVisualizationLock = useRef(false);

  /* -- navigation state -- */
  const [viewMode, setViewMode] = useState(() =>
    new URLSearchParams(location.search).get('view') === '3d' ? '3D' : 'Tuần'
  );
  useEffect(() => {
    if (new URLSearchParams(location.search).get('view') === '3d') {
      setViewMode('3D');
    }
  }, [location.search]);
  const [currentDate, setCurrentDate] = useState(() => new Date());

  /* -- 3D Spatial Computing state -- */
  const [storeLayout, setStoreLayout] = useState({ length: 24, width: 16, height: 5 });
  const [storeZones, setStoreZones] = useState([]);
  const [selected3DShiftId, setSelected3DShiftId] = useState(null);
  const [isAllocating3D, setIsAllocating3D] = useState(false);
  const [allocatedSequence, setAllocatedSequence] = useState([]);
  const [spatialPerspectiveMode, setSpatialPerspectiveMode] = useState('3D'); // '3D' | 'SPLIT'

  /* -- filter state: Compact Dropdown Filter -- */
  const [selectedSkills, setSelectedSkills] = useState(['ALL']);
  const [selectedEmployees, setSelectedEmployees] = useState(['ALL']);
  const [staffWithAvailability, setStaffWithAvailability] = useState(new Set());


  /* -- popover for shift chip -- */
  const [autoScheduling, setAutoScheduling] = useState(false);
  const [menuFor, setMenuFor] = useState(null); // { empId, dateIso, shift }

  /* -- edit mode for shift modal -- */
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [editingShift, setEditingShift] = useState(null); // shift being edited

  /* -- "Tạo lịch" modal -- */
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const registerModalRef=useRef(null),shiftSubmitRef=useRef(false);
  const [savingShift,setSavingShift]=useState(false),[registerTemplates,setRegisterTemplates]=useState([]),[registerTemplateState,setRegisterTemplateState]=useState('loading'),[attendanceConfig,setAttendanceConfig]=useState(null);
  const closeRegisterModal=()=>{if(shiftSubmitRef.current)return;setShowRegisterModal(false);setEditingShift(null);};
  useEffect(()=>{
    if(!showRegisterModal||!storeId)return;
    const abort=new AbortController();
    setRegisterTemplateState('loading');setRegisterTemplates([]);setAttendanceConfig(null);
    api.get(`/stores/${storeId}/shift-templates`,{signal:abort.signal}).then(({data})=>{if(!abort.signal.aborted){setRegisterTemplates(Array.isArray(data)?data.filter(t=>t.isActive!==false):[]);setRegisterTemplateState('ready');}}).catch(()=>{if(!abort.signal.aborted)setRegisterTemplateState('error');});
    getStoreConfiguration(storeId).then(({data})=>{if(!abort.signal.aborted)setAttendanceConfig(data);}).catch(()=>{});
    return()=>abort.abort();
  },[showRegisterModal,storeId]);
  useEffect(()=>{
    if(!showRegisterModal)return;
    const previous=document.activeElement,overflow=document.body.style.overflow;
    document.body.style.overflow='hidden';registerModalRef.current?.querySelector('button')?.focus();
    const keyboard=e=>{
      if(e.key==='Escape'&&!shiftSubmitRef.current){e.preventDefault();setShowRegisterModal(false);}
      if(e.key!=='Tab')return;
      const nodes=[...registerModalRef.current.querySelectorAll('button,input,select,textarea,a[href],summary')].filter(n=>!n.disabled&&n.getClientRects().length);
      if(e.shiftKey&&document.activeElement===nodes[0]){e.preventDefault();nodes.at(-1)?.focus();}
      else if(!e.shiftKey&&document.activeElement===nodes.at(-1)){e.preventDefault();nodes[0]?.focus();}
    };
    document.addEventListener('keydown',keyboard);
    return()=>{document.removeEventListener('keydown',keyboard);document.body.style.overflow=overflow;previous?.isConnected&&previous.focus();};
  },[showRegisterModal]);
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
  const weekDatesFull = useMemo(() => getWeekDates(currentDate), [currentDate]);
  useEffect(()=>{
    const params=new URLSearchParams(location.search);
    if(params.get('action')!=='auto')return;
    setAutoScheduleDates({startDate:toISODate(weekDatesFull[0]),endDate:toISODate(weekDatesFull.at(-1))});
    setShowAutoScheduleModal(true);
    params.delete('action');
    navigate({pathname:location.pathname,search:params.toString()},{replace:true});
  },[location.pathname,location.search,navigate,weekDatesFull]);
  const today = currentDate;
  const displayedDates = viewMode === 'Ngày' ? [currentDate] : weekDatesFull;

  /* ── Date Navigator & Calendar Popover Handlers ── */
  const openCalendarPopover = () => {
    setCalMonth(currentDate.getMonth());
    setCalYear(currentDate.getFullYear());
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
    const d = new Date(currentDate);
    if (viewMode === 'Ngày' || viewMode === '3D') {
      d.setDate(d.getDate() - 1);
    } else {
      d.setDate(d.getDate() - 7);
    }
    setCurrentDate(d);
  };

  const handleNextDate = () => {
    const d = new Date(currentDate);
    if (viewMode === 'Ngày' || viewMode === '3D') {
      d.setDate(d.getDate() + 1);
    } else {
      d.setDate(d.getDate() + 7);
    }
    setCurrentDate(d);
  };

  const handleTodayClick = () => {
    setCurrentDate(new Date());
  };

  const handleSelectWeek = (targetDate) => {
    setCurrentDate(new Date(targetDate));
    setViewMode('Tuần');
    setShowCalendarPopover(false);
  };

  const handleSelectSpecificDay = (targetDate) => {
    setCurrentDate(new Date(targetDate));
    setViewMode('Ngày');
    setShowCalendarPopover(false);
  };

  const handleCalendarDayClick = (date) => {
    setCurrentDate(new Date(date.getFullYear(), date.getMonth(), date.getDate()));
    setShowCalendarPopover(false);
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

  /* ── Real-time sync: lắng nghe khi trang khác duyệt request ── */
  useEffect(() => {
    const handleStorageSync = (e) => {
      if (e.key === 'shiftsync_schedule_refresh') {
        loadData();
      }
    };
    window.addEventListener('storage', handleStorageSync);
    return () => window.removeEventListener('storage', handleStorageSync);
  }, [storeId]); // eslint-disable-line

  const handleStoreChange = (nextStoreId) => {
    if (String(nextStoreId) === String(storeId)) return;
    if (!stores.some(store => String(store.id) === String(nextStoreId))) return;
    setStoreId(nextStoreId);
    setSelected3DShiftId(null);
    setStoreZones([]);
    setEmployees([]);
    setAllShifts([]);
    setAssignments({});
    setAllocatedSequence([]);
    localStorage.setItem('selectedStoreId', String(nextStoreId));
    window.dispatchEvent(new CustomEvent('storeChanged', { detail: { storeId: nextStoreId } }));
  };

  /* ── Load stores ───────────────────────────────── */
  useEffect(() => {
    getAllStores()
      .then((res) => {
        const list = res.data.content || res.data;
        setStores(list);
        if (list && list.length) {
          const saved = localStorage.getItem('selectedStoreId');
          const target = (saved && list.find((s) => String(s.id) === String(saved))) || list[0];
          setStoreId(target.id);
          localStorage.setItem('selectedStoreId', String(target.id));
        }
      })
      .catch(() => setError('Không tải được danh sách chi nhánh'));
  }, []);

  /* ── Load skills ───────────────────────────────── */
  useEffect(() => {
    if (!storeId) return;
    getSkillsByStore(storeId)
      .then((res) => {
        const data = res.data;
        setSkills(Array.isArray(data) ? data : (data.content || []));
      })
      .catch(() => setSkills([]));
  }, [storeId]);

  /* ── Load 3D Spatial Layout & Zones ───────────────────────────────── */
  useEffect(() => {
    if (!storeId) return;
    getStoreLayout(storeId)
      .then((res) => {
        if (res?.data) {
          setStoreLayout({
            length: Number(res.data.length) || 24,
            width: Number(res.data.width) || 16,
            height: Number(res.data.height) || 5,
          });
        }
      })
      .catch(() => {});

    getStoreZones(storeId)
      .then((res) => {
        setStoreZones(res?.data || []);
      })
      .catch(() => setStoreZones([]));
  }, [storeId]);

  /* ── 3D Spatial Computing Computations ── */
  const active3DDayIndex = useMemo(() => {
    const curIso = toISODate(currentDate);
    const idx = weekDatesFull.findIndex((d) => toISODate(d) === curIso);
    return idx >= 0 ? idx : 0;
  }, [currentDate, weekDatesFull]);

  const active3DDate = currentDate;
  const activeDateShifts = allShifts.filter((s) => s.shiftDate === toISODate(active3DDate) && s.status !== 'CANCELLED');

  const current3DShift = useMemo(() => {
    if (selected3DShiftId) {
      const found = activeDateShifts.find((s) => s.id === selected3DShiftId);
      if (found) return found;
    }
    return activeDateShifts[0] || null;
  }, [activeDateShifts, selected3DShiftId]);

  const active3DStaff = useMemo(() => {
    if (!current3DShift) return [];
    const list = [];
    if (Array.isArray(current3DShift.shiftAssignments) && current3DShift.shiftAssignments.length > 0) {
      current3DShift.shiftAssignments.forEach((assign, idx) => {
        const matchedEmp = employees.find((e) => e.id === assign.staffId);
        const skillName = resolveShiftPositionName(current3DShift, assign, skills, matchedEmp);

        // 1. Dùng zoneId đã lưu trong assignment nếu hợp lệ
        let assignedZoneId = assign.zoneId;
        if (!assignedZoneId || !storeZones.some((z) => z.id === assignedZoneId)) {
          // 2. Tra cứu từ yêu cầu kỹ năng của ca
          const reqMatch = current3DShift.skillRequirements?.find(
            (r) => (r.skillId && r.skillId === (assign.requiredSkillId || assign.skillId)) || (r.skillName && r.skillName === skillName)
          );
          if (reqMatch && reqMatch.zoneId && storeZones.some((z) => z.id === reqMatch.zoneId)) {
            assignedZoneId = reqMatch.zoneId;
          } else {
            const namedZone = storeZones.find(
              (zone) => assign.zoneName && String(zone.name).toLowerCase() === String(assign.zoneName).toLowerCase()
            );
            assignedZoneId = namedZone?.id || null;
          }
        }

        list.push({
          id: assign.id || assign.staffId || `staff-${idx}`,
          staffId: assign.staffId,
          gender: assign.gender ?? matchedEmp?.gender,
          staffName: assign.staffName || matchedEmp?.fullName || 'Nhân viên',
          skillName: skillName,
          zoneId: assignedZoneId,
          zoneName: assign.zoneName || storeZones.find((z) => z.id === assignedZoneId)?.name || null,
          avatarId: getAvatarForEmployee(assign.staffName || matchedEmp?.fullName),
        });
      });
    } else if (current3DShift.staffId) {
      const matchedEmp = employees.find((e) => e.id === current3DShift.staffId);
      const skillName = resolveShiftPositionName(current3DShift, null, skills, matchedEmp);
      list.push({
        id: current3DShift.staffId,
        staffId: current3DShift.staffId,
        staffName: current3DShift.staffName || matchedEmp?.fullName || 'Nhân viên',
        skillName: skillName,
        zoneId: current3DShift.zoneId || null,
        zoneName: current3DShift.zoneName || null,
        avatarId: getAvatarForEmployee(current3DShift.staffName || matchedEmp?.fullName),
      });
    }
    return list;
  }, [current3DShift, employees, skills, storeZones]);

  const handleRunSpatialAllocation = async () => {
    if (!storeId) {
      showToast('Thông báo', 'Vui lòng chọn chi nhánh cửa hàng trước khi phân bổ.');
      return;
    }
    if (!current3DShift) {
      showToast('Thông báo', 'Vui lòng chọn ca làm việc để thực hiện phân bổ vị trí nhân sự.');
      return;
    }
    setIsAllocating3D(true);
    try {
      const res = await allocateZonesForShift(storeId, current3DShift.id);
      if (res?.data) {
        setAllocatedSequence(res.data.assignments || []);
        showToast('Phân bổ không gian 3D', `Đã phân bổ tối ưu ${res.data.assignedCount || active3DStaff.length} nhân sự vào các khu vực theo thuật toán Max-Min Dispersion!`);
        loadData();
      }
    } catch (err) {
      showToast('Lỗi phân bổ', err.response?.data?.message || 'Không thể chạy thuật toán phân bổ không gian 3D.');
    } finally {
      setIsAllocating3D(false);
    }
  };

  /* ── Load staff + shifts + skills ───────────────────────── */
  const loadData = () => {
    if (!storeId) return;
    setLoading(true);
    setError('');
    // The schedule board needs the complete active-store roster so empty rows,
    // assignment rendering, filters, and headcounts are not truncated by the
    // employment endpoint's default 20-item page.
    Promise.all([getStaffByStore(storeId, 0, 100), getShiftsForStore(storeId), getSkillsByStore(storeId).catch(() => ({ data: [] }))])
      .then(([staffRes, shiftsRes, skillsRes]) => {
        const loadedSkills = Array.isArray(skillsRes.data) ? skillsRes.data : (skillsRes.data?.content || []);
        if (loadedSkills.length > 0) {
          setSkills(loadedSkills);
        }

        const rawStaff = (staffRes.data.content || staffRes.data || []).filter((emp) => (emp.systemRole || emp.role) !== 'MANAGER' && (emp.systemRole || emp.role) !== 'ADMIN');
        const savedPositions = JSON.parse(localStorage.getItem(`emp_positions_${storeId}`) || '{}');

        const weekRangeIso = weekDatesFull.map(toISODate);
        const allShifts = shiftsRes.data || [];
        const shiftsInRange = allShifts.filter((s) => weekRangeIso.includes(s.shiftDate));
        const savedMeta = JSON.parse(localStorage.getItem(`shifts_meta_${storeId}`) || '{}');

        // Hiển thị shift theo staffId được assign (field staffId trong ShiftDTO hoặc meta)
        const map = {};
        const empPositionsFound = {};

        shiftsInRange.forEach((shift) => {
          const meta = savedMeta[shift.id] || {};
          const baseShift = {
            ...meta,
            ...shift,
            color: shift.color || meta.color,
            note: shift.note ?? meta.note,
          };

          if (Array.isArray(shift.shiftAssignments) && shift.shiftAssignments.length > 0) {
            shift.shiftAssignments.forEach((sa) => {
              const targetEmpId = sa.staffId;
              if (!targetEmpId) return;

              const empObj = rawStaff.find((e) => (e.staffId || e.id) === targetEmpId);
              const assignedSkillName = resolveShiftPositionName(shift, sa, loadedSkills, empObj);
              const assignedSkillId = sa.requiredSkillId || loadedSkills.find(sk => sk.name.toLowerCase() === assignedSkillName.toLowerCase())?.id;
              const assignedColor = getShiftPositionColor(
                { ...baseShift, skillId: assignedSkillId, positionName: assignedSkillName },
                empObj,
                loadedSkills
              );

              if (assignedSkillName && assignedSkillName !== 'Nhân viên') {
                empPositionsFound[targetEmpId] = assignedSkillName;
              }

              const empShift = {
                ...baseShift,
                staffId: targetEmpId,
                assignedStaffId: targetEmpId,
                skillId: assignedSkillId,
                skillName: assignedSkillName,
                positionName: assignedSkillName,
                location: assignedSkillName,
                color: assignedColor,
                zoneName: sa.zoneName,
              };

              if (!map[targetEmpId]) map[targetEmpId] = {};
              if (!map[targetEmpId][shift.shiftDate]) map[targetEmpId][shift.shiftDate] = [];
              if (!map[targetEmpId][shift.shiftDate].some((s) => s.id === shift.id)) {
                map[targetEmpId][shift.shiftDate].push(empShift);
              }
            });
          } else {
            const assignedEmpIds = new Set();
            if (baseShift.staffId) assignedEmpIds.add(baseShift.staffId);
            if (shift.staffId) assignedEmpIds.add(shift.staffId);
            if (shift.assignedStaffId) assignedEmpIds.add(shift.assignedStaffId);
            if (shift.employeeId) assignedEmpIds.add(shift.employeeId);

            assignedEmpIds.forEach((targetEmpId) => {
              const empObj = rawStaff.find((e) => (e.staffId || e.id) === targetEmpId);
              const assignedSkillName = resolveShiftPositionName(baseShift, null, loadedSkills, empObj);
              const assignedColor = getShiftPositionColor(
                { ...baseShift, positionName: assignedSkillName },
                empObj,
                loadedSkills
              );
              if (assignedSkillName && assignedSkillName !== 'Nhân viên') {
                empPositionsFound[targetEmpId] = assignedSkillName;
              }
              const empShift = {
                ...baseShift,
                staffId: targetEmpId,
                skillName: assignedSkillName,
                positionName: assignedSkillName,
                location: assignedSkillName,
                color: assignedColor,
              };
              if (!map[targetEmpId]) map[targetEmpId] = {};
              if (!map[targetEmpId][shift.shiftDate]) map[targetEmpId][shift.shiftDate] = [];
              if (!map[targetEmpId][shift.shiftDate].some((s) => s.id === shift.id)) {
                map[targetEmpId][shift.shiftDate].push(empShift);
              }
            });
          }
        });

        const staff = rawStaff.map((emp) => {
          const id = emp.staffId || emp.id;
          const name = emp.staffFullName || emp.fullName || 'Nhân viên';
          const contractType = emp.contractType?.name || emp.employmentType || 'Chưa có hợp đồng';
          const pos = savedPositions[id] || empPositionsFound[id] || emp.position || emp.jobTitle || emp.skillName || emp.skill?.name || (loadedSkills[0]?.name) || 'Nhân viên';
          return {
            ...emp,
            id: id,
            staffId: id,
            fullName: name,
            staffFullName: name,
            contractTypeName: contractType,
            position: pos === contractType ? (empPositionsFound[id] || 'Nhân viên') : pos,
            jobTitle: pos === contractType ? (empPositionsFound[id] || 'Nhân viên') : pos,
            skillName: pos === contractType ? (empPositionsFound[id] || 'Nhân viên') : pos,
          };
        });
        setEmployees(staff);

        // Load staff availability & skills in parallel
        Promise.allSettled(
          staff.map((emp) =>
            Promise.all([
              getStaffAvailability(emp.id).catch(() => ({ data: [] })),
              getStaffSkills(emp.id).catch(() => ({ data: [] })),
            ]).then(([availRes, skillsRes]) => ({
              id: emp.id,
              hasSlots: Array.isArray(availRes.data) && availRes.data.length > 0,
              slots: Array.isArray(availRes.data) ? availRes.data : [],
              skillIds: Array.isArray(skillsRes.data) ? skillsRes.data : [],
            }))
          )
        ).then((results) => {
          const withAvail = new Set();
          const availMap = {};
          const empSkillsMap = {};
          results.forEach((r) => {
            if (r.status === 'fulfilled') {
              if (r.value.hasSlots) {
                withAvail.add(r.value.id);
                availMap[r.value.id] = r.value.slots;
              }
              empSkillsMap[r.value.id] = r.value.skillIds;
            }
          });
          setStaffWithAvailability(withAvail);
          setEmployees((prev) =>
            prev.map((emp) => {
              const sIds = empSkillsMap[emp.id] || [];
              const empSkillObjs = sIds.map((sid) => loadedSkills.find((sk) => sk.id === sid)).filter(Boolean);
              const primarySkill = empSkillObjs[0]?.name || emp.position;
              return {
                ...emp,
                availabilitySlots: availMap[emp.id] || [],
                skills: empSkillObjs,
                skillName: emp.position && emp.position !== 'Nhân viên' && emp.position !== 'Barista' ? emp.position : primarySkill,
                position: emp.position && emp.position !== 'Nhân viên' && emp.position !== 'Barista' ? emp.position : primarySkill,
              };
            })
          );
        });

        setAssignments(map);
        setAllShifts(shiftsInRange);
      })
      .catch(() => setError('Không tải được lịch làm việc'))
      .finally(() => setLoading(false));
  };

  const notifyShiftUpdates = () => {
    window.dispatchEvent(new CustomEvent('store_shifts_updated', { detail: { storeId } }));
    window.dispatchEvent(new CustomEvent('store_marketplace_updated', { detail: { storeId } }));
  };

  const weekStartIso = useMemo(() => (weekDatesFull[0] ? toISODate(weekDatesFull[0]) : ''), [weekDatesFull]);

  useEffect(() => {
    loadData();
    const allReqs = JSON.parse(localStorage.getItem('cross_store_requests') || '[]');
    setCrossStoreRequests(allReqs);
  }, [storeId, weekStartIso]); // eslint-disable-line

  useEffect(() => {
    let timer;
    const handleSync = (event) => {
      if (event.detail?.storeId && String(event.detail.storeId) !== String(storeId)) return;
      clearTimeout(timer);
      timer = setTimeout(() => loadData(), 150);
    };
    const events = ['store_shifts_updated', 'store_marketplace_updated', 'store_connection_restored'];
    events.forEach(name => window.addEventListener(name, handleSync));
    return () => {
      clearTimeout(timer);
      events.forEach(name => window.removeEventListener(name, handleSync));
    };
  }, [storeId, weekStartIso]);

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
    const empId = e.staffId || e.id;
    const matchUser =
      selectedEmployees.includes('ALL') ||
      selectedEmployees.includes(name) ||
      selectedEmployees.includes(empId);
    if (!matchUser) return false;

    if (selectedSkills.includes('ALL')) return true;

    // Check employee's assigned job position / skills
    const empPos = (e.position || e.jobTitle || e.skillName || e.skill?.name || '').toLowerCase().trim();
    const empSkillId = e.skillId || e.skill?.id || e.jobPositionId;

    const empMatchesSkill = selectedSkills.some((skId) => {
      const skObj = skills.find((sk) => sk.id === skId || sk.name === skId);
      const skName = skObj ? skObj.name.toLowerCase().trim() : String(skId).toLowerCase().trim();
      return (
        empSkillId === skId ||
        (empPos && (empPos === skName || empPos.includes(skName) || skName.includes(empPos)))
      );
    });

    // Check employee's shifts
    const empShifts = assignments[empId] ? Object.values(assignments[empId]).flat() : [];
    const hasShiftWithSkill = empShifts.some((s) => {
      const sSkillId = s.skillId || s.location;
      const sLocationSkill = skills.find((sk) => sk.id === sSkillId || sk.name === sSkillId);
      const sName = (sLocationSkill ? sLocationSkill.name : (s.skillName || s.location || '')).toLowerCase().trim();
      return selectedSkills.some((skId) => {
        const skObj = skills.find((sk) => sk.id === skId || sk.name === skId);
        const targetName = skObj ? skObj.name.toLowerCase().trim() : String(skId).toLowerCase().trim();
        return (
          sSkillId === skId ||
          (sName && (sName === targetName || sName.includes(targetName) || targetName.includes(sName)))
        );
      });
    });

    return empMatchesSkill || hasShiftWithSkill;
  });

  const shiftsInVisibleRange = allShifts.filter((shift) =>
    displayedDates.some((date) => toISODate(date) === shift.shiftDate)
  ).length;

  const alreadyInStoreIds = new Set(employees.map((e) => e.staffId || e.id));
  const availableToAdd = allEmployees.filter((e) => !alreadyInStoreIds.has(e.id) && (e.role || e.systemRole) !== 'ADMIN');

  const getSkillColor = (skObj) => {
    if (!skObj) return null;
    if (skObj.description && skObj.description.startsWith('#')) return toPastelColor(skObj.description);
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
    const currentStore = stores.find((store) => String(store.id) === String(storeId));
    const temporalDefaults=newShiftDefaults(currentStore,dateIso);
    setError('');

    setRegisterForm({
      staffId: empId || '',
      ...temporalDefaults,
      shiftTemplateId:'',
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
    setError('');
    setEditingShift(shift);
    const currentStore = stores.find((store) => String(store.id) === String(storeId));
    const fmtT = (t) => {
      if (!t) return currentStore?.openTime?.slice(0, 5) || '08:00';
      if (typeof t === 'string') return t.slice(0, 5);
      return `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`;
    };
    setRegisterForm({
      staffId: empId || shift.staffId || '',
      shiftDate: shift.shiftDate || '',
      shiftTemplateId:shift.shiftTemplateId||'',
      startTime: fmtT(shift.startTime),
      endTime: fmtT(shift.endTime),
      color: shift.color || SHIFT_COLORS[0],
      location: shift.skillId || shift.location || '',
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
    
    // Tìm vị trí phân công chính xác của ca này
    let posName = shift.positionName || shift.skillName;
    if (!posName || posName === 'Nhân viên') {
      const sk = skills.find((s) => s.id === (shift.skillId || shift.location));
      if (sk) posName = sk.name;
    }
    if (!posName) posName = emp?.position || 'Nhân viên';

    const posColor = getShiftPositionColor({ ...shift, positionName: posName }, emp, skills);
    const currentStoreObj = stores.find((s) => s.id === (shift.branch || shift.storeId || storeId));
    const contractType = emp?.contractTypeName || emp?.contractType?.name || emp?.employmentType || 'Full-Time';

    setViewingShift({
      ...shift,
      empId: empId || shift.staffId,
      staffName: emp?.staffFullName || emp?.fullName || 'Nhân viên',
      contractTypeName: contractType,
      positionName: posName,
      positionColor: posColor,
      storeName: currentStoreObj?.name || 'ShiftSync Flagship Store',
    });
    setShowViewModal(true);
    setMenuFor(null);
  };

  const openAddUserModal = () => {
    setAddUserForm({
      staffId: '',
      employmentType: 'PART_TIME',
      hourlyRate: '25000',
      joinedDate: toISODate(new Date()),
      skillId: '',
    });
    setShowAddUserModal(true);
    getEmployees(0, 100)
      .then((res) => setAllEmployees(res.data.content || res.data || []))
      .catch(() => setAllEmployees([]));
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

    const currentStore = stores.find((store) => String(store.id) === String(storeId));
    const openTime = currentStore?.openTime?.slice(0, 5);
    const closeTime = currentStore?.closeTime?.slice(0, 5);
    let sTime = fmtT(slot.startTime);
    let eTime = fmtT(slot.endTime);
    if (openTime && sTime < openTime) sTime = openTime;
    if (closeTime && eTime > closeTime) eTime = closeTime;
    if (sTime >= eTime) {
      showToast('Khung giờ không hợp lệ', `Ca đăng ký rảnh (${fmtT(slot.startTime)} - ${fmtT(slot.endTime)}) nằm ngoài giờ mở cửa của chi nhánh (${openTime || '06:00'} - ${closeTime || '22:00'}).`);
      return;
    }

    const payload = {
      staffId: empId,
      shiftDate: targetDateIso,
      startTime: sTime,
      endTime: eTime,
      color: defaults.color || SHIFT_COLORS[0],
      skillId: defaults.location || null,
      note: `Phân công từ ca đăng ký rảnh (${DOW_VI[slot.dayOfWeek]})`,
    };

    try {
      await createShift(storeId, payload);
      try {
        await publishShifts(storeId, targetDateIso, targetDateIso);
      } catch (pubErr) {
        // Continue even if already published
      }
      showToast(
        'Duyệt ca thành công! ',
        `Đã duyệt và phân công ca ${DOW_VI[slot.dayOfWeek]} (${fmtT(slot.startTime)} - ${fmtT(slot.endTime)}) cho ${empName}. Ca làm việc đã được xuất bản và hiển thị ngay trên ứng dụng của nhân viên!`
      );
      loadData();
      notifyShiftUpdates();
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

    const currentStore = stores.find((store) => String(store.id) === String(storeId));
    if(shiftSubmitRef.current)return;
    const validation=validateShiftForm(registerForm,currentStore,'create');
    if(validation){setError(validation);return;}
    if(registerForm.branch&&registerForm.branch!==storeId){setError('Điều phối liên chi nhánh cần tạo tại Chợ ca mở.');return;}
    shiftSubmitRef.current=true;setSavingShift(true);
    try {
      const registrationDeadline=shiftRegistrationDeadline(registerForm,attendanceConfig?.availabilityDeadlineHours??24);
      const res = await createShift(storeId, {
        shiftTemplateId:registerForm.shiftTemplateId||null,
        shiftDate: registerForm.shiftDate,
        startTime: registerForm.startTime + ':00',
        endTime: registerForm.endTime + ':00',
        availabilityDeadline: registrationDeadline,
        staffId: registerForm.staffId || null,
        skillId: registerForm.location || null,
        note: registerForm.note,
        color: registerForm.color || null,
      });

      const newShift={...res.data,location:res.data.skillId||registerForm.location};
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
      notifyShiftUpdates();
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Tạo lịch thất bại');
    } finally {shiftSubmitRef.current=false;setSavingShift(false);}
  };

  const handleUpdateShift = async (e) => {
    e.preventDefault();
    if (!editingShift) return;
    setError('');

    const currentStore = stores.find((store) => String(store.id) === String(storeId));
    if(shiftSubmitRef.current)return;
    const validation=validateShiftForm(registerForm,currentStore,'edit');
    if(validation){setError(validation);return;}
    shiftSubmitRef.current=true;setSavingShift(true);

    try {
      const res = await updateShift(storeId, editingShift.id, {
        shiftTemplateId:registerForm.shiftTemplateId||null,
        shiftDate: registerForm.shiftDate,
        startTime: registerForm.startTime + ':00',
        endTime: registerForm.endTime + ':00',
        staffId: registerForm.staffId || null,
        skillId: registerForm.location || null,
        note: registerForm.note,
        color: registerForm.color || null,
      });

      try {
        const legacy=JSON.parse(localStorage.getItem(`shifts_meta_${storeId}`)||'{}');
        delete legacy[editingShift.id];localStorage.setItem(`shifts_meta_${storeId}`,JSON.stringify(legacy));
      } catch {/* Backend remains the source of truth if browser storage is unavailable. */}
      const updated={...editingShift,...res.data,location:res.data.skillId||registerForm.location};

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
      notifyShiftUpdates();
      // Re-read the authoritative backend representation after a direct edit.
      // The optimistic assignment update does not cover every server-derived
      // field (requirements, assignment metadata and persisted note).
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Cập nhật ca làm việc thất bại');
    } finally {shiftSubmitRef.current=false;setSavingShift(false);}
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
      notifyShiftUpdates();
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
          notifyShiftUpdates();
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
      let contractTypeId = null;
      try {
        const ctRes = await getContractTypes();
        const cts = ctRes?.data || [];
        const isFull = addUserForm.employmentType === 'FULL_TIME';
        const matched = cts.find((c) => c.name?.toLowerCase().includes(isFull ? 'full' : 'part'));
        contractTypeId = matched ? matched.id : cts[0]?.id;
      } catch {}

      if (!contractTypeId) {
        setError('Không tìm thấy loại hợp đồng hợp lệ');
        return;
      }

      await assignStaffToStore(storeId, {
        staffId: addUserForm.staffId,
        contractTypeId,
        hourlyRate: Number(addUserForm.hourlyRate) || 25000,
        joinedDate: addUserForm.joinedDate || toISODate(new Date()),
      });
      // Lưu vị trí công việc vào localStorage để hiển thị ngay
      if (addUserForm.skillId) {
        const skObj = skills.find((s) => s.id === addUserForm.skillId);
        if (skObj) {
          const savedPositions = JSON.parse(localStorage.getItem(`emp_positions_${storeId}`) || '{}');
          savedPositions[addUserForm.staffId] = skObj.name;
          localStorage.setItem(`emp_positions_${storeId}`, JSON.stringify(savedPositions));
        }
      }
      setShowAddUserModal(false);
      showToast('Thêm thành công', 'Nhân viên đã được thêm vào chi nhánh và hiển thị trên lịch.');
      loadData();
    } catch (err) {
      if (err.response?.status === 409) {
        showToast('Thông báo', 'Nhân viên này đã thuộc chi nhánh rồi.');
        setShowAddUserModal(false);
        loadData();
      } else {
        setError(err.response?.data?.message || 'Thêm nhân viên thất bại');
      }
    }
  };

  const handlePrint = () => window.print();

  const handlePublish = async () => {
    const dateFrom = toISODate(displayedDates[0]);
    const dateTo = toISODate(displayedDates[displayedDates.length - 1]);
    try {
      await publishShifts(storeId, dateFrom, dateTo);
      showToast(
        'Xuất bản thành công! ',
        `Lịch làm việc từ ${fmtFull(displayedDates[0])} đến ${fmtFull(displayedDates[displayedDates.length - 1])} đã được xuất bản và thông báo đến nhân viên.`
      );
      loadData();
      notifyShiftUpdates();
    } catch (err) {
      showToast('Lỗi xuất bản', err.response?.data?.message || 'Không thể xuất bản lịch làm việc. Vui lòng thử lại.');
    }
  };

  const prepareAutoVisualization = async (startDate, endDate) => {
    if (!storeId || autoVisualizationLock.current) return;
    autoVisualizationLock.current = true;
    setAutoScheduling(true);
    try {
      const response = await getShiftsForStore(storeId);
      const before = shiftsInWindow(response.data, startDate, endDate);
      const store = stores.find(s => String(s.id) === String(storeId));
      setAutoVisualization({storeId, storeName: store?.name || 'Cửa hàng', storeCategory: store?.category || 'OTHER', layout: storeLayout, zones: storeZones, employees, skills, before, startDate, endDate});
      setShowAutoScheduleModal(false);
    } catch (err) {
      showToast('Không tải được lịch hiện tại', err.response?.data?.message || 'Chưa chạy xếp lịch. Vui lòng thử lại.');
    } finally { autoVisualizationLock.current = false; setAutoScheduling(false); }
  };
  const handleRunAutoSchedule = () => prepareAutoVisualization(toISODate(weekDatesFull[0]), toISODate(weekDatesFull[weekDatesFull.length - 1]));

  /* ── Render ────────────────────────────────────── */
  return (
    <div className={`sch-page ${['3D','Planner'].includes(viewMode) && scheduleSubTab === 'board' ? 'sch-page--explorer' : ''}`}>
      {scheduleSubTab === 'board' && <header className="sch-page-heading">
        <div className="sch-page-heading-copy">
          <span className="sch-page-eyebrow">VẬN HÀNH / NHÂN SỰ</span>
          <h1>Lịch làm việc</h1>
          <p>Xem phân công, điều chỉnh ca và theo dõi nhu cầu nhân sự theo từng ngày.</p>
        </div>
        <div className="sch-page-metrics" aria-label="Tổng quan lịch làm việc">
          <div><strong>{employees.length}</strong><span>Nhân viên</span></div>
          <div><strong>{shiftsInVisibleRange}</strong><span>Ca trong {viewMode === 'Ngày' ? 'ngày' : 'tuần'}</span></div>
        </div>
      </header>}
      {/* ═══ DOMAIN SUBTAB BAR ═══ */}
      <div className="sch-domain-tabs" role="tablist" aria-label="Phân hệ lịch làm việc">
        <button
          type="button"
          role="tab"
          aria-selected={scheduleSubTab === 'board'}
          className={`sch-domain-tab ${scheduleSubTab === 'board' ? 'active' : ''}`}
          onClick={() => { setScheduleSubTab('board'); navigate('/schedule', { replace: true }); }}
        >
          Lập lịch & Bảng ca
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={scheduleSubTab === 'availability'}
          className={`sch-domain-tab ${scheduleSubTab === 'availability' ? 'active' : ''}`}
          onClick={() => { setScheduleSubTab('availability'); navigate('/schedule?tab=availability', { replace: true }); }}
        >
          Khả dụng nhân sự
        </button>
      </div>

      {/* ═══ AVAILABILITY SUB-TAB: embed StaffAvailabilityPage ═══ */}
      {scheduleSubTab === 'availability' && (
        <div style={{ flex: 1, overflow: 'auto' }}>
          <StaffAvailabilityPage />
        </div>
      )}

      {/* ═══ MAIN (Full width layout, sidebar removed per user request) ═══ */}
      {scheduleSubTab === 'board' && <main className="sch-main">
        {/* ═══ TOPBAR (Row 1: Ngày/Tuần Toggle & Capsule Action Box - Ảnh 1) ═══ */}
        <div className="sch-topbar">
          <div className="sch-viewmode-toggle">
            <button
              type="button"
              className={`sch-toggle-btn ${viewMode === 'Ngày' ? 'active' : ''}`}
              onClick={() => setViewMode('Ngày')}
            >
              Theo Ngày
            </button>
            <button
              type="button"
              className={`sch-toggle-btn ${viewMode === 'Tuần' ? 'active' : ''}`}
              onClick={() => setViewMode('Tuần')}
            >
              Theo Tuần
            </button>
            <button
              type="button"
              className={`sch-toggle-btn ${viewMode === '3D' ? 'active' : ''}`}
              onClick={() => setViewMode('3D')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Compass size={13} />
              <span>Không gian 3D</span>
            </button>
            <button type="button" className={`sch-toggle-btn ${viewMode === 'Planner' ? 'active' : ''}`} onClick={()=>setViewMode('Planner')}>3D Schedule Planner</button>
          </div>

          <div className="sch-header-right">
            {pendingCrossStoreRequests.length > 0 && (
              <button
                type="button"
                className="sch-cross-dispatch-btn"
                onClick={() => setShowCrossStoreModal(true)}
              >
                <span className="sch-cross-badge-count">{pendingCrossStoreRequests.length}</span>
                <span>Yêu cầu điều phối ({pendingCrossStoreRequests.length})</span>
              </button>
            )}

            {/* Capsule Action Card chuẩn kiểu Ảnh 1 */}
            <div className="sch-publish-card">
              {/* Nút Xem lịch rảnh nhân viên */}
              <button
                type="button"
                className="sch-capsule-btn sch-capsule-avail-btn"
                onClick={() => navigate('/availability')}
                title="Xem toàn bộ khung giờ đăng ký rảnh của nhân viên trong tuần"
              >
                <Users size={14} color="#059669" />
                <span>Lịch rảnh NV</span>
              </button>

              <div className="sch-publish-divider" />

              {/* Nút Định biên nhân sự */}
              <button
                type="button"
                className="sch-capsule-btn sch-capsule-demand-btn"
                onClick={() => {
                  setDemandTargetDate(toISODate(displayedDates[0]));
                  setShowDemandModal(true);
                }}
                title="Ghi nhận số lượng nhân sự cần cho từng ca (Định biên nhân sự)"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"></path>
                  <rect x="9" y="3" width="6" height="4" rx="1"></rect>
                  <path d="M9 14l2 2 4-4"></path>
                </svg>
                <span>Định biên</span>
              </button>

              <div className="sch-publish-divider" />
              <button
                type="button"
                className="sch-capsule-btn sch-capsule-print-btn"
                onClick={handlePrint}
                title="In lịch làm việc"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 6 2 18 2 18 9"></polyline>
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                  <rect x="6" y="14" width="12" height="8"></rect>
                </svg>
                <span>In</span>
              </button>

              <div className="sch-publish-divider" />

              <button
                type="button"
                className="sch-capsule-btn sch-capsule-ai-btn"
                disabled={autoScheduling}
                onClick={() => {
                  setAutoScheduleDates({
                    startDate: toISODate(weekDatesFull[0]),
                    endDate: toISODate(weekDatesFull[weekDatesFull.length - 1]),
                  });
                  setShowAutoScheduleModal(true);
                }}
                title="Gợi ý xếp ca tự động bằng AI"
              >
                <img src={iconAi} alt="AI" className="sch-ai-btn-icon" />
                <span>{autoScheduling ? 'Đang xếp...' : 'Gợi ý AI'}</span>
              </button>

              <div className="sch-publish-divider" />

              <button
                type="button"
                className="sch-capsule-btn sch-capsule-publish-btn"
                onClick={handlePublish}
                title="Xuất bản lịch tuần này"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
                <span>Lịch xuất bản</span>
              </button>
            </div>
          </div>
        </div>

        {/* ═══ ROW 2: TOOLBAR (Date Navigator, Chi nhánh, Bộ lọc ngắn, Thêm lịch) ═══ */}
        <div className="sch-header-toolbar">
          <div className="sch-toolbar-row-left">
            {/* Date Navigator */}
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
                <button
                  type="button"
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
                  {viewMode === 'Ngày' ? (
                    <span className="sch-date-range-full" style={{ fontWeight: 600, alignItems: 'center', gap: 6 }}>
                      <span>{DOW_VI[currentDate.getDay()]},</span>
                      <span>{fmtDateRangeText(currentDate)}</span>
                    </span>
                  ) : (
                    <>
                      <span className="sch-date-range-full">
                        <span>{fmtDateRangeText(weekDatesFull[0])}</span>
                        <span className="sch-date-arrow-sep">→</span>
                        <span>{fmtDateRangeText(weekDatesFull[6])}</span>
                      </span>
                      {viewMode === '3D' && (
                        <span style={{
                          marginLeft: 6,
                          fontSize: 11,
                          padding: '2px 7px',
                          borderRadius: 4,
                          background: '#ECFDF5',
                          color: '#047857',
                          fontWeight: 600,
                          border: '1px solid #A7F3D0',
                        }}>
                          {DOW_VI[currentDate.getDay()]} ({fmtDM(currentDate)})
                        </span>
                      )}
                    </>
                  )}
                  <span className="sch-date-range-compact">
                    {viewMode === 'Ngày' ? fmtDM(currentDate) : `${fmtDM(weekDatesFull[0])} – ${fmtDM(weekDatesFull[6])}`}
                  </span>
                </button>
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
                      <span>{MONTH_NAMES_VI[calMonth]}</span>
                      <span>{calYear}</span>
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
                    <span>T2</span>
                    <span>T3</span>
                    <span>T4</span>
                    <span>T5</span>
                    <span>T6</span>
                    <span>T7</span>
                    <span>CN</span>
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
                              toISODate(d) === toISODate(currentDate);

                            return (
                              <div
                                key={dIdx}
                                className={`sch-cal-day-cell ${isOutside ? 'outside-month' : ''} ${
                                  isToday ? 'is-today' : ''
                                } ${isCurrentSelectedDay ? 'is-selected-day' : ''}`}
                                onClick={() => handleCalendarDayClick(d)}
                                title={viewMode === 'Ngày' ? 'Bấm để chọn ngày này' : 'Bấm để xem lịch tuần này'}
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
                    Bấm vào ngày để xem lịch ({viewMode === 'Ngày' ? 'theo Ngày' : 'theo Tuần'})
                  </div>
                </div>
              )}
            </div>

          </div>

          <div className="sch-toolbar-row-right">
            {/* Bộ lọc ngắn gọn nằm bên phải dưới box capsule */}
            <div className="sch-compact-filter-wrap">
              <CompactDropdownFilter
                skills={skills}
                selectedSkills={selectedSkills}
                onSkillsChange={setSelectedSkills}
                employees={employees}
                selectedEmployees={selectedEmployees}
                onEmployeesChange={setSelectedEmployees}
              />
            </div>

            {/* Nút Thêm lịch */}
            <button
              type="button"
              className="sch-toolbar-add-btn"
              onClick={() => openRegisterModal('', '')}
              title="Thêm lịch làm việc mới"
            >
              + Thêm lịch
            </button>
          </div>
        </div>

        {error && <p className="sch-error">{error}</p>}

        {/* Schedule View: 3D Spatial View vs 2D Matrix Table */}
        {viewMode === 'Planner'?<SchedulePlanner key={storeId} storeId={storeId} storeName={stores.find(s=>String(s.id)===String(storeId))?.name||'Cửa hàng'} storeCategory={stores.find(s=>String(s.id)===String(storeId))?.category||'OTHER'} layout={storeLayout} zones={storeZones} employees={employees} skills={skills} shifts={allShifts} date={toISODate(currentDate)} onDateChange={value=>setCurrentDate(new Date(`${value}T12:00:00`))} onExit={()=>setViewMode('Tuần')} onReload={loadData}/>:viewMode === '3D' ? (
          <div className="sch-explorer-stage">
            {/* 3D Canvas Spatial Model - Full Expanded Height & Width */}
            <div className="sch-explorer-frame">
              <Store3DCanvas
                onExitWorkspace={() => setViewMode('Tuần')}
                onDateChange={(date) => { if (date) { setCurrentDate(new Date(`${date}T12:00:00`)); setSelected3DShiftId(null); } }}
                layout={storeLayout}
                zones={storeZones}
                staff={active3DStaff}
                storeName={stores.find((s) => String(s.id) === String(storeId))?.name || 'ShiftSync Store'}
                storeCategory={stores.find((s) => String(s.id) === String(storeId))?.category || 'OTHER'}
                stores={stores}
                selectedStoreId={storeId}
                onSelectStore={(id) => handleStoreChange(id)}
                onRunAlgorithm={handleRunSpatialAllocation}
                isAllocating={isAllocating3D}
                allocatedSequence={allocatedSequence}
                allDateShifts={activeDateShifts}
                activeDate={toISODate(active3DDate)}
                currentShift={current3DShift}
                onSelectShift={(shift) => setSelected3DShiftId(shift?.id || null)}
                employees={employees}
                skills={skills}
                storeId={storeId}
                onApplyComplete={loadData}
                onOpenAutoSchedule={handleRunAutoSchedule}
                onPublishSchedule={handlePublish}
              />
            </div>
          </div>
        ) : (
          /* Schedule table */
          <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
            <div className="sch-board-caption">
              <div>
                <span className="sch-board-kicker">BẢNG PHÂN CÔNG</span>
                <h2>{viewMode === 'Ngày' ? 'Lịch theo ngày' : 'Lịch theo tuần'}</h2>
              </div>
              <div className="sch-pattern-legend">
                <span className="sch-pattern-swatch" aria-hidden="true" />
                Màu và sọc chéo thể hiện vị trí làm việc
              </div>
            </div>
            {viewMode === 'Ngày' && (
              <div className="sch-day-nav-pills-bar">
                <span className="sch-day-nav-label">Chọn ngày:</span>
                <div className="sch-day-nav-list">
                  {weekDatesFull.map((d, idx) => {
                    const dIso = toISODate(d);
                    const isActive = toISODate(currentDate) === dIso;
                    const isRealToday = toISODate(new Date()) === dIso;
                    const dayDow = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'][idx];
                    const dayShifts = allShifts.filter((s) => s.shiftDate === dIso);
                    const hasShifts = dayShifts.length > 0;
                    const dayWorkerCount = employees.filter(
                      (e) => (assignments[e.staffId || e.id]?.[dIso] || []).length > 0
                    ).length;

                    return (
                      <button
                        key={dIso}
                        type="button"
                        className={`sch-day-nav-pill ${isActive ? 'active' : ''}`}
                        onClick={() => setCurrentDate(d)}
                        title={`${DOW_VI[d.getDay()]}, ${fmtDateRangeText(d)}${hasShifts ? ` (${dayShifts.length} ca, ${dayWorkerCount} nhân viên)` : ''}`}
                      >
                        <span className="sch-day-nav-dow">{dayDow}</span>
                        <span className="sch-day-nav-dm">{fmtDM(d)}</span>
                        {dayWorkerCount > 0 && (
                          <span className="sch-day-nav-badge">{dayWorkerCount} NV</span>
                        )}
                        {isRealToday && (
                          <span className="sch-day-nav-today-tag">Nay</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="sch-table-wrap" role="region" aria-label="Bảng phân công ca làm việc, có thể cuộn ngang" tabIndex={0}>
            <table className="sch-table">
              <thead>
                <tr>
                  <th className="sch-col-emp sch-th-center">
                    <div className="sch-th-emp-title">Nhân viên</div>
                  </th>
                  {displayedDates.map((d) => {
                    const iso = toISODate(d);
                    const workingCount = employees.filter(
                      (e) => (assignments[e.staffId || e.id]?.[iso] || []).length > 0
                    ).length;

                    return (
                      <th
                        key={iso}
                        className="sch-th-center sch-col-date-header"
                        onClick={() => {
                          if (viewMode === 'Tuần') {
                            setCurrentDate(d);
                            setViewMode('Ngày');
                          }
                        }}
                        style={{ cursor: viewMode === 'Tuần' ? 'pointer' : 'default' }}
                        title={viewMode === 'Tuần' ? 'Bấm để xem chi tiết theo ngày này' : undefined}
                      >
                        <div className="sch-date-th-top-row">
                          <span className="sch-date-th-dow">{DOW_VI[d.getDay()]}</span>
                          <span className="sch-date-th-workers-inline">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{opacity:0.55}}>
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                              <circle cx="12" cy="7" r="4"/>
                            </svg>
                            {workingCount}
                          </span>
                        </div>
                        <div className="sch-date-th-dm">Ngày {d.getDate()} tháng {d.getMonth() + 1}</div>
                      </th>
                    );
                  })}
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

              {/* Hàng nhu cầu định biên / Ca chưa xếp nhân viên */}
              {!loading && isManager && (() => {
                const unassignedShiftsByDate = {};
                displayedDates.forEach((d) => {
                  const iso = toISODate(d);
                  const dayShifts = allShifts.filter((s) => s.shiftDate === iso);
                  const unassignedInDay = dayShifts.filter((shift) => {
                    const totalAssigned =
                      (Array.isArray(shift.shiftAssignments) ? shift.shiftAssignments.length : 0) +
                      (shift.staffId ? 1 : 0);
                    const totalRequired = (shift.skillRequirements || []).reduce(
                      (acc, r) => acc + (r.requiredStaff || r.requiredCount || 0),
                      0
                    );
                    return shift.status === 'DRAFT' && (totalAssigned < totalRequired || totalAssigned === 0);
                  });
                  if (unassignedInDay.length > 0) {
                    unassignedShiftsByDate[iso] = unassignedInDay;
                  }
                });
                const hasUnassigned = Object.keys(unassignedShiftsByDate).length > 0;

                return hasUnassigned ? (
                  <tr className="sch-demand-summary-row" key="demand-summary-row">
                    <td className="sch-col-emp">
                      <div className="sch-emp-cell sch-demand-cell-header">
                        
                        <div>
                          <div className="sch-emp-name" style={{ color: '#0f766e', fontWeight: 700 }}>
                            Nhu cầu định biên
                          </div>
                          <div className="sch-emp-role" style={{ color: '#0d9488' }}>
                            Ca DRAFT chờ xếp
                          </div>
                        </div>
                      </div>
                    </td>
                    {displayedDates.map((d) => {
                      const iso = toISODate(d);
                      const dayReqs = unassignedShiftsByDate[iso] || [];
                      return (
                        <td key={'demand-' + iso} className="sch-cell sch-demand-cell">
                          {dayReqs.map((shift, idx) => {
                            const reqs = shift.skillRequirements || [];
                            const reqSummary = reqs
                              .map((r) => `${r.requiredStaff || r.requiredCount || 1} ${r.skillName || 'NV'}`)
                              .join(', ');
                            return (
                              <div
                                key={'req-chip-' + (shift.id || idx)}
                                className="sch-demand-chip"
                                onClick={() => { setDemandTargetDate(shift.shiftDate || iso); setShowDemandModal(true); }} title="Bấm để mở Kế hoạch Định biên nhân sự ngày này"
                              >
                                <div className="sch-demand-chip-time">
                                  {fmtTimeAMPM(shift.startTime)} – {fmtTimeAMPM(shift.endTime)}
                                </div>
                                <div className="sch-demand-chip-text">
                                  {reqSummary ? `Cần: ${reqSummary}` : 'Chưa xếp NV'}
                                </div>
                              </div>
                            );
                          })}
                        </td>
                      );
                    })}
                  </tr>
                ) : null;
              })()}

              {!loading &&
                visibleEmployees.map((emp) => {
                  const empId = emp.staffId || emp.id;
                  const name = emp.staffFullName || emp.fullName || '';
                  const role = emp.contractTypeName || emp.contractType?.name || emp.employmentType || 'Chưa có hợp đồng';
                  const hasSubmittedAvail = staffWithAvailability.has(empId);

                  return (
                    <tr key={empId}>
                      {/* Employee info cell */}
                      <td className="sch-col-emp">
                        <div
                          className="sch-emp-cell"
                          onClick={() => handleOpenStaffAvailability(emp)}
                          title={
                            hasSubmittedAvail
                              ? 'Nhân viên đã gửi lịch đăng ký - Bấm để xem và phân công ca'
                              : 'Bấm để xem lịch khả dụng hoặc hồ sơ nhân viên'
                          }
                        >
                          <div className="sch-emp-avatar-wrap">
                            <Avatar3DWeb avatarId={emp.avatarId || getAvatarForEmployee(emp)} size={38} />
                            {/* Icon tam giác vàng (!) cạnh tên nhân viên: Chỉ hiện khi nhân viên đã gửi lịch */}
                            {hasSubmittedAvail && (
                              <span
                                className="sch-emp-avatar-badge-warning"
                                title="Nhân viên đã gửi lịch khả dụng"
                                aria-label="Đã gửi lịch khả dụng"
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="#F59E0B" stroke="#78350F" strokeWidth="1.5">
                                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                  <line x1="12" y1="9" x2="12" y2="13" stroke="#78350F" strokeWidth="2"></line>
                                  <line x1="12" y1="17" x2="12.01" y2="17" stroke="#78350F" strokeWidth="2.5"></line>
                                </svg>
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="sch-emp-name">{name}</div>
                            <div className="sch-emp-role">{role}</div>
                          </div>
                        </div>
                      </td>

                      {/* Shift cells */}
                      {displayedDates.map((d) => {
                        const iso = toISODate(d);
                        const rawCellShifts = assignments[empId]?.[iso] || [];

                        const cellShifts = selectedSkills.includes('ALL')
                          ? rawCellShifts
                          : rawCellShifts.filter((s) => {
                              const sSkillId = s.skillId || s.location;
                              const sLocationSkill = skills.find((sk) => sk.id === sSkillId || sk.name === sSkillId);
                              const sName = (sLocationSkill ? sLocationSkill.name : (s.skillName || s.location || '')).toLowerCase().trim();
                              return selectedSkills.some((skId) => {
                                const skObj = skills.find((sk) => sk.id === skId || sk.name === skId);
                                const targetName = skObj ? skObj.name.toLowerCase().trim() : String(skId).toLowerCase().trim();
                                return (
                                  sSkillId === skId ||
                                  (sName && (sName === targetName || sName.includes(targetName) || targetName.includes(sName)))
                                );
                              });
                            });
                        const isEmpty = cellShifts.length === 0;

                        return (
                          <td key={iso} className="sch-cell">
                            {/* Shift chip hiển thị đúng màu và tên vị trí nhân viên đảm nhiệm */}
                            {cellShifts.map((s, sIdx) => {
                              const shiftPosName = (s.positionName && s.positionName !== 'Nhân viên')
                                ? s.positionName
                                : resolveShiftPositionName(s, null, skills, emp);
                              const chipColor = getShiftPositionColor({ ...s, positionName: shiftPosName }, emp, skills);
                              const hasManagerNote = Boolean(s.note && s.note.trim().length > 0);
                              const chipKey = s.id ? `${s.id}-${empId}-${iso}` : `shift-${empId}-${iso}-${sIdx}`;
                              const isMenuOpen = menuFor?.shift?.id === s.id && menuFor.empId === empId && menuFor.dateIso === iso;

                              return (
                                <div
                                  key={chipKey}
                                  className="sch-shift-wrap"
                                  ref={isMenuOpen ? menuRef : null}
                                >
                                  <div
                                    className={`sch-shift-block ${hasManagerNote ? 'has-note-flag' : ''}`}
                                    style={{
                                      background: `repeating-linear-gradient(
                                        135deg,
                                        ${chipColor},
                                        ${chipColor} 8px,
                                        rgba(255,255,255,0.18) 8px,
                                        rgba(255,255,255,0.18) 10px
                                      )`,
                                    }}
                                    title={`${name} - Vị trí: ${shiftPosName} (${fmtTimeAMPM(s.startTime)} – ${fmtTimeAMPM(s.endTime)})`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (isMenuOpen) {
                                        setMenuFor(null);
                                      } else {
                                        setMenuFor({ empId, dateIso: iso, shift: { ...s, positionName: shiftPosName } });
                                      }
                                    }}
                                  >
                                    <div className="sch-shift-inner-content">
                                      <span className="sch-shift-time-badge">
                                        {fmtTimeAMPM(s.startTime)} – {fmtTimeAMPM(s.endTime)}
                                      </span>
                                      <span className="sch-shift-pos-badge" title={`Vị trí: ${shiftPosName}`}>
                                        {shiftPosName}
                                      </span>
                                    </div>

                                    {/* Flag / Tam giác vàng trên Box ca khi có yêu cầu / ghi chú từ quản lý */}
                                    {hasManagerNote && (
                                      <span
                                        className="sch-shift-note-flag"
                                        title={`Ghi chú quản lý: ${s.note}`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openViewShiftModal(s, empId);
                                        }}
                                      >
                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="#F59E0B" stroke="#B45309" strokeWidth="1.5">
                                          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
                                          <line x1="4" y1="22" x2="4" y2="15"></line>
                                        </svg>
                                      </span>
                                    )}
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

              {!loading && visibleEmployees.length === 0 && (
                <tr className="sch-empty-row">
                  <td colSpan={displayedDates.length + 1}>
                    <div className="sch-empty-content">
                      <span className="sch-empty-icon" aria-hidden="true"><Users size={22} strokeWidth={1.8} /></span>
                      <strong>{employees.length ? 'Không có nhân viên phù hợp' : 'Chưa có nhân viên trong cửa hàng'}</strong>
                      <p>{employees.length ? 'Hãy đổi bộ lọc để xem lại lịch phân công.' : 'Thêm nhân viên để bắt đầu tạo và phân công ca làm việc.'}</p>
                      {employees.length ? (
                        <button type="button" onClick={() => { setSelectedSkills(['ALL']); setSelectedEmployees(['ALL']); }}>Xóa bộ lọc</button>
                      ) : (
                        <button type="button" onClick={openAddUserModal}>Thêm nhân viên</button>
                      )}
                    </div>
                  </td>
                </tr>
              )}

              {/* Add User row — không có border cột, chỉ border ngang */}
              {!loading && (
                <tr className="sch-add-user-row">
                  <td
                    colSpan={displayedDates.length + 1}
                    className="sch-add-user-td"
                    onClick={openAddUserModal}
                  >
                    <span className="sch-add-user-plus">+</span> Thêm nhân viên
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
        )}
      </main>}

      {showRegisterModal && <div className="sch-modal-overlay" onClick={closeRegisterModal}>
        <ShiftRegistrationForm modalRef={registerModalRef} mode={modalMode} form={registerForm} setForm={setRegisterForm}
          employees={employees} skills={skills} colors={SHIFT_COLORS} store={stores.find(s=>String(s.id)===String(storeId))}
          templates={registerTemplates} templateState={registerTemplateState} config={attendanceConfig} error={error} saving={savingShift}
          assignmentLocked={modalMode==='edit'&&(editingShift?.assignedStaffCount||editingShift?.shiftAssignments?.length||0)>1}
          roleLocked={modalMode==='edit'&&(editingShift?.status!=='DRAFT'||(editingShift?.assignedStaffCount||editingShift?.shiftAssignments?.length||0)>0||(editingShift?.skillRequirements?.length||0)>1)}
          onClose={closeRegisterModal} onSubmit={modalMode==='edit'?handleUpdateShift:handleCreateShift}
          onDelete={()=>{if(editingShift){handleDeleteShift(editingShift);setShowRegisterModal(false);}}}
          onEmployeeChange={staffId=>{const defaults=getEmpDefaultSkillAndColor(staffId);setRegisterForm({...registerForm,staffId,...(modalMode==='create'?{location:defaults.location,color:defaults.color}:{})});}}
          onSkillChange={id=>{const skill=skills.find(s=>s.id===id);setRegisterForm({...registerForm,location:id,color:skill?getSkillColor(skill):registerForm.color});}}
          onSettings={()=>{closeRegisterModal();navigate('/settings?tab=attendance');}}/>
      </div>}

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
              >&times;</button>
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
              >&times;</button>
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
              >&times;</button>
            </div>

            <div className="sch-view-emp-header">
              <Avatar3DWeb
                avatarId={getAvatarForEmployee(viewingShift.staffName)}
                name={viewingShift.staffName}
                size={44}
                className="sch-view-avatar"
              />
              <div>
                <div className="sch-view-emp-name">{viewingShift.staffName}</div>
                <div className="sch-view-emp-role" style={{ color: '#0d9488', fontWeight: 600 }}>
                  Hợp đồng: {viewingShift.contractTypeName || 'Full-Time'}
                </div>
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
                  Áp dụng cấu hình chấm công chung của chi nhánh.
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
              >&times;</button>
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
                        <Avatar3DWeb
                          avatarId={getAvatarForEmployee(req.staffName)}
                          name={req.staffName}
                          size={38}
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
                <Avatar3DWeb
                  avatarId={selectedStaffForAvail.avatarId || getAvatarForEmployee(selectedStaffForAvail.name)}
                  name={selectedStaffForAvail.name}
                  size={44}
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
              >&times;</button>
            </div>

            <div className="sch-avail-modal-body">
              {loadingAvail ? (
                <div style={{ textAlign: 'center', padding: '36px', color: '#666', fontSize: '14px' }}>
                  Đang tải lịch đăng ký của nhân viên...
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
          >&times;</button>
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

      {/* ═══ MODAL: Kế hoạch định biên nhân sự (Demand Planning) ═══ */}
      {showDemandModal && (
        <DemandPlanningModal
          isOpen={showDemandModal}
          onClose={() => setShowDemandModal(false)}
          storeId={storeId}
          initialDateIso={demandTargetDate || toISODate(displayedDates[0])}
          onSuccess={() => {
            showToast(
              'Đã cập nhật định biên! ',
              'Kế hoạch định biên nhân sự đã được đồng bộ với lịch làm việc.'
            );
            loadData();
          }}
        />
      )}

      {/* ═══ MODAL: Tự động xếp ca làm việc (AI Scheduler) ═══ */}
      {showAutoScheduleModal && (
        <div className="sch-modal-overlay" onClick={() => setShowAutoScheduleModal(false)}>
          <div className="sch-modal sch-auto-schedule-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sch-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                
                <h2 style={{ fontSize: 18, margin: 0, color: '#0f172a' }}>Tự động xếp ca làm việc (AI Scheduler)</h2>
              </div>
              <button
                type="button"
                className="sch-modal-close"
                onClick={() => setShowAutoScheduleModal(false)}
              >&times;</button>
            </div>

            <p style={{ margin: '8px 0 16px', fontSize: 13, color: '#64748b' }}>
              Hệ thống sẽ chạy thuật toán phân bổ thông minh dựa trên định biên nhân sự đã thiết lập.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Từ ngày
                </label>
                <input
                  type="date"
                  value={autoScheduleDates.startDate}
                  onChange={(e) => setAutoScheduleDates({ ...autoScheduleDates, startDate: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Đến ngày (tối đa 7 ngày)
                </label>
                <input
                  type="date"
                  value={autoScheduleDates.endDate}
                  onChange={(e) => setAutoScheduleDates({ ...autoScheduleDates, endDate: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13 }}
                />
              </div>
            </div>

            {/* Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 18 }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '14px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#0d9488' }}>
                  {allShifts.filter((s) => s.status === 'DRAFT' || !s.status).length} ca
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>Ca DRAFT cần xếp</div>
              </div>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '14px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#0d9488' }}>
                  {allShifts.reduce((sum, s) => {
                    const reqs = s.skillRequirements || [];
                    return sum + reqs.reduce((acc, r) => acc + (r.requiredStaff || r.requiredCount || 1), 0);
                  }, 0) || 48}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>Vị trí nhân sự yêu cầu</div>
              </div>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '14px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#0d9488' }}>
                  {employees.length}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>Nhân viên khả dụng</div>
              </div>
            </div>

            {/* Checklist items */}
            <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0369a1', marginBottom: 6 }}>
                Thuật toán tối ưu hóa tự động kiểm tra:
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: '#0c4a6e', lineHeight: 1.6 }}>
                <li>Kỹ năng & vai trò chuyên môn tương ứng của nhân viên</li>
                <li>Lịch đăng ký rảnh (Availability) & ngày báo bận (Blackout Dates)</li>
                <li>Hạn mức giờ làm tối đa theo loại hợp đồng (Full-time / Part-time)</li>
                <li>Tính công bằng: Chia đều số ca giữa các nhân viên trong tháng</li>
                <li>Khoảng nghỉ ngơi tối thiểu giữa 2 ca liên tiếp</li>
              </ul>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="sch-confirm-cancel-btn"
                onClick={() => setShowAutoScheduleModal(false)}
                style={{ padding: '9px 18px', borderRadius: 8 }}
              >
                Hủy
              </button>
              <button
                type="button"
                className="sch-confirm-primary-btn"
                disabled={autoScheduling}
                onClick={async () => {
                  const dStart = new Date(autoScheduleDates.startDate);
                  const dEnd = new Date(autoScheduleDates.endDate);
                  const diffDays = Math.round((dEnd - dStart) / (1000 * 60 * 60 * 24));
                  if (!Number.isFinite(diffDays) || diffDays < 0 || diffDays > 6) {
                    showToast('Khoảng thời gian không hợp lệ', 'Thời gian xếp ca tự động tối đa là 7 ngày (1 tuần).');
                    return;
                  }
                  await prepareAutoVisualization(autoScheduleDates.startDate, autoScheduleDates.endDate);
                }}
                style={{ background: '#0d9488', color: '#fff', padding: '9px 20px', borderRadius: 8, fontWeight: 700 }}
              >
                {autoScheduling ? 'Đang tải lịch...' : 'Xem trước vị trí'}
              </button>
            </div>
          </div>
        </div>
      )}

      {autoVisualization && <AutoSchedulerVisualization snapshot={autoVisualization} onClose={() => setAutoVisualization(null)} onSaved={() => {loadData(); notifyShiftUpdates();}}/>}

    </div>
  );
}
