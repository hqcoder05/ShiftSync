import { colors as uiColors } from '../theme/koreanPalette';
import { createAppStyles } from '../theme/appTheme';
import ThreeIllustration from '../components/ThreeIllustration';
import { ensureTouchTarget } from '../utils/touchTarget';
import { vietnamCalendarDate, calendarDate } from '../utils/vietnamTime';
import BackIcon from '../components/BackIcon';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useRef } from 'react';
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
  AppState,
} from 'react-native';
import { getMyRequests, createStaffRequest, toIsoDate, cancelSwapRequest, getRequestTimeline } from '../services/requestService';
import { getLeaveTypes, getMyLeaveBalance } from '../services/leaveService';
import { getMyShifts, getShiftsForStore } from '../services/shiftService';
import { getMyProfile, getMyStores } from '../services/profileService';
import { respondToSwapRequest } from '../services/swapService';
import { submitCheckedSwap } from '../services/scheduleConflictService';
import ScheduleConflictAlert from '../components/ScheduleConflictAlert';
import { showAlert } from '../utils/alert';
import useActionGuard from '../utils/useActionGuard';
import { getNetworkSnapshot, subscribeNetwork } from '../services/networkState';
import BottomNavbar, { useBottomNavbarPadding } from '../components/BottomNavbar';

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
  color: "#C4DDD3",
};

const formatTimelineTime = (value) => {
  if (!value || Number.isNaN(new Date(value).getTime())) return null;
  return new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
};

const RequestTimeline = ({ request }) => (
  <View style={styles.timeline}>
    <Text style={styles.detailSectionHeading}>Tiến trình yêu cầu</Text>
    {request?.isRealSwap && request.createdAt ? <Text style={styles.timelineCreated}>Đã gửi: {formatTimelineTime(request.createdAt)}</Text> : null}
    {getRequestTimeline(request).map((step, index, steps) => (
      <View key={index} style={styles.timelineRow}>
        <View style={styles.timelineTrack}>
          <View style={[styles.timelineDot, step.state === 'done' && styles.timelineDotDone, step.state === 'active' && styles.timelineDotActive, step.state === 'error' && styles.timelineDotError]}>
            <Text style={[styles.timelineDotText, step.state !== 'waiting' && styles.timelineDotTextFilled]}>{step.state === 'done' ? '✓' : step.state === 'error' ? '×' : index + 1}</Text>
          </View>
          {index < steps.length - 1 ? <View style={styles.timelineLine} /> : null}
        </View>
        <View style={styles.timelineBody}>
          <Text style={styles.timelineTitle}>{step.title}</Text>
          {step.actor ? <Text style={styles.timelineActor}>{step.actor}</Text> : null}
          {formatTimelineTime(step.at) ? <Text style={styles.timelineTime}>{formatTimelineTime(step.at)}</Text> : null}
          {step.note ? <Text style={styles.timelineNote}>{step.note}</Text> : null}
        </View>
      </View>
    ))}
  </View>
);

