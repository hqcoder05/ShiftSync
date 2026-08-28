import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
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

// ── Action Icons & Avatars ──────────────────────────────────────────────────
const iconKinh = require('../assets/icon-kinh.png');
const iconLoa = require('../assets/icon-loa.png');
const iconDua = require('../assets/icon-dua.png');

const avatarDilan = require('../assets/avatar-dilan-jon.png');
const avatarMew = require('../assets/avatar-mew-ama.png');
const avatarPaul = require('../assets/avatar-paul-lee.png');
const avatarThia = require('../assets/avatar-thia-ago.png');

const AVATAR_MAP = {
  'Dilan. Jon': avatarDilan,
  'Dilan. Jon (Tôi)': avatarDilan,
  'Paul. Lee': avatarPaul,
  'Paul. Lee (Tôi)': avatarPaul,
  'Thia. Ago': avatarThia,
  'Mew. Ama': avatarMew,
  'Vivi.an': avatarDilan,
};

// ── Color palette matching the Web Schedule (Figma Prototype) ─────────────
const ROLE_THEMES = {
  Barista: {
    color: '#8DD9CC',      // Teal / Mint
    cardBg: 'rgba(141, 217, 204, 0.15)',
    activeBorder: '#8DD9CC',
    activeBg: 'rgba(141, 217, 204, 0.25)',
    dotColor: '#8DD9CC',
  },
  Cashier: {
    color: '#D98DB3',      // Pink / Mauve
    cardBg: 'rgba(217, 141, 179, 0.12)',
    activeBorder: '#D98DB3',
    activeBg: 'rgba(217, 141, 179, 0.25)',
    dotColor: '#D98DB3',
  },
  Kitchen: {
    color: '#D98080',      // Salmon / Coral
    cardBg: 'rgba(217, 128, 128, 0.12)',
    activeBorder: '#D98080',
    activeBg: 'rgba(217, 128, 128, 0.25)',
    dotColor: '#D98080',
  },
  Service: {
    color: '#D9D98D',      // Yellow-green / Olive
    cardBg: 'rgba(217, 217, 141, 0.1)',
    activeBorder: '#D9D98D',
    activeBg: 'rgba(217, 217, 141, 0.25)',
    dotColor: '#D9D98D',
  },
  Supervisor: {
    color: '#7AA8D9',      // Blue
    cardBg: 'rgba(122, 168, 217, 0.12)',
    activeBorder: '#7AA8D9',
    activeBg: 'rgba(122, 168, 217, 0.25)',
    dotColor: '#7AA8D9',
  },
  Default: {
    color: '#8DD9CC',
    cardBg: 'rgba(141, 217, 204, 0.15)',
    activeBorder: '#8DD9CC',
    activeBg: 'rgba(141, 217, 204, 0.25)',
    dotColor: '#8DD9CC',
  }
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

// ── Dữ liệu ca cá nhân (My shifts) ─────────────
const DEFAULT_MY_SHIFTS = [
  {
    id: 'my-shift-1',
    dayIndex: 0,
    dayLabel: 'Thứ 2 (03/08)',
    staffName: 'Dilan. Jon',
    timeRange: '6:00AM - 15:00PM',
    location: 'Highlands D9/71 Tây Thạnh Tân Phú',
    role: 'Barista',
    color: '#8DD9CC',
  },
  {
    id: 'my-shift-2',
    dayIndex: 2,
    dayLabel: 'Thứ 4 (05/08)',
    staffName: 'Dilan. Jon',
    timeRange: '6:00AM - 15:00PM',
    location: 'Highlands D9/71 Tây Thạnh Tân Phú',
    role: 'Barista',
    color: '#8DD9CC',
  },
  {
    id: 'my-shift-3',
    dayIndex: 3,
    dayLabel: 'Thứ 5 (06/08)',
    staffName: 'Dilan. Jon',
    timeRange: '6:00AM - 14:00PM',
    location: 'Highlands D9/71 Tây Thạnh Tân Phú',
    role: 'Barista',
    color: '#8DD9CC',
  },
  {
    id: 'my-shift-4',
    dayIndex: 4,
    dayLabel: 'Thứ 6 (07/08)',
    staffName: 'Dilan. Jon',
    timeRange: '14:00PM - 22:00PM',
    location: 'Highlands D9/71 Tây Thạnh Tân Phú',
    role: 'Cashier',
    color: '#D98DB3',
  },
  {
    id: 'my-shift-5',
    dayIndex: 6,
    dayLabel: 'Thứ CN (09/08)',
    staffName: 'Dilan. Jon',
    timeRange: '14:00PM - 22:00PM',
    location: 'Highlands D9/71 Tây Thạnh Tân Phú',
    role: 'Cashier',
    color: '#D98DB3',
  },
];

// ── Dữ liệu ca của toàn bộ quán (Khớp chuẩn Đổi ca (2).png) ────────────────
const DEFAULT_STORE_SHIFTS = [
  {
    id: 'store-shift-1',
    dayIndex: 0,
    dayLabel: 'Thứ 2 (03/08)',
    staffName: 'Dilan. Jon',
    timeRange: '6:00AM - 15:00PM',
    location: 'Highlands D9/71 Tây Thạnh Tân Phú',
    role: 'Barista',
    color: '#8DD9CC',
  },
  {
    id: 'store-shift-2',
    dayIndex: 0,
    dayLabel: 'Thứ 2 (03/08)',
    staffName: 'Thia. Ago',
    timeRange: '14:00AM - 22:00PM',
    location: 'Highlands D9/71 Tây Thạnh Tân Phú',
    role: 'Cashier',
    color: '#D98DB3',
  },
  {
    id: 'store-shift-3',
    dayIndex: 1,
    dayLabel: 'Thứ 3 (04/08)',
    staffName: 'Dilan. Jon',
    timeRange: '6:00AM - 17:00PM',
    location: 'Highlands D9/71 Tây Thạnh Tân Phú',
    role: 'Barista',
    color: '#8DD9CC',
  },
  {
    id: 'store-shift-4',
    dayIndex: 1,
    dayLabel: 'Thứ 3 (04/08)',
    staffName: 'Thia. Ago',
    timeRange: '6:00AM - 17:00PM',
    location: 'Highlands D9/71 Tây Thạnh Tân Phú',
    role: 'Cashier',
    color: '#D98DB3',
  },
  {
    id: 'store-shift-5',
    dayIndex: 1,
    dayLabel: 'Thứ 3 (04/08)',
    staffName: 'Mew. Ama',
    timeRange: '6:00AM - 14:00PM',
    location: 'Highlands D9/71 Tây Thạnh Tân Phú',
    role: 'Service',
    color: '#D9D98D',
  },
  {
    id: 'store-shift-6',
    dayIndex: 2,
    dayLabel: 'Thứ 4 (05/08)',
    staffName: 'Dilan. Jon',
    timeRange: '6:00AM - 15:00PM',
    location: 'Highlands D9/71 Tây Thạnh Tân Phú',
    role: 'Barista',
    color: '#8DD9CC',
  },
  {
    id: 'store-shift-7',
    dayIndex: 2,
    dayLabel: 'Thứ 4 (05/08)',
    staffName: 'Paul. Lee',
    timeRange: '14:00PM - 22:00PM',
    location: 'Highlands D9/71 Tây Thạnh Tân Phú',
    role: 'Cashier',
    color: '#D98DB3',
  },
  {
    id: 'store-shift-8',
    dayIndex: 3,
    dayLabel: 'Thứ 5 (06/08)',
    staffName: 'Dilan. Jon',
    timeRange: '6:00AM - 14:00PM',
    location: 'Highlands D9/71 Tây Thạnh Tân Phú',
    role: 'Barista',
    color: '#8DD9CC',
  },
  {
    id: 'store-shift-9',
    dayIndex: 3,
    dayLabel: 'Thứ 5 (06/08)',
    staffName: 'Mew. Ama',
    timeRange: '14:00PM - 22:00PM',
    location: 'Highlands D9/71 Tây Thạnh Tân Phú',
    role: 'Kitchen',
    color: '#D98080',
  },
  {
    id: 'store-shift-10',
    dayIndex: 4,
    dayLabel: 'Thứ 6 (07/08)',
    staffName: 'Dilan. Jon',
    timeRange: '14:00PM - 22:00PM',
    location: 'Highlands D9/71 Tây Thạnh Tân Phú',
    role: 'Cashier',
    color: '#D98DB3',
  },
  {
    id: 'store-shift-11',
    dayIndex: 5,
    dayLabel: 'Thứ 7 (08/08)',
    staffName: 'Vivi.an',
    timeRange: '08:00AM - 17:00PM',
    location: 'Highlands D9/71 Tây Thạnh Tân Phú',
    role: 'Supervisor',
    color: '#7AA8D9',
  },
  {
    id: 'store-shift-12',
    dayIndex: 6,
    dayLabel: 'Thứ CN (09/08)',
    staffName: 'Dilan. Jon',
    timeRange: '14:00PM - 22:00PM',
    location: 'Highlands D9/71 Tây Thạnh Tân Phú',
    role: 'Cashier',
    color: '#D98DB3',
  },
];

const SUGGESTED_SWAP_STAFF = [
  { name: 'Mew. Ama', role: 'Barista', avatar: avatarMew },
  { name: 'Thia. Ago', role: 'Cashier', avatar: avatarThia },
  { name: 'Paul. Lee', role: 'Cashier', avatar: avatarPaul },
  { name: 'Thia. Ago', role: 'Parking Staff', avatar: avatarThia },
  { name: 'Mew. Ama', role: 'Server', avatar: avatarMew },
];

export default function ScheduleScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('schedule');
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDayIndex, setSelectedDayIndex] = useState(null);
  const [loading, setLoading] = useState(false);

  // ── Custom Toast / Thông báo đẹp ──
  const [toastMessage, setToastMessage] = useState(null);

  // ── Action Box State (Chuẩn Group 192 / Rectangle 631 trong Đổi ca (2).png) ──
  const [activeSelectedShift, setActiveSelectedShift] = useState(DEFAULT_STORE_SHIFTS[0]);
  const [actionBoxVisible, setActionBoxVisible] = useState(false);

  // ── Sub-modals for forms ──
  const [swapModalVisible, setSwapModalVisible] = useState(false);
  const [absentModalVisible, setAbsentModalVisible] = useState(false);
  const [leaveModalVisible, setLeaveModalVisible] = useState(false);

  // ── Form inputs for Swap ──
  const [selectedSwapShift, setSelectedSwapShift] = useState(DEFAULT_MY_SHIFTS[0]);
  const [showShiftPicker, setShowShiftPicker] = useState(false);
  const [selectedSwapStaff, setSelectedSwapStaff] = useState('Mew. Ama');

  // ── Form inputs for Absent ──
  const [selectedAbsentShift, setSelectedAbsentShift] = useState(DEFAULT_MY_SHIFTS[0]);
  const [showAbsentShiftPicker, setShowAbsentShiftPicker] = useState(false);
  const [absentReason, setAbsentReason] = useState('');

  // ── Form inputs for Leave ──
  const [leaveReason, setLeaveReason] = useState('');
  const [isAllDay, setIsAllDay] = useState(true);
  const [startDate, setStartDate] = useState('30-10-2026');
  const [endDate, setEndDate] = useState('05-11-2026');

  // ── Live shifts state ──
  const [liveMyShifts, setLiveMyShifts] = useState(DEFAULT_MY_SHIFTS);
  const [liveStoreShifts, setLiveStoreShifts] = useState(DEFAULT_STORE_SHIFTS);

  const weekDays = getWeekDates(weekOffset);
  const monthTitle = MONTH_NAMES[weekDays[0].dateObj.getMonth()];

  useEffect(() => {
    fetchScheduleData();
  }, [weekOffset]);

  const showToast = (title, message, type = 'success') => {
    setToastMessage({ title, message, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const fetchScheduleData = async () => {
    try {
      setLoading(true);
      // 1. Fetch current user & stores
      let activeStoreId = null;
      let currentUser = null;
      try {
        const { data: user } = await getMyProfile();
        currentUser = user;
        if (user?.id) {
          const { data: stores } = await getMyStores(user.id);
          const activeStore = stores?.find((s) => s.status === 'ACTIVE') || stores?.[0];
          activeStoreId = activeStore?.storeId || activeStore?.id;
        }
      } catch (e) {
        // backend offline
      }

      // 2. Fetch real my shifts from API
      const res = await getMyShifts().catch(() => null);
      if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
        const mapped = res.data.map((s, idx) => {
          const shiftDateObj = s.shiftDate ? new Date(s.shiftDate) : new Date();
          const dow = shiftDateObj.getDay();
          const actualIdx = dow === 0 ? 6 : dow - 1;
          const fmtT = (t) => {
            if (!t) return '06:00';
            if (typeof t === 'string') return t.slice(0, 5);
            return `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`;
          };
          const role = s.skillName || s.requirements?.[0]?.skillName || 'Barista';
          const theme = ROLE_THEMES[role] || ROLE_THEMES.Default;
          return {
            id: s.id || `live-my-${idx}`,
            shiftDate: s.shiftDate,
            dayIndex: actualIdx,
            dayLabel: `${DAY_LABELS.find((d) => d.dowIndex === dow)?.fullLabel || 'Thứ 2'} (${shiftDateObj.getDate()}/${shiftDateObj.getMonth() + 1})`,
            staffName: currentUser?.fullName || s.staffName || 'Dilan. Jon (Tôi)',
            timeRange: `${fmtT(s.startTime)} - ${fmtT(s.endTime)}`,
            location: s.storeName || 'Highlands D9/71 Tây Thạnh Tân Phú',
            role,
            color: theme.color,
          };
        });
        setLiveMyShifts(mapped);
      } else {
        setLiveMyShifts(DEFAULT_MY_SHIFTS);
      }

      // 3. Fetch real store shifts if storeId exists
      if (activeStoreId) {
        const storeRes = await getShiftsForStore(activeStoreId).catch(() => null);
        if (storeRes && storeRes.data && Array.isArray(storeRes.data) && storeRes.data.length > 0) {
          const mappedStore = storeRes.data.map((s, idx) => {
            const shiftDateObj = s.shiftDate ? new Date(s.shiftDate) : new Date();
            const dow = shiftDateObj.getDay();
            const actualIdx = dow === 0 ? 6 : dow - 1;
            const fmtT = (t) => {
              if (!t) return '06:00';
              if (typeof t === 'string') return t.slice(0, 5);
              return `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`;
            };
            const role = s.skillName || s.requirements?.[0]?.skillName || 'Barista';
            const theme = ROLE_THEMES[role] || ROLE_THEMES.Default;
            return {
              id: s.id || `live-store-${idx}`,
              shiftDate: s.shiftDate,
              dayIndex: actualIdx,
              dayLabel: `${DAY_LABELS.find((d) => d.dowIndex === dow)?.fullLabel || 'Thứ 2'} (${shiftDateObj.getDate()}/${shiftDateObj.getMonth() + 1})`,
              staffName: s.assignedStaffName || s.staffName || 'Nhân viên',
              timeRange: `${fmtT(s.startTime)} - ${fmtT(s.endTime)}`,
              location: s.storeName || 'Highlands D9/71 Tây Thạnh Tân Phú',
              role,
              color: theme.color,
            };
          });
          setLiveStoreShifts(mappedStore);
        } else {
          setLiveStoreShifts(DEFAULT_STORE_SHIFTS);
        }
      }
    } catch (e) {
      console.log('Using local schedule data:', e.message);
      setLiveMyShifts(DEFAULT_MY_SHIFTS);
      setLiveStoreShifts(DEFAULT_STORE_SHIFTS);
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
    const foundMyShift = DEFAULT_MY_SHIFTS.find(s => s.id === shift.id || s.dayIndex === shift.dayIndex);
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

  const getRoleTheme = (role = '') => {
    return ROLE_THEMES[role] || ROLE_THEMES.Default;
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
      >
        {/* ── 1. Tiêu đề Tháng với Điều hướng Tuần/Tháng ─────────── */}
        <View style={styles.monthHeaderRow}>
          <TouchableOpacity
            style={styles.navArrowBtn}
            onPress={() => setWeekOffset(w => w - 1)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.navArrowText}>‹</Text>
          </TouchableOpacity>

          <Text style={styles.monthTitleText}>{monthTitle}</Text>

          <TouchableOpacity
            style={styles.navArrowBtn}
            onPress={() => setWeekOffset(w => w + 1)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.navArrowText}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ── 2. Bộ chuyển Tab: My shifts | Schedule (Rectangle 576/577) ── */}
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
              My shifts
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
              Schedule
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── 3. Thanh 7 Ngày trong tuần (Rectangle 578 - Ảnh Đổi ca (2).png) ── */}
        <View style={styles.weekStripCard}>
          {weekDays.map((item, idx) => {
            const isSelected = selectedDayIndex === idx;

            return (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.dayColumn,
                  isSelected && styles.dayColumnSelected
                ]}
                onPress={() => handleSelectDay(idx)}
                activeOpacity={0.7}
              >
                <Text style={[styles.dayLabelText, isSelected && styles.dayLabelTextSelected]}>
                  {item.shortLabel}
                </Text>
                <Text style={[styles.dayDateText, isSelected && styles.dayDateTextSelected]}>
                  {item.dateStr}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── 4. Danh sách Ca làm việc nhóm theo Ngày (Chuẩn Đổi ca (2).png) ── */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#51A33D" />
            <Text style={styles.loadingText}>Đang tải lịch làm việc...</Text>
          </View>
        ) : (
          <View style={styles.shiftsListContainer}>
            {displayDays.map((dayItem) => {
              const actualIdx = weekDays.findIndex(w => w.dowIndex === dayItem.dowIndex);

              const dayShifts = activeTab === 'my_shifts'
                ? liveMyShifts.filter(s => s.dayIndex === actualIdx)
                : liveStoreShifts.filter(s => s.dayIndex === actualIdx);

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
                    const theme = getRoleTheme(shift.role);
                    const isSelected = activeSelectedShift?.id === shift.id && actionBoxVisible;

                    return (
                      <TouchableOpacity
                        key={shift.id}
                        style={[
                          styles.shiftItemRow,
                          isSelected && styles.shiftItemRowSelected,
                          { backgroundColor: isSelected ? theme.activeBg : theme.cardBg },
                          isSelected && { borderColor: theme.activeBorder, borderWidth: 2, borderStyle: 'dashed' },
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
                          <Text style={styles.shiftTimeRangeText}>{shift.timeRange}</Text>
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

      {/* ── 5. POPUP BOX "LỰA CHỌN YÊU CẦU" (Group 192 / Rectangle 631 chuẩn Đổi ca (2).png) ── */}
      <Modal
        visible={actionBoxVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setActionBoxVisible(false)}
      >
        <View style={styles.popupBackdrop}>
          <View style={styles.popupCard}>
            {/* Nút đóng X (X Icon - top: 263px, left: 365px) */}
            <TouchableOpacity
              style={styles.popupCloseBtn}
              onPress={() => setActionBoxVisible(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.popupCloseBtnText}>✕</Text>
            </TouchableOpacity>

            {/* Thông tin ca trực đang chọn (Avatar Dilan. Jon + Shift) */}
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
                  { backgroundColor: getRoleTheme(activeSelectedShift?.role).color }
                ]}
              />

              {/* Chi tiết ca */}
              <View style={styles.popupShiftInfo}>
                <Text style={styles.popupTimeRange}>{activeSelectedShift?.timeRange}</Text>
                <Text style={styles.popupLocation} numberOfLines={1}>
                  {activeSelectedShift?.location}
                </Text>
                <View style={styles.popupRoleRow}>
                  <View
                    style={[
                      styles.popupRoleDot,
                      { backgroundColor: getRoleTheme(activeSelectedShift?.role).dotColor }
                    ]}
                  />
                  <Text style={styles.popupRoleText}>{activeSelectedShift?.role}</Text>
                </View>
              </View>
            </View>

            {/* Đường kẻ ngang (Line 132) */}
            <View style={styles.popupDivider} />

            {/* Tiêu đề: Lựa chọn yêu cầu */}
            <Text style={styles.popupActionHeading}>Lựa chọn yêu cầu</Text>

            {/* 3 Nút Hành Động Ngang (Rectangle 632, 635, 636) */}
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
                {DEFAULT_MY_SHIFTS.map((shift) => {
                  const isSelected = selectedSwapShift.id === shift.id;
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
                })}
              </View>
            )}

            <View style={styles.formShiftSummaryBox}>
              <View style={styles.popupAvatarCol}>
                <Image source={avatarDilan} style={styles.popupAvatarImg} />
                <Text style={styles.popupAvatarName}>Dilan. Jon</Text>
              </View>

              <View style={[styles.popupVerticalBar, { backgroundColor: selectedSwapShift.color }]} />

              <View style={styles.popupShiftInfo}>
                <Text style={styles.popupTimeRange}>
                  {selectedSwapShift.dayLabel} - {selectedSwapShift.timeRange}
                </Text>
                <Text style={styles.popupLocation}>{selectedSwapShift.location}</Text>
                <View style={styles.popupRoleRow}>
                  <View style={[styles.popupRoleDot, { backgroundColor: selectedSwapShift.color }]} />
                  <Text style={styles.popupRoleText}>{selectedSwapShift.role}</Text>
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
                {DEFAULT_MY_SHIFTS.map((shift) => {
                  const isSelected = selectedAbsentShift.id === shift.id;
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
                })}
              </View>
            )}

            <View style={styles.formShiftSummaryBox}>
              <View style={styles.popupAvatarCol}>
                <Image source={avatarDilan} style={styles.popupAvatarImg} />
                <Text style={styles.popupAvatarName}>Dilan. Jon</Text>
              </View>

              <View style={[styles.popupVerticalBar, { backgroundColor: selectedAbsentShift.color }]} />

              <View style={styles.popupShiftInfo}>
                <Text style={styles.popupTimeRange}>
                  {selectedAbsentShift.dayLabel} - {selectedAbsentShift.timeRange}
                </Text>
                <Text style={styles.popupLocation}>{selectedAbsentShift.location}</Text>
                <View style={styles.popupRoleRow}>
                  <View style={[styles.popupRoleDot, { backgroundColor: selectedAbsentShift.color }]} />
                  <Text style={styles.popupRoleText}>{selectedAbsentShift.role}</Text>
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
    paddingBottom: 40,
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

  // ── Month Header ──
  monthHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    position: 'relative',
    height: 36,
  },
  monthTitleText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#000000',
    letterSpacing: -0.2,
  },
  navArrowBtn: {
    position: 'absolute',
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navArrowText: {
    fontSize: 26,
    color: '#666666',
  },

  // ── Top Segmented Switcher (Rectangle 576/577) ──
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F2F0F0',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(240, 236, 236, 0.7)',
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
    backgroundColor: '#ECF9E8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabBtnInactive: {
    backgroundColor: 'transparent',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#222222',
  },
  tabTextInactive: {
    color: '#666666',
  },

  // ── Week Strip Card (Rectangle 578) ──
  weekStripCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(240, 236, 236, 0.8)',
    borderRadius: 8,
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
    paddingVertical: 4,
    borderRadius: 6,
  },
  dayColumnSelected: {
    backgroundColor: '#ECF9E8',
  },
  dayLabelText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(51, 51, 51, 0.7)',
    marginBottom: 3,
  },
  dayLabelTextSelected: {
    color: '#1E1E1E',
    fontWeight: '700',
  },
  dayDateText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333333',
  },
  dayDateTextSelected: {
    color: '#1E1E1E',
    fontWeight: '700',
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

  // ── Quick Action Row (Đăng ký lịch) ──
  quickActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    marginBottom: 6,
  },
  btnRegisterAvail: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECF9E8',
    borderColor: '#51A33D',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
    gap: 8,
    shadowColor: '#51A33D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  btnRegisterAvailIcon: {
    fontSize: 18,
  },
  btnRegisterAvailText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2B661E',
  },
  btnRefreshSchedule: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnRefreshScheduleText: {
    fontSize: 18,
  },
});
