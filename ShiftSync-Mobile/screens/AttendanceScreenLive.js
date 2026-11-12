import { colors as uiColors } from '../theme/koreanPalette';
import ThreeIllustration from '../components/ThreeIllustration';
import UserAvatar from '../components/UserAvatar';
import { createAppStyles } from '../theme/appTheme';
import { ensureTouchTarget } from '../utils/touchTarget';
import { useCallback, useEffect, useRef, useState } from 'react';
import useResumeRefresh from '../utils/useResumeRefresh';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { StatusBar } from 'expo-status-bar';

import { getMyAttendance } from '../services/attendanceService';
import { createAttendanceAdjustment, getMyAttendanceAdjustments } from '../services/attendanceAdjustmentService';
import { getMyShifts } from '../services/shiftService';
import { getMyProfile } from '../services/profileService';
import { Platform } from 'react-native';
import { recordAttendance, getPendingAttendance, subscribeAttendanceQueue, syncAttendanceQueue, retryBlockedAttendance } from '../services/attendanceQueue';
import { getStoreDetails, getStoreConfiguration } from '../services/storeService';
import { selectAttendanceShift, isAttendanceDateCurrent } from '../utils/attendanceSelection';
import { attendanceLocationError, haversineMeters } from '../utils/location';
import useActionGuard from '../utils/useActionGuard';
import StoreMapPreview from '../components/StoreMapPreview';
import { showAlert } from '../utils/alert';

const localDateISO = (date = new Date()) => {
  return new Date(new Date(date).getTime() + 7 * 3600000).toISOString().slice(0, 10);
};

const formatTime = (value) => {
  if (!value) return '--:--';
  if (typeof value === 'string' && value.length === 8) return value.slice(0, 5);
  try {
    const d = new Date(value);
    return new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }).format(d);
  } catch {
    return String(value).slice(0, 5);
  }
};