export default function RequestScreen({ navigation, route }) {
  const { runAction, busy } = useActionGuard();
  const loadInFlight = useRef(false);
  const bottomNavbarPadding = useBottomNavbarPadding();
  const [requests, setRequests] = useState([]);
  const [availableShifts, setAvailableShifts] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserName, setCurrentUserName] = useState('');
  const [currentUserAvatarId, setCurrentUserAvatarId] = useState(null);
  const [storeColleagues, setStoreColleagues] = useState([]);
  const [respondingSwapId, setRespondingSwapId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [requestMenuVisible, setRequestMenuVisible] = useState(false);
  const [filterStatus, setFilterStatus] = useState(null); // null | 'APPROVED' | 'PENDING' | 'REJECTED'

  // ── Leave Types & Leave Balance (Backend Source of Truth) ──
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loadingLeaveTypes, setLoadingLeaveTypes] = useState(false);
  const [leaveTypesError, setLeaveTypesError] = useState(null);
  const [selectedLeaveType, setSelectedLeaveType] = useState('');
  const [leaveBalance, setLeaveBalance] = useState(null);

  // ── Custom Toast / Thông báo đẹp ──
  const [toastMessage, setToastMessage] = useState(null);

  // ── ✈️ 3D Paper Plane launch trigger ──
  const [planeLaunched, setPlaneLaunched] = useState(false);

  const triggerLaunchPlane = () => {
    setPlaneLaunched(false);
    setTimeout(() => {
      setPlaneLaunched(true);
      setTimeout(() => setPlaneLaunched(false), 2600);
    }, 40);
  };

  // ── Modal States ──
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  const [leaveModalVisible, setLeaveModalVisible] = useState(false);
  const [swapModalVisible, setSwapModalVisible] = useState(false);
  const [absentModalVisible, setAbsentModalVisible] = useState(false);

  const today = vietnamCalendarDate();
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
  const [scheduleConflict, setScheduleConflict] = useState(null);
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
    const refresh = () => {
      if (navigation?.isFocused?.() !== false && AppState.currentState === 'active' && getNetworkSnapshot().online) {
        loadData({ background: true });
      }
    };
    const timer = setInterval(refresh, 15000);
    const stopNetwork = subscribeNetwork(refresh);
    const appState = AppState.addEventListener('change', refresh);
    return () => { unsub?.(); clearInterval(timer); stopNetwork(); appState.remove(); };
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

  const fetchLeaveTypesData = async (targetStoreId) => {
    const sId = targetStoreId || activeStoreId;
    if (!sId) return;
    try {
      setLoadingLeaveTypes(true);
      setLeaveTypesError(null);
      const [typesRes, balRes] = await Promise.allSettled([
        getLeaveTypes(sId),
        getMyLeaveBalance(sId),
      ]);
      if (typesRes.status === 'fulfilled' && typesRes.value?.data) {
        const data = typesRes.value.data;
        setLeaveTypes(data);
        if (data.length > 0) {
          setSelectedLeaveType((prev) => {
            if (prev && data.some((t) => (t.code || t.name) === prev)) return prev;
            return data[0].code || data[0].name;
          });
        }
      } else {
        setLeaveTypesError('Không thể tải danh sách loại nghỉ. Vui lòng thử lại.');
      }
      if (balRes.status === 'fulfilled' && balRes.value?.data) {
        setLeaveBalance(balRes.value.data);
      }
    } catch (err) {
      console.log('Error fetching leave types/balance:', err);
      setLeaveTypesError('Không thể tải danh sách loại nghỉ. Vui lòng thử lại.');
    } finally {
      setLoadingLeaveTypes(false);
    }
  };

  const loadData = async ({ background = false } = {}) => {
    if (loadInFlight.current) return;
    loadInFlight.current = true;
    try {
      if (!background) setLoading(true);
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
        setCurrentUserId(activeUserId);

        try {
          const storesRes = await getMyStores(activeUserId).catch(() => null);
          const activeStore = storesRes?.data?.find((s) => s.status === 'ACTIVE');
          storeId = activeStore?.storeId || activeStore?.id || null;
          setActiveStoreId(storeId);
        } catch (e) {
          // ignore
        }
      } else {
        setCurrentUserId(null);
        setCurrentUserName('');
        setCurrentUserAvatarId(null);
        setActiveStoreId(null);
      }

      // Load real requests from Backend (LeaveRequests, Swaps, Adjustments)
      const reqList = await getMyRequests(storeId, activeUserId);
      setRequests(reqList || []);
      setSelectedRequest((current) => current ? reqList.find((item) => item.id === current.id) || current : null);

      // Load leave types and user balance
      if (storeId) {
        fetchLeaveTypesData(storeId);
      }

      if (shiftsRes.status === 'fulfilled' && Array.isArray(shiftsRes.value?.data)) {
        const mapped = shiftsRes.value.data.filter((s) => {
          const ownAssignment = s.shiftAssignments?.some((a) => String(a.staffId) === String(activeUserId));
          const ownDirectAssignment = String(s.staffId) === String(activeUserId);
          return activeUserId && storeId && (ownAssignment || ownDirectAssignment) && s.status === 'PUBLISHED' &&
            String(s.storeId) === String(storeId) && new Date(`${s.shiftDate}T${s.startTime}+07:00`).getTime() > Date.now();
        }).map((s, idx) => {
          const d = s.shiftDate ? calendarDate(s.shiftDate) : vietnamCalendarDate();
          const dow = ['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][d.getDay()];
          const dayStr = String(d.getDate()).padStart(2, '0');
          const monthStr = String(d.getMonth() + 1).padStart(2, '0');
          return {
            id: s.id || `shift-${idx}`,
            shiftId: s.id,
            staffId: activeUserId,
            storeId: s.storeId,
            shiftDate: s.shiftDate,
            dayLabel: `${dow} (${dayStr}/${monthStr})`,
            timeRange: `${String(s.startTime).slice(0, 5)} - ${String(s.endTime).slice(0, 5)}`,
            location: s.storeAddress || s.storeName || 'Chi nhánh phân công',
            role: s.skillName || s.requiredSkillName || 'Barista',
            color: "#C4DDD3",
          };
        });

        setAvailableShifts(mapped);
        setSelectedSwapShift((previous) => mapped.find((s) => s.id === (previous?.shiftId || previous?.id)) || mapped[0] || EMPTY_SHIFT);
        setSelectedAbsentShift((previous) => mapped.find((s) => s.id === (previous?.shiftId || previous?.id)) || mapped[0] || EMPTY_SHIFT);
      } else {
        setAvailableShifts([]);
        setSelectedSwapShift(EMPTY_SHIFT);
        setSelectedAbsentShift(EMPTY_SHIFT);
      }

      // Fetch colleagues from store
      if (storeId) {
        try {
          const storeShiftsRes = await getShiftsForStore(storeId).catch(() => null);
          if (storeShiftsRes?.data && Array.isArray(storeShiftsRes.data)) {
            const colleaguesMap = new Map();
            storeShiftsRes.data.forEach((s) => {
              if (s.status !== 'PUBLISHED' || new Date(`${s.shiftDate}T${s.startTime}+07:00`).getTime() <= Date.now()) return;
              const assignments = Array.isArray(s.shiftAssignments) && s.shiftAssignments.length > 0
                ? s.shiftAssignments
                : (s.staffId || s.assignedStaffId ? [{
                    staffId: s.staffId || s.assignedStaffId,
                    staffName: s.staffName || s.assignedStaffName,
                    avatarId: s.avatarId,
                    skillName: s.skillName,
                  }] : []);

              assignments.forEach((assign) => {
                const staffId = assign.staffId;
                const staffName = assign.staffName || '';
                const role = assign.skillName || s.skillName || s.requirements?.[0]?.skillName || 'Nhân viên';
                if (staffName && staffId && String(staffId) !== String(activeUserId) && staffName !== 'Chưa phân công') {
                  if (!colleaguesMap.has(staffId)) {
                    colleaguesMap.set(staffId, {
                      id: staffId,
                      staffId: staffId,
                      name: staffName,
                      role,
                      avatarId: assign.avatarId || s.avatarId,
                      shiftId: s.id,
                      shiftDate: s.shiftDate,
                      timeRange: `${String(s.startTime || '').slice(0, 5)} - ${String(s.endTime || '').slice(0, 5)}`,
                    });
                  }
                }
              });
            });
            const colleaguesList = Array.from(colleaguesMap.values());
            setStoreColleagues(colleaguesList);
            if (colleaguesList.length > 0) {
              setSelectedSwapStaff((prev) => {
                return colleaguesList.find((item) => String(item.staffId) === String(prev?.staffId || prev)) || colleaguesList[0];
              });
            } else {
              setSelectedSwapStaff('');
            }
          }
        } catch (e) {
          // ignore store fetch errors
        }
      } else {
        setStoreColleagues([]);
        setSelectedSwapStaff('');
      }
    } catch (e) {
      console.log('Error loading data:', e);
    } finally {
      loadInFlight.current = false;
      if (!background) setLoading(false);
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
    const submitted = await runAction('submit', async () => {
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

        setLeaveReason('');
        setLeaveError(null);
        showToast('Gửi thành công', 'Yêu cầu xin nghỉ phép đã được chuyển tới Quản lý');
        // ✈️ Phóng máy bay giấy 3D khi gửi yêu cầu thành công
        await loadRequests();
        return true;
      } catch (err) {
        const errMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Không thể gửi yêu cầu xin nghỉ';
        setLeaveError(errMsg);
        showToast('Thất bại', errMsg, 'error');
      } finally {
        setLoading(false);
      }
    });
    if (submitted) setLeaveModalVisible(false);
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

    const selectedStaffId = typeof selectedSwapStaff === 'object' ? selectedSwapStaff.staffId : selectedSwapStaff;
    const targetColleague = storeColleagues.find((colleague) => String(colleague.staffId) === String(selectedStaffId));

    const colleagueName = targetColleague?.name || (typeof selectedSwapStaff === 'string' ? selectedSwapStaff : 'Đồng nghiệp');
    const fromShiftId = selectedSwapShift?.shiftId || selectedSwapShift?.id;
    const toStaffId = targetColleague?.staffId || targetColleague?.id;
    const toShiftId = targetColleague?.shiftId;
    if (!availableShifts.some((shift) => shift.id === fromShiftId && String(shift.staffId) === String(currentUserId)) || !toStaffId || !toShiftId) {
      setSwapError('Chỉ được đổi ca sắp tới của bạn với ca được phân công cho đồng nghiệp trong cửa hàng.');
      return;
    }

    showAlert(
      'Xác nhận gửi yêu cầu đổi ca',
      `Bạn có chắc chắn muốn gửi đề xuất hoán đổi ca làm ${selectedSwapShift.dayLabel} (${selectedSwapShift.timeRange}) với bạn ${colleagueName}?\n\nĐồng nghiệp sẽ nhận được thông báo để xác nhận trước khi Quản lý duyệt chính thức.`,
      [
        { text: 'Kiểm tra lại', style: 'cancel' },
        {
          text: 'Xác nhận gửi ngay',
          style: 'default',
          onPress: async () => {
            const submitted = await runAction('submit', async () => {
              try {
                setLoading(true);
                const checked = await submitCheckedSwap({ userId: currentUserId, storeId: activeStoreId, fromShiftId, toStaffId, toShiftId });
                if (checked.conflicts.length) {
                  setScheduleConflict(checked);
                  return false;
                }

                setSwapError(null);
                showToast('Gửi thành công', `Đã gửi yêu cầu đổi ca ${selectedSwapShift.dayLabel} với ${colleagueName}`);
                // ✈️ Phóng máy bay giấy 3D khi gửi yêu cầu thành công
                await loadRequests();
                return true;
              } catch (err) {
                const errMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Không thể gửi yêu cầu đổi ca';
                setSwapError(errMsg);
                showToast('Thất bại', errMsg, 'error');
              } finally {
                setLoading(false);
              }
            });
            if (submitted) setSwapModalVisible(false);
          },
        },
      ]
    );
  };

  // ── Submit Xin vắng (Image 4) ──
  const handleSubmitAbsent = async () => {
    const submitted = await runAction('submit', async () => {
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
      if (!availableShifts.some((shift) => shift.id === (selectedAbsentShift.shiftId || selectedAbsentShift.id) && String(shift.staffId) === String(currentUserId))) {
        setAbsentError('Vui lòng chọn ca sắp tới được phân công cho bạn.');
        return;
      }

      try {
        setLoading(true);
        await createStaffRequest({
          type: 'ABSENT',
          typeCategory: 'absence',
          requestType: 'Yêu cầu xin vắng',
          startDate: selectedAbsentShift.shiftDate,
          endDate: selectedAbsentShift.shiftDate,
          requesterName: currentUserName || 'Nhân viên',
          shiftInfo: `${selectedAbsentShift.dayLabel} ${selectedAbsentShift.timeRange} (${selectedAbsentShift.role})`,
          reason: absentReason.trim(),
          content: `Xin vắng ca làm: ${selectedAbsentShift.dayLabel} (${selectedAbsentShift.timeRange}).\nLý do: ${absentReason.trim()}`,
        }, selectedAbsentShift.storeId || activeStoreId);

        setAbsentReason('');
        setAbsentError(null);
        showToast('Gửi thành công', `Đã gửi yêu cầu xin vắng ca ${selectedAbsentShift.dayLabel} tới Quản lý`);
        // ✈️ Phóng máy bay giấy 3D khi gửi yêu cầu thành công
        await loadRequests();
        return true;
      } catch (err) {
        const errMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Không thể gửi yêu cầu xin vắng';
        setAbsentError(errMsg);
        showToast('Thất bại', errMsg, 'error');
      } finally {
        setLoading(false);
      }
    });
    if (submitted) setAbsentModalVisible(false);
  };

  const filteredRequests = filterStatus
    ? requests.filter(r => r.status === filterStatus)
    : requests;

  const incomingSwaps = requests.filter((r) => {
    if (!r.isRealSwap || r.status !== 'PENDING' || r.employeeAccepted) return false;
    const isTargetUser = currentUserId && String(r.toStaffId) === String(currentUserId);
    return isTargetUser;
  });

  const handleRespondSwap = async (swapItem, accept) => {
    if (!currentUserId || String(swapItem.toStaffId) !== String(currentUserId) || swapItem.status !== 'PENDING' || swapItem.employeeAccepted) return;
    showAlert(
      accept ? 'Xác nhận đồng ý nhận ca đổi' : 'Từ chối yêu cầu đổi ca',
      accept
        ? `Bạn có chắc chắn đồng ý nhận ca (${swapItem.fromShiftDate} ${swapItem.fromShiftStartTime?.slice(0, 5)} - ${swapItem.fromShiftEndTime?.slice(0, 5)}) và nhượng ca của bạn cho ${swapItem.fromStaffName}?\n\nYêu cầu sẽ được gửi tới Quản lý để phê duyệt chính thức.`
        : `Bạn có chắc chắn muốn từ chối yêu cầu đổi ca từ ${swapItem.fromStaffName}?`,
      [
        { text: 'Hủy bỏ', style: 'cancel' },
        {
          text: accept ? 'Đồng ý nhận ca' : 'Từ chối',
          style: accept ? 'default' : 'destructive',
          onPress: async () => {
            const responded = await runAction(`swap:${swapItem.id}`, async () => {
              try {
                setRespondingSwapId(swapItem.id);
                await respondToSwapRequest(swapItem.id, { accept });
                if (accept) {
                  showToast('Thành công', `Bạn đã đồng ý đổi ca với ${swapItem.fromStaffName}. Đang chờ Quản lý phê duyệt.`);
                } else {
                  showToast('Đã từ chối', `Bạn đã từ chối yêu cầu đổi ca của ${swapItem.fromStaffName}.`);
                }

                await loadRequests();
                return true;
              } catch (err) {
                const msg = err.response?.data?.message || err.message || 'Không thể phản hồi yêu cầu đổi ca';
                showToast('Lỗi', msg, 'error');
              } finally {
                setRespondingSwapId(null);
              }
            });
            if (responded) setDetailModalVisible(false);
          },
        },
      ]
    );
  };

  const handleCancelSwap = (request) => {
    if (!currentUserId || String(request.fromStaffId) !== String(currentUserId) || request.status !== 'PENDING') return;
    showAlert('Hủy yêu cầu đổi ca', 'Lịch làm hiện tại sẽ được giữ nguyên. Bạn muốn hủy yêu cầu này?', [
      { text: 'Quay lại', style: 'cancel' },
      {
        text: 'Hủy yêu cầu', style: 'destructive', onPress: () => runAction(`swap:${request.id}`, async () => {
          try {
            await cancelSwapRequest(request.id);
            await loadRequests({ background: true });
            showToast('Đã hủy', 'Yêu cầu đổi ca đã được hủy.');
          } catch (err) {
            showToast('Không thể hủy', err.response?.data?.message || err.message, 'error');
          }
        }),
      },
    ]);
  };

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
      <StatusBar barStyle="dark-content" backgroundColor={uiColors.surface} />

      {/* ── CUSTOM TOAST NOTIFICATION ─────────────────────────── */}
      {renderToast()}

      <View style={styles.timeOffHeader}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Quay lại" onPress={() => navigation.goBack()} style={ensureTouchTarget(styles.timeOffHeaderButton)}><BackIcon /></TouchableOpacity>
        <Text accessibilityRole="header" style={styles.timeOffHeaderTitle}>Nghỉ phép & yêu cầu</Text>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Tạo yêu cầu mới" onPress={() => setRequestMenuVisible(true)} style={ensureTouchTarget(styles.timeOffHeaderButton)}><Ionicons accessible={false} name="add" size={27} color="#404B57" /></TouchableOpacity>
      </View>
      <ScrollView
        style={styles.page}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: bottomNavbarPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.requestCompanion}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.companionTitle}>Theo dõi yêu cầu</Text>
            <Text style={styles.companionBody}>Gửi yêu cầu và xem phản hồi từ quản lý.</Text>
          </View>
          <ThreeIllustration kind="rabbit" size={128} animated interactive />
        </View>
        {leaveBalance && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timeOffBalances}>
          {[
            ['Phép năm còn lại', leaveBalance.remainingDays, 'Có thể sử dụng', uiColors.mint],
            ['Đã sử dụng', leaveBalance.usedDays, leaveBalance.year ? `Năm ${leaveBalance.year}` : 'Trong năm', '#FFFFFF'],
            ['Đang chờ duyệt', leaveBalance.pendingDays, 'Yêu cầu đang chờ', uiColors.butter],
          ].map(([label, value, caption, backgroundColor]) => <View key={label} style={[styles.timeOffBalanceCard, { backgroundColor }]}><Text style={styles.timeOffBalanceLabel}>{label}</Text><Text style={styles.timeOffBalanceValue}>{value ?? '—'} <Text style={{ fontSize: 12, fontWeight: '400' }}>ngày</Text></Text><Text style={styles.timeOffBalanceCaption}>{caption}</Text></View>)}
        </ScrollView>}
        <View style={styles.timeOffFilters}>{[[null, 'Tất cả'], ['PENDING', 'Chờ duyệt'], ['APPROVED', 'Đã duyệt'], ['REJECTED', 'Từ chối']].map(([value, label]) => <TouchableOpacity key={label} onPress={() => setFilterStatus(value)} accessibilityRole="button" accessibilityState={{ selected: filterStatus === value }} aria-selected={filterStatus === value} style={ensureTouchTarget([styles.timeOffFilter, filterStatus === value && styles.timeOffFilterActive])}><Text style={[styles.timeOffFilterText, filterStatus === value && { color: uiColors.ink }]}>{label}</Text></TouchableOpacity>)}</View>

        {/* ── ⚡ YÊU CẦU ĐỔI CA GỬI ĐẾN BẠN (GIAO DIỆN NHẬN CA ĐỔI) ── */}
        {incomingSwaps.length > 0 && (
          <View style={styles.incomingSwapSection}>
            <View style={styles.incomingSectionHeader}>
              <View style={styles.incomingBadge}>
                <Text style={styles.incomingBadgeText}>⚡ CẦN BẠN PHẢN HỒI ({incomingSwaps.length})</Text>
              </View>
              <Text style={styles.incomingSectionTitle}>Yêu cầu đổi ca gửi đến bạn</Text>
              <Text style={styles.incomingSectionSub}>
                Đồng nghiệp muốn đổi ca làm việc. Vui lòng kiểm tra và xác nhận đồng ý hoặc từ chối.
              </Text>
            </View>

            {incomingSwaps.map((swap) => {
              const fromTime = `${String(swap.fromShiftStartTime || '').slice(0, 5)} - ${String(swap.fromShiftEndTime || '').slice(0, 5)}`;
              const toTime = `${String(swap.toShiftStartTime || '').slice(0, 5)} - ${String(swap.toShiftEndTime || '').slice(0, 5)}`;
              const isResponding = respondingSwapId === swap.id || !!busy[`swap:${swap.id}`];

              return (
                <View key={swap.id} style={styles.incomingSwapCard}>
                  {/* Header: Người gửi */}
                  <View style={styles.incomingCardTop}>
                    <Image
                      source={getStaffAvatarSource(swap.fromStaffName)}
                      style={styles.incomingSenderAvatar}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.incomingSenderName}>{swap.fromStaffName}</Text>
                      <Text style={styles.incomingSenderRole}>Đồng nghiệp đề xuất đổi ca</Text>
                    </View>
                    <View style={styles.pendingActionPill}>
                      <Text style={styles.pendingActionText}>Chờ bạn duyệt</Text>
                    </View>
                  </View>

                  {/* Chi tiết ca hoán đổi */}
                  <View style={styles.swapComparisonBox}>
                    <View style={styles.swapShiftRow}>
                      <View style={[styles.swapShiftDot, { backgroundColor: "#B38D49" }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.swapShiftLabel}>Ca của bạn (sẽ nhượng lại):</Text>
                        <Text style={styles.swapShiftValue}>
                          {swap.toShiftDate} • {toTime}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.swapArrowWrap}>
                      <Text style={styles.swapArrowText}>⇅</Text>
                    </View>

                    <View style={styles.swapShiftRow}>
                      <View style={[styles.swapShiftDot, { backgroundColor: uiColors.success }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.swapShiftLabel}>Ca bạn sẽ nhận thay:</Text>
                        <Text style={[styles.swapShiftValue, { color: uiColors.successStrong, fontWeight: '700' }]}>
                          {swap.fromShiftDate} • {fromTime}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Nút hành động Đồng ý / Từ chối */}
                  <View style={styles.incomingActionsRow}>
                    <TouchableOpacity accessibilityRole="button"
                      style={ensureTouchTarget(styles.declineBtn)}
                      onPress={() => handleRespondSwap(swap, false)}
                      disabled={isResponding}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.declineBtnText}>Từ chối</Text>
                    </TouchableOpacity>

                    <TouchableOpacity accessibilityRole="button"
                      style={ensureTouchTarget(styles.acceptBtn)}
                      onPress={() => handleRespondSwap(swap, true)}
                      disabled={isResponding}
                      activeOpacity={0.85}
                    >
                      {isResponding ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Text style={styles.acceptBtnIcon}>✓</Text>
                          <Text style={styles.acceptBtnText}>Đồng ý nhận ca</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ── 4. Danh sách Yêu cầu ── */}
        <Text style={styles.timeOffListCaption}>YÊU CẦU CỦA BẠN</Text>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={uiColors.primaryStrong} />
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
                const isCancelled = item.status === 'CANCELLED';

                const statusLabel = item.statusLabel || (isApproved ? 'Đã duyệt' : isRejected ? 'Từ chối' : item.status === 'CANCELLED' ? 'Đã hủy' : 'Chờ duyệt');

                let typeTitle = 'Xin nghỉ phép';
                if (item.type === 'SWAP') typeTitle = 'Đổi ca';
                else if (item.type === 'ABSENT') typeTitle = 'Vắng mặt';
                else if (item.typeLabel) typeTitle = item.typeLabel;

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={ensureTouchTarget(styles.timeOffRow)}
                    onPress={() => {
                      setSelectedRequest(item);
                      setDetailModalVisible(true);
                    }}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel={`Xem chi tiết ${typeTitle} ${item.date || item.startDate || ''}`}
                  >
                    <View style={styles.timeOffRowCopy}>
                      <Text style={styles.timeOffRowDate}>{item.startDate ? `${item.startDate.slice(8, 10)}/${item.startDate.slice(5, 7)}${item.endDate && item.endDate !== item.startDate ? ` – ${item.endDate.slice(8, 10)}/${item.endDate.slice(5, 7)}` : ''}` : item.fromShiftDate ? `${item.fromShiftDate.slice(8, 10)}/${item.fromShiftDate.slice(5, 7)}` : item.date || 'Yêu cầu mới'}</Text>
                      <Text numberOfLines={2} style={styles.timeOffRowType}>{item.type === 'SWAP' ? 'Đổi ca làm việc' : item.type === 'ABSENT' ? 'Xin vắng mặt' : item.typeLabel || typeTitle}{item.requestedDays ? ` (${item.requestedDays} ngày)` : ''}</Text>
                    </View>
                    <View style={[styles.timeOffStatus, { backgroundColor: isApproved ? uiColors.mint : isRejected ? uiColors.dangerSoft : isCancelled ? uiColors.subtle : uiColors.line }]}><Text style={[styles.timeOffStatusText, { color: isApproved ? uiColors.successText : isRejected ? uiColors.dangerText : uiColors.muted }]}>{statusLabel}</Text></View>
                    <Ionicons accessible={false} name="chevron-forward" size={17} color="#9BA3A7" />
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      <Modal visible={requestMenuVisible} transparent animationType="fade" onRequestClose={() => setRequestMenuVisible(false)}>
        <View style={styles.timeOffMenuBackdrop}><View style={styles.timeOffMenu}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 14 }}><Text style={{ fontSize: 18, color: uiColors.ink, fontWeight: '500' }}>Tạo yêu cầu</Text><TouchableOpacity style={ensureTouchTarget()} accessibilityRole="button" accessibilityLabel="Đóng tạo yêu cầu" onPress={() => setRequestMenuVisible(false)}><Ionicons accessible={false} name="close" size={25} color={uiColors.muted} /></TouchableOpacity></View>
          {[
            ['Xin nghỉ phép', 'calendar-outline', () => setLeaveModalVisible(true)],
            ['Vắng mặt', 'person-remove-outline', () => setAbsentModalVisible(true)],
            ['Hỗ trợ đổi ca', 'swap-horizontal-outline', () => setSwapModalVisible(true)],
          ].map(([label, icon, action]) => <TouchableOpacity key={label} accessibilityRole="button" accessibilityLabel={label} onPress={() => { setRequestMenuVisible(false); action(); }} style={ensureTouchTarget(styles.timeOffMenuItem)}><View style={styles.timeOffMenuIcon}><Ionicons accessible={false} name={icon} size={21} color="#8B809D" /></View><Text style={{ color: "#404B57", fontSize: 15, flex: 1 }}>{label}</Text><Ionicons accessible={false} name="chevron-forward" size={17} color={uiColors.muted} /></TouchableOpacity>)}
        </View></View>
      </Modal>

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
              <TouchableOpacity accessibilityLabel="Đóng yêu cầu nghỉ phép" accessibilityRole="button"
                style={ensureTouchTarget(styles.closeBtn)}
                onPress={() => setLeaveModalVisible(false)}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Yêu cầu xin nghỉ</Text>
            </View>

            <View style={styles.headerDivider} />

            {/* Loại nghỉ phép */}
            <Text style={styles.sectionHeader}>Loại nghỉ phép</Text>
            {loadingLeaveTypes ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}>
                <ActivityIndicator size="small" color={uiColors.primaryStrong} style={{ marginRight: 8 }} />
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

            <Text style={styles.sectionHeader}>Thời gian</Text>

            <View style={styles.formRow}>
              <Text style={styles.formLabel}>Cả ngày</Text>
              <Switch
                value={isAllDay}
                onValueChange={setIsAllDay}
                trackColor={{ false: uiColors.lineStrong, true: uiColors.orange }}
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
                ⏱ Số ngày xin nghỉ: <Text style={{ fontWeight: '800', color: uiColors.successText }}>{calcLeaveDuration(startDate, endDate)} ngày</Text>
              </Text>
              {selectedLeaveType === 'ANNUAL' && leaveBalance && (
                <Text style={styles.leaveBalanceNoticeSub}>
                  Quỹ phép năm còn: <Text style={{ fontWeight: '700' }}>{leaveBalance.remainingDays} ngày</Text>
                  {calcLeaveDuration(startDate, endDate) <= leaveBalance.remainingDays ? (
                    <Text style={{ color: uiColors.successText }}> (Hợp lệ)</Text>
                  ) : (
                    <Text style={{ color: uiColors.dangerText }}> (Vượt quá số ngày còn lại!)</Text>
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

            <TouchableOpacity accessibilityRole="button"
              style={ensureTouchTarget([styles.submitBtn, (loading || busy.submit) && styles.submitBtnDisabled])}
              onPress={handleSubmitLeave}
              disabled={loading || busy.submit}
              activeOpacity={0.8}
            >
              {(loading || busy.submit) ? (
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
        onRequestClose={() => scheduleConflict ? setScheduleConflict(null) : setSwapModalVisible(false)}
      >
        <SafeAreaView style={styles.modalSafeArea}>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <TouchableOpacity accessibilityLabel="Đóng yêu cầu đổi ca" accessibilityRole="button"
                style={ensureTouchTarget(styles.closeBtn)}
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
                {availableShifts.length === 0 ? (
                  <Text style={{ padding: 12, color: uiColors.muted, fontSize: 13, textAlign: 'center' }}>
                    Chưa có ca làm việc được phân công.
                  </Text>
                ) : (
                  availableShifts.map((shift) => {
                    const isSelected = selectedSwapShift.id === shift.id;
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
                  <Text style={{ fontSize: 13, color: uiColors.muted, fontStyle: 'italic' }}>Chưa có thông tin đồng nghiệp trong chi nhánh</Text>
                </View>
              ) : (
                storeColleagues.map((staff, idx) => {
                  const isSelected = (selectedSwapStaff && typeof selectedSwapStaff === 'object' && selectedSwapStaff.staffId === staff.staffId) || selectedSwapStaff === staff.name;

                  return (
                    <TouchableOpacity accessibilityLabel={`Chọn đồng nghiệp ${staff.name}, ${staff.role}`} accessibilityState={{ selected: isSelected }} aria-selected={isSelected} accessibilityRole="button"
                      key={idx}
                      style={ensureTouchTarget([styles.suggestItem, isSelected && styles.suggestItemSelected])}
                      onPress={() => {
                        setSelectedSwapStaff(staff);
                        showToast('Đã chọn đồng nghiệp', `${staff.name} • ${staff.role}`, 'info');
                      }}
                      activeOpacity={0.7}
                    >
                      <Image source={getStaffAvatarSource(staff.name, staff.avatarId)} style={styles.suggestAvatar} />
                      <View style={styles.suggestInfo}>
                        <Text style={styles.suggestName}>{staff.name}</Text>
                        <Text style={styles.suggestRole}>{staff.role}{staff.timeRange ? ` • ${staff.timeRange}` : ''}</Text>
                      </View>
                      {isSelected && (
                        <View style={styles.suggestCheckBadge}>
                          <Text style={styles.suggestCheckmark}>✓</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </View>

            {selectedSwapStaff ? (
              <View style={styles.selectedColleagueCard}>
                <View style={styles.sccHeader}>
                  <View style={styles.sccBadge}>
                    <Text style={styles.sccBadgeText}>✓ ĐÃ CHỌN ĐỒNG NGHIỆP ĐỔI CA</Text>
                  </View>
                  <Text style={styles.sccName}>
                    {typeof selectedSwapStaff === 'object' ? selectedSwapStaff.name : selectedSwapStaff}
                  </Text>
                </View>
                <View style={styles.sccExchangeRow}>
                  <View style={styles.sccBox}>
                    <Text style={styles.sccBoxLabel}>Ca của bạn (nhượng lại)</Text>
                    <Text style={styles.sccBoxTime}>{selectedSwapShift.dayLabel}</Text>
                    <Text style={styles.sccBoxSub}>{selectedSwapShift.timeRange}</Text>
                  </View>
                  <View style={styles.sccArrowWrap}>
                    <Text style={styles.sccArrowText}>⇄</Text>
                  </View>
                  <View style={styles.sccBox}>
                    <Text style={styles.sccBoxLabel}>Ca đồng nghiệp (bạn nhận)</Text>
                    <Text style={styles.sccBoxTime}>
                      {typeof selectedSwapStaff === 'object' ? selectedSwapStaff.name : selectedSwapStaff}
                    </Text>
                    <Text style={[styles.sccBoxSub, { color: uiColors.successStrong, fontWeight: '600' }]}>
                      {typeof selectedSwapStaff === 'object' && selectedSwapStaff.timeRange
                        ? `${selectedSwapStaff.shiftDate ? selectedSwapStaff.shiftDate + ' • ' : ''}${selectedSwapStaff.timeRange}`
                        : 'Cần đồng nghiệp duyệt'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.sccNoticeText}>
                  ℹ️ Trạng thái: Sau khi gửi, yêu cầu sẽ là "Chờ đồng nghiệp đồng ý". Sau khi {typeof selectedSwapStaff === 'object' ? selectedSwapStaff.name : selectedSwapStaff} chấp thuận, Quản lý mới duyệt chính thức.
                </Text>
              </View>
            ) : null}

            {swapError && (
              <View style={styles.modalErrorBox}>
                <Text style={styles.modalErrorIcon}>⚠️</Text>
                <Text style={styles.modalErrorText}>{swapError}</Text>
              </View>
            )}

            <TouchableOpacity accessibilityRole="button"
              style={ensureTouchTarget([styles.submitBtn, (loading || busy.submit) && styles.submitBtnDisabled])}
              onPress={handleSubmitSwap}
              disabled={loading || busy.submit}
              activeOpacity={0.8}
            >
              {(loading || busy.submit) ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Gửi yêu cầu</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
          {renderToast()}
          <ScheduleConflictAlert embedded conflict={scheduleConflict} onClose={() => setScheduleConflict(null)} />
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
              <TouchableOpacity accessibilityLabel="Đóng yêu cầu xin vắng" accessibilityRole="button"
                style={ensureTouchTarget(styles.closeBtn)}
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
                {availableShifts.length === 0 ? (
                  <Text style={{ padding: 12, color: uiColors.muted, fontSize: 13, textAlign: 'center' }}>
                    Chưa có ca làm việc được phân công.
                  </Text>
                ) : (
                  availableShifts.map((shift) => {
                    const isSelected = selectedAbsentShift.id === shift.id;
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

            <TouchableOpacity accessibilityRole="button"
              style={ensureTouchTarget([styles.submitBtn, (loading || busy.submit) && styles.submitBtnDisabled])}
              onPress={handleSubmitAbsent}
              disabled={loading || busy.submit}
              activeOpacity={0.8}
            >
              {(loading || busy.submit) ? (
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
              style={ensureTouchTarget(styles.detailCloseBtn)}
              onPress={() => setDetailModalVisible(false)}
              accessibilityRole="button"
              accessibilityLabel="Đóng chi tiết yêu cầu"
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>

            <ScrollView style={styles.detailScroll} showsVerticalScrollIndicator={false}>
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
                <Text style={[styles.detailValue, { color: uiColors.successText, fontWeight: '800' }]}>
                  {selectedRequest.requestedDays} ngày
                </Text>
              </View>
            ) : null}

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{selectedRequest?.isRealSwap ? 'Ca đề xuất:' : 'Ngày bắt đầu:'}</Text>
              <Text style={styles.detailValue}>{selectedRequest?.startDate || selectedRequest?.date}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{selectedRequest?.isRealSwap ? 'Ca đổi lại:' : 'Ngày kết thúc:'}</Text>
              <Text style={styles.detailValue}>{selectedRequest?.isRealSwap
                ? `${selectedRequest.toShiftDate || ''} (${String(selectedRequest.toShiftStartTime || '').slice(0, 5)} - ${String(selectedRequest.toShiftEndTime || '').slice(0, 5)})`
                : selectedRequest?.endDate || selectedRequest?.date}</Text>
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
                Trạng thái: {selectedRequest?.statusLabel || 'Đang chờ duyệt'}
              </Text>
            </View>

            <RequestTimeline request={selectedRequest} />

            {/* Nếu là yêu cầu đổi ca gửi đến bạn đang chờ phản hồi */}
            {selectedRequest?.isRealSwap &&
              selectedRequest?.status === 'PENDING' &&
              !selectedRequest?.employeeAccepted &&
              (currentUserId && String(selectedRequest.toStaffId) === String(currentUserId)) && (
                <View style={styles.detailModalActionsRow}>
                  <TouchableOpacity accessibilityRole="button"
                    style={ensureTouchTarget(styles.detailDeclineBtn)}
                    onPress={() => handleRespondSwap(selectedRequest, false)}
                    disabled={respondingSwapId === selectedRequest.id || !!busy[`swap:${selectedRequest.id}`]}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.detailDeclineBtnText}>Từ chối</Text>
                  </TouchableOpacity>

                  <TouchableOpacity accessibilityRole="button"
                    style={ensureTouchTarget(styles.detailAcceptBtn)}
                    onPress={() => handleRespondSwap(selectedRequest, true)}
                    disabled={respondingSwapId === selectedRequest.id || !!busy[`swap:${selectedRequest.id}`]}
                    activeOpacity={0.85}
                  >
                    {(respondingSwapId === selectedRequest.id || busy[`swap:${selectedRequest.id}`]) ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.detailAcceptBtnText}>✓ Đồng ý nhận ca</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            {selectedRequest?.isRealSwap && selectedRequest.status === 'PENDING' && currentUserId && String(selectedRequest.fromStaffId) === String(currentUserId) ? (
              <TouchableOpacity style={ensureTouchTarget(styles.cancelSwapButton)} disabled={!!busy[`swap:${selectedRequest.id}`]} onPress={() => handleCancelSwap(selectedRequest)} accessibilityRole="button">
                {busy[`swap:${selectedRequest.id}`] ? <ActivityIndicator color={uiColors.dangerStrong} size="small" /> : <Text style={styles.cancelSwapText}>Hủy yêu cầu đổi ca</Text>}
              </TouchableOpacity>
            ) : null}
            </ScrollView>
          </View>
          {renderToast()}
        </View>
      </Modal>
      <BottomNavbar navigation={navigation} activeRoute="Request" />
    </SafeAreaView>
  );
}

// ── StyleSheet ──────────────────────────────────────────────────────────────
const styles = createAppStyles({
  requestCompanion: { marginHorizontal: 16, marginTop: 14, marginBottom: 4, paddingLeft: 16, paddingRight: 6, borderRadius: 18, backgroundColor: uiColors.canvas, flexDirection: 'row', alignItems: 'center', gap: 10 },
  companionTitle: { color: uiColors.ink, fontSize: 16, lineHeight: 22, fontWeight: '600' },
  companionBody: { color: uiColors.muted, fontSize: 12, lineHeight: 18, marginTop: 5 },
  timeOffHeader: { height: 58, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: uiColors.line, backgroundColor: uiColors.surface },
  timeOffHeaderButton: { width: 50, height: 52, alignItems: 'center', justifyContent: 'center' },
  timeOffHeaderTitle: { flex: 1, color: uiColors.ink, fontSize: 17, fontWeight: '500', textAlign: 'center' },
  timeOffBalances: { padding: 16, gap: 10 },
  timeOffBalanceCard: { width: 145, padding: 14, borderWidth: 1, borderColor: uiColors.subtle, borderRadius: 10, shadowColor: uiColors.ink, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 1 },
  timeOffBalanceLabel: { color: uiColors.muted, fontSize: 11 }, timeOffBalanceValue: { color: "#404B57", fontSize: 20, fontWeight: '500', marginTop: 12 }, timeOffBalanceCaption: { color: uiColors.muted, fontSize: 10, marginTop: 7 },
  timeOffFilters: { flexDirection: 'row', gap: 5, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: uiColors.line },
  timeOffFilter: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 9, borderRadius: 7 }, timeOffFilterActive: { backgroundColor: uiColors.subtle }, timeOffFilterText: { color: uiColors.muted, fontSize: 11 },
  timeOffListCaption: { fontSize: 10, letterSpacing: 0.7, color: uiColors.muted, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 6 },
  timeOffRow: { minHeight: 83, paddingHorizontal: 20, paddingVertical: 18, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: uiColors.line, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: uiColors.surface },
  timeOffRowCopy: { flex: 1, minWidth: 0 }, timeOffRowDate: { color: uiColors.ink, fontSize: 14, fontWeight: '500' }, timeOffRowType: { color: uiColors.muted, fontSize: 11, marginTop: 6, lineHeight: 17 },
  timeOffStatus: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4, maxWidth: '39%' }, timeOffStatusText: { fontSize: 9, fontWeight: '500', textTransform: 'uppercase', textAlign: 'center' },
  timeOffMenuBackdrop: { flex: 1, backgroundColor: "#28313B44", alignItems: 'center', justifyContent: 'center', padding: 24 }, timeOffMenu: { backgroundColor: uiColors.surface, width: '100%', maxWidth: 400, borderRadius: 18, padding: 20 }, timeOffMenuItem: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 15, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: uiColors.line }, timeOffMenuIcon: { width: 39, height: 39, borderRadius: 12, backgroundColor: uiColors.lavender, alignItems: 'center', justifyContent: 'center' },
  safeArea: {
    flex: 1,
    backgroundColor: uiColors.surface,
  },
  page: {
    flex: 1,
    backgroundColor: uiColors.surface,
  },
  contentContainer: {
    paddingHorizontal: 0,
    paddingTop: 0,
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

  // ── Header ──
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 12,

    minHeight: 48,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 0,
    backgroundColor: uiColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
    borderColor: uiColors.line,
  },
  closeBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: "#404B57",
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: uiColors.ink,
  },

  // ── Hero 3D Card (Trạm tiếp nhận yêu cầu với máy bay 3D) ──

  headerDivider: {
    height: 1,
    backgroundColor: uiColors.line,
    marginVertical: 16,
  },

  // ── Top 3 Filter Cards ──
  filterCardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 0,
    marginBottom: 12,

    backgroundColor: uiColors.subtle,
    borderRadius: 6,
    padding: 3,
  },
  filterCard: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: 4,
    borderWidth: 0,
    borderColor: 'transparent',
    paddingVertical: 8,
    paddingHorizontal: 4,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCardActive: {
    borderColor: uiColors.orange,
    backgroundColor: uiColors.orange,
  },
  filterCardContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCardText: {
    fontSize: 12,
    fontWeight: '500',
    color: uiColors.secondary,
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
    backgroundColor: uiColors.surface,
    borderRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 10,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: uiColors.line,
  },
  actionCardPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: uiColors.ink,
    lineHeight: 16,
  },
  actionCardPillIcon: {
    width: 28,
    height: 28,
  },

  // ── Danh sách yêu cầu ──
  requestListHeading: {
    fontSize: 15,
    fontWeight: '600',
    color: uiColors.ink,
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
    color: uiColors.secondary,
  },
  emptyBox: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13.5,
    color: uiColors.muted,
  },
  requestItemCard: {
    backgroundColor: uiColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: uiColors.line,
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  requestItemCardRejected: {
    backgroundColor: "rgba(240, 239, 235, 0.5)",
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
    color: uiColors.ink,
  },
  requestItemDate: {
    fontSize: 12,
    color: uiColors.muted,
    maxWidth: '58%',
    flexShrink: 1,
    textAlign: 'right',
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
    color: uiColors.secondary,
    lineHeight: 16,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 14,
    alignSelf: 'flex-start',
    backgroundColor: uiColors.lineStrong,
    maxWidth: '55%',
    flexShrink: 1,
  },
  statusBadgeApproved: {
    backgroundColor: uiColors.success,
  },
  statusBadgeRejected: {
    backgroundColor: uiColors.danger,
  },
  statusBadgePending: {
    backgroundColor: uiColors.butter,
  },
  statusBadgeCancelled: { backgroundColor: uiColors.canvas },
  statusBadgeTextCancelled: { color: uiColors.muted },
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
    color: uiColors.warningText,
  },

  // ── Modals Common ──
  modalSafeArea: {
    flex: 1,
    backgroundColor: uiColors.surface,
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
    color: uiColors.ink,
  },
  formValue: {
    fontSize: 16,
    fontWeight: '500',
    color: uiColors.ink,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: uiColors.secondary,
    marginTop: 10,
    marginBottom: 6,
  },
  dateInput: {
    fontSize: 15,
    color: uiColors.ink,
    fontWeight: '500',
    borderBottomWidth: 1,
    borderBottomColor: uiColors.lineStrong,
    paddingVertical: 4,
    minWidth: 100,
    textAlign: 'right',

    backgroundColor: uiColors.surface,
  },
  reasonTextArea: {
    backgroundColor: uiColors.surface,
    borderWidth: 1,
    borderColor: uiColors.lineStrong,
    borderRadius: 4,
    padding: 14,
    fontSize: 15,
    color: uiColors.ink,
    textAlignVertical: 'top',
    minHeight: 120,
    marginBottom: 20,
  },
  submitBtn: {
    backgroundColor: uiColors.orange,
    borderRadius: 4,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    shadowColor: uiColors.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0,
    shadowRadius: 2,
    elevation: 0,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
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
    color: uiColors.ink,
  },
  changeShiftBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    backgroundColor: uiColors.canvas,
  },
  changeShiftBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: uiColors.primaryStrong,
  },
  shiftPickerDropdown: {
    backgroundColor: uiColors.surface,
    borderWidth: 1,
    borderColor: uiColors.line,
    borderRadius: 4,
    padding: 6,
    marginBottom: 12,
  },
  shiftPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 3,
  },
  shiftPickerItemSelected: {
    backgroundColor: uiColors.peach,
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
    color: uiColors.primaryStrong,
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
    borderColor: uiColors.ink,
    marginBottom: 3,
  },
  avatarName: {
    fontSize: 12,
    fontWeight: '600',
    color: uiColors.ink,
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
    backgroundColor: "#C4DDD3",
    marginRight: 12,
  },
  miniInfo: {
    flex: 1,
  },
  miniTime: {
    fontSize: 14.5,
    fontWeight: '700',
    color: uiColors.ink,
  },
  miniLocation: {
    fontSize: 12,
    color: "rgba(40, 49, 59, 0.7)",
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
    backgroundColor: "#C4DDD3",
  },
  miniRoleText: {
    fontSize: 12.5,
    fontWeight: '500',
    color: "rgba(40, 49, 59, 0.6)",
  },

  // ── Suggestion list ──
  suggestTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: uiColors.secondary,
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
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 4,
    backgroundColor: uiColors.surface,
    borderWidth: 1,
    borderColor: uiColors.line,
    shadowColor: uiColors.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0,
    shadowRadius: 3,
    elevation: 0,
  },
  suggestItemSelected: {
    backgroundColor: uiColors.peach,
    borderColor: uiColors.orange,
    shadowColor: uiColors.info,
    shadowOpacity: 0,
    shadowRadius: 6,
    elevation: 0,
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
    fontSize: 12.5,
    color: uiColors.muted,
    marginTop: 2,
  },
  suggestCheckBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: uiColors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestCheckmark: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // ── Selected Colleague Preview Card ──
  selectedColleagueCard: {
    backgroundColor: uiColors.canvas,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: uiColors.line,
    padding: 14,
    marginBottom: 16,
    shadowColor: uiColors.info,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0,
    shadowRadius: 6,
    elevation: 0,

    borderStyle: 'solid',
  },
  sccHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: uiColors.line,
    paddingBottom: 8,
  },
  sccBadge: {
    backgroundColor: uiColors.line,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  sccBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: uiColors.ink,
    letterSpacing: 0.3,
  },
  sccName: {
    fontSize: 14,
    fontWeight: '700',
    color: uiColors.ink,
  },
  sccExchangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: uiColors.surface,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: uiColors.line,
  },
  sccBox: {
    flex: 1,
    alignItems: 'center',
  },
  sccBoxLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: uiColors.muted,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  sccBoxTime: {
    fontSize: 13,
    fontWeight: '700',
    color: uiColors.ink,
    textAlign: 'center',
  },
  sccBoxSub: {
    fontSize: 11,
    color: uiColors.muted,
    marginTop: 2,
    textAlign: 'center',
  },
  sccArrowWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: uiColors.sky,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
  },
  sccArrowText: {
    fontSize: 18,
    color: uiColors.muted,
    fontWeight: '800',
  },
  sccNoticeText: {
    fontSize: 11.5,
    color: uiColors.secondary,
    lineHeight: 16,
    marginTop: 10,
    fontStyle: 'italic',
  },

  // ── Warning Note ──
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

  // ── Detail Modal Overlay (Image 5) ──
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(40, 49, 59, 0.4)",
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  detailModalCard: {
    backgroundColor: uiColors.surface,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    width: '100%',
    maxWidth: 380,
    maxHeight: '88%',
    position: 'relative',
    shadowColor: uiColors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0,
    shadowRadius: 10,
    elevation: 0,
  },
  detailScroll: { flexShrink: 1, marginTop: 18 },
  timeline: { paddingTop: 16, marginTop: 12, borderTopWidth: 1, borderTopColor: uiColors.line },
  timelineCreated: { color: uiColors.muted, fontSize: 12, marginBottom: 14, lineHeight: 18 },
  timelineRow: { flexDirection: 'row', minHeight: 76 },
  timelineTrack: { width: 34, alignItems: 'center' },
  timelineDot: { width: 25, height: 25, borderRadius: 13, backgroundColor: uiColors.canvas, borderWidth: 1, borderColor: uiColors.lineStrong, alignItems: 'center', justifyContent: 'center' },
  timelineDotDone: { backgroundColor: uiColors.success, borderColor: uiColors.success },
  timelineDotActive: { backgroundColor: uiColors.orange, borderColor: uiColors.orange },
  timelineDotError: { backgroundColor: uiColors.dangerStrong, borderColor: uiColors.dangerStrong },
  timelineDotText: { fontSize: 12, fontWeight: '700', color: uiColors.muted },
  timelineDotTextFilled: { color: '#FFFFFF' },
  timelineLine: { flex: 1, width: 1, backgroundColor: uiColors.line, marginVertical: 4 },
  timelineBody: { flex: 1, paddingLeft: 8, paddingBottom: 18 },
  timelineTitle: { fontSize: 13, lineHeight: 19, fontWeight: '700', color: uiColors.ink },
  timelineActor: { fontSize: 12, lineHeight: 18, color: uiColors.secondary, marginTop: 3 },
  timelineTime: { fontSize: 11, lineHeight: 17, color: uiColors.muted, marginTop: 2 },
  timelineNote: { fontSize: 12, lineHeight: 18, color: uiColors.secondary, marginTop: 5 },
  cancelSwapButton: { minHeight: 44, borderWidth: 1, borderColor: "#EDD3D1", borderRadius: 8, padding: 12, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  cancelSwapText: { fontSize: 13, fontWeight: '600', color: uiColors.dangerStrong },
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
    borderColor: uiColors.ink,
    marginBottom: 8,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: uiColors.ink,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: uiColors.secondary,
    maxWidth: '46%',
    flexShrink: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: uiColors.ink,
    flex: 1,
    textAlign: 'right',
    marginLeft: 12,
  },
  detailSectionHeading: {
    fontSize: 14,
    fontWeight: '600',
    color: uiColors.secondary,
    marginTop: 10,
    marginBottom: 6,
  },
  detailReasonBox: {
    backgroundColor: uiColors.mint,
    borderWidth: 1,
    borderColor: "rgba(81, 125, 105, 0.4)",
    borderRadius: 8,
    padding: 12,
    marginBottom: 18,
    minHeight: 60,
  },
  detailReasonText: {
    fontSize: 13.5,
    color: uiColors.ink,
    lineHeight: 18,
  },
  detailStatusBadge: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: uiColors.lineStrong,
  },
  detailStatusBadgeApproved: {
    backgroundColor: uiColors.mint,
    borderWidth: 1,
    borderColor: uiColors.success,
  },
  detailStatusBadgeRejected: {
    backgroundColor: "#F1DDDC",
    borderWidth: 1,
    borderColor: uiColors.danger,
  },
  detailStatusBadgePending: {
    backgroundColor: uiColors.butter,
    borderWidth: 1,
    borderColor: "#B38D49",
  },
  detailStatusBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: uiColors.ink,
  },
  detailStatusBadgeTextApproved: {
    color: uiColors.successText,
  },
  detailStatusBadgeTextRejected: {
    color: uiColors.dangerStrong,
  },
  detailStatusBadgeTextPending: {
    color: uiColors.warningText,
  },

  // ── Loading ──
  loadingBox: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 13.5,
    color: uiColors.muted,
  },

  // ── Leave Balance Card ──
  balanceCard: {
    backgroundColor: uiColors.surface,
    borderColor: uiColors.line,
    borderWidth: 1,
    borderRadius: 4,
    padding: 14,
    marginBottom: 14,
    shadowColor: uiColors.success,
    shadowOpacity: 0,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 0,
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
    fontWeight: '600',
    color: uiColors.ink,
  },
  balanceCardSub: {
    fontSize: 12,
    color: uiColors.secondary,
    marginTop: 2,
  },
  balanceRemainingPill: {
    backgroundColor: uiColors.canvas,
    borderColor: uiColors.line,
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  balanceRemainingNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: uiColors.ink,
  },
  balanceRemainingLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: uiColors.muted,
    marginTop: -2,
  },
  balanceMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: uiColors.surface,
    borderRadius: 0,
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
    color: uiColors.ink,
  },
  balanceMetricLabel: {
    fontSize: 11,
    color: uiColors.muted,
    marginTop: 2,
    fontWeight: '500',
  },
  balanceMetricDivider: {
    width: 1,
    height: 22,
    backgroundColor: uiColors.line,
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
    borderRadius: 4,
    backgroundColor: uiColors.canvas,
    borderWidth: 1,
    borderColor: uiColors.line,
  },
  leaveTypePillActive: {
    backgroundColor: uiColors.orange,
    borderColor: uiColors.orange,
  },
  leaveTypePillText: {
    fontSize: 13,
    fontWeight: '600',
    color: uiColors.secondary,
  },
  leaveTypePillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // ── Duration Notice ──
  leaveDurationNotice: {
    backgroundColor: uiColors.canvas,
    borderColor: uiColors.line,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginVertical: 10,
  },
  leaveDurationNoticeText: {
    fontSize: 13.5,
    color: "#404B57",
  },
  leaveBalanceNoticeSub: {
    fontSize: 12,
    color: uiColors.muted,
    marginTop: 4,
  },

  // ── Duration badge in list ──
  durationBadge: {
    backgroundColor: uiColors.sky,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  durationBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: uiColors.info,
  },

  // ── Rejected reason boxes ──
  rejectedReasonBox: {
    backgroundColor: uiColors.dangerSoft,
    borderColor: "#EDD3D1",
    borderWidth: 1,
    borderRadius: 6,
    padding: 6,
    marginTop: 6,
  },
  rejectedReasonText: {
    fontSize: 12,
    color: uiColors.dangerStrong,
    fontWeight: '500',
  },
  detailRejectionBox: {
    backgroundColor: uiColors.dangerSoft,
    borderColor: uiColors.salmon,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  detailRejectionTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: uiColors.dangerStrong,
    marginBottom: 2,
  },
  detailRejectionText: {
    fontSize: 13,
    color: uiColors.dangerStrong,
  },

  // ── ⚡ INCOMING SWAP REQUEST SECTION ──
  incomingSwapSection: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  incomingSectionHeader: {
    marginBottom: 12,
  },
  incomingBadge: {
    alignSelf: 'flex-start',
    backgroundColor: uiColors.butter,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#EBDDAD",
  },
  incomingBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: uiColors.warningText,
    letterSpacing: 0.5,
  },
  incomingSectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: uiColors.ink,
    marginBottom: 4,
  },
  incomingSectionSub: {
    fontSize: 13,
    color: uiColors.muted,
    lineHeight: 18,
  },
  incomingSwapCard: {
    backgroundColor: uiColors.surface,
    borderRadius: 4,
    padding: 16,
    borderWidth: 1.5,
    borderColor: uiColors.line,
    marginBottom: 12,
    shadowColor: uiColors.warning,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0,
    shadowRadius: 10,
    elevation: 0,
  },
  incomingCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  incomingSenderAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: uiColors.canvas,
  },
  incomingSenderName: {
    fontSize: 15,
    fontWeight: '800',
    color: uiColors.ink,
  },
  incomingSenderRole: {
    fontSize: 12,
    color: uiColors.muted,
    marginTop: 2,
  },
  pendingActionPill: {
    backgroundColor: uiColors.butter,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pendingActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: uiColors.warningText,
  },
  swapComparisonBox: {
    backgroundColor: uiColors.canvas,
    borderRadius: 4,
    padding: 12,
    borderWidth: 1,
    borderColor: uiColors.line,
    marginBottom: 14,
    gap: 8,
  },
  swapShiftRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  swapShiftDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  swapShiftLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: uiColors.muted,
    marginBottom: 2,
  },
  swapShiftValue: {
    fontSize: 13.5,
    fontWeight: '700',
    color: uiColors.ink,
  },
  swapArrowWrap: {
    alignItems: 'center',
    marginVertical: -2,
  },
  swapArrowText: {
    fontSize: 16,
    color: uiColors.muted,
    fontWeight: 'bold',
  },
  incomingActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  declineBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E5BAB7",
    backgroundColor: uiColors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: uiColors.dangerText,
  },
  acceptBtn: {
    flex: 1.5,
    height: 44,
    borderRadius: 4,
    backgroundColor: uiColors.orange,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: uiColors.success,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0,
    shadowRadius: 6,
    elevation: 0,
  },
  acceptBtnIcon: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  acceptBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // ── DETAIL MODAL ACTIONS ──
  detailModalActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: uiColors.canvas,
  },
  detailDeclineBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E5BAB7",
    backgroundColor: uiColors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailDeclineBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: uiColors.dangerText,
  },
  detailAcceptBtn: {
    flex: 1.6,
    height: 46,
    borderRadius: 4,
    backgroundColor: uiColors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: uiColors.success,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0,
    shadowRadius: 6,
    elevation: 0,
  },
  detailAcceptBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  requestIntro: {'fontSize':13,'lineHeight':19,'color':uiColors.muted,'paddingLeft':48,'paddingRight':8},
  filterCardTextActive: {'color':'#FFFFFF','fontWeight':'600'},
});
