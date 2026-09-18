import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Image,
  Modal,
  TextInput,
  Switch,
} from 'react-native';
import { getMyShifts, getShiftsForStore } from '../services/shiftService';
import { createStaffRequest } from '../services/requestService';
import { getMyProfile, getMyStores } from '../services/profileService';
import { getSkillsByStore } from '../services/skillService';
import BottomNavbar from '../components/BottomNavbar';

// ── Avatars & Action Icons ──────────────────────────────────────────────────
const avatarDilan = require('../assets/avatar-dilan-jon.png');
const avatarMew = require('../assets/avatar-mew-ama.png');
const avatarPaul = require('../assets/avatar-paul-lee.png');
const avatarThia = require('../assets/avatar-thia-ago.png');

const iconKinh = require('../assets/icon-kinh.png');
const iconLoa = require('../assets/icon-loa.png');
const iconDua = require('../assets/icon-dua.png');

const AVATAR_MAP = {
  'Dilan. Jon': avatarDilan,
  'Dilan. Jon (Tôi)': avatarDilan,
  'Paul. Lee': avatarPaul,
  'Paul. Lee (Tôi)': avatarPaul,
  'Thia. Ago': avatarThia,
  'Mew. Ama': avatarMew,
  'Vivi.an': avatarDilan,
};

// ── Color palette matching Web Schedule & SkillsPage (Figma Tokens) ─────────────
export const SHIFT_COLORS = [
  '#5BC8B8', // teal/green - Barista / Pha chế
  '#D97FB2', // pink - Cashier / Thu ngân
  '#D98080', // salmon/red - Kitchen / Bếp
  '#C8C84A', // yellow-green - Service / Phục vụ
  '#7AA8D9', // blue - Supervisor / Giám sát / Quản lý
];

export const PRESET_ROLE_COLORS = [
  '#5BC8B8', // teal
  '#D97FB2', // pink
  '#D98080', // salmon/red
  '#C8C84A', // yellow-green
  '#7AA8D9', // blue
  '#FFA726', // orange
  '#AB47BC', // purple
  '#26A69A', // green
];

export const resolveRoleColor = (roleName = '') => {
  if (!roleName) return '#5BC8B8';
  const r = roleName.toLowerCase().trim();
  if (r.includes('barista') || r.includes('pha chế') || r.includes('pha che')) return '#5BC8B8';
  if (r.includes('cashier') || r.includes('thu ngân') || r.includes('thu ngan')) return '#D97FB2';
  if (r.includes('kitchen') || r.includes('bếp') || r.includes('bep')) return '#D98080';
  if (r.includes('service') || r.includes('phục vụ') || r.includes('phuc vu') || r.includes('waiter') || r.includes('server')) return '#C8C84A';
  if (r.includes('supervisor') || r.includes('giám sát') || r.includes('quản lý') || r.includes('quan ly') || r.includes('manager')) return '#7AA8D9';
  const code = [...r].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return SHIFT_COLORS[code % SHIFT_COLORS.length];
};

