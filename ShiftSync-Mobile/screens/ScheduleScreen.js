import { colors as uiColors, resolveUiColor } from '../theme/koreanPalette';
import ThreeIllustration from '../components/ThreeIllustration';
import { createAppStyles } from '../theme/appTheme';
import { ensureTouchTarget } from '../utils/touchTarget';
import { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  PanResponder,
  StatusBar,
  Image,
  Modal,
  TextInput,
  Switch,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { getMyShifts, getShiftsForStore } from '../services/shiftService';
import { createStaffRequest } from '../services/requestService';
import { submitCheckedSwap } from '../services/scheduleConflictService';
import ScheduleConflictAlert from '../components/ScheduleConflictAlert';
import { getLeaveTypes } from '../services/leaveService';
import { getMyProfile, getMyStores } from '../services/profileService';
import { getSkillsByStore } from '../services/skillService';
import BottomNavbar from '../components/BottomNavbar';
import useActionGuard from '../utils/useActionGuard';
import PaperPlane3D from '../components/PaperPlane3D';
import { vietnamCalendarDate, calendarDayDifference, calendarDate, vietnamDateKey, shiftCalendarMonth } from '../utils/vietnamTime';
import useResumeRefresh from '../utils/useResumeRefresh';

import { getAvatarThumbnail } from '../components/avatarThumbnails';
import { getAvatarForEmployee, AVATAR_OPTIONS } from '../components/avatarConfigs';

// ── Avatars & Action Icons ──────────────────────────────────────────────────
const avatarDilan = require('../assets/avatar-dilan-jon.png');
const avatarMew = require('../assets/avatar-mew-ama.png');
const avatarPaul = require('../assets/avatar-paul-lee.png');
const avatarThia = require('../assets/avatar-thia-ago.png');

const iconKinh = require('../assets/icon-kinh.png');
const iconLoa = require('../assets/icon-loa.png');
const iconDua = require('../assets/icon-dua.png');

export const getStaffAvatarSource = (staffName, avatarId) => {
  if (avatarId) {
    const thumb = getAvatarThumbnail(avatarId);
    if (thumb) return { uri: thumb };
    if (avatarId === 'mew') return avatarMew;
    if (avatarId === 'paul') return avatarPaul;
    if (avatarId === 'thia') return avatarThia;
    if (avatarId === 'dilan') return avatarDilan;
  }
  const calculatedId = typeof getAvatarForEmployee === 'function'
    ? getAvatarForEmployee({ fullName: staffName })
    : 'dilan';
  const thumb = getAvatarThumbnail(calculatedId);
  if (thumb) return { uri: thumb };
  if (calculatedId === 'mew') return avatarMew;
  if (calculatedId === 'paul') return avatarPaul;
  if (calculatedId === 'thia') return avatarThia;
  return avatarDilan;
};

export const resolveOwnedRequestShift = (clickedShift, myShifts = [], currentStaffId) => {
  if (!clickedShift || clickedShift.id === 'no-shift') return null;
  const asId = (value) => value == null || value === '' ? null : String(value);
  const authenticatedId = asId(currentStaffId);
  const clickedStaffId = asId(clickedShift.staffId);
  if (authenticatedId && clickedStaffId && clickedStaffId !== authenticatedId) return null;

  return myShifts.find((ownShift) => {
    if (clickedShift.shiftDate && ownShift.shiftDate && clickedShift.shiftDate !== ownShift.shiftDate) return false;
    const ownStaffId = asId(ownShift.staffId);
    if (clickedStaffId && ownStaffId && clickedStaffId !== ownStaffId) return false;
    const exactRowId = asId(clickedShift.id) && asId(clickedShift.id) === asId(ownShift.id);
    const exactAssignment = asId(clickedShift.assignmentId) && asId(clickedShift.assignmentId) === asId(ownShift.assignmentId);
    const authenticatedAssignment = authenticatedId && clickedStaffId === authenticatedId;
    const fromMySchedule = clickedShift.isOwnAssignment === true || myShifts.includes(clickedShift);
    if (exactRowId && (fromMySchedule || exactAssignment || authenticatedAssignment)) return true;

    return Boolean(
      authenticatedAssignment
      && asId(clickedShift.shiftId)
      && asId(clickedShift.shiftId) === asId(ownShift.shiftId)
      && clickedShift.shiftDate
      && clickedShift.shiftDate === ownShift.shiftDate
      && (!ownStaffId || ownStaffId === authenticatedId)
    );
  }) || null;
};

// ── Color palette matching Web Schedule & SkillsPage (Figma Tokens) ─────────────
export const SHIFT_COLORS = [
  "#C4DDD3", // Barista / Pha chế
  '#F4A8C4', // Cashier / Thu ngân
  '#FDBA74', // Kitchen / Bếp
  "#C9C5DD", // Service / Phục vụ
  "#C4D3E1", // Supervisor / Giám sát / Quản lý
];

export const PRESET_ROLE_COLORS = [
  uiColors.turquoise, // teal
  uiColors.pink, // pink
  uiColors.salmon, // salmon/red
  uiColors.mustard, // yellow-green
  uiColors.blue, // blue
  "#BE9161", // orange
  '#AB47BC', // purple
  uiColors.success, // green
];

export const resolveRoleColor = (roleName = '') => {
  if (!roleName) return SHIFT_COLORS[0];
  const r = roleName.toLowerCase().trim();
  if (r.includes('barista') || r.includes('pha chế') || r.includes('pha che')) return "#C4DDD3";
  if (r.includes('cashier') || r.includes('thu ngân') || r.includes('thu ngan')) return '#F4A8C4';
  if (r.includes('kitchen') || r.includes('bếp') || r.includes('bep')) return '#FDBA74';
  if (r.includes('service') || r.includes('phục vụ') || r.includes('phuc vu') || r.includes('waiter') || r.includes('server')) return "#C9C5DD";
  if (r.includes('supervisor') || r.includes('giám sát') || r.includes('quản lý') || r.includes('quan ly') || r.includes('manager')) return "#C4D3E1";
  const code = [...r].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return SHIFT_COLORS[code % SHIFT_COLORS.length];
};

const ROLE_THEMES = {
  Barista: {
    color: uiColors.turquoise,      // Teal / Mint
    cardBg: "rgba(115, 169, 154, 0.15)",
    activeBorder: uiColors.turquoise,
    activeBg: "rgba(115, 169, 154, 0.25)",
    dotColor: uiColors.turquoise,
  },
  'Pha chế': {
    color: uiColors.turquoise,
    cardBg: "rgba(115, 169, 154, 0.15)",
    activeBorder: uiColors.turquoise,
    activeBg: "rgba(115, 169, 154, 0.25)",
    dotColor: uiColors.turquoise,
  },
  Cashier: {
    color: uiColors.pink,      // Pink / Mauve
    cardBg: "rgba(183, 143, 168, 0.15)",
    activeBorder: uiColors.pink,
    activeBg: "rgba(183, 143, 168, 0.25)",
    dotColor: uiColors.pink,
  },
  'Thu ngân': {
    color: uiColors.pink,
    cardBg: "rgba(183, 143, 168, 0.15)",
    activeBorder: uiColors.pink,
    activeBg: "rgba(183, 143, 168, 0.25)",
    dotColor: uiColors.pink,
  },
  Kitchen: {
    color: uiColors.salmon,      // Salmon / Coral
    cardBg: "rgba(197, 140, 132, 0.15)",
    activeBorder: uiColors.salmon,
    activeBg: "rgba(197, 140, 132, 0.25)",
    dotColor: uiColors.salmon,
  },
  'Bếp': {
    color: uiColors.salmon,
    cardBg: "rgba(197, 140, 132, 0.15)",
    activeBorder: uiColors.salmon,
    activeBg: "rgba(197, 140, 132, 0.25)",
    dotColor: uiColors.salmon,
  },
  Service: {
    color: uiColors.mustard,      // Yellow-green / Olive
    cardBg: "rgba(185, 170, 114, 0.15)",
    activeBorder: uiColors.mustard,
    activeBg: "rgba(185, 170, 114, 0.25)",
    dotColor: uiColors.mustard,
  },
  'Phục vụ': {
    color: uiColors.mustard,
    cardBg: "rgba(185, 170, 114, 0.15)",
    activeBorder: uiColors.mustard,
    activeBg: "rgba(185, 170, 114, 0.25)",
    dotColor: uiColors.mustard,
  },
  Waiter: {
    color: uiColors.mustard,
    cardBg: "rgba(185, 170, 114, 0.15)",
    activeBorder: uiColors.mustard,
    activeBg: "rgba(185, 170, 114, 0.25)",
    dotColor: uiColors.mustard,
  },
  Supervisor: {
    color: uiColors.blue,      // Blue
    cardBg: "rgba(129, 154, 183, 0.15)",
    activeBorder: uiColors.blue,
    activeBg: "rgba(129, 154, 183, 0.25)",
    dotColor: uiColors.blue,
  },
  'Giám sát': {
    color: uiColors.blue,
    cardBg: "rgba(129, 154, 183, 0.15)",
    activeBorder: uiColors.blue,
    activeBg: "rgba(129, 154, 183, 0.25)",
    dotColor: uiColors.blue,
  },
  'Quản lý': {
    color: uiColors.blue,
    cardBg: "rgba(129, 154, 183, 0.15)",
    activeBorder: uiColors.blue,
    activeBg: "rgba(129, 154, 183, 0.25)",
    dotColor: uiColors.blue,
  },
  Default: {
    color: uiColors.turquoise,
    cardBg: "rgba(115, 169, 154, 0.15)",
    activeBorder: uiColors.turquoise,
    activeBg: "rgba(115, 169, 154, 0.25)",
    dotColor: uiColors.turquoise,
  }
};

const getRoleTheme = (roleOrShift = '') => {
  let color = '';
  let roleName = '';
  if (typeof roleOrShift === 'object' && roleOrShift !== null) {
    color = roleOrShift.color;
    roleName = roleOrShift.role || '';
  } else {
    roleName = roleOrShift;
  }

  if (!color || !color.startsWith('#')) {
    color = resolveRoleColor(roleName);
  }
  color = resolveUiColor(color);

  let r = 115, g = 169, b = 154;
  if (color && color.startsWith('#') && color.length >= 7) {
    r = parseInt(color.slice(1, 3), 16) || 91;
    g = parseInt(color.slice(3, 5), 16) || 200;
    b = parseInt(color.slice(5, 7), 16) || 184;
  }

  return {
    color,
    cardBg: `rgba(${r}, ${g}, ${b}, 0.15)`,
    activeBorder: color,
    activeBg: `rgba(${r}, ${g}, ${b}, 0.25)`,
    dotColor: color,
  };
};

const DAY_LABELS = [
  { fullLabel: 'Thứ 2', shortLabel: 'Thứ 2', dowIndex: 1 },
  { fullLabel: 'Thứ 3', shortLabel: 'Thứ 3', dowIndex: 2 },
  { fullLabel: 'Thứ 4', shortLabel: 'Thứ 4', dowIndex: 3 },
  { fullLabel: 'Thứ 5', shortLabel: 'Thứ 5', dowIndex: 4 },
  { fullLabel: 'Thứ 6', shortLabel: 'Thứ 6', dowIndex: 5 },
  { fullLabel: 'Thứ 7', shortLabel: 'Thứ 7', dowIndex: 6 },
  { fullLabel: 'Thứ CN', shortLabel: 'Thứ CN', dowIndex: 0 },
];

const MONTH_NAMES = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
];

function getWeekDates(weekOffset = 0) {
  const base = vietnamCalendarDate();
  const dow = base.getDay();
  const diffToMon = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(base);
  monday.setDate(base.getDate() + diffToMon + weekOffset * 7);

  return DAY_LABELS.map((item, idx) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + idx);
    const dayNumStr = d.getDate().toString().padStart(2, '0');
    const monthNumStr = (d.getMonth() + 1).toString().padStart(2, '0');

    return {
      ...item,
      dateObj: d,
      dateStr: dayNumStr,
      monthStr: monthNumStr,
      fullHeaderDate: `${item.fullLabel}, ${dayNumStr} tháng ${monthNumStr}`,
      fullDateStr: `${d.getFullYear()}-${monthNumStr}-${dayNumStr}`,
    };
  });
}

