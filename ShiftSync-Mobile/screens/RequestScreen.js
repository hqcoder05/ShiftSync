import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Modal,
  TextInput,
  Switch,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { getMyRequests, createStaffRequest, toIsoDate } from '../services/requestService';
import { getLeaveTypes, getMyLeaveBalance } from '../services/leaveService';
import { getMyShifts, getShiftsForStore } from '../services/shiftService';
import { getMyProfile, getMyStores } from '../services/profileService';
import BottomNavbar from '../components/BottomNavbar';
import PaperPlane3D from '../components/PaperPlane3D';

import { getAvatarThumbnail } from '../components/avatarThumbnails';
import { getAvatarForEmployee } from '../components/avatarConfigs';

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

const EMPTY_SHIFT = {
  id: 'no-shift',
  dayLabel: 'Chưa có ca',
  timeRange: '—',
  location: 'Cửa hàng được phân công',
  role: 'Nhân viên',
  color: '#8DD9CC',
};

export default function RequestScreen({ navigation, route }) {
  const [requests, setRequests] = useState([]);
  const [availableShifts, setAvailableShifts] = useState([]);
  const [currentUserName, setCurrentUserName] = useState('');
  const [currentUserAvatarId, setCurrentUserAvatarId] = useState(null);
  const [storeColleagues, setStoreColleagues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState(null); // null | 'APPROVED' | 'PENDING' | 'REJECTED'

  // ── Leave Types & Leave Balance (Backend Source of Truth) ──
  const [leaveTypes, setLeaveTypes] = useState([
    { code: 'ANNUAL', name: 'Phép năm', deductsAnnualBalance: true },
    { code: 'SICK', name: 'Nghỉ ốm', deductsAnnualBalance: false },
    { code: 'EMERGENCY', name: 'Khẩn cấp', deductsAnnualBalance: false },
    { code: 'UNPAID', name: 'Không lương', deductsAnnualBalance: false },
  ]);
  const [selectedLeaveType, setSelectedLeaveType] = useState('ANNUAL');
  const [leaveBalance, setLeaveBalance] = useState(null);

  // ── Custom Toast / Thông báo đẹp ──
  const [toastMessage, setToastMessage] = useState(null);

  // ── Modal States ──
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  const [leaveModalVisible, setLeaveModalVisible] = useState(false);
  const [swapModalVisible, setSwapModalVisible] = useState(false);
  const [absentModalVisible, setAbsentModalVisible] = useState(false);

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const dayAfter = new Date(today);
  dayAfter.setDate(today.getDate() + 2);
  const fmtD = (d) => `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;

  const [activeStoreId, setActiveStoreId] = useState(null);
  const [isAllDay, setIsAllDay] = useState(true);
  const [startDate, setStartDate] = useState(fmtD(tomorrow));
  const [endDate, setEndDate] = useState(fmtD(dayAfter));
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveError, setLeaveError] = useState(null);
  const [swapError, setSwapError] = useState(null);
  const [absentError, setAbsentError] = useState(null);

  // ── Form States (Đổi ca - Image 3) ──
  const [selectedSwapShift, setSelectedSwapShift] = useState(EMPTY_SHIFT);
  const [showShiftPicker, setShowShiftPicker] = useState(false);
  const [selectedSwapStaff, setSelectedSwapStaff] = useState('');

  // ── Form States (Xin vắng - Image 4) ──
  const [selectedAbsentShift, setSelectedAbsentShift] = useState(EMPTY_SHIFT);
  const [showAbsentShiftPicker, setShowAbsentShiftPicker] = useState(false);
  const [absentReason, setAbsentReason] = useState('');

  useEffect(() => {
    loadData();
    const unsub = navigation?.addListener?.('focus', () => {
      loadData();
    });
    return unsub;
  }, [navigation]);

  useEffect(() => {
    // Check if opened with an action from ScheduleScreen
    if (route?.params?.action === 'open_swap') {
      if (route.params.shift) {
        setSelectedSwapShift(route.params.shift);
      }
      setSwapModalVisible(true);
    } else if (route?.params?.action === 'open_absent') {
      if (route.params.shift) {
        setSelectedAbsentShift(route.params.shift);
      }
      setAbsentModalVisible(true);
    } else if (route?.params?.action === 'open_leave') {
      setLeaveModalVisible(true);
    }
  }, [route?.params]);

  const showToast = (title, message, type = 'success') => {
    setToastMessage({ title, message, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const calcLeaveDuration = (startStr, endStr) => {
    try {
      const isoS = toIsoDate(startStr);
      const isoE = toIsoDate(endStr);
      const d1 = new Date(isoS);
      const d2 = new Date(isoE);
      if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 1;
      const diffTime = d2.getTime() - d1.getTime();
      const diffDays = Math.round(diffTime / (1000 * 3600 * 24)) + 1;
      return diffDays > 0 ? diffDays : 1;
    } catch (e) {
      return 1;
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      let activeUserId = null;
      let userFullName = '';
      let storeId = null;

      const [profileRes, shiftsRes] = await Promise.allSettled([
        getMyProfile(),
        getMyShifts(),
      ]);

      if (profileRes.status === 'fulfilled' && profileRes.value?.data) {
        userFullName = profileRes.value.data.fullName || 'Nhân viên';
        setCurrentUserName(userFullName);
        setCurrentUserAvatarId(profileRes.value.data.avatarId || null);
        activeUserId = profileRes.value.data.id;

        try {
          const storesRes = await getMyStores(activeUserId).catch(() => null);
          const activeStore = storesRes?.data?.find((s) => s.status === 'ACTIVE') || storesRes?.data?.[0];
          storeId = activeStore?.storeId || activeStore?.id || null;
          setActiveStoreId(storeId);
        } catch (e) {
          // ignore
        }
      }

      // Load real requests from Backend (LeaveRequests, Swaps, Adjustments)
      const reqList = await getMyRequests(storeId);
      setRequests(reqList || []);

      // Load leave types and user balance
      if (storeId) {
        try {
          const [typesRes, balRes] = await Promise.allSettled([
            getLeaveTypes(storeId),
            getMyLeaveBalance(storeId),
          ]);
          if (typesRes.status === 'fulfilled' && typesRes.value?.data) {
            setLeaveTypes(typesRes.value.data);
          }
          if (balRes.status === 'fulfilled' && balRes.value?.data) {
            setLeaveBalance(balRes.value.data);
          }
        } catch (err) {
          console.log('Error fetching leave balance/types:', err.message);
        }
      }

      if (shiftsRes.status === 'fulfilled' && Array.isArray(shiftsRes.value?.data)) {
        if (!storeId && shiftsRes.value.data.length > 0) {
          const shiftStoreId = shiftsRes.value.data.find(s => s.storeId)?.storeId;
          if (shiftStoreId) {
            storeId = shiftStoreId;
            setActiveStoreId(storeId);
          }
        }
        const mapped = shiftsRes.value.data.map((s, idx) => {
          const d = s.shiftDate ? new Date(s.shiftDate) : new Date();
          const dow = ['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][d.getDay()];
          const dayStr = String(d.getDate()).padStart(2, '0');
          const monthStr = String(d.getMonth() + 1).padStart(2, '0');
          return {
            id: s.id || `shift-${idx}`,
            dayLabel: `${dow} (${dayStr}/${monthStr})`,
            timeRange: `${String(s.startTime).slice(0, 5)} - ${String(s.endTime).slice(0, 5)}`,
            location: s.storeAddress || s.storeName || 'Chi nhánh phân công',
            role: s.skillName || s.requiredSkillName || 'Barista',
            color: '#8DD9CC',
          };
        });

        if (mapped.length > 0) {
          setAvailableShifts(mapped);
          setSelectedSwapShift(mapped[0]);
          setSelectedAbsentShift(mapped[0]);
        }
      }

      // Fetch colleagues from store
      if (storeId) {
        try {
          const storeShiftsRes = await getShiftsForStore(storeId).catch(() => null);
          if (storeShiftsRes?.data && Array.isArray(storeShiftsRes.data)) {
            const colleaguesMap = new Map();
            storeShiftsRes.data.forEach((s) => {
              const staffName = s.assignedStaffName || s.staffName || '';
              const role = s.skillName || s.requirements?.[0]?.skillName || 'Nhân viên';
              if (staffName && staffName !== 'Chưa phân công' && staffName !== userFullName) {
                if (!colleaguesMap.has(staffName)) {
                  colleaguesMap.set(staffName, {
                    name: staffName,
                    role,
                    avatarId: s.avatarId,
                  });
                }
              }
            });
            const colleaguesList = Array.from(colleaguesMap.values());
            setStoreColleagues(colleaguesList);
            if (colleaguesList.length > 0) {
              setSelectedSwapStaff((prev) => prev || colleaguesList[0].name);
            }
          }
        } catch (e) {
          // ignore store fetch errors
        }
      }
    } catch (e) {
      console.log('Error loading data:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadRequests = loadData;

  const handleFilterToggle = (status) => {
    if (filterStatus === status) {
      setFilterStatus(null);
    } else {
      setFilterStatus(status);
    }
  };

  // ── Submit Xin nghỉ (Image 1) ──
  const handleSubmitLeave = async () => {
    setLeaveError(null);
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

    const duration = calcLeaveDuration(startDate, endDate);
    const currentType = leaveTypes.find(t => t.code === selectedLeaveType);
    if (currentType?.deductsAnnualBalance && leaveBalance) {
      if (duration > leaveBalance.remainingDays) {
        const msg = `Bạn chỉ còn ${leaveBalance.remainingDays} ngày phép năm (cần ${duration} ngày). Hãy rút ngắn hoặc chọn loại nghỉ khác.`;
        setLeaveError(msg);
        showToast('Không đủ ngày phép', msg, 'warning');
        return;
      }
    }

    try {
      setLoading(true);
      await createStaffRequest({
        type: 'LEAVE',
        typeCategory: 'leave',
        requestType: 'Yêu cầu xin nghỉ',
        leaveType: selectedLeaveType,
        startDate: startDate,
        endDate: endDate,
        reason: leaveReason.trim(),
        content: `Đơn xin nghỉ phép (${selectedLeaveType}) từ ${startDate} đến ${endDate}.\nLý do: ${leaveReason.trim()}`,
      }, activeStoreId);
      setLeaveModalVisible(false);
      setLeaveReason('');
      setLeaveError(null);
      showToast('Gửi thành công', 'Yêu cầu xin nghỉ phép đã được chuyển tới Quản lý');
      loadRequests();
    } catch (err) {
      const errMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Không thể gửi yêu cầu xin nghỉ';
      setLeaveError(errMsg);
      showToast('Thất bại', errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  // ── Submit Đổi ca (Image 3) ──
  const handleSubmitSwap = async () => {
    setSwapError(null);
    if (!selectedSwapShift || selectedSwapShift.id === 'no-shift') {
      const msg = 'Vui lòng chọn ca làm việc của bạn để thực hiện đổi ca';
      setSwapError(msg);
      showToast('Lưu ý', msg, 'warning');
      return;
    }
    if (!selectedSwapStaff) {
      const msg = 'Vui lòng chọn nhân viên đồng nghiệp để đổi ca';
      setSwapError(msg);
      showToast('Lưu ý', msg, 'warning');
      return;
    }

    try {
      setLoading(true);
      await createStaffRequest({
        type: 'SWAP',
        typeCategory: 'swap',
        requestType: 'Yêu cầu đổi ca',
        requesterName: currentUserName || 'Nhân viên',
        targetStaffName: selectedSwapStaff,
        shiftInfo: `${selectedSwapShift.dayLabel} ${selectedSwapShift.timeRange} (${selectedSwapShift.role})`,
        reason: `Đề xuất đổi ca: ${selectedSwapShift.dayLabel} (${selectedSwapShift.timeRange}) với bạn ${selectedSwapStaff}.`,
        content: `Đề xuất đổi ca làm việc: ${selectedSwapShift.dayLabel} (${selectedSwapShift.timeRange}) với bạn ${selectedSwapStaff}.`,
      });
      setSwapModalVisible(false);
      setSwapError(null);
      showToast('Gửi thành công', `Đã gửi yêu cầu đổi ca ${selectedSwapShift.dayLabel} với ${selectedSwapStaff}`);
      loadRequests();
    } catch (err) {
      const errMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Không thể gửi yêu cầu đổi ca';
      setSwapError(errMsg);
      showToast('Thất bại', errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  // ── Submit Xin vắng (Image 4) ──
  const handleSubmitAbsent = async () => {
    setAbsentError(null);
    if (!selectedAbsentShift || selectedAbsentShift.id === 'no-shift') {
      const msg = 'Vui lòng chọn ca làm việc cần xin vắng';
      setAbsentError(msg);
      showToast('Lưu ý', msg, 'warning');
      return;
    }
    if (!absentReason.trim()) {
      const msg = 'Vui lòng nhập lý do xin vắng ca làm việc';
      setAbsentError(msg);
      showToast('Lưu ý', msg, 'warning');
      return;
    }

    try {
      setLoading(true);
      await createStaffRequest({
        type: 'ABSENT',
        typeCategory: 'absence',
        requestType: 'Yêu cầu xin vắng',
        requesterName: currentUserName || 'Nhân viên',
        shiftInfo: `${selectedAbsentShift.dayLabel} ${selectedAbsentShift.timeRange} (${selectedAbsentShift.role})`,
        reason: absentReason.trim(),
        content: `Xin vắng ca làm: ${selectedAbsentShift.dayLabel} (${selectedAbsentShift.timeRange}).\nLý do: ${absentReason.trim()}`,
      });
      setAbsentModalVisible(false);
      setAbsentReason('');
      setAbsentError(null);
      showToast('Gửi thành công', `Đã gửi yêu cầu xin vắng ca ${selectedAbsentShift.dayLabel} tới Quản lý`);
      loadRequests();
    } catch (err) {
      const errMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Không thể gửi yêu cầu xin vắng';
      setAbsentError(errMsg);
      showToast('Thất bại', errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = filterStatus
    ? requests.filter(r => r.status === filterStatus)
    : requests;

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
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* ── CUSTOM TOAST NOTIFICATION ─────────────────────────── */}
      {renderToast()}

      <ScrollView
        style={styles.page}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. Header (Quản lý yêu cầu) ── */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => navigation?.goBack?.()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Quản lý yêu cầu</Text>
          </View>
        </View>

        {/* ── 🌟 Hero 3D Card: Máy bay giấy 3D tương tác ── */}
        <View style={styles.hero3DCard}>
          <View style={styles.hero3DInfo}>
            <Text style={styles.hero3DTitle}>Trạm tiếp nhận yêu cầu</Text>
            <Text style={styles.hero3DSubtitle}>
              Gửi yêu cầu đổi ca, xin vắng mặt hoặc đăng ký nghỉ phép trực tiếp tới quản lý ca.
            </Text>
          </View>
          <View style={styles.heroPlaneContainer}>
            <PaperPlane3D width={140} height={110} interactive={true} />
          </View>
        </View>

        <View style={styles.headerDivider} />

        {/* ── 2. Top 3 Filter Cards: Đã duyệt / Chờ duyệt / Từ chối ── */}
        <View style={styles.filterCardsRow}>
          {/* Card 1: Đã duyệt */}
          <TouchableOpacity
            style={[
              styles.filterCard,
              filterStatus === 'APPROVED' && styles.filterCardActive,
            ]}
            onPress={() => handleFilterToggle('APPROVED')}
            activeOpacity={0.8}
          >
            <View style={styles.filterCardContent}>
              <Text style={styles.filterCardText}>Đã duyệt</Text>
            </View>
          </TouchableOpacity>

          {/* Card 2: Chờ duyệt */}
          <TouchableOpacity
            style={[
              styles.filterCard,
              filterStatus === 'PENDING' && styles.filterCardActive,
            ]}
            onPress={() => handleFilterToggle('PENDING')}
            activeOpacity={0.8}
          >
            <View style={styles.filterCardContent}>
              <Text style={styles.filterCardText}>Chờ duyệt</Text>
            </View>
          </TouchableOpacity>

          {/* Card 3: Từ chối */}
          <TouchableOpacity
            style={[
              styles.filterCard,
              filterStatus === 'REJECTED' && styles.filterCardActive,
            ]}
            onPress={() => handleFilterToggle('REJECTED')}
            activeOpacity={0.8}
          >
            <View style={styles.filterCardContent}>
              <Text style={styles.filterCardText}>Từ chối</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── 🌟 Quỹ phép năm (Leave Balance Card) ── */}
        {leaveBalance && (
          <View style={styles.balanceCard}>
            <View style={styles.balanceHeaderRow}>
              <View style={styles.balanceTitleWrap}>
                <Text style={styles.balanceCardTitle}>Quỹ phép năm ({leaveBalance.year})</Text>
                <Text style={styles.balanceCardSub}>Hợp đồng: {leaveBalance.annualEntitlement} ngày/năm</Text>
              </View>
              <View style={styles.balanceRemainingPill}>
                <Text style={styles.balanceRemainingNumber}>{leaveBalance.remainingDays}</Text>
                <Text style={styles.balanceRemainingLabel}>còn lại</Text>
              </View>
            </View>

            <View style={styles.balanceMetricsRow}>
              <View style={styles.balanceMetricItem}>
                <Text style={styles.balanceMetricValue}>{leaveBalance.totalEntitlement}</Text>
                <Text style={styles.balanceMetricLabel}>Tổng cấp</Text>
              </View>
              <View style={styles.balanceMetricDivider} />
              <View style={styles.balanceMetricItem}>
                <Text style={[styles.balanceMetricValue, { color: '#2563EB' }]}>{leaveBalance.usedDays}</Text>
                <Text style={styles.balanceMetricLabel}>Đã dùng</Text>
              </View>
              <View style={styles.balanceMetricDivider} />
              <View style={styles.balanceMetricItem}>
                <Text style={[styles.balanceMetricValue, { color: '#D97706' }]}>{leaveBalance.pendingDays}</Text>
                <Text style={styles.balanceMetricLabel}>Đang chờ</Text>
              </View>
              <View style={styles.balanceMetricDivider} />
              <View style={styles.balanceMetricItem}>
                <Text style={[styles.balanceMetricValue, { color: '#16A34A' }]}>{leaveBalance.remainingDays}</Text>
                <Text style={styles.balanceMetricLabel}>Khả dụng</Text>
              </View>
            </View>
          </View>
        )}

        {/* ── 3. 3 Action Buttons: Hỗ trợ đổi ca / Vắng mặt / Xin nghỉ phép ── */}
        <View style={styles.actionSectionContainer}>
          <View style={styles.actionButtonsRow}>
            {/* 1. Hỗ trợ đổi ca */}
            <TouchableOpacity
              style={styles.actionCardPill}
              onPress={() => setSwapModalVisible(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.actionCardPillText}>Hỗ trợ{'\n'}đổi ca</Text>
              <Image source={iconKinh} style={styles.actionCardPillIcon} resizeMode="contain" />
            </TouchableOpacity>

            {/* 2. Vắng mặt */}
            <TouchableOpacity
              style={styles.actionCardPill}
              onPress={() => setAbsentModalVisible(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.actionCardPillText}>Vắng{'\n'}mặt</Text>
              <Image source={iconLoa} style={styles.actionCardPillIcon} resizeMode="contain" />
            </TouchableOpacity>

            {/* 3. Xin nghỉ phép */}
            <TouchableOpacity
              style={styles.actionCardPill}
              onPress={() => setLeaveModalVisible(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.actionCardPillText}>Xin nghỉ{'\n'}phép</Text>
              <Image source={iconDua} style={styles.actionCardPillIcon} resizeMode="contain" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 4. Danh sách Yêu cầu ── */}
        <Text style={styles.requestListHeading}>Danh sách yêu cầu</Text>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#51A33D" />
            <Text style={styles.loadingText}>Đang tải...</Text>
          </View>
        ) : (
          <View style={styles.requestList}>
            {filteredRequests.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>
                  {filterStatus
                    ? 'Không có yêu cầu nào trong mục này.'
                    : 'Chưa có yêu cầu nào.'}
                </Text>
              </View>
            ) : (
              filteredRequests.map((item) => {
                const isApproved = item.status === 'APPROVED';
                const isRejected = item.status === 'REJECTED';
                const isPending = item.status === 'PENDING' || !item.status;

                let statusLabel = 'Chờ duyệt';
                if (isApproved) statusLabel = 'Đã duyệt';
                else if (isRejected) statusLabel = 'Từ chối';

                let typeTitle = 'Xin nghỉ phép';
                if (item.type === 'SWAP') typeTitle = 'Đổi ca';
                else if (item.type === 'ABSENT') typeTitle = 'Vắng mặt';
                else if (item.typeLabel) typeTitle = item.typeLabel;

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.requestItemCard,
                      isRejected && styles.requestItemCardRejected,
                    ]}
                    onPress={() => {
                      setSelectedRequest(item);
                      setDetailModalVisible(true);
                    }}
                    activeOpacity={0.85}
                  >
                    <View style={styles.requestItemTopRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.requestItemTitle}>{typeTitle}</Text>
                        {item.requestedDays ? (
                          <View style={styles.durationBadge}>
                            <Text style={styles.durationBadgeText}>{item.requestedDays} ngày</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.requestItemDate}>{item.date || item.startDate || ''}</Text>
                    </View>

                    <View style={styles.requestItemBottomRow}>
                      <Text style={styles.requestItemDesc} numberOfLines={2}>
                        {item.description || item.reason || 'Không có ghi chú'}
                      </Text>

                      {/* Status Badge */}
                      <View
                        style={[
                          styles.statusBadge,
                          isApproved && styles.statusBadgeApproved,
                          isRejected && styles.statusBadgeRejected,
                          isPending && styles.statusBadgePending,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            isApproved && styles.statusBadgeTextApproved,
                            isRejected && styles.statusBadgeTextRejected,
                            isPending && styles.statusBadgeTextPending,
                          ]}
                        >
                          {statusLabel}
                        </Text>
                      </View>
                    </View>

                    {isRejected && item.rejectionReason ? (
                      <View style={styles.rejectedReasonBox}>
                        <Text style={styles.rejectedReasonText}>
                          ⚠️ Lý do từ chối: {item.rejectionReason}
                        </Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* ── MODAL 1: Yêu cầu xin nghỉ (Ảnh 1 trong docx) ─────────────── */}
      <Modal
        visible={leaveModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setLeaveModalVisible(false)}
      >
        <SafeAreaView style={styles.modalSafeArea}>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setLeaveModalVisible(false)}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Yêu cầu xin nghỉ</Text>
            </View>

            <View style={styles.headerDivider} />

            {/* Loại nghỉ phép */}
            <Text style={styles.sectionHeader}>Loại nghỉ phép</Text>
            <View style={styles.leaveTypeRow}>
              {leaveTypes.map((t) => {
                const isSel = selectedLeaveType === t.code;
                return (
                  <TouchableOpacity
                    key={t.code}
                    style={[styles.leaveTypePill, isSel && styles.leaveTypePillActive]}
                    onPress={() => setSelectedLeaveType(t.code)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.leaveTypePillText, isSel && styles.leaveTypePillTextActive]}>
                      {t.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.sectionHeader}>Thời gian</Text>

            <View style={styles.formRow}>
              <Text style={styles.formLabel}>Cả ngày</Text>
              <Switch
                value={isAllDay}
                onValueChange={setIsAllDay}
                trackColor={{ false: '#E0E0E0', true: '#51A33D' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.formRow}>
              <Text style={styles.formLabel}>Ngày bắt đầu</Text>
              <TextInput
                style={styles.dateInput}
                value={startDate}
                onChangeText={setStartDate}
                placeholder="DD-MM-YYYY"
              />
            </View>

            <View style={styles.formRow}>
              <Text style={styles.formLabel}>Ngày kết thúc</Text>
              <TextInput
                style={styles.dateInput}
                value={endDate}
                onChangeText={setEndDate}
                placeholder="DD-MM-YYYY"
              />
            </View>

            {/* Duration and balance feedback */}
            <View style={styles.leaveDurationNotice}>
              <Text style={styles.leaveDurationNoticeText}>
                ⏱ Số ngày xin nghỉ: <Text style={{ fontWeight: '800', color: '#15803D' }}>{calcLeaveDuration(startDate, endDate)} ngày</Text>
              </Text>
              {selectedLeaveType === 'ANNUAL' && leaveBalance && (
                <Text style={styles.leaveBalanceNoticeSub}>
                  Quỹ phép năm còn: <Text style={{ fontWeight: '700' }}>{leaveBalance.remainingDays} ngày</Text>
                  {calcLeaveDuration(startDate, endDate) <= leaveBalance.remainingDays ? (
                    <Text style={{ color: '#16A34A' }}> (Hợp lệ)</Text>
                  ) : (
                    <Text style={{ color: '#DC2626' }}> (Vượt quá số ngày còn lại!)</Text>
                  )}
                </Text>
              )}
            </View>

            <Text style={styles.sectionHeader}>Lý do:</Text>
            <TextInput
              style={styles.reasonTextArea}
              value={leaveReason}
              onChangeText={(txt) => {
                setLeaveReason(txt);
                setLeaveError(null);
              }}
              placeholder="Nhập lý do xin nghỉ..."
              multiline
              numberOfLines={4}
            />

            {leaveError && (
              <View style={styles.modalErrorBox}>
                <Text style={styles.modalErrorIcon}>⚠️</Text>
                <Text style={styles.modalErrorText}>{leaveError}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleSubmitLeave}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Gửi yêu cầu</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
          {renderToast()}
        </SafeAreaView>
      </Modal>

      {/* ── MODAL 2: Yêu cầu đổi ca (Ảnh 3 - CÓ THỂ CHỌN CA CỦA MÌNH) ──── */}
      <Modal
        visible={swapModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setSwapModalVisible(false)}
      >
        <SafeAreaView style={styles.modalSafeArea}>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setSwapModalVisible(false)}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Yêu cầu đổi ca</Text>
            </View>

            <View style={styles.headerDivider} />

            {/* Ca làm việc của tôi đang chọn */}
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
                {availableShifts.length === 0 ? (
                  <Text style={{ padding: 12, color: '#7B8490', fontSize: 13, textAlign: 'center' }}>
                    Chưa có ca làm việc được phân công.
                  </Text>
                ) : (
                  availableShifts.map((shift) => {
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
                  })
                )}
              </View>
            )}

            {/* Preview Thẻ Ca đã chọn */}
            <View style={styles.requesterShiftBox}>
              <View style={styles.avatarCol}>
                <Image source={getStaffAvatarSource(currentUserName, currentUserAvatarId)} style={styles.avatarImg} />
                <Text style={styles.avatarName}>{currentUserName || 'Nhân viên'}</Text>
              </View>

              <View style={styles.shiftCardMini}>
                <View style={[styles.miniBar, { backgroundColor: selectedSwapShift.color }]} />
                <View style={styles.miniInfo}>
                  <Text style={styles.miniTime}>
                    {selectedSwapShift.dayLabel} - {selectedSwapShift.timeRange}
                  </Text>
                  <Text style={styles.miniLocation}>{selectedSwapShift.location}</Text>
                  <View style={styles.miniRoleRow}>
                    <View style={[styles.miniRoleDot, { backgroundColor: selectedSwapShift.color }]} />
                    <Text style={styles.miniRoleText}>{selectedSwapShift.role}</Text>
                  </View>
                </View>
              </View>
            </View>

            <Text style={styles.suggestTitle}>Gợi ý đồng nghiệp</Text>

            <View style={styles.suggestList}>
              {storeColleagues.length === 0 ? (
                <View style={{ paddingVertical: 14, alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: '#7B8490', fontStyle: 'italic' }}>Chưa có thông tin đồng nghiệp trong chi nhánh</Text>
                </View>
              ) : (
                storeColleagues.map((staff, idx) => {
                  const isSelected = selectedSwapStaff === staff.name;

                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.suggestItem, isSelected && styles.suggestItemSelected]}
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

            {swapError && (
              <View style={styles.modalErrorBox}>
                <Text style={styles.modalErrorIcon}>⚠️</Text>
                <Text style={styles.modalErrorText}>{swapError}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleSubmitSwap}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Gửi yêu cầu</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
          {renderToast()}
        </SafeAreaView>
      </Modal>

      {/* ── MODAL 3: Yêu cầu xin vắng (Ảnh 4 - CÓ THỂ CHỌN CA CỦA MÌNH) ──── */}
      <Modal
        visible={absentModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setAbsentModalVisible(false)}
      >
        <SafeAreaView style={styles.modalSafeArea}>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setAbsentModalVisible(false)}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Yêu cầu xin vắng</Text>
            </View>

            <View style={styles.headerDivider} />

            {/* Ca làm việc cần xin vắng */}
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
                {availableShifts.length === 0 ? (
                  <Text style={{ padding: 12, color: '#7B8490', fontSize: 13, textAlign: 'center' }}>
                    Chưa có ca làm việc được phân công.
                  </Text>
                ) : (
                  availableShifts.map((shift) => {
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
                  })
                )}
              </View>
            )}

            {/* Requester & Shift Preview */}
            <View style={styles.requesterShiftBox}>
              <View style={styles.avatarCol}>
                <Image source={getStaffAvatarSource(currentUserName, currentUserAvatarId)} style={styles.avatarImg} />
                <Text style={styles.avatarName}>{currentUserName || 'Nhân viên'}</Text>
              </View>

              <View style={styles.shiftCardMini}>
                <View style={[styles.miniBar, { backgroundColor: selectedAbsentShift.color }]} />
                <View style={styles.miniInfo}>
                  <Text style={styles.miniTime}>
                    {selectedAbsentShift.dayLabel} - {selectedAbsentShift.timeRange}
                  </Text>
                  <Text style={styles.miniLocation}>{selectedAbsentShift.location}</Text>
                  <View style={styles.miniRoleRow}>
                    <View style={[styles.miniRoleDot, { backgroundColor: selectedAbsentShift.color }]} />
                    <Text style={styles.miniRoleText}>{selectedAbsentShift.role}</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.headerDivider} />

            <Text style={styles.sectionHeader}>Lý do:</Text>
            <TextInput
              style={styles.reasonTextArea}
              value={absentReason}
              onChangeText={setAbsentReason}
              placeholder="Nhập lý do xin vắng ca này..."
              multiline
              numberOfLines={4}
            />

            {/* Warning Note Box */}
            <View style={styles.warningNoteBox}>
              <Text style={styles.warningNoteTitle}>Lưu ý:</Text>
              <Text style={styles.warningNoteText}>
                Yêu cầu vắng ca của bạn cần được Quản lý phê duyệt. Trong lúc chờ duyệt, bạn vẫn chịu trách nhiệm với ca làm.
              </Text>
            </View>

            {absentError && (
              <View style={styles.modalErrorBox}>
                <Text style={styles.modalErrorIcon}>⚠️</Text>
                <Text style={styles.modalErrorText}>{absentError}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleSubmitAbsent}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Gửi yêu cầu</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
          {renderToast()}
        </SafeAreaView>
      </Modal>

      {/* ── MODAL 4: Chi tiết yêu cầu (Ảnh 5 trong docx) ─────────────── */}
      <Modal
        visible={detailModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.detailModalCard}>
            <TouchableOpacity
              style={styles.detailCloseBtn}
              onPress={() => setDetailModalVisible(false)}
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>

            <View style={styles.detailHeaderCenter}>
              <Image
                source={getStaffAvatarSource(selectedRequest?.requesterName, selectedRequest?.avatarId)}
                style={styles.detailAvatar}
              />
              <Text style={styles.detailTitle}>{selectedRequest?.typeLabel || 'Xin nghỉ'}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Loại yêu cầu:</Text>
              <Text style={styles.detailValue}>{selectedRequest?.typeLabel || 'Xin nghỉ'}</Text>
            </View>

            {selectedRequest?.requestedDays ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Số ngày nghỉ:</Text>
                <Text style={[styles.detailValue, { color: '#15803D', fontWeight: '800' }]}>
                  {selectedRequest.requestedDays} ngày
                </Text>
              </View>
            ) : null}

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Ngày bắt đầu:</Text>
              <Text style={styles.detailValue}>{selectedRequest?.startDate || selectedRequest?.date}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Ngày kết thúc:</Text>
              <Text style={styles.detailValue}>{selectedRequest?.endDate || selectedRequest?.date}</Text>
            </View>

            <Text style={styles.detailSectionHeading}>Lý do:</Text>
            <View style={styles.detailReasonBox}>
              <Text style={styles.detailReasonText}>{selectedRequest?.reason || selectedRequest?.description || 'Không có lý do'}</Text>
            </View>

            {selectedRequest?.status === 'REJECTED' && selectedRequest?.rejectionReason ? (
              <View style={styles.detailRejectionBox}>
                <Text style={styles.detailRejectionTitle}>Lý do từ chối:</Text>
                <Text style={styles.detailRejectionText}>{selectedRequest.rejectionReason}</Text>
              </View>
            ) : null}

            <View style={[
              styles.detailStatusBadge,
              selectedRequest?.status === 'APPROVED' && styles.detailStatusBadgeApproved,
              selectedRequest?.status === 'REJECTED' && styles.detailStatusBadgeRejected,
              (selectedRequest?.status === 'PENDING' || !selectedRequest?.status) && styles.detailStatusBadgePending,
            ]}>
              <Text style={[
                styles.detailStatusBadgeText,
                selectedRequest?.status === 'APPROVED' && styles.detailStatusBadgeTextApproved,
                selectedRequest?.status === 'REJECTED' && styles.detailStatusBadgeTextRejected,
                (selectedRequest?.status === 'PENDING' || !selectedRequest?.status) && styles.detailStatusBadgeTextPending,
              ]}>
                {selectedRequest?.status === 'APPROVED' ? 'Trạng thái: Đã duyệt' : selectedRequest?.status === 'REJECTED' ? 'Trạng thái: Từ chối' : 'Trạng thái: Đang chờ duyệt'}
              </Text>
            </View>
          </View>
        </View>
      </Modal>
      <BottomNavbar navigation={navigation} activeRoute="Request" />
    </SafeAreaView>
  );
}

// ── StyleSheet ──────────────────────────────────────────────────────────────
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
  modalErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#F87171',
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
    color: '#B91C1C',
    fontWeight: '500',
    lineHeight: 18,
  },

  // ── Header ──
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  closeBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#334155',
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },

  // ── Hero 3D Card (Trạm tiếp nhận yêu cầu với máy bay 3D) ──
  hero3DCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    borderRadius: 18,
    padding: 14,
    paddingRight: 6,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(66, 133, 49, 0.25)',
    borderTopColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#22c55e',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  hero3DInfo: {
    flex: 1,
    paddingRight: 6,
  },
  hero3DTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#14532D',
  },
  hero3DSubtitle: {
    fontSize: 11.5,
    color: '#4B5563',
    marginTop: 4,
    lineHeight: 16,
  },
  heroPlaneContainer: {
    width: 145,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerDivider: {
    height: 1.5,
    backgroundColor: 'rgba(240, 236, 236, 0.8)',
    marginVertical: 14,
  },

  // ── Top 3 Filter Cards ──
  filterCardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 12,
  },
  filterCard: {
    flex: 1,
    backgroundColor: '#ECF9E8',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
    paddingVertical: 10,
    paddingHorizontal: 8,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCardActive: {
    borderColor: '#51A33D',
    backgroundColor: '#DEF4D7',
  },
  filterCardContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCardText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#273426',
    textAlign: 'center',
  },

  // ── 3 Action Buttons (Tạo yêu cầu mới) ──
  actionSectionContainer: {
    marginTop: 6,
    marginBottom: 12,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionCardPill: {
    flex: 1,
    backgroundColor: '#ECF9E8',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    height: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(81, 163, 61, 0.2)',
  },
  actionCardPillText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#333333',
    lineHeight: 16,
  },
  actionCardPillIcon: {
    width: 28,
    height: 28,
  },

  // ── Danh sách yêu cầu ──
  requestListHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#666666',
    marginBottom: 10,
  },
  requestList: {
    display: 'flex',
    flexDirection: 'column',
  },
  loadingBox: {
    paddingVertical: 30,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13.5,
    color: '#666666',
  },
  emptyBox: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13.5,
    color: '#888888',
  },
  requestItemCard: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(240, 236, 236, 0.8)',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  requestItemCardRejected: {
    backgroundColor: 'rgba(242, 240, 240, 0.5)',
    borderRadius: 6,
    paddingHorizontal: 8,
  },
  requestItemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  requestItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E1E1E',
  },
  requestItemDate: {
    fontSize: 12,
    color: '#888888',
  },
  requestItemBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  requestItemDesc: {
    flex: 1,
    fontSize: 12.5,
    color: '#666666',
    lineHeight: 16,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 14,
    alignSelf: 'flex-start',
    backgroundColor: '#E0E0E0',
  },
  statusBadgeApproved: {
    backgroundColor: '#51A33D',
  },
  statusBadgeRejected: {
    backgroundColor: '#E74C3C',
  },
  statusBadgePending: {
    backgroundColor: '#F3A8C4',
  },
  statusBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statusBadgeTextApproved: {
    color: '#FFFFFF',
  },
  statusBadgeTextRejected: {
    color: '#FFFFFF',
  },
  statusBadgeTextPending: {
    color: '#FFFFFF',
  },

  // ── Modals Common ──
  modalSafeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: 44,
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  formValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
    marginTop: 10,
    marginBottom: 6,
  },
  dateInput: {
    fontSize: 15,
    color: '#333333',
    fontWeight: '500',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingVertical: 4,
    minWidth: 100,
    textAlign: 'right',
  },
  reasonTextArea: {
    backgroundColor: 'rgba(236, 249, 232, 0.4)',
    borderWidth: 1.5,
    borderColor: 'rgba(81, 163, 61, 0.7)',
    borderRadius: 8,
    padding: 14,
    fontSize: 15,
    color: '#222222',
    textAlignVertical: 'top',
    minHeight: 120,
    marginBottom: 20,
  },
  submitBtn: {
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
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E1E1E',
  },

  // ── Shift Selector (Chọn ca của mình) ──
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

  // ── Shift Preview Box ──
  requesterShiftBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  avatarCol: {
    alignItems: 'center',
    width: 58,
    marginRight: 10,
  },
  avatarImg: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: '#000000',
    marginBottom: 3,
  },
  avatarName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333333',
    textAlign: 'center',
  },
  shiftCardMini: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniBar: {
    width: 3,
    height: 34,
    borderRadius: 3,
    backgroundColor: '#8DD9CC',
    marginRight: 12,
  },
  miniInfo: {
    flex: 1,
  },
  miniTime: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#222222',
  },
  miniLocation: {
    fontSize: 12,
    color: 'rgba(51, 51, 51, 0.7)',
    marginVertical: 2,
  },
  miniRoleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  miniRoleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#8DD9CC',
  },
  miniRoleText: {
    fontSize: 12.5,
    fontWeight: '500',
    color: 'rgba(51, 51, 51, 0.6)',
  },

  // ── Suggestion list ──
  suggestTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 10,
    marginTop: 12,
  },
  suggestList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    marginBottom: 16,
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

  // ── Warning Note ──
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

  // ── Detail Modal Overlay (Image 5) ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  detailModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    width: '100%',
    maxWidth: 380,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  detailCloseBtn: {
    position: 'absolute',
    right: 14,
    top: 14,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  detailHeaderCenter: {
    alignItems: 'center',
    marginBottom: 16,
  },
  detailAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1.5,
    borderColor: '#000000',
    marginBottom: 8,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E1E1E',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555555',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222222',
  },
  detailSectionHeading: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555555',
    marginTop: 10,
    marginBottom: 6,
  },
  detailReasonBox: {
    backgroundColor: '#F9FBF8',
    borderWidth: 1,
    borderColor: 'rgba(81, 163, 61, 0.4)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 18,
    minHeight: 60,
  },
  detailReasonText: {
    fontSize: 13.5,
    color: '#333333',
    lineHeight: 18,
  },
  detailStatusBadge: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E0E0E0',
  },
  detailStatusBadgeApproved: {
    backgroundColor: '#ECF9E8',
    borderWidth: 1,
    borderColor: '#51A33D',
  },
  detailStatusBadgeRejected: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  detailStatusBadgePending: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  detailStatusBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333333',
  },
  detailStatusBadgeTextApproved: {
    color: '#2E7D32',
  },
  detailStatusBadgeTextRejected: {
    color: '#991B1B',
  },
  detailStatusBadgeTextPending: {
    color: '#92400E',
  },

  // ── Loading ──
  loadingBox: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 13.5,
    color: '#888888',
  },

  // ── Leave Balance Card ──
  balanceCard: {
    backgroundColor: '#F0FDF4',
    borderColor: 'rgba(34, 197, 94, 0.3)',
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    shadowColor: '#22c55e',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  balanceHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  balanceTitleWrap: {
    flex: 1,
  },
  balanceCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#14532D',
  },
  balanceCardSub: {
    fontSize: 12,
    color: '#4B5563',
    marginTop: 2,
  },
  balanceRemainingPill: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  balanceRemainingNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: '#15803D',
  },
  balanceRemainingLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#166534',
    marginTop: -2,
  },
  balanceMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  balanceMetricItem: {
    alignItems: 'center',
    flex: 1,
  },
  balanceMetricValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
  },
  balanceMetricLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  balanceMetricDivider: {
    width: 1,
    height: 22,
    backgroundColor: '#E2E8F0',
  },

  // ── Leave Type Selector Pills ──
  leaveTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  leaveTypePill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  leaveTypePillActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#22C55E',
  },
  leaveTypePillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  leaveTypePillTextActive: {
    color: '#15803D',
    fontWeight: '700',
  },

  // ── Duration Notice ──
  leaveDurationNotice: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginVertical: 10,
  },
  leaveDurationNoticeText: {
    fontSize: 13.5,
    color: '#334155',
  },
  leaveBalanceNoticeSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },

  // ── Duration badge in list ──
  durationBadge: {
    backgroundColor: '#E0F2FE',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  durationBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0369A1',
  },

  // ── Rejected reason boxes ──
  rejectedReasonBox: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 6,
    padding: 6,
    marginTop: 6,
  },
  rejectedReasonText: {
    fontSize: 12,
    color: '#B91C1C',
    fontWeight: '500',
  },
  detailRejectionBox: {
    backgroundColor: '#FEF2F2',
    borderColor: '#F87171',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  detailRejectionTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#991B1B',
    marginBottom: 2,
  },
  detailRejectionText: {
    fontSize: 13,
    color: '#B91C1C',
  },
});