const ROLE_THEMES = {
  Barista: {
    color: '#5BC8B8',      // Teal / Mint
    cardBg: 'rgba(91, 200, 184, 0.15)',
    activeBorder: '#5BC8B8',
    activeBg: 'rgba(91, 200, 184, 0.25)',
    dotColor: '#5BC8B8',
  },
  'Pha chế': {
    color: '#5BC8B8',
    cardBg: 'rgba(91, 200, 184, 0.15)',
    activeBorder: '#5BC8B8',
    activeBg: 'rgba(91, 200, 184, 0.25)',
    dotColor: '#5BC8B8',
  },
  Cashier: {
    color: '#D97FB2',      // Pink / Mauve
    cardBg: 'rgba(217, 127, 178, 0.15)',
    activeBorder: '#D97FB2',
    activeBg: 'rgba(217, 127, 178, 0.25)',
    dotColor: '#D97FB2',
  },
  'Thu ngân': {
    color: '#D97FB2',
    cardBg: 'rgba(217, 127, 178, 0.15)',
    activeBorder: '#D97FB2',
    activeBg: 'rgba(217, 127, 178, 0.25)',
    dotColor: '#D97FB2',
  },
  Kitchen: {
    color: '#D98080',      // Salmon / Coral
    cardBg: 'rgba(217, 128, 128, 0.15)',
    activeBorder: '#D98080',
    activeBg: 'rgba(217, 128, 128, 0.25)',
    dotColor: '#D98080',
  },
  'Bếp': {
    color: '#D98080',
    cardBg: 'rgba(217, 128, 128, 0.15)',
    activeBorder: '#D98080',
    activeBg: 'rgba(217, 128, 128, 0.25)',
    dotColor: '#D98080',
  },
  Service: {
    color: '#C8C84A',      // Yellow-green / Olive
    cardBg: 'rgba(200, 200, 74, 0.15)',
    activeBorder: '#C8C84A',
    activeBg: 'rgba(200, 200, 74, 0.25)',
    dotColor: '#C8C84A',
  },
  'Phục vụ': {
    color: '#C8C84A',
    cardBg: 'rgba(200, 200, 74, 0.15)',
    activeBorder: '#C8C84A',
    activeBg: 'rgba(200, 200, 74, 0.25)',
    dotColor: '#C8C84A',
  },
  Waiter: {
    color: '#C8C84A',
    cardBg: 'rgba(200, 200, 74, 0.15)',
    activeBorder: '#C8C84A',
    activeBg: 'rgba(200, 200, 74, 0.25)',
    dotColor: '#C8C84A',
  },
  Supervisor: {
    color: '#7AA8D9',      // Blue
    cardBg: 'rgba(122, 168, 217, 0.15)',
    activeBorder: '#7AA8D9',
    activeBg: 'rgba(122, 168, 217, 0.25)',
    dotColor: '#7AA8D9',
  },
  'Giám sát': {
    color: '#7AA8D9',
    cardBg: 'rgba(122, 168, 217, 0.15)',
    activeBorder: '#7AA8D9',
    activeBg: 'rgba(122, 168, 217, 0.25)',
    dotColor: '#7AA8D9',
  },
  'Quản lý': {
    color: '#7AA8D9',
    cardBg: 'rgba(122, 168, 217, 0.15)',
    activeBorder: '#7AA8D9',
    activeBg: 'rgba(122, 168, 217, 0.25)',
    dotColor: '#7AA8D9',
  },
  Default: {
    color: '#5BC8B8',
    cardBg: 'rgba(91, 200, 184, 0.15)',
    activeBorder: '#5BC8B8',
    activeBg: 'rgba(91, 200, 184, 0.25)',
    dotColor: '#5BC8B8',
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

  let r = 91, g = 200, b = 184;
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
  const base = new Date();
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
  color: '#8DD9CC',
};

const SUGGESTED_SWAP_STAFF = [
  { name: 'Mew. Ama', role: 'Barista', avatar: avatarMew },
  { name: 'Thia. Ago', role: 'Cashier', avatar: avatarThia },
  { name: 'Paul. Lee', role: 'Cashier', avatar: avatarPaul },
  { name: 'Thia. Ago', role: 'Parking Staff', avatar: avatarThia },
  { name: 'Mew. Ama', role: 'Server', avatar: avatarMew },
];

export default function ScheduleScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('my_shifts');
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDayIndex, setSelectedDayIndex] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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
  const [selectedSwapStaff, setSelectedSwapStaff] = useState('Mew. Ama');

  // ── Form inputs for Absent ──
  const [selectedAbsentShift, setSelectedAbsentShift] = useState(EMPTY_SHIFT);
  const [showAbsentShiftPicker, setShowAbsentShiftPicker] = useState(false);
  const [absentReason, setAbsentReason] = useState('');

  // ── Form inputs for Leave ──
  const [leaveReason, setLeaveReason] = useState('');
  const [isAllDay, setIsAllDay] = useState(true);
  const [startDate, setStartDate] = useState('30-10-2026');
  const [endDate, setEndDate] = useState('05-11-2026');

  // ── Live shifts state ──
  const [liveMyShifts, setLiveMyShifts] = useState([]);
  const [liveStoreShifts, setLiveStoreShifts] = useState([]);

  const weekDays = getWeekDates(weekOffset);
  const startDay = weekDays[0];
  const endDay = weekDays[6];
  const monthTitle = startDay.dateObj.getMonth() === endDay.dateObj.getMonth()
    ? `${MONTH_NAMES[startDay.dateObj.getMonth()]}, ${startDay.dateObj.getFullYear()}`
    : `${MONTH_NAMES[startDay.dateObj.getMonth()]} - ${MONTH_NAMES[endDay.dateObj.getMonth()]}, ${endDay.dateObj.getFullYear()}`;
  const weekSubtitle = `${startDay.dateStr}/${startDay.monthStr} - ${endDay.dateStr}/${endDay.monthStr}` +
    (weekOffset === 0 ? ' (Tuần này)' : weekOffset === 1 ? ' (Tuần tới)' : weekOffset === -1 ? ' (Tuần trước)' : weekOffset > 0 ? ` (+${weekOffset} tuần)` : ` (${weekOffset} tuần)`);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  useEffect(() => {
    fetchScheduleData(true);
    const unsubscribe = navigation.addListener('focus', () => {
      fetchScheduleData(false);
    });
    return unsubscribe;
  }, [navigation, weekOffset]);

  const showToast = (title, message, type = 'success') => {
    setToastMessage({ title, message, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await fetchScheduleData(false);
    setRefreshing(false);
  };

  const fetchScheduleData = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      // 1. Fetch current user & stores
      let activeStoreId = null;
      let currentUser = null;
      let storeSkills = [];
      try {
        const { data: user } = await getMyProfile();
        currentUser = user;
        if (user?.id) {
          const { data: stores } = await getMyStores(user.id);
          const activeStore = stores?.find((s) => s.status === 'ACTIVE') || stores?.[0];
          activeStoreId = activeStore?.storeId || activeStore?.id;
          if (activeStoreId) {
            const skillRes = await getSkillsByStore(activeStoreId).catch(() => null);
            if (skillRes?.data) {
              storeSkills = Array.isArray(skillRes.data) ? skillRes.data : (skillRes.data.content || []);
            }
          }
        }
      } catch (e) {
        // backend offline
      }

      const getShiftColor = (s, roleName) => {
        if (s.color && s.color.startsWith('#')) return s.color;
        if (s.skillColor && s.skillColor.startsWith('#')) return s.skillColor;
        const sSkillId = s.skillId || s.location;
        const matched = storeSkills.find(
          (sk) => (sSkillId && (sk.id === sSkillId || sk.name.toLowerCase() === String(sSkillId).toLowerCase())) ||
                  (s.skillName && sk.name.toLowerCase() === s.skillName.toLowerCase()) ||
                  (roleName && sk.name.toLowerCase() === roleName.toLowerCase())
        );
        if (matched && matched.description && matched.description.startsWith('#')) {
          return matched.description;
        }
        return resolveRoleColor(matched ? matched.name : roleName);
      };

      // 2. Fetch real my shifts from API
      const res = await getMyShifts().catch(() => null);
      if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
        const mapped = res.data.map((s, idx) => {
          const [y, m, d] = (s.shiftDate || '').split('-').map(Number);
          const shiftDateObj = y ? new Date(y, m - 1, d) : new Date();
          const dow = shiftDateObj.getDay();
          const actualIdx = dow === 0 ? 6 : dow - 1;
          const fmtT = (t) => {
            if (!t) return '06:00';
            if (typeof t === 'string') return t.slice(0, 5);
            return `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`;
          };
          const role = s.skillName || s.requirements?.[0]?.skillName || 'Barista';
          const shiftColor = getShiftColor(s, role);
          return {
            id: s.id || `live-my-${idx}`,
            shiftDate: s.shiftDate,
            dayIndex: actualIdx,
            dayLabel: `${DAY_LABELS.find((d) => d.dowIndex === dow)?.fullLabel || 'Thứ 2'} (${d || shiftDateObj.getDate()}/${m || (shiftDateObj.getMonth() + 1)})`,
            staffName: currentUser?.fullName || s.staffName || 'Nhân viên',
            timeRange: `${fmtT(s.startTime)} - ${fmtT(s.endTime)}`,
            location: s.storeAddress || s.storeName || 'Chi nhánh phân công',
            role,
            color: shiftColor,
            note: s.note || '',
            hasFlag: Boolean(s.note && s.note.trim().length > 0),
          };
        });
        setLiveMyShifts(mapped);
        if (mapped.length > 0) {
          setSelectedSwapShift((prev) => (prev && prev.id !== 'no-shift' ? prev : mapped[0]));
          setSelectedAbsentShift((prev) => (prev && prev.id !== 'no-shift' ? prev : mapped[0]));
        }
      } else {
        setLiveMyShifts([]);
      }

      // 3. Fetch real store shifts if storeId exists
      if (activeStoreId) {
        const storeRes = await getShiftsForStore(activeStoreId).catch(() => null);
        if (storeRes && storeRes.data && Array.isArray(storeRes.data) && storeRes.data.length > 0) {
          const mappedStore = storeRes.data.map((s, idx) => {
            const [y, m, d] = (s.shiftDate || '').split('-').map(Number);
            const shiftDateObj = y ? new Date(y, m - 1, d) : new Date();
            const dow = shiftDateObj.getDay();
            const actualIdx = dow === 0 ? 6 : dow - 1;
            const fmtT = (t) => {
              if (!t) return '06:00';
              if (typeof t === 'string') return t.slice(0, 5);
              return `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`;
            };
            const role = s.skillName || s.requirements?.[0]?.skillName || 'Barista';
            const shiftColor = getShiftColor(s, role);
            return {
              id: s.id || `live-store-${idx}`,
              shiftDate: s.shiftDate,
              dayIndex: actualIdx,
              dayLabel: `${DAY_LABELS.find((d) => d.dowIndex === dow)?.fullLabel || 'Thứ 2'} (${d || shiftDateObj.getDate()}/${m || (shiftDateObj.getMonth() + 1)})`,
              staffName: s.assignedStaffName || s.staffName || 'Nhân viên',
              timeRange: `${fmtT(s.startTime)} - ${fmtT(s.endTime)}`,
              location: s.storeAddress || s.storeName || 'Chi nhánh phân công',
              role,
              color: shiftColor,
              note: s.note || '',
              hasFlag: Boolean(s.note && s.note.trim().length > 0),
            };
          });
          setLiveStoreShifts(mappedStore);
        } else {
          setLiveStoreShifts([]);
        }
      }
    } catch (e) {
      console.log('Using live schedule data:', e.message);
      setLiveMyShifts([]);
      setLiveStoreShifts([]);
    } finally {
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
    // Tự động gán ca được click thành ca swap / absent mặc định
    const foundMyShift = liveMyShifts.find(s => s.id === shift.id || s.dayIndex === shift.dayIndex) || shift;
    if (foundMyShift) {
      setSelectedSwapShift(foundMyShift);
      setSelectedAbsentShift(foundMyShift);
    }
    setActionBoxVisible(true);
  };

  // ── Xử lý chuyển tiếp khi bấm 3 nút trong popup ──
  const handleOpenSwapModal = () => {
    setActionBoxVisible(false);
    setShowShiftPicker(false);
    setSwapModalVisible(true);
  };

  const handleOpenAbsentModal = () => {
    setActionBoxVisible(false);
    setShowAbsentShiftPicker(false);
    setAbsentModalVisible(true);
  };

  const handleOpenLeaveModal = () => {
    setActionBoxVisible(false);
    setLeaveModalVisible(true);
  };

  // ── Submit Đổi ca ──
  const handleSubmitSwap = async () => {
    if (!selectedSwapShift || selectedSwapShift.id === 'no-shift') {
      showToast('Lưu ý', 'Vui lòng chọn ca làm việc để đổi', 'warning');
      return;
    }
    try {
      setLoading(true);
      await createStaffRequest({
        type: 'SWAP',
        requesterName: 'Dilan. Jon',
        targetStaffName: selectedSwapStaff,
        shiftInfo: `${selectedSwapShift.dayLabel} ${selectedSwapShift.timeRange} (${selectedSwapShift.role})`,
        reason: `Yêu cầu đổi ca trực với bạn ${selectedSwapStaff}`,
      });
      setSwapModalVisible(false);
      showToast('Gửi thành công', `Đã gửi yêu cầu đổi ca ${selectedSwapShift.dayLabel} với ${selectedSwapStaff} tới Quản lý`);
    } catch (e) {
      showToast('Thất bại', 'Không thể gửi yêu cầu đổi ca', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ── Submit Xin vắng ──
  const handleSubmitAbsent = async () => {
    if (!selectedAbsentShift || selectedAbsentShift.id === 'no-shift') {
      showToast('Lưu ý', 'Vui lòng chọn ca làm việc xin vắng', 'warning');
      return;
    }
    if (!absentReason.trim()) {
      showToast('Lưu ý', 'Vui lòng nhập lý do xin vắng ca', 'warning');
      return;
    }
    try {
      setLoading(true);
      await createStaffRequest({
        type: 'ABSENT',
        requesterName: 'Dilan. Jon',
        shiftInfo: `${selectedAbsentShift.dayLabel} ${selectedAbsentShift.timeRange} (${selectedAbsentShift.role})`,
        reason: absentReason.trim(),
      });
      setAbsentModalVisible(false);
      setAbsentReason('');
      showToast('Gửi thành công', `Đã gửi yêu cầu xin vắng ca ${selectedAbsentShift.dayLabel} tới Quản lý`);
    } catch (e) {
      showToast('Thất bại', 'Không thể gửi yêu cầu xin vắng', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ── Submit Xin nghỉ ──
  const handleSubmitLeave = async () => {
    if (!leaveReason.trim()) {
      showToast('Lưu ý', 'Vui lòng nhập lý do xin nghỉ phép', 'warning');
      return;
    }
    try {
      setLoading(true);
      await createStaffRequest({
        type: 'LEAVE',
        requesterName: 'Dilan. Jon',
        startDate,
        endDate,
        reason: leaveReason.trim(),
      });
      setLeaveModalVisible(false);
      setLeaveReason('');
      showToast('Gửi thành công', 'Yêu cầu xin nghỉ phép đã được chuyển tới Quản lý');
    } catch (e) {
      showToast('Thất bại', 'Không thể gửi yêu cầu xin nghỉ', 'error');
    } finally {
      setLoading(false);
    }
  };

  const displayDays = selectedDayIndex !== null
    ? [weekDays[selectedDayIndex]]
    : weekDays;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* ── CUSTOM TOAST NOTIFICATION ─────────────────────────── */}
      {toastMessage && (
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
              <Text style={styles.toastMessage} numberOfLines={2}>{toastMessage.message}</Text>
            </View>
          </View>
        </View>
      )}

      <ScrollView
        style={styles.page}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleManualRefresh}
            colors={['#27272a']}
            tintColor="#27272a"
          />
        }
      >
        {/* ── 1. Tiêu đề Tháng với Điều hướng Tuần/Tháng ─────────── */}
        <View style={styles.monthHeaderRow}>
          <TouchableOpacity
            style={styles.navArrowBtn}
            onPress={() => {
              setWeekOffset(w => w - 1);
              setSelectedDayIndex(null);
            }}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            activeOpacity={0.7}
          >
            <Text style={styles.navArrowText}>‹</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.monthTitleContainer}
            onPress={() => {
              setWeekOffset(0);
              setSelectedDayIndex(null);
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.monthTitleText}>{monthTitle}</Text>
            <Text style={styles.weekRangeSubtitle}>{weekSubtitle}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navArrowBtn}
            onPress={() => {
              setWeekOffset(w => w + 1);
              setSelectedDayIndex(null);
            }}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            activeOpacity={0.7}
          >
            <Text style={styles.navArrowText}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ── 2. Bộ chuyển Tab: Ca của tôi | Lịch chi nhánh | Chợ ca ── */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === 'my_shifts' ? styles.tabBtnActive : styles.tabBtnInactive
            ]}
            onPress={() => setActiveTab('my_shifts')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'my_shifts' ? styles.tabTextActive : styles.tabTextInactive
              ]}
            >
              Ca của tôi
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === 'schedule' ? styles.tabBtnActive : styles.tabBtnInactive
            ]}
            onPress={() => setActiveTab('schedule')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'schedule' ? styles.tabTextActive : styles.tabTextInactive
              ]}
            >
              Lịch chi nhánh
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabBtn,
              styles.tabBtnMarketplace,
            ]}
            onPress={() => {
              const parent = navigation.getParent?.();
              if (parent) {
                parent.navigate('Marketplace');
              } else {
                navigation.navigate('Marketplace');
              }
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.tabTextMarketplace}>
              Chợ ca
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── 3. Thanh 7 Ngày trong tuần (Rectangle 578 - Ảnh Đổi ca (2).png) ── */}
        <View style={styles.weekStripCard}>
          {weekDays.map((item, idx) => {
            const isSelected = selectedDayIndex === idx;
            const isToday = item.fullDateStr === todayStr;

            return (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.dayColumn,
                  isSelected && styles.dayColumnSelected,
                  isToday && !isSelected && styles.dayColumnToday,
                ]}
                onPress={() => handleSelectDay(idx)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.dayLabelText,
                  isSelected && styles.dayLabelTextSelected,
                  isToday && !isSelected && styles.dayLabelTextToday,
                ]}>
                  {item.shortLabel}
                </Text>
                <Text style={[
                  styles.dayDateText,
                  isSelected && styles.dayDateTextSelected,
                  isToday && !isSelected && styles.dayDateTextToday,
                ]}>
                  {item.dateStr}
                </Text>
                {isToday && (
                  <View style={[styles.todayDot, isSelected && { backgroundColor: '#FFFFFF' }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── 4. Danh sách Ca làm việc nhóm theo Ngày (Chuẩn Đổi ca (2).png) ── */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#27272a" />
            <Text style={styles.loadingText}>Đang tải lịch làm việc...</Text>
          </View>
        ) : (
          <View style={styles.shiftsListContainer}>
            {displayDays.map((dayItem) => {
              const actualIdx = weekDays.findIndex(w => w.dowIndex === dayItem.dowIndex);

              const dayShifts = (activeTab === 'my_shifts'
                ? liveMyShifts
                : (liveStoreShifts.length > 0 ? liveStoreShifts : liveMyShifts)
              ).filter(s => {
                if (s.shiftDate) {
                  return s.shiftDate === dayItem.fullDateStr;
                }
                return s.dayIndex === actualIdx;
              });

              if (dayShifts.length === 0) {
                return (
                  <View key={actualIdx} style={styles.emptyDaySection}>
                    <Text style={styles.daySectionHeaderTitle}>{dayItem.fullHeaderDate}</Text>
                    <View style={styles.emptyDayRow}>
                      <Text style={styles.emptyMessageText}>
                        {activeTab === 'my_shifts'
                          ? 'Bạn không có lịch làm việc trong ngày này.'
                          : 'Không có ca trực nào trong ngày.'}
                      </Text>
                    </View>
                    <View style={styles.daySectionDivider} />
                  </View>
                );
              }

              return (
                <View key={actualIdx} style={styles.dayGroupSection}>
                  {/* Tiêu đề ngày (Thứ 2, 03 tháng 08) */}
                  <Text style={styles.daySectionHeaderTitle}>{dayItem.fullHeaderDate}</Text>

                  {/* Danh sách ca trực trong ngày */}
                  {dayShifts.map((shift) => {
                    const theme = getRoleTheme(shift);
                    const isSelected = activeSelectedShift?.id === shift.id && actionBoxVisible;

                    return (
                      <TouchableOpacity
                        key={shift.id}
                        style={[
                          styles.shiftItemRow,
                          isSelected && styles.shiftItemRowSelected,
                          { backgroundColor: isSelected ? theme.activeBg : theme.cardBg },
                          isSelected && { borderColor: '#27272a', borderWidth: 2 },
                        ]}
                        onPress={() => handleShiftPress(shift, dayItem)}
                        activeOpacity={0.85}
                      >
                        {/* Cột trái: Avatar + Tên nhân viên */}
                        <View style={styles.staffAvatarCol}>
                          <Image
                            source={AVATAR_MAP[shift.staffName] || avatarDilan}
                            style={styles.staffAvatarImg}
                          />
                          <Text style={styles.staffNameText} numberOfLines={1}>
                            {shift.staffName}
                          </Text>
                        </View>

                        {/* Vạch màu dọc */}
                        <View style={[styles.shiftVerticalBar, { backgroundColor: theme.color }]} />

                        {/* Cột phải: Thông tin ca */}
                        <View style={styles.shiftDetailCol}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Text style={styles.shiftTimeRangeText}>{shift.timeRange}</Text>
                            {shift.hasFlag && (
                              <View style={styles.shiftFlagBadge}>
                                <Text style={styles.shiftFlagText} numberOfLines={1}>🚩 Cảnh báo</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.shiftLocationText} numberOfLines={1}>
                            {shift.location}
                          </Text>
                          <View style={styles.shiftRoleRow}>
                            <View style={[styles.roleDot, { backgroundColor: theme.dotColor }]} />
                            <Text style={styles.roleLabelText}>{shift.role}</Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}

                  {/* Vạch phân cách ngày (Line 123 / 125 / 126) */}
                  <View style={styles.daySectionDivider} />
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* ── 5. POPUP BOX "LỰA CHỌN YÊU CẦU" ── */}
      <Modal
        visible={actionBoxVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setActionBoxVisible(false)}
      >
        <View style={styles.popupBackdrop}>
          <View style={styles.popupCard}>
            {/* Nút đóng X */}
            <TouchableOpacity
              style={styles.popupCloseBtn}
              onPress={() => setActionBoxVisible(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.popupCloseBtnText}>✕</Text>
            </TouchableOpacity>

            {/* Thông tin ca trực đang chọn (Avatar + Shift) */}
            <View style={styles.popupShiftHeader}>
              <View style={styles.popupAvatarCol}>
                <Image
                  source={AVATAR_MAP[activeSelectedShift?.staffName] || avatarDilan}
                  style={styles.popupAvatarImg}
                />
                <Text style={styles.popupAvatarName}>
                  {activeSelectedShift?.staffName || 'Dilan. Jon'}
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
                <Text style={styles.popupManagerNoteTitle}>🚩 Ghi chú / Cảnh báo từ quản lý:</Text>
                <Text style={styles.popupManagerNoteText}>{activeSelectedShift.note}</Text>
              </View>
            )}

            {/* Đường kẻ ngang */}
            <View style={styles.popupDivider} />

            {/* Tiêu đề: Lựa chọn yêu cầu */}
            <Text style={styles.popupActionHeading}>Lựa chọn yêu cầu</Text>

            {/* 3 Nút Hành Động Ngang */}
            <View style={styles.actionButtonsRow}>
              {/* 1. Hỗ trợ đổi ca */}
              <TouchableOpacity
                style={styles.actionCardPill}
                onPress={handleOpenSwapModal}
                activeOpacity={0.8}
              >
                <Text style={styles.actionCardPillText}>Hỗ trợ{'\n'}đổi ca</Text>
                <Image source={iconKinh} style={styles.actionCardPillIcon} resizeMode="contain" />
              </TouchableOpacity>

              {/* 2. Vắng mặt */}
              <TouchableOpacity
                style={styles.actionCardPill}
                onPress={handleOpenAbsentModal}
                activeOpacity={0.8}
              >
                <Text style={styles.actionCardPillText}>Vắng{'\n'}mặt</Text>
                <Image source={iconLoa} style={styles.actionCardPillIcon} resizeMode="contain" />
              </TouchableOpacity>

              {/* 3. Xin nghỉ phép */}
              <TouchableOpacity
                style={styles.actionCardPill}
                onPress={handleOpenLeaveModal}
                activeOpacity={0.8}
              >
                <Text style={styles.actionCardPillText}>Xin nghỉ{'\n'}phép</Text>
                <Image source={iconDua} style={styles.actionCardPillIcon} resizeMode="contain" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── FORM 1: Yêu cầu đổi ca (Ảnh 3 - CÓ THỂ CHỌN CA CỦA MÌNH) ──── */}
      <Modal
        visible={swapModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setSwapModalVisible(false)}
      >
        <SafeAreaView style={styles.formModalSafeArea}>
          <ScrollView contentContainerStyle={styles.formModalContent}>
            <View style={styles.formHeaderRow}>
              <TouchableOpacity
                style={styles.formCloseBtn}
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
              <TouchableOpacity
                style={styles.changeShiftBtn}
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
                    <Text style={{ fontSize: 13, color: '#888', fontStyle: 'italic' }}>Chưa có ca làm việc nào</Text>
                  </View>
                ) : (
                  liveMyShifts.map((shift) => {
                    const isSelected = selectedSwapShift?.id === shift.id;
                    return (
                      <TouchableOpacity
                        key={shift.id}
                        style={[styles.shiftPickerItem, isSelected && styles.shiftPickerItemSelected]}
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
                <Image source={avatarDilan} style={styles.popupAvatarImg} />
                <Text style={styles.popupAvatarName}>Dilan. Jon</Text>
              </View>

              <View style={[styles.popupVerticalBar, { backgroundColor: selectedSwapShift?.color || '#5BC8B8' }]} />

              <View style={styles.popupShiftInfo}>
                <Text style={styles.popupTimeRange}>
                  {selectedSwapShift?.id !== 'no-shift' && selectedSwapShift?.dayLabel
                    ? `${selectedSwapShift.dayLabel} - ${selectedSwapShift.timeRange}`
                    : 'Chưa có ca làm việc'}
                </Text>
                <Text style={styles.popupLocation}>{selectedSwapShift?.location || 'Cửa hàng được phân công'}</Text>
                <View style={styles.popupRoleRow}>
                  <View style={[styles.popupRoleDot, { backgroundColor: selectedSwapShift?.color || '#5BC8B8' }]} />
                  <Text style={styles.popupRoleText}>{selectedSwapShift?.role || 'Nhân viên'}</Text>
                </View>
              </View>
            </View>

            <Text style={styles.suggestSectionTitle}>Gợi ý đồng nghiệp</Text>

            <View style={styles.suggestList}>
              {SUGGESTED_SWAP_STAFF.map((staff, idx) => {
                const isSelected = selectedSwapStaff === staff.name && idx === 0;

                return (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.suggestItem, isSelected && styles.suggestItemSelected]}
                    onPress={() => setSelectedSwapStaff(staff.name)}
                    activeOpacity={0.7}
                  >
                    <Image source={staff.avatar} style={styles.suggestAvatar} />
                    <View style={styles.suggestInfo}>
                      <Text style={styles.suggestName}>{staff.name}</Text>
                      <Text style={styles.suggestRole}>{staff.role}</Text>
                    </View>
                    {isSelected && <Text style={styles.suggestCheckmark}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.submitBtnLarge}
              onPress={handleSubmitSwap}
              activeOpacity={0.8}
            >
              <Text style={styles.submitBtnLargeText}>Gửi yêu cầu</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── FORM 2: Yêu cầu xin vắng (Ảnh 4 - CÓ THỂ CHỌN CA CỦA MÌNH) ──── */}
      <Modal
        visible={absentModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setAbsentModalVisible(false)}
      >
        <SafeAreaView style={styles.formModalSafeArea}>
          <ScrollView contentContainerStyle={styles.formModalContent}>
            <View style={styles.formHeaderRow}>
              <TouchableOpacity
                style={styles.formCloseBtn}
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
              <TouchableOpacity
                style={styles.changeShiftBtn}
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
                    <Text style={{ fontSize: 13, color: '#888', fontStyle: 'italic' }}>Chưa có ca làm việc nào</Text>
                  </View>
                ) : (
                  liveMyShifts.map((shift) => {
                    const isSelected = selectedAbsentShift?.id === shift.id;
                    return (
                      <TouchableOpacity
                        key={shift.id}
                        style={[styles.shiftPickerItem, isSelected && styles.shiftPickerItemSelected]}
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
                <Image source={avatarDilan} style={styles.popupAvatarImg} />
                <Text style={styles.popupAvatarName}>Dilan. Jon</Text>
              </View>

              <View style={[styles.popupVerticalBar, { backgroundColor: selectedAbsentShift?.color || '#5BC8B8' }]} />

              <View style={styles.popupShiftInfo}>
                <Text style={styles.popupTimeRange}>
                  {selectedAbsentShift?.id !== 'no-shift' && selectedAbsentShift?.dayLabel
                    ? `${selectedAbsentShift.dayLabel} - ${selectedAbsentShift.timeRange}`
                    : 'Chưa có ca làm việc'}
                </Text>
                <Text style={styles.popupLocation}>{selectedAbsentShift?.location || 'Cửa hàng được phân công'}</Text>
                <View style={styles.popupRoleRow}>
                  <View style={[styles.popupRoleDot, { backgroundColor: selectedAbsentShift?.color || '#5BC8B8' }]} />
                  <Text style={styles.popupRoleText}>{selectedAbsentShift?.role || 'Nhân viên'}</Text>
                </View>
              </View>
            </View>

            <View style={styles.popupDivider} />

            <Text style={styles.formInputLabel}>Lý do:</Text>
            <TextInput
              style={styles.formTextArea}
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

            <TouchableOpacity
              style={styles.submitBtnLarge}
              onPress={handleSubmitAbsent}
              activeOpacity={0.8}
            >
              <Text style={styles.submitBtnLargeText}>Gửi yêu cầu</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── FORM 3: Yêu cầu xin nghỉ (Ảnh 1) ─────────────────────────── */}
      <Modal
        visible={leaveModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setLeaveModalVisible(false)}
      >
        <SafeAreaView style={styles.formModalSafeArea}>
          <ScrollView contentContainerStyle={styles.formModalContent}>
            <View style={styles.formHeaderRow}>
              <TouchableOpacity
                style={styles.formCloseBtn}
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

            <Text style={styles.formSectionHeading}>Thời gian</Text>

            <View style={styles.formRowInline}>
              <Text style={styles.formRowLabel}>Cả ngày</Text>
              <Switch
                value={isAllDay}
                onValueChange={setIsAllDay}
                trackColor={{ false: '#E0E0E0', true: '#51A33D' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.formRowInline}>
              <Text style={styles.formRowLabel}>Ngày bắt đầu</Text>
              <TextInput
                style={styles.formDateInput}
                value={startDate}
                onChangeText={setStartDate}
                placeholder="DD-MM-YYYY"
              />
            </View>

            <View style={styles.formRowInline}>
              <Text style={styles.formRowLabel}>Ngày kết thúc</Text>
              <TextInput
                style={styles.formDateInput}
                value={endDate}
                onChangeText={setEndDate}
                placeholder="DD-MM-YYYY"
              />
            </View>

            <Text style={styles.formInputLabel}>Lý do:</Text>
            <TextInput
              style={styles.formTextArea}
              value={leaveReason}
              onChangeText={setLeaveReason}
              placeholder="Nhập lý do xin nghỉ..."
              multiline
              numberOfLines={4}
            />

            <TouchableOpacity
              style={styles.submitBtnLarge}
              onPress={handleSubmitLeave}
              activeOpacity={0.8}
            >
              <Text style={styles.submitBtnLargeText}>Gửi yêu cầu</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
      <BottomNavbar navigation={navigation} activeRoute="Schedule" />
    </SafeAreaView>
  );
}

// ── StyleSheet chuẩn Pixel-Perfect Figma (Đổi ca (2).png) ────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  page: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 95,
  },

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
    backgroundColor: '#ECF9E8',
    borderColor: '#51A33D',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: '100%',
    maxWidth: 380,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  toastCardWarning: {
    backgroundColor: '#FFFDF5',
    borderColor: '#F59E0B',
  },
  toastCardError: {
    backgroundColor: '#FFF5F5',
    borderColor: '#EF4444',
  },
  toastIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#51A33D',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  toastIconCircleWarning: {
    backgroundColor: '#F59E0B',
  },
  toastIconCircleError: {
    backgroundColor: '#EF4444',
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
    color: '#222222',
  },
  toastMessage: {
    fontSize: 12.5,
    color: '#444444',
    marginTop: 2,
  },

  // ── Month Header & Week Navigation ──
  monthHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 12,
    minHeight: 46,
  },
  monthTitleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingHorizontal: 8,
  },
  monthTitleText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  weekRangeSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 2,
  },
  navArrowBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  navArrowText: {
    fontSize: 22,
    color: '#334155',
    fontWeight: '700',
    lineHeight: 24,
  },

  // ── Top Segmented Switcher (Rectangle 576/577) ──
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 3,
    height: 46,
    marginBottom: 16,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 360,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: '#27272a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  tabBtnInactive: {
    backgroundColor: 'transparent',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  tabTextInactive: {
    color: '#64748B',
  },
  tabBtnMarketplace: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  tabTextMarketplace: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#15803D',
  },

  // ── Week Strip Card (Rectangle 578) ──
  weekStripCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(240, 236, 236, 0.8)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  dayColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 8,
  },
  dayColumnSelected: {
    backgroundColor: '#27272a',
  },
  dayLabelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 3,
  },
  dayLabelTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dayDateText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  dayDateTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dayColumnToday: {
    borderWidth: 1.5,
    borderColor: '#428531',
  },
  dayLabelTextToday: {
    color: '#428531',
    fontWeight: '700',
  },
  dayDateTextToday: {
    color: '#428531',
    fontWeight: '800',
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#428531',
    marginTop: 2,
  },

  // ── Day Group Sections ──
  shiftsListContainer: {
    display: 'flex',
    flexDirection: 'column',
  },
  dayGroupSection: {
    marginBottom: 12,
  },
  daySectionHeaderTitle: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 10,
    marginTop: 4,
  },
  daySectionDivider: {
    height: 1,
    backgroundColor: 'rgba(240, 236, 236, 0.8)',
    marginTop: 14,
    marginBottom: 6,
  },

  // ── Shift Item Row ──
  shiftItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  shiftItemRowSelected: {},
  staffAvatarCol: {
    width: 60,
    alignItems: 'center',
    marginRight: 10,
  },
  staffAvatarImg: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: '#333333',
    marginBottom: 3,
  },
  staffNameText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#333333',
    textAlign: 'center',
  },
  shiftVerticalBar: {
    width: 3,
    height: 28,
    borderRadius: 3,
    marginRight: 10,
  },
  shiftDetailCol: {
    flex: 1,
    justifyContent: 'center',
  },
  shiftTimeRangeText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#222222',
  },
  shiftLocationText: {
    fontSize: 11.5,
    color: '#555555',
    marginVertical: 2,
  },
  shiftRoleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  roleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  roleLabelText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(51, 51, 51, 0.6)',
  },

  // ── Empty state ──
  emptyDaySection: {
    marginBottom: 10,
  },
  emptyDayRow: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  emptyMessageText: {
    fontSize: 13.5,
    color: '#888888',
  },

  // ── POPUP BOX "LỰA CHỌN YÊU CẦU" ──
  popupBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  popupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
    width: '100%',
    maxWidth: 390,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  popupCloseBtn: {
    position: 'absolute',
    right: 14,
    top: 14,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  popupCloseBtnText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E1E1E',
  },
  popupShiftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 36,
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
    borderColor: '#000000',
    marginBottom: 3,
  },
  popupAvatarName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333333',
    textAlign: 'center',
  },
  popupVerticalBar: {
    width: 3,
    height: 34,
    borderRadius: 3,
    backgroundColor: '#8DD9CC',
    marginRight: 12,
  },
  popupShiftInfo: {
    flex: 1,
  },
  popupTimeRange: {
    fontSize: 15,
    fontWeight: '700',
    color: '#222222',
  },
  popupLocation: {
    fontSize: 12,
    color: 'rgba(51, 51, 51, 0.7)',
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
    backgroundColor: '#8DD9CC',
  },
  popupRoleText: {
    fontSize: 12.5,
    fontWeight: '500',
    color: 'rgba(51, 51, 51, 0.6)',
  },
  popupDivider: {
    height: 1.5,
    backgroundColor: 'rgba(240, 236, 236, 0.8)',
    marginVertical: 12,
  },
  popupActionHeading: {
    fontSize: 15.5,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 14,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 12,
  },
  actionCardPill: {
    flex: 1,
    backgroundColor: '#ECF9E8',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 8,
    height: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionCardPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333333',
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
    color: '#333333',
  },
  changeShiftBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#ECF9E8',
  },
  changeShiftBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2E7D32',
  },
  shiftPickerDropdown: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
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
    backgroundColor: '#ECF9E8',
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
    color: '#444444',
  },
  shiftPickerItemTextSelected: {
    fontWeight: '700',
    color: '#1E1E1E',
  },
  shiftPickerCheck: {
    fontSize: 14,
    fontWeight: '700',
    color: '#51A33D',
  },

  // ── Form Modals Common Styles ──
  formModalSafeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
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
    height: 44,
  },
  formCloseBtn: {
    position: 'absolute',
    left: 0,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formCloseBtnText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E1E1E',
  },
  formHeaderTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#000000',
  },
  formShiftSummaryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  suggestSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666666',
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
    borderBottomColor: 'rgba(240, 236, 236, 0.7)',
  },
  suggestItemSelected: {
    backgroundColor: '#F5F5F5',
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
    color: '#222222',
  },
  suggestRole: {
    fontSize: 13,
    color: '#666666',
    marginTop: 2,
  },
  suggestCheckmark: {
    fontSize: 16,
    fontWeight: '700',
    color: '#51A33D',
  },
  submitBtnLarge: {
    backgroundColor: '#ECF9E8',
    borderRadius: 10,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  submitBtnLargeText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E1E1E',
  },
  formInputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
    marginTop: 10,
    marginBottom: 6,
  },
  formTextArea: {
    backgroundColor: 'rgba(236, 249, 232, 0.4)',
    borderWidth: 1.5,
    borderColor: 'rgba(81, 163, 61, 0.7)',
    borderRadius: 8,
    padding: 14,
    fontSize: 15,
    color: '#222222',
    textAlignVertical: 'top',
    minHeight: 120,
    marginBottom: 16,
  },
  warningNoteBox: {
    backgroundColor: '#FFFDF5',
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
    padding: 12,
    borderRadius: 6,
    marginBottom: 20,
  },
  warningNoteTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#D97706',
    marginBottom: 4,
  },
  warningNoteText: {
    fontSize: 13,
    color: '#555555',
    lineHeight: 18,
  },
  formRowInline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  formRowLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  formRowValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
  },
  formSectionHeading: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
    marginTop: 8,
    marginBottom: 4,
  },
  formDateInput: {
    fontSize: 15,
    color: '#333333',
    fontWeight: '500',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingVertical: 4,
    minWidth: 100,
    textAlign: 'right',
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
    color: '#888888',
  },

  // ── Shift Note Flag Badge ──
  shiftFlagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
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
    color: '#B45309',
  },
  popupManagerNoteBox: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  popupManagerNoteTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
    marginBottom: 3,
  },
  popupManagerNoteText: {
    fontSize: 13,
    color: '#78350F',
    lineHeight: 18,
  },
});