// ── Dữ liệu ca cá nhân & chi nhánh (Lấy từ API thật) ─────────────
const DEFAULT_MY_SHIFTS = [];
const DEFAULT_STORE_SHIFTS = [];

const EMPTY_SHIFT = {
  id: 'no-shift',
  dayLabel: 'Chưa có ca',
  timeRange: '—',
  location: 'Cửa hàng được phân công',
  role: 'Nhân viên',
  color: "#C4DDD3",
};

export default function ScheduleScreen({ navigation }) {
  const { width: viewportWidth } = useWindowDimensions();
  useResumeRefresh(navigation, () => fetchScheduleData(false));
  const insets = useSafeAreaInsets();
  const { runAction, busy } = useActionGuard();
  const submitting = !!busy.submit;
  const toastTimeout = useRef(null);
  const planeTimeout = useRef(null);
  const planeStartTimeout = useRef(null);
  useEffect(() => () => { clearTimeout(toastTimeout.current); clearTimeout(planeTimeout.current); clearTimeout(planeStartTimeout.current); }, []);
  const [activeTab, setActiveTab] = useState('my_shifts');
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDayIndex, setSelectedDayIndex] = useState(() => (vietnamCalendarDate().getDay() + 6) % 7);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [calendarMonthKey, setCalendarMonthKey] = useState(() => `${vietnamDateKey().slice(0, 7)}-01`);
  const calendarMonth = calendarDate(calendarMonthKey);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [roleFilter, setRoleFilter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scheduleErrors, setScheduleErrors] = useState({ my_shifts: false, schedule: false });
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [storeColleagues, setStoreColleagues] = useState([]);

  // ── Custom Toast / Thông báo đẹp ──
  const [toastMessage, setToastMessage] = useState(null);

  // ── Action Box State (Chuẩn Group 192 / Rectangle 631 trong Đổi ca (2).png) ──
  const [activeSelectedShift, setActiveSelectedShift] = useState(null);
  const [actionBoxVisible, setActionBoxVisible] = useState(false);

  // ── Sub-modals for forms ──
  const [swapModalVisible, setSwapModalVisible] = useState(false);
  const [absentModalVisible, setAbsentModalVisible] = useState(false);
  const [leaveModalVisible, setLeaveModalVisible] = useState(false);

  // ── Form inputs for Swap ──
  const [selectedSwapShift, setSelectedSwapShift] = useState(EMPTY_SHIFT);
  const [showShiftPicker, setShowShiftPicker] = useState(false);
  const [selectedSwapStaff, setSelectedSwapStaff] = useState('');

  // ── Form inputs for Absent ──
  const [selectedAbsentShift, setSelectedAbsentShift] = useState(EMPTY_SHIFT);
  const [showAbsentShiftPicker, setShowAbsentShiftPicker] = useState(false);
  const [absentReason, setAbsentReason] = useState('');

  // ── Form inputs for Leave ──
  const today = vietnamCalendarDate();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const dayAfter = new Date(today);
  dayAfter.setDate(today.getDate() + 2);
  const fmtD = (d) => `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;

  const [activeStoreId, setActiveStoreId] = useState(null);
  const [leaveReason, setLeaveReason] = useState('');
  const [isAllDay, setIsAllDay] = useState(true);
  const [startDate, setStartDate] = useState(fmtD(tomorrow));
  const [endDate, setEndDate] = useState(fmtD(dayAfter));
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loadingLeaveTypes, setLoadingLeaveTypes] = useState(false);
  const [leaveTypesError, setLeaveTypesError] = useState(null);
  const [selectedLeaveType, setSelectedLeaveType] = useState('');
  const [leaveError, setLeaveError] = useState(null);
  const [swapError, setSwapError] = useState(null);
  const [scheduleConflict, setScheduleConflict] = useState(null);
  const [absentError, setAbsentError] = useState(null);

  // ── ✈️ 3D Paper Plane launch trigger ──
  const [planeLaunched, setPlaneLaunched] = useState(false);

  const triggerLaunchPlane = () => {
    setPlaneLaunched(false);
    clearTimeout(planeStartTimeout.current);
    planeStartTimeout.current = setTimeout(() => {
      setPlaneLaunched(true);
      clearTimeout(planeTimeout.current);
      planeTimeout.current = setTimeout(() => setPlaneLaunched(false), 2600);
    }, 40);
  };

  // ── Live shifts state ──
  const [liveMyShifts, setLiveMyShifts] = useState([]);
  const [liveStoreShifts, setLiveStoreShifts] = useState([]);

  const vietnamToday = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  // Recreate UI-only Date carriers after a device-zone change; business date
  // keys still come exclusively from the Vietnam calendar.
  const calendarDeviceOffset = new Date().getTimezoneOffset();
  const weekDays = useMemo(() => getWeekDates(weekOffset), [weekOffset, vietnamToday, calendarDeviceOffset]);
  const startDay = weekDays[0];
  const endDay = weekDays[weekDays.length - 1];
  const monthTitle = startDay.dateObj.getMonth() === endDay.dateObj.getMonth()
    ? `${MONTH_NAMES[startDay.dateObj.getMonth()]}, ${startDay.dateObj.getFullYear()}`
    : `${MONTH_NAMES[startDay.dateObj.getMonth()]} - ${MONTH_NAMES[endDay.dateObj.getMonth()]}, ${endDay.dateObj.getFullYear()}`;
  const weekSubtitle = `${startDay.dateStr}/${startDay.monthStr} - ${endDay.dateStr}/${endDay.monthStr}` +
    (weekOffset === 0 ? ' (Tuần này)' : weekOffset === 1 ? ' (Tuần tới)' : weekOffset === -1 ? ' (Tuần trước)' : weekOffset > 0 ? ` (+${weekOffset} tuần)` : ` (${weekOffset} tuần)`);
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  useEffect(() => {
    fetchScheduleData(true);
    const unsubscribe = navigation.addListener('focus', () => {
      fetchScheduleData(false);
    });
    return unsubscribe;
  }, [navigation]);

  const showToast = (title, message, type = 'success') => {
    setToastMessage({ title, message, type });
    clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const fetchLeaveTypesData = async (targetStoreId) => {
    const sId = targetStoreId || activeStoreId;
    if (!sId) return;
    try {
      setLoadingLeaveTypes(true);
      setLeaveTypesError(null);
      const res = await getLeaveTypes(sId);
      const data = res?.data || [];
      setLeaveTypes(data);
      if (data.length > 0) {
        setSelectedLeaveType((prev) => {
          if (prev && data.some((t) => (t.code || t.name) === prev)) return prev;
          return data[0].code || data[0].name;
        });
      }
    } catch (err) {
      console.log('Error fetching leave types in ScheduleScreen:', err);
      setLeaveTypesError('Không thể tải danh sách loại nghỉ. Vui lòng thử lại.');
    } finally {
      setLoadingLeaveTypes(false);
    }
  };

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await fetchScheduleData(false);
    setRefreshing(false);
  };

  const fetchScheduleData = async (isInitial = false) => {
    const nextErrors = { my_shifts: false, schedule: false };
    try {
      if (isInitial) setLoading(true);
      // 1. Fetch current user & stores
      let activeStoreId = null;
      let currentUser = null;
      let storeSkills = [];
      try {
        const { data: user } = await getMyProfile();
        currentUser = user;
        setCurrentUserProfile(user);
        if (user?.id) {
          const { data: stores } = await getMyStores(user.id);
          const activeStore = stores?.find((s) => s.status === 'ACTIVE') || stores?.[0];
          activeStoreId = activeStore?.storeId || activeStore?.id;
          setActiveStoreId(activeStoreId);
          if (activeStoreId) {
            fetchLeaveTypesData(activeStoreId);
            const skillRes = await getSkillsByStore(activeStoreId).catch(() => null);
            if (skillRes?.data) {
              storeSkills = Array.isArray(skillRes.data) ? skillRes.data : (skillRes.data.content || []);
            }
          }
        }
      } catch (e) {
        nextErrors.schedule = true;
      }

      const getShiftColor = (s, roleName) => {
        if (!s) return SHIFT_COLORS[0];
        if (s.color && typeof s.color === 'string' && s.color.startsWith('#')) return s.color;
        if (s.skillColor && typeof s.skillColor === 'string' && s.skillColor.startsWith('#')) return s.skillColor;
        const sSkillId = s.skillId || s.location;
        const skillsList = Array.isArray(storeSkills) ? storeSkills : [];
        const matched = skillsList.find(
          (sk) => sk && (
            (sSkillId && (sk.id === sSkillId || (sk.name && String(sk.name).toLowerCase() === String(sSkillId).toLowerCase()))) ||
            (s.skillName && sk.name && String(sk.name).toLowerCase() === String(s.skillName).toLowerCase()) ||
            (roleName && sk.name && String(sk.name).toLowerCase() === String(roleName).toLowerCase())
          )
        );
        if (matched && matched.description && typeof matched.description === 'string' && matched.description.startsWith('#')) {
          return matched.description;
        }
        return resolveRoleColor(matched?.name || roleName);
      };

      // ShiftDTO contains one or more assignment-specific work locations.  The
      // assignment is the source of truth for both the staff member's skill
      // and zone; top-level ShiftDTO fields describe the shift as a whole.
      const resolveAssignmentDetails = (shift, assignment) => {
        const assignmentSkillId = assignment?.requiredSkillId || assignment?.skillId;
        const matchedSkill = storeSkills.find((skill) =>
          assignmentSkillId && String(skill.id) === String(assignmentSkillId)
        );
        const requirement = (shift.skillRequirements || []).find((item) =>
          assignmentSkillId && String(item.skillId) === String(assignmentSkillId)
        );
        const skillRole = assignment?.skillName
          || matchedSkill?.name
          || requirement?.skillName
          || shift.skillName;
        const position = assignment?.zoneName
          || shift.zoneName
          || skillRole
          || 'Chưa xác định vị trí';
        const shiftForColor = {
          ...shift,
          skillId: assignmentSkillId || shift.skillId,
          skillName: skillRole || position,
        };

        return {
          position,
          color: getShiftColor(shiftForColor, skillRole || position),
          location: assignment?.zoneName || shift.zoneName || shift.storeAddress || shift.storeName || 'Chi nhánh phân công',
          zoneId: assignment?.zoneId || shift.zoneId || null,
        };
      };

      // 2. Fetch real my shifts from API
      const res = await getMyShifts().catch(() => {
        nextErrors.my_shifts = true;
        return null;
      });
      if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
        const mapped = res.data.map((s, idx) => {
          const [y, m, d] = (s.shiftDate || '').split('-').map(Number);
          const shiftDateObj = y ? new Date(y, m - 1, d) : vietnamCalendarDate();
          const dow = shiftDateObj.getDay();
          const actualIdx = dow === 0 ? 6 : dow - 1;
          const fmtT = (t) => {
            if (!t) return '06:00';
            if (typeof t === 'string') return t.slice(0, 5);
            return `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`;
          };
          const myAssignment = (s.shiftAssignments || []).find((assignment) =>
            String(assignment.staffId) === String(currentUser?.id)
          );
          const assignmentDetails = resolveAssignmentDetails(s, myAssignment);
          return {
            id: myAssignment?.id ? `${s.id}-${myAssignment.id}` : (s.id || `live-my-${idx}`),
            assignmentId: myAssignment?.id || null,
            staffId: myAssignment?.staffId || currentUser?.id || s.staffId || s.assignedStaffId,
            isOwnAssignment: true,
            shiftId: s.id,
            shiftDate: s.shiftDate,
            dayIndex: actualIdx,
            dayLabel: `${DAY_LABELS.find((d) => d.dowIndex === dow)?.fullLabel || 'Thứ 2'} (${d || shiftDateObj.getDate()}/${m || (shiftDateObj.getMonth() + 1)})`,
            staffName: currentUser?.fullName || s.staffName || 'Nhân viên',
            avatarId: currentUser?.avatarId || s.avatarId,
            timeRange: `${fmtT(s.startTime)} - ${fmtT(s.endTime)}`,
            location: assignmentDetails.location,
            storeName: s.storeName,
            zoneId: assignmentDetails.zoneId,
            position: assignmentDetails.position,
            role: assignmentDetails.position,
            color: assignmentDetails.color,
            note: s.note || '',
            hasFlag: Boolean(s.note && s.note.trim().length > 0),
          };
        });
        setLiveMyShifts(mapped);
      } else if (res) {
        setLiveMyShifts([]);
      }

      // 3. Fetch real store shifts if storeId exists
      if (activeStoreId) {
        const storeRes = await getShiftsForStore(activeStoreId).catch(() => {
          nextErrors.schedule = true;
          return null;
        });
        if (storeRes && storeRes.data && Array.isArray(storeRes.data) && storeRes.data.length > 0) {
          const colleaguesMap = new Map();
          const mappedStore = storeRes.data.flatMap((s, idx) => {
            const [y, m, d] = (s.shiftDate || '').split('-').map(Number);
            const shiftDateObj = y ? new Date(y, m - 1, d) : vietnamCalendarDate();
            const dow = shiftDateObj.getDay();
            const actualIdx = dow === 0 ? 6 : dow - 1;
            const fmtT = (t) => {
              if (!t) return '06:00';
              if (typeof t === 'string') return t.slice(0, 5);
              return `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`;
            };
            const assignments = s.shiftAssignments?.length ? s.shiftAssignments : [null];
            return assignments.map((assignment, assignmentIndex) => {
              const assignmentDetails = resolveAssignmentDetails(s, assignment);
              const staffName = assignment?.staffName || s.assignedStaffName || s.staffName || 'Nhân viên';

              const staffId = assignment?.staffId || s.staffId || s.assignedStaffId;
              if (staffName && staffName !== 'Chưa phân công' && (!currentUser?.fullName || staffName !== currentUser.fullName)) {
                if (!colleaguesMap.has(staffName)) {
                  colleaguesMap.set(staffName, {
                    staffId,
                    name: staffName,
                    role: assignmentDetails.position,
                    avatarId: assignment?.avatarId || s.avatarId,
                    shiftId: s.id,
                    shiftDate: s.shiftDate,
                    timeRange: `${fmtT(s.startTime)} - ${fmtT(s.endTime)}`,
                  });
                }
              }

              return {
              id: assignment?.id ? `${s.id}-${assignment.id}` : (s.id || `live-store-${idx}-${assignmentIndex}`),
              assignmentId: assignment?.id || null,
              staffId,
              shiftId: s.id,
              shiftDate: s.shiftDate,
              dayIndex: actualIdx,
              dayLabel: `${DAY_LABELS.find((d) => d.dowIndex === dow)?.fullLabel || 'Thứ 2'} (${d || shiftDateObj.getDate()}/${m || (shiftDateObj.getMonth() + 1)})`,
              staffName,
              avatarId: assignment?.avatarId || s.avatarId,
              timeRange: `${fmtT(s.startTime)} - ${fmtT(s.endTime)}`,
              location: assignmentDetails.location,
              storeName: s.storeName,
              zoneId: assignmentDetails.zoneId,
              position: assignmentDetails.position,
              role: assignmentDetails.position,
              color: assignmentDetails.color,
              note: s.note || '',
              hasFlag: Boolean(s.note && s.note.trim().length > 0),
              };
            });
          });
          setLiveStoreShifts(mappedStore);
          const colleaguesList = Array.from(colleaguesMap.values());
          setStoreColleagues(colleaguesList);
          if (colleaguesList.length > 0) {
            setSelectedSwapStaff((prev) => prev || colleaguesList[0].name);
          }
        } else if (storeRes) {
          setLiveStoreShifts([]);
          setStoreColleagues([]);
        }
      } else if (!nextErrors.schedule) {
        setLiveStoreShifts([]);
        setStoreColleagues([]);
      }
    } catch (e) {
      console.log('Using live schedule data:', e.message);
      nextErrors.my_shifts = true;
      nextErrors.schedule = true;
    } finally {
      setScheduleErrors(nextErrors);
      setLoading(false);
    }
  };

  const handleSelectDay = (idx) => {
    if (selectedDayIndex === idx) {
      setSelectedDayIndex(null);
    } else {
      setSelectedDayIndex(idx);
    }
  };

  // ── Khi bấm vào bất kỳ ca làm nào trên lịch -> Mở popup box chuẩn Đổi ca (2).png ──
  const handleShiftPress = (shift, dayItem) => {
    setActiveSelectedShift({ ...shift, dayItem });
    const ownedShift = resolveOwnedRequestShift(shift, liveMyShifts, currentUserProfile?.id);
    setSelectedSwapShift(ownedShift || EMPTY_SHIFT);
    setSelectedAbsentShift(ownedShift || EMPTY_SHIFT);
    setActionBoxVisible(true);
  };

  // ── Xử lý chuyển tiếp khi bấm 3 nút trong popup ──
  const handleOpenSwapModal = () => {
    if (!resolveOwnedRequestShift(selectedSwapShift, liveMyShifts, currentUserProfile?.id)) {
      setSelectedSwapShift(EMPTY_SHIFT);
      showToast('Chọn ca của bạn', 'Bạn chỉ có thể yêu cầu đổi ca được phân công cho mình.', 'warning');
      return;
    }
    setActionBoxVisible(false);
    setShowShiftPicker(false);
    setSwapModalVisible(true);
  };

  const handleOpenAbsentModal = () => {
    if (!resolveOwnedRequestShift(selectedAbsentShift, liveMyShifts, currentUserProfile?.id)) {
      setSelectedAbsentShift(EMPTY_SHIFT);
      showToast('Chọn ca của bạn', 'Bạn chỉ có thể xin vắng ca được phân công cho mình.', 'warning');
      return;
    }
    setActionBoxVisible(false);
    setShowAbsentShiftPicker(false);
    setAbsentModalVisible(true);
  };

  const handleOpenLeaveModal = () => {
    setActionBoxVisible(false);
    setLeaveError(null);
    if (activeStoreId && leaveTypes.length === 0) {
      fetchLeaveTypesData(activeStoreId);
    }
    setLeaveModalVisible(true);
  };

  // ── Submit Đổi ca ──
  const handleSubmitSwap = () => runAction('submit', async () => {
    setSwapError(null);
    if (!resolveOwnedRequestShift(selectedSwapShift, liveMyShifts, currentUserProfile?.id)) {
      const msg = 'Vui lòng chọn ca được phân công cho bạn để đổi';
      setSwapError(msg);
      showToast('Lưu ý', msg, 'warning');
      return;
    }
    if (!selectedSwapStaff) {
      const msg = 'Vui lòng chọn đồng nghiệp để đổi ca';
      setSwapError(msg);
      showToast('Lưu ý', msg, 'warning');
      return;
    }

    const targetColleague = typeof selectedSwapStaff === 'object'
      ? selectedSwapStaff
      : storeColleagues.find((c) => c.name === selectedSwapStaff || c.staffId === selectedSwapStaff);

    const colleagueName = targetColleague?.name || (typeof selectedSwapStaff === 'string' ? selectedSwapStaff : 'Đồng nghiệp');
    const fromShiftId = selectedSwapShift?.shiftId || selectedSwapShift?.id;
    const toStaffId = targetColleague?.staffId || targetColleague?.id;
    const toShiftId = targetColleague?.shiftId;

    try {
      const checked = await submitCheckedSwap({ userId: currentUserProfile?.id, storeId: activeStoreId, fromShiftId, toStaffId, toShiftId });
      if (checked.conflicts.length) {
        setScheduleConflict(checked);
        return;
      }
      setSwapModalVisible(false);
      setSwapError(null);
      showToast('Gửi thành công', `Đã gửi yêu cầu đổi ca ${selectedSwapShift.dayLabel} với ${colleagueName} tới Quản lý`);
      // ✈️ Phóng máy bay giấy 3D khi gửi yêu cầu thành công
      triggerLaunchPlane();
    } catch (e) {
      const errMsg = e.response?.data?.message || e.response?.data?.error || e.message || 'Không thể gửi yêu cầu đổi ca';
      setSwapError(errMsg);
      showToast('Thất bại', errMsg, 'error');
    } finally {
    }
  });

  // ── Submit Xin vắng ──
  const handleSubmitAbsent = () => runAction('submit', async () => {
    setAbsentError(null);
    if (!resolveOwnedRequestShift(selectedAbsentShift, liveMyShifts, currentUserProfile?.id)) {
      const msg = 'Vui lòng chọn ca được phân công cho bạn để xin vắng';
      setAbsentError(msg);
      showToast('Lưu ý', msg, 'warning');
      return;
    }
    if (!absentReason.trim()) {
      const msg = 'Vui lòng nhập lý do xin vắng ca';
      setAbsentError(msg);
      showToast('Lưu ý', msg, 'warning');
      return;
    }
    try {
      await createStaffRequest({
        type: 'ABSENT',
        startDate: selectedAbsentShift.shiftDate,
        endDate: selectedAbsentShift.shiftDate,
        typeCategory: 'absence',
        requestType: 'Yêu cầu xin vắng',
        requesterName: currentUserProfile?.fullName || 'Nhân viên',
        shiftInfo: `${selectedAbsentShift.dayLabel} ${selectedAbsentShift.timeRange} (${selectedAbsentShift.role})`,
        reason: absentReason.trim(),
        content: `Xin vắng ca: ${selectedAbsentShift.dayLabel} (${selectedAbsentShift.timeRange}).\nLý do: ${absentReason.trim()}`,
      }, activeStoreId);
      setAbsentModalVisible(false);
      setAbsentReason('');
      setAbsentError(null);
      showToast('Gửi thành công', `Đã gửi yêu cầu xin vắng ca ${selectedAbsentShift.dayLabel} tới Quản lý`);
      // ✈️ Phóng máy bay giấy 3D khi gửi yêu cầu thành công
      triggerLaunchPlane();
    } catch (e) {
      const errMsg = e.response?.data?.message || e.response?.data?.error || e.message || 'Không thể gửi yêu cầu xin vắng';
      setAbsentError(errMsg);
      showToast('Thất bại', errMsg, 'error');
    } finally {
    }
  });

  // ── Submit Xin nghỉ ──
  const handleSubmitLeave = () => runAction('submit', async () => {
    setLeaveError(null);
    if (!selectedLeaveType || leaveTypes.length === 0) {
      const msg = 'Vui lòng chọn loại nghỉ phép hợp lệ';
      setLeaveError(msg);
      showToast('Lưu ý', msg, 'warning');
      return;
    }
    if (!leaveReason.trim()) {
      const msg = 'Vui lòng nhập lý do xin nghỉ phép';
      setLeaveError(msg);
      showToast('Lưu ý', msg, 'warning');
      return;
    }

    if (!activeStoreId) {
      const msg = 'Không tìm thấy thông tin chi nhánh cửa hàng của bạn';
      setLeaveError(msg);
      showToast('Lỗi', msg, 'error');
      return;
    }

    try {
      await createStaffRequest({
        type: 'LEAVE',
        typeCategory: 'leave',
        requestType: 'Yêu cầu xin nghỉ',
        leaveType: selectedLeaveType,
        startDate,
        endDate,
        reason: leaveReason.trim(),
        content: `Đơn xin nghỉ phép (${selectedLeaveType}) từ ${startDate} đến ${endDate}.\nLý do: ${leaveReason.trim()}`,
      }, activeStoreId);
      setLeaveModalVisible(false);
      setLeaveReason('');
      setLeaveError(null);
      showToast('Gửi thành công', 'Yêu cầu xin nghỉ phép đã được chuyển tới Quản lý');
      // ✈️ Phóng máy bay giấy 3D khi gửi yêu cầu thành công
      triggerLaunchPlane();
    } catch (e) {
      const errMsg = e.response?.data?.message || e.response?.data?.error || e.message || 'Không thể gửi yêu cầu xin nghỉ';
      setLeaveError(errMsg);
      showToast('Thất bại', errMsg, 'error');
    } finally {
    }
  });

  const displayDays = selectedDayIndex !== null
    ? [weekDays[selectedDayIndex]]
    : weekDays;
  const availableShifts = activeTab === 'my_shifts'
    ? liveMyShifts
    : (liveStoreShifts.length > 0 ? liveStoreShifts : liveMyShifts);
  const weekHasShifts = availableShifts.some((shift) => weekDays.some((day) => shift.shiftDate === day.fullDateStr));
  const displayedShifts = availableShifts.filter((shift) => activeTab !== 'schedule' || !roleFilter || shift.position === roleFilter);
  const hasScheduleError = scheduleErrors[activeTab]
    || (activeTab === 'schedule' && liveStoreShifts.length === 0 && scheduleErrors.my_shifts);
  const visibleShiftCount = displayDays.reduce((count, dayItem) => {
    const dayIndex = weekDays.findIndex((day) => day.dowIndex === dayItem.dowIndex);
    return count + displayedShifts.filter((shift) => shift.shiftDate
      ? shift.shiftDate === dayItem.fullDateStr
      : shift.dayIndex === dayIndex).length;
  }, 0);
  const headerMonth = MONTH_NAMES[weekDays[selectedDayIndex ?? 0].dateObj.getMonth()];
  const storeTitle = availableShifts.find((shift) => shift.storeName)?.storeName || 'Chi nhánh làm việc';
  const roleOptions = [...new Set(availableShifts.map((shift) => shift.position).filter(Boolean))];
  const calendarStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
  const calendarOffset = (calendarStart.getDay() + 6) % 7;
  const calendarDays = Array.from({ length: 42 }, (_, index) => new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), index - calendarOffset + 1));
  const selectedDate = selectedDayIndex !== null ? weekDays[selectedDayIndex].fullDateStr : null;
  const canManageSelectedShift = Boolean(resolveOwnedRequestShift(activeSelectedShift, liveMyShifts, currentUserProfile?.id));
  const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const openCalendar = () => {
    setCalendarMonthKey(`${weekDays[selectedDayIndex ?? 0].fullDateStr.slice(0, 7)}-01`);
    setCalendarVisible(true);
  };
  const selectCalendarDate = (date) => {
    const currentMonday = new Date(getWeekDates(0)[0].dateObj);
    const targetMonday = new Date(date);
    currentMonday.setHours(0, 0, 0, 0);
    targetMonday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
    targetMonday.setHours(0, 0, 0, 0);
    setWeekOffset(Math.round(calendarDayDifference(targetMonday, currentMonday) / 7));
    setSelectedDayIndex((date.getDay() + 6) % 7);
    setCalendarVisible(false);
  };
  const weekPanResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 18 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
    onPanResponderRelease: (_, gesture) => {
      if (Math.abs(gesture.dx) > 40) setWeekOffset((offset) => offset + (gesture.dx < 0 ? 1 : -1));
    },
  });

  const renderToast = () => {
    if (!toastMessage) return null;
    return (
      <View style={styles.toastOverlay}>
        <View style={[
          styles.toastCard,
          toastMessage.type === 'warning' && styles.toastCardWarning,
          toastMessage.type === 'error' && styles.toastCardError,
        ]}>
          <View style={[
            styles.toastIconCircle,
            toastMessage.type === 'warning' && styles.toastIconCircleWarning,
            toastMessage.type === 'error' && styles.toastIconCircleError,
          ]}>
            <Text style={styles.toastIconText}>
              {toastMessage.type === 'warning' ? '!' : toastMessage.type === 'error' ? '✕' : '✓'}
            </Text>
          </View>
          <View style={styles.toastTextContainer}>
            <Text style={styles.toastTitle}>{toastMessage.title}</Text>
            <Text style={styles.toastMessage} numberOfLines={3}>{toastMessage.message}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={uiColors.surface} />
      {renderToast()}

      <View style={styles.monthHeaderRow}>
        <TouchableOpacity
          style={ensureTouchTarget(styles.todayIconButton)}
          accessibilityRole="button"
          accessibilityLabel="Mở lịch chọn ngày"
          onPress={openCalendar}
        >
          <Ionicons name="calendar-clear-outline" size={28} color={uiColors.ink} accessible={false} />
          <Text style={styles.todayIconDay}>{today.getDate()}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={ensureTouchTarget(styles.monthTitleContainer)} accessibilityRole="button" accessibilityLabel={`Chọn ngày trong ${headerMonth}`} onPress={openCalendar}>
          <Text accessibilityRole="header" style={styles.monthTitleText}>{headerMonth}</Text>
          <Ionicons name="chevron-down" size={19} color={uiColors.ink} accessible={false} />
        </TouchableOpacity>
        <TouchableOpacity style={ensureTouchTarget(styles.todayIconButton)} accessibilityRole="button" accessibilityLabel="Lịch sử điều chỉnh" accessibilityState={{ disabled: !activeStoreId }} aria-disabled={!activeStoreId} disabled={!activeStoreId} onPress={() => navigation.navigate('ScheduleHistory', { storeId: activeStoreId, weekStart: weekDays[0].fullDateStr })}>
          <Ionicons name="time-outline" size={26} color={activeStoreId ? uiColors.orange : "#B8BFC1"} accessible={false} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        {[
          { key: 'my_shifts', label: 'Ca của tôi' },
          { key: 'schedule', label: 'Lịch chi nhánh' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={ensureTouchTarget([styles.tabBtn, activeTab === tab.key && styles.tabBtnActive])}
            onPress={() => setActiveTab(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === tab.key }} aria-selected={activeTab === tab.key}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'schedule' && <View style={styles.storeFilterRow}>
        <Ionicons name="location-outline" size={24} color="#8B809D" accessible={false} />
        <Text style={styles.storeFilterTitle} numberOfLines={1}>{storeTitle}</Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={roleFilter ? `Lọc lịch theo vị trí, đang chọn ${roleFilter}` : 'Lọc lịch theo vị trí'}
          onPress={() => setFilterModalVisible(true)}
          style={ensureTouchTarget(styles.filterButton)}
        >
          <Ionicons name="options-outline" size={26} color={roleFilter ? uiColors.orange : "#404B57"} accessible={false} />
        </TouchableOpacity>
      </View>}

      <ScrollView horizontal style={{ flexGrow: 0 }} contentContainerStyle={{ flexGrow: 1 }} showsHorizontalScrollIndicator={viewportWidth < 358}>
      <View style={[styles.weekStripCard, { minWidth: 358, flex: 1 }]} {...(viewportWidth >= 358 ? weekPanResponder.panHandlers : {})}>
        {weekDays.map((item, index) => {
          const isSelected = selectedDayIndex === index;
          const isToday = item.fullDateStr === todayStr;
          const hasShift = liveMyShifts.some((shift) => shift.shiftDate ? shift.shiftDate === item.fullDateStr : shift.dayIndex === index);
          return (
            <TouchableOpacity
              key={item.fullDateStr}
              style={ensureTouchTarget([styles.dayColumn, isToday && !isSelected && styles.dayColumnToday, isSelected && styles.dayColumnSelected])}
              onPress={() => handleSelectDay(index)}
              accessibilityRole="button"
              accessibilityLabel={`${item.fullHeaderDate}${isToday ? ', hôm nay' : ''}${hasShift ? ', có ca làm' : ''}`}
              accessibilityHint="Nhấn để xem ca trong ngày. Nhấn lần nữa để xem cả tuần. Vuốt ngang để chuyển tuần."
              accessibilityState={{ selected: isSelected }} aria-selected={isSelected}
              activeOpacity={0.8}
            >
              <Text style={[styles.dayLabelText, isSelected && styles.dayLabelTextSelected]}>{index === 6 ? 'CN' : `T${index + 2}`}</Text>
              <Text style={[styles.dayDateText, isSelected && styles.dayDateTextSelected]}>{Number(item.dateStr)}</Text>
              <View style={[styles.workDot, hasShift && styles.workDotVisible, hasShift && isSelected && styles.workDotSelected]} />
            </TouchableOpacity>
          );
        })}
      </View></ScrollView>

      <ScrollView
        style={styles.page}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: 88 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleManualRefresh} colors={[uiColors.orange]} tintColor={uiColors.orange} />}
      >
        <View style={styles.companionBanner}>
          <Text style={styles.companionEyebrow}>CÙNG ĐỘI NGŨ CỦA BẠN</Text>
          <Text style={styles.companionTitle}>Sẵn sàng cho ca làm mới</Text>
          <ThreeIllustration kind="shift-buddies" width={Math.min(320, viewportWidth - 48)} height={Math.min(180, (viewportWidth - 48) / 1.6)} animated interactive style={styles.companionScene} />
          <Text style={styles.companionCaption}>Xem lịch và chủ động sắp xếp thời gian.</Text>
        </View>
        {!loading && hasScheduleError && <View style={styles.scheduleErrorCard} accessibilityRole="alert">
          <Ionicons name="cloud-offline-outline" size={24} color={uiColors.primaryStrong} accessible={false} />
          <View style={styles.scheduleErrorCopy}>
            <Text style={styles.scheduleErrorTitle}>Chưa cập nhật được lịch làm</Text>
            <Text style={styles.scheduleErrorMessage}>{visibleShiftCount > 0
              ? 'Đang hiển thị lịch đã tải trước đó. Hãy thử tải lại.'
              : 'Kiểm tra kết nối rồi thử tải lại để xem ca được phân công.'}</Text>
          </View>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Thử tải lại lịch làm việc" accessibilityState={{ disabled: refreshing, busy: refreshing }} aria-disabled={refreshing} aria-busy={refreshing} disabled={refreshing} onPress={handleManualRefresh} style={ensureTouchTarget(styles.scheduleRetryButton)}>
            {refreshing ? <ActivityIndicator size="small" color={uiColors.primaryStrong} /> : <Text style={styles.retryText}>Thử lại</Text>}
          </TouchableOpacity>
        </View>}

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={uiColors.primaryStrong} />
            <Text style={styles.loadingText}>Đang tải lịch làm việc...</Text>
          </View>
        ) : hasScheduleError && visibleShiftCount === 0 ? null : !weekHasShifts ? (
          <View style={{ paddingTop: 8 }}>
            <View style={[styles.emptyScheduleNotice, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}><View style={{ flex: 1 }}><Text style={styles.emptyScheduleNoticeTitle}>Tuần này chưa có lịch làm</Text><Text style={styles.emptyScheduleNoticeText}>Cho quản lý biết khi nào bạn có thể làm việc.</Text></View><ThreeIllustration kind="calendar" size={68} /></View>
            {weekDays.map((day, index) => <View key={day.fullDateStr} style={styles.emptyScheduleDay}>
              <View style={styles.emptyScheduleDayHeader}><Text style={styles.emptyScheduleDate}>{day.fullHeaderDate}</Text><View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}><Ionicons name="people-outline" size={14} color={uiColors.muted} /><Text style={{ color: uiColors.muted, fontSize: 12 }}>0</Text></View></View>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Đăng ký lịch rảnh ${day.fullHeaderDate}`} onPress={() => navigation.navigate('Availability', undefined, { pop: true })} style={ensureTouchTarget(styles.availabilityDashedButton)}><Ionicons accessible={false} name="add" size={17} color={uiColors.muted} /><Text style={styles.availabilityDashedText}>Đăng ký lịch rảnh</Text></TouchableOpacity>
            </View>)}
          </View>
        ) : visibleShiftCount === 0 ? (
          <View style={styles.emptyWeekCard}>
            <ThreeIllustration kind="calendar" size={96} />
            <Text style={styles.emptyWeekTitle}>{roleFilter && activeTab === 'schedule' ? 'Không có ca phù hợp' : selectedDayIndex !== null ? (activeTab === 'my_shifts' ? 'Bạn không có ca trong ngày này' : 'Không có ca trong ngày này') : 'Chưa có ca trong tuần này'}</Text>
            <Text style={styles.emptyWeekMessage}>{roleFilter && activeTab === 'schedule' ? 'Thử chọn vị trí khác trong bộ lọc.' : 'Chọn ngày khác hoặc kéo xuống để cập nhật lịch.'}</Text>
            <TouchableOpacity accessibilityRole="button" style={ensureTouchTarget(styles.emptyCalendarButton)} onPress={openCalendar}>
              <Text style={styles.retryText}>Xem ngày khác</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.shiftsListContainer}>
            {displayDays.map((dayItem) => {
              const actualIndex = weekDays.findIndex((day) => day.dowIndex === dayItem.dowIndex);
              const dayShifts = displayedShifts.filter((shift) => shift.shiftDate ? shift.shiftDate === dayItem.fullDateStr : shift.dayIndex === actualIndex);
              if (dayShifts.length === 0 && activeTab === 'my_shifts') return null;
              return (
                <View key={dayItem.fullDateStr} style={styles.dayGroupSection}>
                  <View style={styles.dateGutter}>
                    <Text style={styles.dateGutterWeekday}>{actualIndex === 6 ? 'CN' : `Thứ ${actualIndex + 2}`}</Text>
                    <Text style={styles.dateGutterDay}>{Number(dayItem.dateStr)}</Text>
                  </View>
                  <View style={styles.dayShiftRows}>
                    {dayShifts.length === 0 ? <Text style={styles.emptyDayText}>Không có ca làm</Text> : dayShifts.map((shift) => {
                      const theme = getRoleTheme(shift);
                      const isTeam = activeTab === 'schedule';
                      return (
                        <TouchableOpacity
                          key={shift.id}
                          style={ensureTouchTarget([styles.shiftItemRow, isTeam && styles.teamShiftRow])}
                          onPress={() => handleShiftPress(shift, dayItem)}
                          accessibilityRole="button"
                          accessibilityLabel={`${shift.staffName}, ${shift.timeRange}, ${shift.storeName || shift.location}, ${shift.position || 'Chưa xác định vị trí'}`}
                          accessibilityHint="Xem chi tiết và yêu cầu cho ca làm"
                          activeOpacity={0.75}
                        >
                          {isTeam && <Image source={getStaffAvatarSource(shift.staffName, shift.avatarId)} style={styles.teamAvatar} />}
                          <View style={styles.shiftDetailCol}>
                            {isTeam && <Text style={styles.teamStaffName}>{shift.staffName}</Text>}
                            <Text style={[styles.shiftTimeRangeText, isTeam && styles.teamShiftTime]}>{shift.timeRange}</Text>
                            {!isTeam && <Text style={styles.shiftLocationText}>{shift.storeName || shift.location}</Text>}
                            <View style={styles.shiftRoleRow}>
                              <View style={[styles.roleDot, { backgroundColor: theme.dotColor }]} />
                              <Text style={styles.roleLabelText}>{shift.position || 'Chưa xác định vị trí'}</Text>
                            </View>
                            {shift.hasFlag && <Text style={styles.shiftNoteHint}>Có ghi chú từ quản lý</Text>}
                          </View>
                          {!isTeam && <Ionicons name="chevron-forward" size={19} color={uiColors.muted} accessible={false} />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Modal visible={calendarVisible} transparent animationType="fade" onRequestClose={() => setCalendarVisible(false)}>
        <View style={styles.calendarBackdrop}>
          <View style={styles.calendarSheet}>
            <View style={styles.calendarHeader}>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Tháng trước" style={ensureTouchTarget(styles.calendarArrow)} onPress={() => setCalendarMonthKey((key) => shiftCalendarMonth(key, -1))}>
                <Ionicons name="chevron-back" size={23} color="#404B57" accessible={false} />
              </TouchableOpacity>
              <Text accessibilityRole="header" style={styles.calendarTitle}>{MONTH_NAMES[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}</Text>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Tháng sau" style={ensureTouchTarget(styles.calendarArrow)} onPress={() => setCalendarMonthKey((key) => shiftCalendarMonth(key, 1))}>
                <Ionicons name="chevron-forward" size={23} color="#404B57" accessible={false} />
              </TouchableOpacity>
            </View>
            <ScrollView horizontal contentContainerStyle={{ flexGrow: 1 }}>
            <View style={[styles.calendarGrid, { minWidth: 336, flex: 1 }]}>
              {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day) => <Text key={day} style={styles.calendarWeekday}>{day}</Text>)}
              {calendarDays.map((date) => {
                const key = dateKey(date);
                const selected = selectedDate === key;
                const outsideMonth = date.getMonth() !== calendarMonth.getMonth();
                const hasShift = liveMyShifts.some((shift) => shift.shiftDate === key);
                return (
                  <TouchableOpacity key={key} accessibilityRole="button" accessibilityLabel={`Ngày ${date.getDate()} tháng ${date.getMonth() + 1} năm ${date.getFullYear()}`} accessibilityState={{ selected }} aria-selected={selected} style={ensureTouchTarget(styles.calendarCell)} onPress={() => selectCalendarDate(date)}>
                    <View style={[styles.calendarDateCircle, selected && styles.calendarDateSelected]}>
                      <Text style={[styles.calendarDateText, outsideMonth && styles.calendarDateOutside, selected && styles.calendarDateTextSelected]}>{date.getDate()}</Text>
                      {hasShift && <View style={[styles.calendarWorkDot, selected && styles.workDotSelected]} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
            </ScrollView>
            <View style={styles.calendarFooter}>
              <TouchableOpacity accessibilityRole="button" style={ensureTouchTarget(styles.calendarFooterButton)} onPress={() => { setWeekOffset(0); setSelectedDayIndex((today.getDay() + 6) % 7); setCalendarVisible(false); }}><Text style={styles.retryText}>Hôm nay</Text></TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" style={ensureTouchTarget(styles.calendarFooterButton)} onPress={() => { setSelectedDayIndex(null); setCalendarVisible(false); }}><Text style={styles.retryText}>Xem cả tuần</Text></TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" style={ensureTouchTarget(styles.calendarFooterButton)} onPress={() => setCalendarVisible(false)}><Text style={styles.calendarDoneText}>Đóng</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={filterModalVisible} transparent animationType="slide" onRequestClose={() => setFilterModalVisible(false)}>
        <View style={styles.calendarBackdrop}>
          <View style={styles.calendarSheet}>
            <Text accessibilityRole="header" style={styles.filterTitle}>Lọc theo vị trí</Text>
            <ScrollView style={styles.filterOptions}>
              {[null, ...roleOptions].map((role) => <TouchableOpacity key={role || 'all'} accessibilityRole="radio" accessibilityState={{ checked: roleFilter === role }} aria-checked={roleFilter === role} onPress={() => setRoleFilter(role)} style={ensureTouchTarget(styles.filterOption)}>
                <Text style={styles.filterOptionText}>{role || 'Tất cả vị trí'}</Text>
                <Ionicons name={roleFilter === role ? 'radio-button-on' : 'radio-button-off'} size={23} color={roleFilter === role ? uiColors.orange : uiColors.muted} accessible={false} />
              </TouchableOpacity>)}
            </ScrollView>
            <TouchableOpacity accessibilityRole="button" onPress={() => setFilterModalVisible(false)} style={ensureTouchTarget(styles.calendarApplyButton)}><Text style={styles.calendarApplyText}>Xong</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── 5. POPUP BOX "LỰA CHỌN YÊU CẦU" ── */}
      <Modal
        visible={actionBoxVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setActionBoxVisible(false)}
      >
        <View style={styles.popupBackdrop}>
          <ScrollView style={styles.popupScroll} contentContainerStyle={styles.popupCard} showsVerticalScrollIndicator={false}>
            {/* Nút đóng X */}
            <TouchableOpacity
              style={ensureTouchTarget(styles.popupCloseBtn)}
              accessibilityRole="button"
              accessibilityLabel="Đóng chi tiết ca làm"
              onPress={() => setActionBoxVisible(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.popupCloseBtnText}>✕</Text>
            </TouchableOpacity>

            {/* Thông tin ca trực đang chọn (Avatar + Shift) */}
            <View style={styles.popupShiftHeader}>
              <View style={styles.popupAvatarCol}>
                <Image
                  source={getStaffAvatarSource(activeSelectedShift?.staffName, activeSelectedShift?.avatarId)}
                  style={styles.popupAvatarImg}
                />
                <Text style={styles.popupAvatarName}>
                  {activeSelectedShift?.staffName || currentUserProfile?.fullName || 'Nhân viên'}
                </Text>
              </View>

              {/* Vạch màu dọc */}
              <View
                style={[
                  styles.popupVerticalBar,
                  { backgroundColor: getRoleTheme(activeSelectedShift).color }
                ]}
              />

              {/* Chi tiết ca */}
              <View style={styles.popupShiftInfo}>
                <Text style={styles.popupTimeRange}>{activeSelectedShift?.timeRange || '—'}</Text>
                <Text style={styles.popupLocation} numberOfLines={1}>
                  {activeSelectedShift?.location || 'Cửa hàng'}
                </Text>
                <View style={styles.popupRoleRow}>
                  <View
                    style={[
                      styles.popupRoleDot,
                      { backgroundColor: getRoleTheme(activeSelectedShift).dotColor }
                    ]}
                  />
                  <Text style={styles.popupRoleText}>{activeSelectedShift?.role || 'Nhân viên'}</Text>
                </View>
              </View>
            </View>

            {/* Ghi chú quản lý nếu có cờ cảnh báo */}
            {activeSelectedShift?.hasFlag && (
              <View style={styles.popupManagerNoteBox}>
                <Text style={styles.popupManagerNoteTitle}>Ghi chú / Cảnh báo từ quản lý:</Text>
                <Text style={styles.popupManagerNoteText}>{activeSelectedShift.note}</Text>
              </View>
            )}

            {/* Đường kẻ ngang */}
            <View style={styles.popupDivider} />

            {/* Tiêu đề: Lựa chọn yêu cầu */}
            <Text style={styles.popupActionHeading}>{canManageSelectedShift ? 'Yêu cầu cho ca của bạn' : 'Ca làm của đồng nghiệp'}</Text>
            {!canManageSelectedShift && <Text style={styles.popupOwnershipNote}>Bạn có thể xem thông tin ca này. Đổi ca và xin vắng chỉ áp dụng cho ca được phân công cho bạn; nghỉ phép là yêu cầu cá nhân.</Text>}

            {/* 3 Nút Hành Động Ngang */}
            <View style={styles.actionButtonsRow}>
              {canManageSelectedShift && <>
              {/* 1. Hỗ trợ đổi ca */}
              <TouchableOpacity
                style={ensureTouchTarget(styles.actionCardPill)}
                accessibilityRole="button"
                accessibilityLabel="Yêu cầu hỗ trợ đổi ca"
                onPress={handleOpenSwapModal}
                activeOpacity={0.8}
              >
                <Text style={styles.actionCardPillText}>Hỗ trợ{'\n'}đổi ca</Text>
                <Image source={iconKinh} style={styles.actionCardPillIcon} resizeMode="contain" />
              </TouchableOpacity>

              {/* 2. Vắng mặt */}
              <TouchableOpacity
                style={ensureTouchTarget(styles.actionCardPill)}
                accessibilityRole="button"
                accessibilityLabel="Yêu cầu vắng mặt"
                onPress={handleOpenAbsentModal}
                activeOpacity={0.8}
              >
                <Text style={styles.actionCardPillText}>Vắng{'\n'}mặt</Text>
                <Image source={iconLoa} style={styles.actionCardPillIcon} resizeMode="contain" />
              </TouchableOpacity>

              </>}
              {/* 3. Xin nghỉ phép */}
              <TouchableOpacity
                style={ensureTouchTarget(styles.actionCardPill)}
                accessibilityRole="button"
                accessibilityLabel="Gửi yêu cầu nghỉ phép cho bản thân"
                onPress={handleOpenLeaveModal}
                activeOpacity={0.8}
              >
                <Text style={styles.actionCardPillText}>Xin nghỉ phép của tôi</Text>
                <Image source={iconDua} style={styles.actionCardPillIcon} resizeMode="contain" />
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* ── FORM 1: Yêu cầu đổi ca (Ảnh 3 - CÓ THỂ CHỌN CA CỦA MÌNH) ──── */}
      <Modal
        visible={swapModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => scheduleConflict ? setScheduleConflict(null) : setSwapModalVisible(false)}
      >
        <SafeAreaView style={styles.formModalSafeArea} edges={['top', 'left', 'right']}>
          <KeyboardAvoidingView style={styles.formKeyboardArea} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={[styles.formModalContent, { paddingBottom: 40 + insets.bottom }]}>
            <View style={styles.formHeaderRow}>
              <TouchableOpacity
                style={ensureTouchTarget(styles.formCloseBtn)}
                accessibilityRole="button"
                accessibilityLabel="Đóng yêu cầu đổi ca"
                onPress={() => setSwapModalVisible(false)}
              >
                <Text style={styles.formCloseBtnText}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.formHeaderTitle}>Yêu cầu đổi ca</Text>
            </View>

            <View style={styles.popupDivider} />

            {/* Shift Selector: Cho phép chọn ca của mình */}
            <View style={styles.shiftSelectorHeaderRow}>
              <Text style={styles.shiftSelectorHeaderTitle}>Ca làm của bạn:</Text>
              <TouchableOpacity accessibilityRole="button"
                style={ensureTouchTarget(styles.changeShiftBtn)}
                onPress={() => setShowShiftPicker(!showShiftPicker)}
                activeOpacity={0.7}
              >
                <Text style={styles.changeShiftBtnText}>
                  {showShiftPicker ? 'Đóng danh sách ▲' : 'Đổi ca khác ▼'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Dropdown danh sách ca của tôi */}
            {showShiftPicker && (
              <View style={styles.shiftPickerDropdown}>
                {liveMyShifts.length === 0 ? (
                  <View style={{ padding: 12 }}>
                    <Text style={{ fontSize: 13, color: uiColors.muted, fontStyle: 'italic' }}>Chưa có ca làm việc nào</Text>
                  </View>
                ) : (
                  liveMyShifts.map((shift) => {
                    const isSelected = selectedSwapShift?.id === shift.id;
                    return (
                      <TouchableOpacity accessibilityLabel={`Chọn ca ${shift.dayLabel}, ${shift.timeRange}, ${shift.role}`} accessibilityState={{ selected: isSelected }} aria-selected={isSelected} accessibilityRole="button"
                        key={shift.id}
                        style={ensureTouchTarget([styles.shiftPickerItem, isSelected && styles.shiftPickerItemSelected])}
                        onPress={() => {
                          setSelectedSwapShift(shift);
                          setShowShiftPicker(false);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.shiftPickerDot, { backgroundColor: shift.color }]} />
                        <Text style={[styles.shiftPickerItemText, isSelected && styles.shiftPickerItemTextSelected]}>
                          {shift.dayLabel} : {shift.timeRange} ({shift.role})
                        </Text>
                        {isSelected && <Text style={styles.shiftPickerCheck}>✓</Text>}
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            )}

            <View style={styles.formShiftSummaryBox}>
              <View style={styles.popupAvatarCol}>
                <Image source={getStaffAvatarSource(currentUserProfile?.fullName, currentUserProfile?.avatarId)} style={styles.popupAvatarImg} />
                <Text style={styles.popupAvatarName}>{currentUserProfile?.fullName || 'Nhân viên'}</Text>
              </View>

              <View style={[styles.popupVerticalBar, { backgroundColor: selectedSwapShift?.color || uiColors.turquoise }]} />

              <View style={styles.popupShiftInfo}>
                <Text style={styles.popupTimeRange}>
                  {selectedSwapShift?.id !== 'no-shift' && selectedSwapShift?.dayLabel
                    ? `${selectedSwapShift.dayLabel} - ${selectedSwapShift.timeRange}`
                    : 'Chưa có ca làm việc'}
                </Text>
                <Text style={styles.popupLocation}>{selectedSwapShift?.location || 'Cửa hàng được phân công'}</Text>
                <View style={styles.popupRoleRow}>
                  <View style={[styles.popupRoleDot, { backgroundColor: selectedSwapShift?.color || uiColors.turquoise }]} />
                  <Text style={styles.popupRoleText}>{selectedSwapShift?.role || 'Nhân viên'}</Text>
                </View>
              </View>
            </View>

            <Text style={styles.suggestSectionTitle}>Gợi ý đồng nghiệp</Text>

            <View style={styles.suggestList}>
              {storeColleagues.length === 0 ? (
                <View style={{ paddingVertical: 14, alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: uiColors.muted, fontStyle: 'italic' }}>Chưa có thông tin đồng nghiệp trong chi nhánh</Text>
                </View>
              ) : (
                storeColleagues.map((staff, idx) => {
                  const isSelected = selectedSwapStaff === staff.name;

                  return (
                    <TouchableOpacity accessibilityLabel={`Chọn đồng nghiệp ${staff.name}, ${staff.role}`} accessibilityState={{ selected: isSelected }} aria-selected={isSelected} accessibilityRole="button"
                      key={idx}
                      style={ensureTouchTarget([styles.suggestItem, isSelected && styles.suggestItemSelected])}
                      onPress={() => setSelectedSwapStaff(staff.name)}
                      activeOpacity={0.7}
                    >
                      <Image source={getStaffAvatarSource(staff.name, staff.avatarId)} style={styles.suggestAvatar} />
                      <View style={styles.suggestInfo}>
                        <Text style={styles.suggestName}>{staff.name}</Text>
                        <Text style={styles.suggestRole}>{staff.role}</Text>
                      </View>
                      {isSelected && <Text style={styles.suggestCheckmark}>✓</Text>}
                    </TouchableOpacity>
                  );
                })
              )}
            </View>

            {swapError ? (
              <View style={styles.modalErrorBox}>
                <Text style={styles.modalErrorIcon}>⚠️</Text>
                <Text style={styles.modalErrorText}>{swapError}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={ensureTouchTarget([styles.submitBtnLarge, submitting && styles.submitBtnDisabled])}
              accessibilityRole="button"
              accessibilityState={{ disabled: submitting, busy: submitting }} aria-disabled={submitting} aria-busy={submitting}
              onPress={handleSubmitSwap}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitBtnLargeText}>Gửi yêu cầu</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
          </KeyboardAvoidingView>
          {renderToast()}
          <ScheduleConflictAlert embedded conflict={scheduleConflict} onClose={() => setScheduleConflict(null)} />
        </SafeAreaView>
      </Modal>

      {/* ── FORM 2: Yêu cầu xin vắng (Ảnh 4 - CÓ THỂ CHỌN CA CỦA MÌNH) ──── */}
      <Modal
        visible={absentModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setAbsentModalVisible(false)}
      >
        <SafeAreaView style={styles.formModalSafeArea} edges={['top', 'left', 'right']}>
          <KeyboardAvoidingView style={styles.formKeyboardArea} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={[styles.formModalContent, { paddingBottom: 40 + insets.bottom }]}>
            <View style={styles.formHeaderRow}>
              <TouchableOpacity
                style={ensureTouchTarget(styles.formCloseBtn)}
                accessibilityRole="button"
                accessibilityLabel="Đóng yêu cầu vắng mặt"
                onPress={() => setAbsentModalVisible(false)}
              >
                <Text style={styles.formCloseBtnText}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.formHeaderTitle}>Yêu cầu xin vắng</Text>
            </View>

            <View style={styles.popupDivider} />

            {/* Shift Selector: Cho phép chọn ca của mình */}
            <View style={styles.shiftSelectorHeaderRow}>
              <Text style={styles.shiftSelectorHeaderTitle}>Ca xin vắng:</Text>
              <TouchableOpacity accessibilityRole="button"
                style={ensureTouchTarget(styles.changeShiftBtn)}
                onPress={() => setShowAbsentShiftPicker(!showAbsentShiftPicker)}
                activeOpacity={0.7}
              >
                <Text style={styles.changeShiftBtnText}>
                  {showAbsentShiftPicker ? 'Đóng danh sách ▲' : 'Đổi ca khác ▼'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Dropdown danh sách ca của tôi */}
            {showAbsentShiftPicker && (
              <View style={styles.shiftPickerDropdown}>
                {liveMyShifts.length === 0 ? (
                  <View style={{ padding: 12 }}>
                    <Text style={{ fontSize: 13, color: uiColors.muted, fontStyle: 'italic' }}>Chưa có ca làm việc nào</Text>
                  </View>
                ) : (
                  liveMyShifts.map((shift) => {
                    const isSelected = selectedAbsentShift?.id === shift.id;
                    return (
                      <TouchableOpacity accessibilityLabel={`Chọn ca ${shift.dayLabel}, ${shift.timeRange}, ${shift.role}`} accessibilityState={{ selected: isSelected }} aria-selected={isSelected} accessibilityRole="button"
                        key={shift.id}
                        style={ensureTouchTarget([styles.shiftPickerItem, isSelected && styles.shiftPickerItemSelected])}
                        onPress={() => {
                          setSelectedAbsentShift(shift);
                          setShowAbsentShiftPicker(false);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.shiftPickerDot, { backgroundColor: shift.color }]} />
                        <Text style={[styles.shiftPickerItemText, isSelected && styles.shiftPickerItemTextSelected]}>
                          {shift.dayLabel} : {shift.timeRange} ({shift.role})
                        </Text>
                        {isSelected && <Text style={styles.shiftPickerCheck}>✓</Text>}
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            )}

            <View style={styles.formShiftSummaryBox}>
              <View style={styles.popupAvatarCol}>
                <Image source={getStaffAvatarSource(currentUserProfile?.fullName, currentUserProfile?.avatarId)} style={styles.popupAvatarImg} />
                <Text style={styles.popupAvatarName}>{currentUserProfile?.fullName || 'Nhân viên'}</Text>
              </View>

              <View style={[styles.popupVerticalBar, { backgroundColor: selectedAbsentShift?.color || uiColors.turquoise }]} />

              <View style={styles.popupShiftInfo}>
                <Text style={styles.popupTimeRange}>
                  {selectedAbsentShift?.id !== 'no-shift' && selectedAbsentShift?.dayLabel
                    ? `${selectedAbsentShift.dayLabel} - ${selectedAbsentShift.timeRange}`
                    : 'Chưa có ca làm việc'}
                </Text>
                <Text style={styles.popupLocation}>{selectedAbsentShift?.location || 'Cửa hàng được phân công'}</Text>
                <View style={styles.popupRoleRow}>
                  <View style={[styles.popupRoleDot, { backgroundColor: selectedAbsentShift?.color || uiColors.turquoise }]} />
                  <Text style={styles.popupRoleText}>{selectedAbsentShift?.role || 'Nhân viên'}</Text>
                </View>
              </View>
            </View>

            <View style={styles.popupDivider} />

            <Text style={styles.formInputLabel}>Lý do:</Text>
            <TextInput
              style={styles.formTextArea}
              accessibilityLabel="Lý do xin vắng mặt"
              value={absentReason}
              onChangeText={setAbsentReason}
              placeholder="Nhập lý do xin vắng ca này..."
              multiline
              numberOfLines={4}
            />

            <View style={styles.warningNoteBox}>
              <Text style={styles.warningNoteTitle}>Lưu ý:</Text>
              <Text style={styles.warningNoteText}>
                Yêu cầu vắng ca của bạn cần được Quản lý phê duyệt. Trong lúc chờ duyệt, bạn vẫn chịu trách nhiệm với ca làm.
              </Text>
            </View>

            {absentError ? (
              <View style={styles.modalErrorBox}>
                <Text style={styles.modalErrorIcon}>⚠️</Text>
                <Text style={styles.modalErrorText}>{absentError}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={ensureTouchTarget([styles.submitBtnLarge, submitting && styles.submitBtnDisabled])}
              accessibilityRole="button"
              accessibilityState={{ disabled: submitting, busy: submitting }} aria-disabled={submitting} aria-busy={submitting}
              onPress={handleSubmitAbsent}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitBtnLargeText}>Gửi yêu cầu</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
          </KeyboardAvoidingView>
          {renderToast()}
        </SafeAreaView>
      </Modal>

      {/* ── FORM 3: Yêu cầu xin nghỉ (Ảnh 1) ─────────────────────────── */}
      <Modal
        visible={leaveModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setLeaveModalVisible(false)}
      >
        <SafeAreaView style={styles.formModalSafeArea} edges={['top', 'left', 'right']}>
          <KeyboardAvoidingView style={styles.formKeyboardArea} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={[styles.formModalContent, { paddingBottom: 40 + insets.bottom }]}>
            <View style={styles.formHeaderRow}>
              <TouchableOpacity
                style={ensureTouchTarget(styles.formCloseBtn)}
                accessibilityRole="button"
                accessibilityLabel="Đóng yêu cầu nghỉ phép"
                onPress={() => setLeaveModalVisible(false)}
              >
                <Text style={styles.formCloseBtnText}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.formHeaderTitle}>Yêu cầu xin nghỉ</Text>
            </View>

            <View style={styles.popupDivider} />

            <View style={styles.formRowInline}>
              <Text style={styles.formRowLabel}>Phân loại yêu cầu</Text>
              <Text style={styles.formRowValue}>Xin nghỉ</Text>
            </View>

            <Text style={styles.formSectionHeading}>Loại nghỉ phép</Text>
            {loadingLeaveTypes ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}>
                <ActivityIndicator size="small" color={uiColors.successText} style={{ marginRight: 8 }} />
                <Text style={{ fontSize: 13, color: uiColors.muted }}>Đang tải danh sách loại nghỉ...</Text>
              </View>
            ) : leaveTypesError ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}>
                <Text style={{ fontSize: 12.5, color: uiColors.dangerText, flex: 1 }}>{leaveTypesError}</Text>
                <TouchableOpacity accessibilityRole="button"
                  onPress={() => fetchLeaveTypesData(activeStoreId)}
                  style={ensureTouchTarget({ backgroundColor: "#F1DDDC", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 })}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: uiColors.dangerText }}>Thử lại</Text>
                </TouchableOpacity>
              </View>
            ) : leaveTypes.length === 0 ? (
              <Text style={{ fontSize: 13, color: uiColors.muted, paddingVertical: 8 }}>Chưa có loại nghỉ khả dụng.</Text>
            ) : (
              <View style={styles.leaveTypeRow}>
                {leaveTypes.map((t) => {
                  const typeCode = t.code || t.name;
                  const typeName = t.name || t.code;
                  const isSel = selectedLeaveType === typeCode;
                  return (
                    <TouchableOpacity accessibilityRole="button"
                      key={typeCode}
                      style={ensureTouchTarget([styles.leaveTypePill, isSel && styles.leaveTypePillActive])}
                      onPress={() => setSelectedLeaveType(typeCode)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.leaveTypePillText, isSel && styles.leaveTypePillTextActive]}>
                        {typeName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <Text style={styles.formSectionHeading}>Thời gian</Text>

            <View style={styles.formRowInline}>
              <Text style={styles.formRowLabel}>Cả ngày</Text>
              <Switch
                accessibilityLabel="Nghỉ cả ngày"
                value={isAllDay}
                onValueChange={setIsAllDay}
                trackColor={{ false: uiColors.lineStrong, true: uiColors.success }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.formRowInline}>
              <Text style={styles.formRowLabel}>Ngày bắt đầu</Text>
              <TextInput
                style={styles.formDateInput}
                accessibilityLabel="Ngày bắt đầu nghỉ phép, định dạng ngày tháng năm"
                value={startDate}
                onChangeText={setStartDate}
                placeholder="DD-MM-YYYY"
              />
            </View>

            <View style={styles.formRowInline}>
              <Text style={styles.formRowLabel}>Ngày kết thúc</Text>
              <TextInput
                style={styles.formDateInput}
                accessibilityLabel="Ngày kết thúc nghỉ phép, định dạng ngày tháng năm"
                value={endDate}
                onChangeText={setEndDate}
                placeholder="DD-MM-YYYY"
              />
            </View>

            <Text style={styles.formInputLabel}>Lý do:</Text>
            <TextInput
              style={styles.formTextArea}
              accessibilityLabel="Lý do xin nghỉ phép"
              value={leaveReason}
              onChangeText={(txt) => {
                setLeaveReason(txt);
                setLeaveError(null);
              }}
              placeholder="Nhập lý do xin nghỉ..."
              multiline
              numberOfLines={4}
            />

            {leaveError ? (
              <View style={styles.modalErrorBox}>
                <Text style={styles.modalErrorIcon}>⚠️</Text>
                <Text style={styles.modalErrorText}>{leaveError}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={ensureTouchTarget([styles.submitBtnLarge, submitting && styles.submitBtnDisabled])}
              accessibilityRole="button"
              accessibilityState={{ disabled: submitting, busy: submitting }} aria-disabled={submitting} aria-busy={submitting}
              onPress={handleSubmitLeave}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitBtnLargeText}>Gửi yêu cầu</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
          </KeyboardAvoidingView>
          {renderToast()}
        </SafeAreaView>
      </Modal>
      {planeLaunched && PaperPlane3D && <PaperPlane3D launched /> }
      <BottomNavbar navigation={navigation} activeRoute="Schedule" />
    </SafeAreaView>
  );
}

// ── StyleSheet chuẩn Pixel-Perfect Figma (Đổi ca (2).png) ────────────────
const styles = createAppStyles({
  companionBanner: { marginHorizontal: 16, marginTop: 16, marginBottom: 8, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 14, borderRadius: 20, borderWidth: 1, borderColor: uiColors.line, backgroundColor: uiColors.subtle },
  companionEyebrow: { fontSize: 9, letterSpacing: 1.1, fontWeight: '700', color: uiColors.warningText, marginBottom: 6 },
  companionTitle: { fontSize: 17, lineHeight: 23, fontWeight: '600', color: "#404B57", letterSpacing: -0.25 },
  companionScene: { alignSelf: 'center', marginTop: -2 },
  companionCaption: { fontSize: 11, lineHeight: 17, color: uiColors.muted, textAlign: 'center' },
  emptyScheduleNotice: { padding: 20, backgroundColor: uiColors.lavender, borderRadius: 18, marginHorizontal: 16, marginVertical: 12 },
  emptyScheduleNoticeTitle: { fontSize: 15, color: uiColors.ink, fontWeight: '600' },
  emptyScheduleNoticeText: { fontSize: 12, color: uiColors.muted, marginTop: 5 },
  emptyScheduleDay: { paddingBottom: 14, backgroundColor: uiColors.surface },
  emptyScheduleDayHeader: { backgroundColor: uiColors.canvas, paddingHorizontal: 20, paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  emptyScheduleDate: { fontSize: 12, color: uiColors.secondary, fontWeight: '500' },
  availabilityDashedButton: { marginHorizontal: 20, marginTop: 13, minHeight: 43, borderWidth: 1, borderColor: uiColors.lineStrong, borderStyle: 'dashed', borderRadius: 13, flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center' },
  availabilityDashedText: { color: uiColors.muted, fontSize: 12 },
  safeArea: { flex: 1, backgroundColor: uiColors.surface },
  page: { flex: 1, backgroundColor: uiColors.surface },
  contentContainer: { width: '100%', maxWidth: 720, alignSelf: 'center' },
  monthHeaderRow: { height: 64, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: uiColors.surface },
  todayIconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  todayIconDay: { position: 'absolute', top: 19, fontSize: 11, fontWeight: '600', color: uiColors.ink },
  headerSpacer: { width: 44 },
  monthTitleContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, flex: 1, minHeight: 44 },
  monthTitleText: { color: uiColors.ink, fontSize: 22, fontWeight: '500' },
  tabContainer: { flexDirection: 'row', marginHorizontal: 20, padding: 3, backgroundColor: uiColors.subtle, borderRadius: 14 },
  tabBtn: { flex: 1, minHeight: 40, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 8, borderRadius: 11 },
  tabBtnActive: { backgroundColor: uiColors.orange },
  tabText: { color: uiColors.primaryStrong, fontSize: 15, fontWeight: '400', textAlign: 'center', lineHeight: 20 },
  tabTextActive: { color: '#FFFFFF', fontWeight: '600' },
  storeFilterRow: { flexDirection: 'row', alignItems: 'center', gap: 9, minHeight: 56, paddingHorizontal: 16, marginTop: 12 },
  storeFilterTitle: { flex: 1, minWidth: 0, fontSize: 16, color: uiColors.ink },
  filterButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  weekStripCard: { flexDirection: 'row', paddingHorizontal: 4, paddingTop: 20, paddingBottom: 16, borderBottomWidth: 7, borderBottomColor: uiColors.canvas },
  dayColumn: { flex: 1, minWidth: 0, minHeight: 82, paddingVertical: 9, alignItems: 'center', justifyContent: 'center', borderRadius: 15, marginHorizontal: 2 },
  dayColumnToday: { backgroundColor: uiColors.canvas },
  dayColumnSelected: { backgroundColor: uiColors.peach },
  dayLabelText: { fontSize: 13, fontWeight: '500', color: uiColors.muted, marginBottom: 3 },
  dayLabelTextSelected: { color: uiColors.primaryStrong },
  dayDateText: { fontSize: 25, lineHeight: 30, fontWeight: '500', color: uiColors.muted },
  dayDateTextSelected: { color: uiColors.primaryStrong },
  workDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'transparent', marginTop: 4 },
  workDotVisible: { backgroundColor: uiColors.muted },
  workDotSelected: { backgroundColor: uiColors.primaryStrong },
  shiftsListContainer: { width: '100%' },
  dayGroupSection: { flexDirection: 'row', paddingHorizontal: 12, paddingTop: 18, paddingBottom: 16, borderBottomWidth: 7, borderBottomColor: uiColors.canvas },
  dateGutter: { width: 52, paddingTop: 1, paddingRight: 6 },
  dateGutterWeekday: { color: "#8B809D", fontSize: 13, lineHeight: 19 },
  dateGutterDay: { color: uiColors.ink, fontSize: 27, lineHeight: 34, fontWeight: '500' },
  dayShiftRows: { flex: 1, minWidth: 0 },
  shiftItemRow: { minHeight: 92, flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 3 },
  shiftDetailCol: { flex: 1, minWidth: 0 },
  shiftTimeRangeText: { fontSize: 21, lineHeight: 29, fontWeight: '400', color: uiColors.ink },
  shiftLocationText: { color: uiColors.muted, fontSize: 15, lineHeight: 22, marginTop: 2 },
  shiftRoleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0, marginTop: 3 },
  roleDot: { width: 8, height: 8, borderRadius: 4 },
  roleLabelText: { flexShrink: 1, fontSize: 14, lineHeight: 21, color: uiColors.muted },
  shiftNoteHint: { color: '#B06747', fontSize: 11, lineHeight: 17, marginTop: 2 },
  teamShiftRow: { alignItems: 'flex-start', minHeight: 104, gap: 11, paddingVertical: 8 },
  teamAvatar: { width: 39, height: 39, borderRadius: 20, marginTop: 2 },
  teamStaffName: { fontSize: 18, fontWeight: '400', lineHeight: 25, color: uiColors.ink },
  teamShiftTime: { fontSize: 14, lineHeight: 21, color: uiColors.muted },
  emptyDayText: { color: uiColors.muted, fontSize: 14, paddingVertical: 15 },
  emptyWeekCard: { paddingHorizontal: 30, paddingVertical: 44, alignItems: 'center' },
  emptyWeekTitle: { color: "#404B57", textAlign: 'center', fontSize: 16, fontWeight: '500', lineHeight: 23, marginTop: 15 },
  emptyWeekMessage: { marginTop: 7, color: uiColors.muted, fontSize: 13, lineHeight: 20, textAlign: 'center' },
  emptyCalendarButton: { minHeight: 44, paddingHorizontal: 16, marginTop: 8, justifyContent: 'center' },
  retryText: { color: uiColors.primaryStrong, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  scheduleErrorCard: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, padding: 14, backgroundColor: uiColors.peach, borderBottomWidth: 1, borderBottomColor: '#F4E4D9' },
  scheduleErrorCopy: { flex: 1, minWidth: 140 },
  scheduleErrorTitle: { color: uiColors.primaryStrong, fontSize: 13, fontWeight: '600', lineHeight: 19 },
  scheduleErrorMessage: { color: uiColors.primaryStrong, fontSize: 12, lineHeight: 18, marginTop: 3 },
  scheduleRetryButton: { minHeight: 44, paddingHorizontal: 6, justifyContent: 'center' },
  calendarBackdrop: { flex: 1, backgroundColor: "rgba(40, 49, 59, 0.38)", justifyContent: 'center', alignItems: 'center', padding: 16 },
  calendarSheet: { width: '100%', maxWidth: 400, maxHeight: '90%', backgroundColor: uiColors.surface, borderRadius: 24, padding: 16 },
  calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  calendarArrow: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  calendarTitle: { flex: 1, fontSize: 18, fontWeight: '500', color: uiColors.ink, textAlign: 'center' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarWeekday: { width: '14.285714%', textAlign: 'center', paddingVertical: 8, color: uiColors.muted, fontSize: 12 },
  calendarCell: { width: '14.285714%', minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  calendarDateCircle: { width: 36, height: 40, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  calendarDateSelected: { backgroundColor: uiColors.mint },
  calendarDateText: { fontSize: 16, color: uiColors.ink },
  calendarDateOutside: { color: "#C9CFCC" },
  calendarDateTextSelected: { color: uiColors.successText },
  calendarWorkDot: { position: 'absolute', bottom: 3, width: 4, height: 4, borderRadius: 2, backgroundColor: uiColors.muted },
  calendarFooter: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: uiColors.subtle, marginTop: 10 },
  calendarFooterButton: { minHeight: 48, paddingHorizontal: 8, justifyContent: 'center' },
  calendarDoneText: { color: uiColors.ink, fontSize: 14, fontWeight: '500' },
  filterTitle: { color: uiColors.ink, fontSize: 20, fontWeight: '500', marginBottom: 14 },
  filterOptions: { maxHeight: 320 },
  filterOption: { flexDirection: 'row', minHeight: 52, justifyContent: 'space-between', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: uiColors.subtle },
  filterOptionText: { flex: 1, color: uiColors.ink, fontSize: 15 },
  calendarApplyButton: { minHeight: 48, borderRadius: 5, backgroundColor: uiColors.orange, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  calendarApplyText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  formKeyboardArea: { flex: 1 },

  // ── Custom Toast ──
  toastOverlay: {
    position: 'absolute',
    top: 20,
    left: 16,
    right: 16,
    zIndex: 9999,
    alignItems: 'center',
  },
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: uiColors.mint,
    borderColor: uiColors.success,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: '100%',
    maxWidth: 380,
    shadowColor: uiColors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  toastCardWarning: {
    backgroundColor: uiColors.butter,
    borderColor: "#B38D49",
  },
  toastCardError: {
    backgroundColor: uiColors.dangerSoft,
    borderColor: uiColors.danger,
  },
  toastIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: uiColors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  toastIconCircleWarning: {
    backgroundColor: "#B38D49",
  },
  toastIconCircleError: {
    backgroundColor: uiColors.danger,
  },
  toastIconText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  toastTextContainer: {
    flex: 1,
  },
  toastTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: uiColors.ink,
  },
  toastMessage: {
    fontSize: 12.5,
    color: "#404B57",
    marginTop: 2,
  },
  modalErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: uiColors.dangerSoft,
    borderWidth: 1,
    borderColor: uiColors.salmon,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  modalErrorIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  modalErrorText: {
    flex: 1,
    fontSize: 13,
    color: uiColors.dangerStrong,
    fontWeight: '500',
    lineHeight: 18,
  },

  // ── POPUP BOX "LỰA CHỌN YÊU CẦU" ──
  popupBackdrop: {
    flex: 1,
    backgroundColor: "rgba(40, 49, 59, 0.3)",
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  popupCard: {
    backgroundColor: uiColors.surface,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
    width: '100%',
    maxWidth: 390,
    position: 'relative',
    shadowColor: uiColors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  popupScroll: { width: '100%', maxWidth: 390, maxHeight: '90%', flexGrow: 0, borderRadius: 22, backgroundColor: uiColors.surface },
  popupCloseBtn: {
    position: 'absolute',
    right: 14,
    top: 14,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  popupCloseBtnText: {
    fontSize: 22,
    fontWeight: '700',
    color: uiColors.ink,
  },
  popupShiftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 48,
    marginBottom: 12,
  },
  popupAvatarCol: {
    alignItems: 'center',
    width: 58,
    marginRight: 10,
  },
  popupAvatarImg: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: uiColors.ink,
    marginBottom: 3,
  },
  popupAvatarName: {
    fontSize: 12,
    fontWeight: '600',
    color: uiColors.ink,
    textAlign: 'center',
  },
  popupVerticalBar: {
    width: 3,
    height: 34,
    borderRadius: 3,
    backgroundColor: "#C4DDD3",
    marginRight: 12,
  },
  popupShiftInfo: {
    flex: 1,
    minWidth: 0,
  },
  popupTimeRange: {
    fontSize: 15,
    fontWeight: '700',
    color: uiColors.ink,
  },
  popupLocation: {
    fontSize: 12,
    color: "rgba(40, 49, 59, 0.7)",
    marginVertical: 2,
  },
  popupRoleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  popupRoleDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: "#C4DDD3",
  },
  popupRoleText: {
    fontSize: 12.5,
    fontWeight: '500',
    color: '#526959',
    flexShrink: 1,
  },
  popupDivider: {
    height: 1.5,
    backgroundColor: "rgba(240, 239, 235, 0.8)",
    marginVertical: 12,
  },
  popupActionHeading: {
    fontSize: 15.5,
    fontWeight: '600',
    color: uiColors.ink,
    marginBottom: 14,
  },
  popupOwnershipNote: { fontSize: 13, lineHeight: 20, color: uiColors.muted, marginBottom: 8 },
  actionButtonsRow: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 12,
  },
  actionCardPill: {
    backgroundColor: uiColors.canvas,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionCardPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: uiColors.ink,
    lineHeight: 16,
  },
  actionCardPillIcon: {
    width: 28,
    height: 28,
  },

  // ── Shift Selector in Modal ──
  shiftSelectorHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  shiftSelectorHeaderTitle: {
    fontSize: 14.5,
    fontWeight: '600',
    color: uiColors.ink,
  },
  changeShiftBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: uiColors.mint,
  },
  changeShiftBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: uiColors.successText,
  },
  shiftPickerDropdown: {
    backgroundColor: uiColors.canvas,
    borderWidth: 1,
    borderColor: uiColors.lineStrong,
    borderRadius: 8,
    padding: 6,
    marginBottom: 12,
  },
  shiftPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  shiftPickerItemSelected: {
    backgroundColor: uiColors.mint,
  },
  shiftPickerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  shiftPickerItemText: {
    flex: 1,
    fontSize: 13,
    color: "#404B57",
  },
  shiftPickerItemTextSelected: {
    fontWeight: '700',
    color: uiColors.ink,
  },
  shiftPickerCheck: {
    fontSize: 14,
    fontWeight: '700',
    color: uiColors.successText,
  },

  // ── Form Modals Common Styles ──
  formModalSafeArea: {
    flex: 1,
    backgroundColor: uiColors.surface,
  },
  formModalContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  formHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    minHeight: 56,
    paddingVertical: 6,
  },
  formCloseBtn: {
    position: 'absolute',
    left: 0,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formCloseBtnText: {
    fontSize: 22,
    fontWeight: '700',
    color: uiColors.ink,
  },
  formHeaderTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: uiColors.ink,
    textAlign: 'center',
    paddingHorizontal: 44,
  },
  formShiftSummaryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  suggestSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: uiColors.secondary,
    marginBottom: 10,
    marginTop: 8,
  },
  suggestList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    marginBottom: 20,
  },
  suggestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(240, 239, 235, 0.7)",
  },
  suggestItemSelected: {
    backgroundColor: uiColors.canvas,
  },
  suggestAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  suggestInfo: {
    flex: 1,
  },
  suggestName: {
    fontSize: 15,
    fontWeight: '700',
    color: uiColors.ink,
  },
  suggestRole: {
    fontSize: 13,
    color: uiColors.secondary,
    marginTop: 2,
  },
  suggestCheckmark: {
    fontSize: 16,
    fontWeight: '700',
    color: uiColors.successText,
  },
  submitBtnLarge: {
    backgroundColor: uiColors.orange,
    borderRadius: 7,
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    shadowColor: uiColors.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnLargeText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  formInputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: uiColors.secondary,
    marginTop: 10,
    marginBottom: 6,
  },
  formTextArea: {
    backgroundColor: uiColors.surface,
    borderWidth: 1.5,
    borderColor: uiColors.lineStrong,
    borderRadius: 8,
    padding: 14,
    fontSize: 15,
    color: uiColors.ink,
    textAlignVertical: 'top',
    minHeight: 120,
    marginBottom: 16,
  },
  warningNoteBox: {
    backgroundColor: uiColors.butter,
    borderLeftWidth: 3,
    borderLeftColor: "#B38D49",
    padding: 12,
    borderRadius: 6,
    marginBottom: 20,
  },
  warningNoteTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: uiColors.warningText,
    marginBottom: 4,
  },
  warningNoteText: {
    fontSize: 13,
    color: uiColors.secondary,
    lineHeight: 18,
  },
  formRowInline: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  formRowLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: uiColors.ink,
  },
  formRowValue: {
    fontSize: 16,
    fontWeight: '500',
    color: uiColors.ink,
  },
  formSectionHeading: {
    fontSize: 16,
    fontWeight: '600',
    color: uiColors.secondary,
    marginTop: 8,
    marginBottom: 4,
  },
  formDateInput: {
    fontSize: 15,
    color: uiColors.ink,
    fontWeight: '500',
    borderBottomWidth: 1,
    borderBottomColor: uiColors.lineStrong,
    paddingVertical: 10,
    minHeight: 44,
    minWidth: 100,
    textAlign: 'right',
  },
  leaveTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 8,
  },
  leaveTypePill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: uiColors.canvas,
    borderWidth: 1,
    borderColor: uiColors.line,
    minHeight: 44,
    justifyContent: 'center',
  },
  leaveTypePillActive: {
    backgroundColor: uiColors.mint,
    borderColor: uiColors.success,
  },
  leaveTypePillText: {
    fontSize: 13,
    fontWeight: '600',
    color: uiColors.secondary,
  },
  leaveTypePillTextActive: {
    color: uiColors.successText,
    fontWeight: '700',
  },

  // ── Loading ──
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    color: uiColors.muted,
  },

  // ── Shift Note Flag Badge ──
  shiftFlagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: uiColors.butter,
    borderWidth: 1,
    borderColor: "#EBDDAD",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 3,
  },
  shiftFlagIcon: {
    fontSize: 10,
  },
  shiftFlagText: {
    fontSize: 11,
    fontWeight: '700',
    color: uiColors.warningText,
  },
  popupManagerNoteBox: {
    backgroundColor: uiColors.butter,
    borderWidth: 1,
    borderColor: "#EBDDAD",
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  popupManagerNoteTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: uiColors.warningText,
    marginBottom: 3,
  },
  popupManagerNoteText: {
    fontSize: 13,
    color: uiColors.warningText,
    lineHeight: 18,
  },
});