const formatDate = (value) =>
  value
    ? new Intl.DateTimeFormat('vi-VN', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(new Date(`${value}T00:00:00`))
    : '';

const timeRange = (shift) =>
  `${String(shift.startTime).slice(0, 5)} – ${String(shift.endTime).slice(0, 5)}`;

const statusBadge = (status) => {
  switch (String(status || '').toUpperCase()) {
    case 'PRESENT':
    case 'ON_TIME':
      return { text: 'Đúng giờ', color: uiColors.successStrong, bg: uiColors.mint };
    case 'LATE':
      return { text: 'Đi trễ', color: uiColors.primaryStrong, bg: uiColors.butter };
    case 'EARLY_LEAVE':
      return { text: 'Về sớm', color: uiColors.primaryStrong, bg: uiColors.peach };
    case 'ABSENT':
    case 'NOT_CHECKED_IN':
      return { text: 'Vắng mặt', color: uiColors.dangerStrong, bg: "#F1DDDC" };
    default:
      return { text: 'Chưa chấm công', color: uiColors.secondary, bg: uiColors.canvas };
  }
};

export default function AttendanceScreenLive({ navigation }) {
  useResumeRefresh(navigation, () => loadData(false));
  const insets = useSafeAreaInsets();
  const { runAction, busy } = useActionGuard();
  const [store, setStore] = useState(null);
  const [storeConfiguration, setStoreConfiguration] = useState(null);
  const [coordinates, setCoordinates] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [pendingEvents, setPendingEvents] = useState([]);
  const { height: screenHeight } = useWindowDimensions();
  const cameraRef = useRef(null);
  const scrollViewRef = useRef(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [cameraFacing, setCameraFacing] = useState('front'); // Selfie mặc định
  const [cameraMode, setCameraMode] = useState('CHECK_IN'); // 'CHECK_IN' hoặc 'CHECK_OUT'

  const [attendance, setAttendance] = useState([]);
  const [shift, setShift] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [profile, setProfile] = useState(null);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [clockNow, setClockNow] = useState(new Date());
  const loadedDateRef = useRef(localDateISO());
  const [submitting, setSubmitting] = useState(false);
  const [cameraVisible, setCameraVisible] = useState(false);

  // Modal xem ảnh phóng to
  const [previewPhoto, setPreviewPhoto] = useState(null); // { uri, title, time }
  const [adjustments, setAdjustments] = useState([]);
  const [explanationVisible, setExplanationVisible] = useState(false);
  const [explanationReason, setExplanationReason] = useState('');
  const [requestedCheckIn, setRequestedCheckIn] = useState('');
  const [requestedCheckOut, setRequestedCheckOut] = useState('');
  const [explanationSubmitting, setExplanationSubmitting] = useState(false);

  const loadData = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    else setRefreshing(true);
    try {
      const [attendanceRes, shiftsRes, profileRes] = await Promise.all([
        getMyAttendance(), getMyShifts(), getMyProfile().catch(() => null),
      ]);
      if (profileRes?.data) setProfile(profileRes.data);
      setLoadError(false);
      setAttendance(attendanceRes.data || []);
      const pending = await getPendingAttendance(profileRes?.data?.id).catch(() => []);
      setPendingEvents(pending);
      const currentShift = selectAttendanceShift(shiftsRes.data, attendanceRes.data, pending);
      setShift(currentShift || null);
      setStore(null); setStoreConfiguration(null);
      if (currentShift?.storeId) {
        const [details, configuration] = await Promise.allSettled([getStoreDetails(currentShift.storeId), getStoreConfiguration(currentShift.storeId)]);
        setStore(details.status === 'fulfilled' ? details.value.data : null);
        setStoreConfiguration(configuration.status === 'fulfilled' ? configuration.value.data : null);
      } else { setStore(null); setStoreConfiguration(null); }
      if (currentShift?.storeId) {
        try {
          const adjustmentsRes = await getMyAttendanceAdjustments(currentShift.storeId);
          setAdjustments(adjustmentsRes.data || []);
        } catch {
          setAdjustments([]);
        }
      } else {
        setAdjustments([]);
      }
    } catch (error) {
      setLoadError(true);
    } finally {
      if (isInitial) setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData(true);
    const unsubscribe = navigation?.addListener?.('focus', () => loadData(false));
    return () => {
      unsubscribe?.();
    };
  }, [navigation, loadData]);

  useEffect(() => {
    const timer = setInterval(() => setClockNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const clockDate = localDateISO(clockNow);
  useEffect(() => {
    if (loadedDateRef.current === clockDate) return;
    loadedDateRef.current = clockDate;
    setShift(null);
    setCameraVisible(false);
    loadData();
  }, [clockDate, loadData]);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const pending = await getPendingAttendance(profile?.id).catch(() => []);
      if (active) setPendingEvents(pending);
    };
    refresh();
    const stop = subscribeAttendanceQueue(() => { refresh(); loadData(); });
    return () => { active = false; stop(); };
  }, [profile?.id, loadData]);

  const refreshLocation = useCallback(async (request = false) => {
    try {
      const permission = request ? await Location.requestForegroundPermissionsAsync() : await Location.getForegroundPermissionsAsync();
      if (permission.status !== 'granted') { setLocationError('Cho phép GPS để kiểm tra vị trí.'); return null; }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const issue = attendanceLocationError(location, Number(storeConfiguration?.geofenceRadiusM) || 100);
      if (issue) { setCoordinates(null); setLocationError(issue); return null; }
      setCoordinates(location.coords); setLocationError('');
      return location.coords;
    } catch { setLocationError('Chưa lấy được GPS. Hãy bật vị trí rồi thử lại.'); return null; }
  }, [storeConfiguration?.geofenceRadiusM]);
  useEffect(() => {
    refreshLocation();
    const stop = navigation?.addListener?.('focus', () => refreshLocation());
    return () => stop?.();
  }, [navigation, refreshLocation]);
  const geofenceReady = haversineMeters(store, store) != null && Number(storeConfiguration?.geofenceRadiusM) > 0;
  const allowedRadius = geofenceReady ? Number(storeConfiguration.geofenceRadiusM) : null;
  const distance = haversineMeters(coordinates, store);
  const outsideGeofence = distance != null && distance > allowedRadius;
  const pendingForShift = pendingEvents.filter((event) => String(event.shiftId) === String(shift?.id));
  const blockedForShift = pendingForShift.some((event) => event.status === 'blocked');
  const pendingIn = pendingForShift.find((event) => event.action === 'CHECK_IN' && event.status !== 'blocked');
  const pendingOut = pendingForShift.find((event) => event.action === 'CHECK_OUT' && event.status !== 'blocked');

  // Tìm bản ghi chấm công của ca hiện tại
  const todayAttendance = shift ? attendance.find(
    (item) => item.shiftId != null && String(item.shiftId) === String(shift.id)
  ) : null;
  const isCheckedIn = !!(todayAttendance?.checkInTime || pendingIn);
  const isCheckedOut = !!(todayAttendance?.checkOutTime || pendingOut);
  const lateAttendance = todayAttendance?.status === 'LATE';
  const currentAdjustment = adjustments.find((item) =>
    (todayAttendance?.id && item.attendanceId === todayAttendance.id) || (shift?.id && item.shiftId === shift.id)
  );

  const submitExplanation = () => runAction('explanation', async () => {
    if (!shift?.storeId || !shift?.id || !todayAttendance?.id || !explanationReason.trim()) {
      return showAlert('Thiếu thông tin', 'Vui lòng nhập lý do giải trình.');
    }
    setExplanationSubmitting(true);
    try {
      await createAttendanceAdjustment(shift.storeId, {
        attendanceId: todayAttendance.id,
        shiftId: shift.id,
        reason: explanationReason.trim(),
        ...(requestedCheckIn.trim() ? { requestedCheckIn: requestedCheckIn.trim() } : {}),
        ...(requestedCheckOut.trim() ? { requestedCheckOut: requestedCheckOut.trim() } : {}),
      });
      setExplanationVisible(false);
      setExplanationReason('');
      setRequestedCheckIn('');
      setRequestedCheckOut('');
      await loadData();
      showAlert('Đã gửi giải trình', 'Giải trình đang chờ quản lý duyệt.');
    } catch (error) {
      showAlert('Gửi giải trình thất bại', error.response?.data?.message || error.message || 'Vui lòng thử lại.');
    } finally {
      setExplanationSubmitting(false);
    }
  });

  // Mở camera chụp ảnh check-in hoặc check-out
  const openCamera = (mode) => runAction('open-camera', async () => {
    if (!shift) {
      return showAlert('Chưa có ca làm', 'Bạn chưa được phân công ca làm việc để chấm công.');
    }
    if (!isAttendanceDateCurrent(shift)) {
      loadData();
      return showAlert('Ca làm đã thay đổi', 'Vui lòng tải lại ca làm trước khi chấm công.');
    }
    if (!cameraPermission?.granted) {
      const permission = await requestCameraPermission();
      if (!permission.granted) {
        return showAlert('Quyền Camera', 'Vui lòng cấp quyền truy cập Camera để chụp ảnh xác nhận.');
      }
    }
    if (!geofenceReady) return showAlert('Chưa tải được cấu hình cửa hàng', 'Kéo xuống để tải lại tọa độ và phạm vi chấm công trước khi bắt đầu.');
    const currentCoordinates = await refreshLocation(true);
    if (!currentCoordinates) return;
    const meters = haversineMeters(currentCoordinates, store);
    if (meters == null) return showAlert('Chưa có vị trí cửa hàng', 'Cần tải tọa độ cửa hàng trước khi chấm công.');
    if (meters > allowedRadius) return showAlert('Ngoài vùng chấm công', `Bạn cách cửa hàng ${Math.round(meters)} m. Phạm vi cho phép là ${allowedRadius} m.`);
    if (!isAttendanceDateCurrent(shift)) {
      loadData();
      return showAlert('Ca làm đã thay đổi', 'Vui lòng tải lại ca làm trước khi chấm công.');
    }
    setCameraMode(mode);
    setCameraVisible(true);
  });

  // Chụp ảnh và gửi chấm công lên máy chủ
  const captureAndSubmit = () => runAction('capture', async () => {
    if (!cameraRef.current || !shift) return;
    if (!isAttendanceDateCurrent(shift)) {
      setCameraVisible(false);
      loadData();
      return showAlert('Ca làm đã thay đổi', 'Vui lòng tải lại ca làm trước khi chấm công.');
    }
    setSubmitting(true);
    try {
      const [{ photo, capturedAt }, location] = await Promise.all([
        cameraRef.current.takePictureAsync({ quality: 0.6 }).then((photo) => ({ photo, capturedAt: new Date().toISOString() })),
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      ]);
      const issue = attendanceLocationError(location, allowedRadius);
      if (issue) throw new Error(issue);
      const meters = haversineMeters(location.coords, store);
      setCoordinates(location.coords);
      if (meters == null || meters > allowedRadius) throw new Error('Vị trí hiện tại nằm ngoài vùng cho phép hoặc thiếu tọa độ cửa hàng.');
      const response = await recordAttendance({
        userId: profile?.id,
        storeId: shift.storeId,
        action: cameraMode,
        capturedAt,
        shiftId: shift.id,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        photoUri: photo.uri,
      });

      setCameraVisible(false);
      if (response.queued) {
        showAlert(response.blocked ? 'Cần kiểm tra chấm công' : 'Đã lưu trên thiết bị', response.error || 'Ảnh, vị trí và giờ chụp đã được lưu. Ứng dụng sẽ tự gửi khi có mạng hoặc khi bạn mở lại ứng dụng.');
        return;
      }
      if (!response.data) { showAlert('Đã đồng bộ chấm công', 'Bản chấm công đã được máy chủ tiếp nhận.'); await loadData(); return; }

      if (cameraMode === 'CHECK_IN') {
        const isLate = response.data.status === 'LATE';
        if (isLate) {
          const lateMinutes = Number(response.data.lateMinutes);
          showAlert(
            'Check In thành công',
            `Ghi nhận vào ca lúc ${formatTime(response.data.checkInTime)}. Trạng thái: Đi trễ${lateMinutes > 0 ? ` ${lateMinutes} phút` : ''}.`
          );
        } else {
          showAlert(
            'Check In thành công',
            `Ghi nhận vào ca lúc ${formatTime(response.data.checkInTime)}. Trạng thái: Đúng giờ.`
          );
        }
      } else {
        showAlert(
          'Check Out thành công',
          `Ghi nhận ra ca lúc ${formatTime(response.data.checkOutTime)}. Đã hoàn thành ca làm việc!`
        );
      }

      loadData();
    } catch (error) {
      showAlert('Chấm công không thành công', error.response?.data?.message || error.message || 'Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  });

  // Màn hình Camera chụp ảnh Check-in / Check-out
  if (cameraVisible) {
    const isCheckIn = cameraMode === 'CHECK_IN';
    const captureBusy = submitting || !!busy.capture;
    return (
      <SafeAreaView style={styles.cameraPage}>
        <StatusBar style="light" />
        <CameraView ref={cameraRef} style={styles.camera} facing={cameraFacing} />
        
        {/* Header trên camera */}
        <View style={[styles.cameraTopBar, { top: insets.top + 16 }]}>
          <Text style={styles.cameraTitle}>
            {isCheckIn ? 'Chụp ảnh Check In (Vào ca)' : 'Chụp ảnh Check Out (Ra ca)'}
          </Text>
          <Text style={styles.cameraSubtitle}>
            {shift ? `${shift.shiftDate} · ${timeRange(shift)}` : ''}
          </Text>
        </View>

        {/* Nút thao tác dưới camera */}
        <View style={[styles.cameraOverlay, { bottom: insets.bottom + 24 }]}>
          <View style={styles.cameraActionRow}>
            <TouchableOpacity
              onPress={() => setCameraFacing((prev) => (prev === 'front' ? 'back' : 'front'))}
              style={ensureTouchTarget(styles.flipBtn)}
              accessibilityRole="button"
              accessibilityLabel="Đổi camera trước hoặc sau"
            >
              <Text style={styles.flipText}>Đổi Camera</Text>
            </TouchableOpacity>

            <Pressable accessibilityRole="button" accessibilityLabel={isCheckIn ? 'Chụp ảnh vào ca' : 'Chụp ảnh ra ca'} accessibilityState={{ disabled: captureBusy, busy: captureBusy }} aria-disabled={captureBusy} aria-busy={captureBusy} disabled={captureBusy} onPress={captureAndSubmit} style={ensureTouchTarget(styles.shutter)}>
              {captureBusy ? (
                <ActivityIndicator color={uiColors.ink} />
              ) : (
                <View style={[styles.shutterDot, isCheckIn ? styles.shutterCheckIn : styles.shutterCheckOut]} />
              )}
            </Pressable>

            <Pressable accessibilityRole="button" accessibilityLabel="Đóng camera" disabled={captureBusy} onPress={() => setCameraVisible(false)} style={ensureTouchTarget(styles.cancelBtn)}>
              <Text style={styles.cancelText}>Đóng</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const userName = profile?.fullName || profile?.name || 'bạn';
  const myAssignment = (shift?.shiftAssignments || []).find((item) => String(item.staffId) === String(profile?.id));
  const position = myAssignment?.skillName || myAssignment?.zoneName || shift?.skillName || shift?.zoneName || 'Nhân viên';
  const punchStart = new Date(todayAttendance?.checkInTime || pendingIn?.capturedAt || '').getTime();
  const punchEnd = isCheckedOut ? new Date(todayAttendance?.checkOutTime || pendingOut?.capturedAt).getTime() : clockNow.getTime();
  const elapsedMinutes = Number.isFinite(punchStart) && Number.isFinite(punchEnd)
    ? Math.max(0, Math.floor((punchEnd - punchStart) / 60000)) : null;
  const elapsedLabel = elapsedMinutes == null ? formatTime(todayAttendance?.checkInTime)
    : `${elapsedMinutes >= 60 ? `${Math.floor(elapsedMinutes / 60)} giờ ` : ''}${elapsedMinutes % 60} phút`;
  const clockLabel = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  }).format(clockNow);
  const openHistory = () => setHistoryVisible(true);

  return (
    <SafeAreaView style={[styles.safe, historyVisible && styles.historyPage]} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <View style={styles.topHeaderRow}>
        <Pressable accessibilityRole="button" accessibilityLabel={historyVisible ? 'Quay lại chấm công' : 'Quay lại lịch làm'}
          onPress={() => historyVisible ? setHistoryVisible(false) : navigation.navigate('Schedule')} style={ensureTouchTarget(styles.headerIcon)}>
          <Ionicons name="chevron-back" size={26} color={uiColors.muted} accessible={false} />
        </Pressable>
        <Text accessibilityRole="header" style={styles.headerTitle}>{historyVisible ? 'Lịch sử chấm công' : clockLabel}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={historyVisible ? 'Làm mới lịch sử chấm công' : 'Xem lịch sử chấm công'}
          onPress={() => historyVisible ? loadData() : openHistory()} style={ensureTouchTarget(styles.headerIcon)}>
          <Ionicons name={historyVisible ? 'refresh-outline' : 'time-outline'} size={24} color={uiColors.muted} accessible={false} />
        </Pressable>
      </View>
      <ScrollView ref={scrollViewRef} contentContainerStyle={[styles.content, { paddingBottom: 24 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData()} tintColor={uiColors.info} colors={[uiColors.info]} />}>
        {loading ? <View style={styles.loader}>
          <ActivityIndicator size="large" color={uiColors.info} />
          <Text style={styles.loaderText}>Đang tải ca làm của bạn...</Text>
        </View> : <>
          {loadError && <View style={styles.errorCard} accessibilityRole="alert">
            <Ionicons name="cloud-offline-outline" size={24} color={uiColors.primaryStrong} accessible={false} />
            <View style={styles.flexCopy}>
              <Text style={styles.errorTitle}>Chưa cập nhật được dữ liệu</Text>
              <Text style={styles.errorText}>Kiểm tra kết nối rồi thử tải lại.</Text>
            </View>
            <TouchableOpacity accessibilityRole="button" onPress={() => loadData()} style={ensureTouchTarget(styles.retryBtn)}><Text style={styles.errorTitle}>Thử lại</Text></TouchableOpacity>
          </View>}
          {historyVisible ? <View style={styles.historyContent}>
            {/* ══ LỊCH SỬ CHẤM CÔNG ══ */}
            <View style={styles.historyHeaderRow}>
              <Text accessibilityRole="header" style={styles.historySectionTitle}>Lịch sử chấm công</Text>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Làm mới lịch sử chấm công" onPress={() => loadData()} disabled={refreshing} style={ensureTouchTarget(styles.refreshBtn)}>
                {refreshing ? <ActivityIndicator size="small" color={uiColors.successStrong} /> : <Ionicons name="refresh-outline" size={18} color={uiColors.successStrong} accessible={false} />}
                <Text style={styles.refreshBtnText}>Làm mới</Text>
              </TouchableOpacity>
            </View>

            {attendance.length === 0 ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIcon}><ThreeIllustration kind="clock" size={60} /></View>
                <Text style={styles.emptyTitle}>{loadError ? 'Chưa tải được lịch sử' : 'Chưa có lịch sử chấm công'}</Text>
                <Text style={styles.emptyText}>{loadError ? 'Thử tải lại khi kết nối ổn định.' : 'Các lần vào ca và ra ca sẽ được lưu tại đây.'}</Text>
              </View>
            ) : (
              attendance.map((item) => {
                const badge = statusBadge(item.status);
                return (
                  <View key={item.id} style={styles.historyItemCard}>
                    {/* Hàng trên: Ngày + Trạng thái */}
                    <View style={styles.historyItemHeader}>
                      <View style={styles.flexCopy}>
                        <Text style={styles.historyItemDate}>{formatDate(item.shiftDate)}</Text>
                        <Text style={styles.historyItemStore}>
                          {item.storeName || 'Chi nhánh phân công'}
                          {item.lateMinutes > 0 ? ` · Trễ ${item.lateMinutes} phút` : ''}
                        </Text>
                        {(item.zoneName || item.workstationName) && (
                          <Text style={styles.historyItemStore}>
                            {item.zoneName || 'Chưa gán phân khu'}{item.workstationName ? ` · ${item.workstationName}` : ''}
                          </Text>
                        )}
                      </View>
                      <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                        <Text style={[styles.badgeText, { color: badge.color }]}>{badge.text}</Text>
                      </View>
                    </View>

                    {/* Chi tiết 2 lần check có hình ảnh và giờ */}
                    <View style={styles.historyDetailsRow}>
                      {/* Check-in */}
                      <View style={styles.historyCheckItem}>
                        <Text style={styles.historyCheckLabel}>Vào ca:</Text>
                        <Text style={styles.historyCheckTime}>{formatTime(item.checkInTime)}</Text>
                        {item.checkInPhotoBase64 ? (
                          <TouchableOpacity accessibilityRole="button"
                            onPress={() =>
                              setPreviewPhoto({
                                uri: `data:image/jpeg;base64,${item.checkInPhotoBase64}`,
                                title: 'Ảnh Check In',
                                time: formatTime(item.checkInTime),
                              })
                            }
                            style={ensureTouchTarget(styles.historyPhotoWrap)}
                          >
                            <Image
                              source={{ uri: `data:image/jpeg;base64,${item.checkInPhotoBase64}` }}
                              style={styles.historyThumb}
                            />
                            <Text style={styles.thumbSubText}>Xem ảnh</Text>
                          </TouchableOpacity>
                        ) : (
                          <View style={styles.historyNoPhotoBox}>
                            <Text style={styles.historyNoPhotoText}>Không ảnh</Text>
                          </View>
                        )}
                      </View>

                      {/* Phân cách */}
                      <View style={styles.historyDivider} />

                      {/* Check-out */}
                      <View style={styles.historyCheckItem}>
                        <Text style={styles.historyCheckLabel}>Ra ca:</Text>
                        <Text style={styles.historyCheckTime}>
                          {item.checkOutTime ? formatTime(item.checkOutTime) : 'Chưa ra ca'}
                        </Text>
                        {item.checkOutPhotoBase64 ? (
                          <TouchableOpacity accessibilityRole="button"
                            onPress={() =>
                              setPreviewPhoto({
                                uri: `data:image/jpeg;base64,${item.checkOutPhotoBase64}`,
                                title: 'Ảnh Check Out',
                                time: formatTime(item.checkOutTime),
                              })
                            }
                            style={ensureTouchTarget(styles.historyPhotoWrap)}
                          >
                            <Image
                              source={{ uri: `data:image/jpeg;base64,${item.checkOutPhotoBase64}` }}
                              style={styles.historyThumb}
                            />
                            <Text style={styles.thumbSubText}>Xem ảnh</Text>
                          </TouchableOpacity>
                        ) : (
                          <View style={styles.historyNoPhotoBox}>
                            <Text style={styles.historyNoPhotoText}>
                              {item.checkOutTime ? 'Không ảnh' : 'Chưa check-out'}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View> : <>
            <View style={[styles.welcome, isCheckedIn && styles.welcomeWorking, { minHeight: Math.max(176, screenHeight * 0.25) }]}>
              <View style={[styles.identity, isCheckedIn && styles.identityWorking]}>
                <View style={styles.personAvatar}><UserAvatar avatarId={profile?.avatarId || 'dilan'} size={64} /></View>
                <View style={[styles.welcomeCopy, isCheckedIn && styles.welcomeCopyWorking]}>
                  <Text style={[styles.welcomeName, isCheckedIn && { textAlign: 'center' }]}>{isCheckedIn ? userName : `Chào ${userName}!`}</Text>
                  {isCheckedIn ? <View style={[styles.punchStatus, isCheckedOut && styles.punchStatusComplete]}>
                    <Text style={styles.punchStatusText}>{pendingIn || pendingOut ? 'Chờ đồng bộ' : isCheckedOut ? 'Đã kết thúc ca' : 'Đang trong ca'}</Text>
                  </View> : <Text style={styles.welcomeSubtitle}>Chúc bạn một ca làm thật tốt.</Text>}
                </View>
              </View>
              {isCheckedIn && <View style={styles.punchInfo}>
                <Ionicons name={isCheckedOut ? 'checkmark-circle-outline' : 'hourglass-outline'} size={27} color={uiColors.ink} accessible={false} />
                <View style={styles.flexCopy}>
                  <Text style={styles.punchInfoTime}>{elapsedLabel}</Text>
                  <Text style={styles.punchInfoLabel}>{elapsedMinutes == null ? 'bắt đầu ca' : 'thời gian trong ca'}</Text>
                </View>
              </View>}
            </View>
            <View style={[styles.shiftArea, { paddingTop: 20, minHeight: screenHeight * 0.65 }]}>
              <ThreeIllustration kind="frog" size={128} animated interactive style={{ alignSelf: 'center', marginBottom: 8 }} />
              {(!loadError || shift) && <>
                <Text accessibilityRole="header" style={styles.sectionTitle}>{isCheckedIn && !isCheckedOut ? 'Ca hiện tại' : 'Ca làm của bạn'}</Text>
                <Text style={styles.sectionDate}>{formatDate(shift?.shiftDate || localDateISO())}</Text>
                <View style={styles.shiftCard}>
                  {shift ? <>
                    <View style={styles.shiftSummary}>
                      <View style={styles.roleAvatar}><Text style={styles.roleInitial}>{position.charAt(0).toUpperCase()}</Text></View>
                      <View style={styles.flexCopy}>
                        <Text style={styles.shiftTime}>{timeRange(shift)}</Text>
                        <Text style={styles.shiftRole}>{position}{shift.storeName ? ` | ${shift.storeName}` : ''}</Text>
                      </View>
                    </View>
                    {isCheckedOut ? <View style={styles.completedBanner}>
                      <Ionicons name="checkmark-circle-outline" size={23} color={uiColors.ink} accessible={false} />
                      <Text style={styles.completedText}>{pendingOut ? 'Đã lưu ra ca · Chờ đồng bộ' : 'Đã hoàn thành ca làm'}</Text>
                    </View> : <TouchableOpacity accessibilityRole="button"
                      accessibilityLabel={isCheckedIn ? 'Kết thúc ca, chụp ảnh ra ca' : 'Bắt đầu ca, chụp ảnh vào ca'}
                      accessibilityState={{ disabled: submitting || busy['open-camera'] || outsideGeofence || !geofenceReady || !profile?.id || blockedForShift, busy: submitting || !!busy['open-camera'] }} aria-disabled={submitting || busy['open-camera'] || outsideGeofence || !geofenceReady || !profile?.id || blockedForShift} aria-busy={submitting || !!busy['open-camera']} disabled={submitting || busy['open-camera'] || outsideGeofence || !geofenceReady || !profile?.id || blockedForShift}
                      onPress={() => openCamera(isCheckedIn ? 'CHECK_OUT' : 'CHECK_IN')}
                      style={ensureTouchTarget([styles.actionBtn, isCheckedIn ? styles.checkOutBtn : styles.checkInBtn, (outsideGeofence || !geofenceReady || !profile?.id || busy['open-camera'] || blockedForShift) && { opacity: 0.5 }])}>
                      {busy['open-camera'] && <ActivityIndicator color="#FFFFFF" />}<Text style={styles.actionBtnText}>{isCheckedIn ? 'Kết thúc ca' : 'Bắt đầu ca'}</Text>
                      <Ionicons name="log-out-outline" size={24} color="#FFFFFF" accessible={false} />
                    </TouchableOpacity>}
                  </> : <>
                    <Text style={styles.emptyShiftTitle}>Hôm nay chưa có ca làm</Text>
                    <Text style={styles.emptyShiftText}>Ca được phân công sẽ xuất hiện tại đây.</Text>
                    <TouchableOpacity accessibilityRole="button" onPress={() => navigation.navigate('Schedule')} style={ensureTouchTarget(styles.emptyScheduleBtn)}>
                      <Text style={styles.emptyScheduleText}>Xem lịch làm việc</Text><Ionicons name="arrow-forward" size={18} color={uiColors.info} accessible={false} />
                    </TouchableOpacity>
                  </>}
                </View>
                {shift && <>
                  <StoreMapPreview store={store} distance={distance} radius={allowedRadius} />
                  <TouchableOpacity accessibilityRole="button" accessibilityLabel="Cập nhật vị trí GPS" onPress={() => runAction('gps', () => refreshLocation(true))} disabled={busy.gps} style={ensureTouchTarget({ paddingVertical: 12 })}>
                    {busy.gps && <ActivityIndicator color={uiColors.info} />}<Text style={[styles.verificationText, { marginTop: 0, color: outsideGeofence || distance > 200 ? uiColors.danger : uiColors.muted }]}>{(!geofenceReady ? 'Chưa tải được phạm vi chấm công. Kéo xuống để tải lại.' : locationError) || (outsideGeofence ? 'Ngoài vùng cho phép. Cập nhật GPS để kiểm tra lại.' : 'Cập nhật vị trí GPS')}</Text>
                  </TouchableOpacity>
                </>}
                {pendingEvents.map((event) => <View key={event.id} style={{ padding: 12, backgroundColor: event.status === 'blocked' ? uiColors.peach : uiColors.butter, borderRadius: 8, marginTop: 10 }}>
                  <Text style={{ color: '#68451F', fontSize: 13 }}>{event.action === 'CHECK_IN' ? 'Vào ca' : 'Ra ca'} · {formatTime(event.capturedAt)} · {event.status === 'blocked' ? 'Cần kiểm tra' : 'Chờ đồng bộ'}</Text>
                  {event.error && <Text style={{ color: uiColors.primaryStrong, fontSize: 12, marginTop: 5 }}>{event.error}</Text>}
                  <Text style={{ color: uiColors.muted, fontSize: 11, marginTop: 4 }}>Ảnh và vị trí vẫn được giữ trên thiết bị.</Text>
                  {event.status === 'blocked' && <Text style={{ color: uiColors.muted, fontSize: 11, marginTop: 4 }}>Liên hệ quản lý để xử lý nguyên nhân, sau đó thử gửi lại.</Text>}
                  <TouchableOpacity accessibilityRole="button" style={ensureTouchTarget()} onPress={() => runAction('sync', () => event.status === 'blocked' ? retryBlockedAttendance(event.id, profile?.id) : syncAttendanceQueue())} disabled={busy.sync}><Text style={{ color: uiColors.info, paddingTop: 8 }}>{event.status === 'blocked' ? 'Thử gửi lại' : 'Đồng bộ ngay'}</Text></TouchableOpacity>
                </View>)}
                {shift && !isCheckedOut && <Text style={styles.verificationText}>Ảnh xác nhận và vị trí được ghi nhận khi chấm công.</Text>}
              </>}
            {lateAttendance && (
              <View style={styles.explanationCard}>
                <Text style={styles.explanationTitle}>Giải trình chấm công</Text>
                <Text style={styles.explanationStatus}>
                  Đi trễ{Number(todayAttendance?.lateMinutes) > 0 ? ` ${todayAttendance.lateMinutes} phút` : ''}
                </Text>
                {currentAdjustment?.status === 'PENDING' ? (
                  <Text style={styles.explanationPending}>Giải trình đang chờ quản lý duyệt</Text>
                ) : currentAdjustment?.status === 'APPROVED' ? (
                  <Text style={styles.explanationApproved}>Giải trình đã được duyệt</Text>
                ) : currentAdjustment?.status === 'REJECTED' ? (
                  <TouchableOpacity accessibilityRole="button" style={ensureTouchTarget(styles.explanationButton)} onPress={() => setExplanationVisible(true)}>
                    <Text style={styles.explanationButtonText}>Gửi lại giải trình</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity accessibilityRole="button" style={ensureTouchTarget(styles.explanationButton)} onPress={() => setExplanationVisible(true)}>
                    <Text style={styles.explanationButtonText}>Giải trình chấm công</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}


              <TouchableOpacity accessibilityRole="button" onPress={openHistory} style={ensureTouchTarget(styles.historyLink)}>
                <Text style={styles.historyLinkText}>Xem lịch sử chấm công</Text><Ionicons name="chevron-forward" size={18} color={uiColors.muted} accessible={false} />
              </TouchableOpacity>
            </View>
          </>}
        </>}
      </ScrollView>
      {/* ══ MODAL XEM ẢNH PHÓNG TO ══ */}
      <Modal visible={explanationVisible} transparent animationType="fade" onRequestClose={() => !explanationSubmitting && setExplanationVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.modalBackdrop, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.explanationModalContent}>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
            <Text style={styles.modalTitle}>Giải trình đi trễ</Text>
            <Text style={styles.modalSubtitle}>Gửi lý do để quản lý xem xét. Trạng thái chấm công được giữ lại trong lịch sử.</Text>
            <Text style={styles.fieldLabel}>Lý do giải trình</Text>
            <TextInput
              accessibilityLabel="Lý do giải trình"
              value={explanationReason}
              onChangeText={setExplanationReason}
              placeholder="Nhập lý do giải trình"
              multiline
              style={[styles.explanationInput, styles.reasonInput]}
            />
            <Text style={styles.fieldLabel}>Thời điểm vào ca đề nghị (không bắt buộc)</Text>
            <TextInput
              accessibilityLabel="Thời điểm vào ca đề nghị"
              value={requestedCheckIn}
              onChangeText={setRequestedCheckIn}
              placeholder="Check-in, ví dụ 2026-09-21T08:00:00+07:00"
              autoCapitalize="none"
              style={styles.explanationInput}
            />
            <Text style={styles.fieldLabel}>Thời điểm ra ca đề nghị (không bắt buộc)</Text>
            <TextInput
              accessibilityLabel="Thời điểm ra ca đề nghị"
              value={requestedCheckOut}
              onChangeText={setRequestedCheckOut}
              placeholder="Check-out, ví dụ 2026-09-21T17:00:00+07:00"
              autoCapitalize="none"
              style={styles.explanationInput}
            />
            <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: explanationSubmitting, busy: explanationSubmitting }} aria-disabled={explanationSubmitting} aria-busy={explanationSubmitting} disabled={explanationSubmitting} onPress={submitExplanation} style={ensureTouchTarget(styles.explanationButton)}>
              {explanationSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.explanationButtonText}>Gửi giải trình</Text>}
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" disabled={explanationSubmitting} onPress={() => setExplanationVisible(false)} style={ensureTouchTarget(styles.modalCloseBtn)}>
              <Text style={styles.modalCloseText}>Hủy</Text>
            </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={!!previewPhoto} transparent animationType="fade" onRequestClose={() => setPreviewPhoto(null)}>
        <View style={[styles.modalBackdrop, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.modalContent}>
            <ScrollView style={styles.photoScroll} contentContainerStyle={styles.photoScrollContent}>
            <Text style={styles.modalTitle}>{previewPhoto?.title || 'Ảnh chấm công'}</Text>
            <Text style={styles.modalSubtitle}>Thời gian ghi nhận: {previewPhoto?.time}</Text>

            {previewPhoto?.uri && (
              <Image source={{ uri: previewPhoto.uri }} style={styles.modalFullImage} resizeMode="contain" />
            )}

            <TouchableOpacity accessibilityRole="button" onPress={() => setPreviewPhoto(null)} style={ensureTouchTarget(styles.modalCloseBtn)}>
              <Text style={styles.modalCloseText}>Đóng</Text>
            </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>


    </SafeAreaView>
  );
}

const styles = createAppStyles({
  safe: { flex: 1, backgroundColor: uiColors.canvas },
  historyPage: { backgroundColor: uiColors.surface },
  content: { flexGrow: 1 },
  topHeaderRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 6, backgroundColor: uiColors.canvas },
  headerIcon: { width: 44, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, minWidth: 0, textAlign: 'center', fontSize: 16, fontWeight: '500', color: uiColors.ink, lineHeight: 23 },
  loader: { padding: 70, alignItems: 'center', gap: 16 },
  loaderText: { color: uiColors.muted, fontSize: 14 },
  flexCopy: { flex: 1, minWidth: 0 },
  welcome: { paddingHorizontal: 24, paddingVertical: 28, justifyContent: 'center' },
  welcomeWorking: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  identity: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18 },
  identityWorking: { flex: 1, flexDirection: 'column', gap: 10 },
  personAvatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: '#8FC6C0', overflow: 'hidden' },
  welcomeCopy: { flexShrink: 1, maxWidth: 270 },
  welcomeCopyWorking: { alignItems: 'center', width: '100%' },
  welcomeName: { fontSize: 19, lineHeight: 26, fontWeight: '500', color: uiColors.ink },
  welcomeSubtitle: { fontSize: 15, lineHeight: 22, color: uiColors.secondary, marginTop: 2 },
  punchStatus: { alignSelf: 'flex-start', backgroundColor: '#BDEDE8', paddingVertical: 5, paddingHorizontal: 14, borderRadius: 20, marginTop: 7 },
  punchStatusComplete: { backgroundColor: uiColors.line },
  punchStatusText: { fontSize: 12, color: uiColors.ink, fontWeight: '500' },
  punchInfo: { flex: 1, flexDirection: 'row', gap: 12, alignItems: 'center', alignSelf: 'center' },
  punchInfoTime: { fontSize: 17, color: uiColors.ink, fontWeight: '600' },
  punchInfoLabel: { color: uiColors.muted, fontSize: 12, marginTop: 3 },
  shiftArea: { flex: 1, backgroundColor: uiColors.subtle, paddingHorizontal: 20, paddingBottom: 28 },
  sectionTitle: { fontSize: 25, lineHeight: 32, fontWeight: '600', color: uiColors.ink },
  sectionDate: { fontSize: 14, color: uiColors.secondary, lineHeight: 21, marginTop: 3, marginBottom: 20 },
  shiftCard: { backgroundColor: uiColors.surface, borderRadius: 22, padding: 20 },
  shiftSummary: { flexDirection: 'row', gap: 14, alignItems: 'center', marginBottom: 36 },
  roleAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: uiColors.secondary, alignItems: 'center', justifyContent: 'center' },
  roleInitial: { color: '#FFFFFF', fontSize: 24, fontWeight: '400' },
  shiftTime: { color: uiColors.ink, fontSize: 20, lineHeight: 28, fontWeight: '500' },
  shiftRole: { color: uiColors.secondary, fontSize: 14, lineHeight: 20, marginTop: 2 },
  actionBtn: { minHeight: 60, paddingVertical: 16, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 32 },
  checkInBtn: { backgroundColor: uiColors.primary },
  checkOutBtn: { backgroundColor: uiColors.danger },
  actionBtnText: { color: '#FFFFFF', fontSize: 19, fontWeight: '600', flexShrink: 1, textAlign: 'center' },
  completedBanner: { minHeight: 60, padding: 14, borderRadius: 30, backgroundColor: uiColors.canvas, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  completedText: { color: uiColors.ink, fontSize: 15, fontWeight: '500', flexShrink: 1 },
  verificationText: { textAlign: 'center', color: uiColors.muted, fontSize: 11, lineHeight: 17, marginTop: 12, marginHorizontal: 8 },
  emptyShiftTitle: { fontSize: 19, lineHeight: 26, color: uiColors.ink, fontWeight: '500' },
  emptyShiftText: { color: uiColors.muted, fontSize: 14, lineHeight: 21, marginTop: 10 },
  emptyScheduleBtn: { flexDirection: 'row', alignItems: 'center', minHeight: 48, marginTop: 14, gap: 10 },
  emptyScheduleText: { fontSize: 14, fontWeight: '600', color: uiColors.info },
  errorCard: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, margin: 16, padding: 14, backgroundColor: uiColors.peach, borderRadius: 8 },
  errorTitle: { color: uiColors.primaryStrong, fontSize: 13, fontWeight: '600' },
  errorText: { color: uiColors.primaryStrong, fontSize: 12, lineHeight: 18, marginTop: 3 },
  retryBtn: { minHeight: 44, paddingHorizontal: 8, justifyContent: 'center' },
  historyContent: { padding: 20 },
  historyLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, minHeight: 48, marginTop: 16 },
  historyLinkText: { fontSize: 13, color: uiColors.muted },
  // History section
  historyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  historySectionTitle: { fontSize: 19, fontWeight: '700', color: uiColors.ink, flexShrink: 1 },
  refreshBtn: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 4 },
  refreshBtnText: { fontSize: 12, fontWeight: '600', color: uiColors.info },

  emptyCard: { backgroundColor: uiColors.surface, borderWidth: 1, borderColor: uiColors.line, borderRadius: 20, padding: 24, alignItems: 'center' },
  emptyIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: uiColors.canvas, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: uiColors.ink, textAlign: 'center' },
  emptyText: { fontSize: 13, lineHeight: 21, color: uiColors.muted, textAlign: 'center', marginTop: 6 },

  historyItemCard: {
    backgroundColor: uiColors.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: uiColors.line,
    marginBottom: 12,
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  historyItemDate: { fontSize: 14, lineHeight: 20, fontWeight: '700', color: uiColors.ink },
  historyItemStore: { fontSize: 12, lineHeight: 18, color: uiColors.muted, marginTop: 4 },

  historyDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: uiColors.canvas,
    borderRadius: 14,
    padding: 12,
  },
  historyCheckItem: { flex: 1, minWidth: 0, alignItems: 'center' },
  historyCheckLabel: { fontSize: 12, fontWeight: '600', color: uiColors.muted, marginBottom: 4 },
  historyCheckTime: { fontSize: 14, fontWeight: '700', color: uiColors.ink, marginBottom: 10, textAlign: 'center' },
  historyPhotoWrap: { alignItems: 'center' },
  historyThumb: { width: 52, height: 52, borderRadius: 6, backgroundColor: uiColors.line },
  thumbSubText: { fontSize: 12, fontWeight: '600', color: uiColors.info, marginTop: 4 },
  historyNoPhotoBox: {
    width: 52,
    height: 52,
    borderRadius: 6,
    backgroundColor: uiColors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: uiColors.line,
  },
  historyNoPhotoText: { fontSize: 10, color: uiColors.muted, textAlign: 'center' },
  historyDivider: { width: 1, height: 50, backgroundColor: uiColors.line, marginHorizontal: 8 },

  // Badges
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, maxWidth: '100%', alignSelf: 'flex-start' },
  badgeText: { fontSize: 11.5, fontWeight: '700' },

  // Camera screen
  cameraPage: { flex: 1, backgroundColor: uiColors.ink },
  camera: { flex: 1 },
  cameraTopBar: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    alignItems: 'center',
    backgroundColor: "rgba(40, 49, 59, 0.6)",
    paddingVertical: 10,
    borderRadius: 12,
  },
  cameraTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  cameraSubtitle: { color: uiColors.lineStrong, fontSize: 12, marginTop: 2 },

  cameraOverlay: {
    position: 'absolute',
    bottom: 36,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  cameraActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 24,
  },
  flipBtn: {
    minHeight: 44,
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  flipText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: uiColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterDot: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  shutterCheckIn: { backgroundColor: uiColors.info },
  shutterCheckOut: { backgroundColor: uiColors.ink },
  cancelBtn: { minHeight: 44, paddingHorizontal: 14, paddingVertical: 10, justifyContent: 'center' },
  cancelText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(40, 49, 59, 0.75)",
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: uiColors.surface,
    borderRadius: 22,
    padding: 20,
    width: '100%',
    maxWidth: 380,
    maxHeight: '100%',
  },
  photoScroll: { width: '100%' },
  photoScrollContent: { alignItems: 'center' },
  modalTitle: { fontSize: 21, fontWeight: '700', color: uiColors.ink },
  modalSubtitle: { fontSize: 13, lineHeight: 20, color: uiColors.muted, marginTop: 8, marginBottom: 20 },
  modalFullImage: { width: '100%', aspectRatio: 0.875, borderRadius: 14, backgroundColor: uiColors.ink, marginBottom: 20 },
  modalCloseBtn: {
    backgroundColor: uiColors.ink,
    minHeight: 48,
    marginTop: 10,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  explanationCard: {
    backgroundColor: uiColors.peach,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  explanationTitle: { fontSize: 15, fontWeight: '700', color: uiColors.primaryStrong },
  explanationStatus: { fontSize: 13, color: uiColors.primaryStrong, marginTop: 4, marginBottom: 10 },
  explanationPending: { fontSize: 13, color: uiColors.warningText, fontWeight: '600' },
  explanationApproved: { fontSize: 13, color: uiColors.successStrong, fontWeight: '600' },
  explanationButton: {
    backgroundColor: uiColors.primaryStrong,
    borderRadius: 12,
    minHeight: 48,
    paddingVertical: 14,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  explanationButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  explanationModalContent: {
    backgroundColor: uiColors.surface,
    borderRadius: 22,
    width: '100%',
    maxWidth: 420,
    maxHeight: '100%',
    overflow: 'hidden',
  },
  modalScrollContent: { padding: 20 },
  fieldLabel: { fontSize: 13, lineHeight: 20, fontWeight: '600', color: uiColors.ink, marginBottom: 8 },
  explanationInput: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: uiColors.lineStrong,
    borderRadius: 10,
    padding: 12,
    textAlignVertical: 'top',
    fontSize: 14,
    color: uiColors.ink,
    marginBottom: 20,
  },
  reasonInput: { minHeight: 110 },
});
