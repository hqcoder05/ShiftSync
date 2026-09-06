import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { StatusBar } from 'expo-status-bar';

import { getMyAttendance, submitSelfieAttendance } from '../services/attendanceService';
import { getMyShifts } from '../services/shiftService';

const localDateISO = () => {
  const d = new Date();
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 10);
};

const formatTime = (value) => {
  if (!value) return '--:--';
  if (typeof value === 'string' && value.length === 8) return value.slice(0, 5);
  try {
    const d = new Date(value);
    return new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(d);
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
  switch (status) {
    case 'PRESENT':
      return { text: 'Đúng giờ', color: '#166534', bg: '#DCFCE7' };
    case 'LATE':
      return { text: 'Đi trễ', color: '#9A3412', bg: '#FFEDD5' };
    case 'EARLY_LEAVE':
      return { text: 'Về sớm', color: '#C2410C', bg: '#FFF7ED' };
    case 'ABSENT':
      return { text: 'Vắng mặt', color: '#991B1B', bg: '#FEE2E2' };
    default:
      return { text: 'Đã ghi nhận', color: '#374151', bg: '#F3F4F6' };
  }
};

export default function AttendanceScreenLive({ navigation }) {
  const cameraRef = useRef(null);
  const scrollViewRef = useRef(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [cameraFacing, setCameraFacing] = useState('front'); // Selfie mặc định
  const [cameraMode, setCameraMode] = useState('CHECK_IN'); // 'CHECK_IN' hoặc 'CHECK_OUT'

  const [attendance, setAttendance] = useState([]);
  const [shift, setShift] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cameraVisible, setCameraVisible] = useState(false);

  // Chế độ chấm công: 'ON_TIME' (Đúng giờ khi test) hoặc 'REAL_TIME' (Theo giờ thực tế)
  const [testMode, setTestMode] = useState('ON_TIME');

  // Modal xem ảnh phóng to
  const [previewPhoto, setPreviewPhoto] = useState(null); // { uri, title, time }

  const loadData = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const [attendanceRes, shiftsRes] = await Promise.all([getMyAttendance(), getMyShifts()]);
      setAttendance(attendanceRes.data || []);
      const today = localDateISO();
      const available = (shiftsRes.data || []).filter(
        (item) => item.status === 'PUBLISHED' || item.status === 'COMPLETED'
      );
      // Tìm ca làm của hôm nay, nếu không có lấy ca gần nhất để hỗ trợ test
      const currentShift = available.find((item) => item.shiftDate === today) || (available.length > 0 ? available[0] : null);
      setShift(currentShift || null);
    } catch (error) {
      if (isInitial) {
        Alert.alert('Lỗi dữ liệu', 'Không thể kết nối máy chủ để tải lịch làm việc.');
      }
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(true);
    const unsubscribe = navigation?.addListener?.('focus', () => loadData(false));
    const interval = setInterval(() => loadData(false), 5000); // Tự động cập nhật mượt mà mỗi 5s khi quản lý đổi giờ trên Web
    return () => {
      unsubscribe?.();
      clearInterval(interval);
    };
  }, [navigation, loadData]);

  // Tìm bản ghi chấm công của ca hiện tại
  const todayAttendance = attendance.find(
    (a) => (shift && a.shiftId === shift.id) || a.shiftDate === (shift?.shiftDate || localDateISO())
  );
  const isCheckedIn = !!(todayAttendance && todayAttendance.checkInTime);
  const isCheckedOut = !!(todayAttendance && todayAttendance.checkOutTime);

  // Mở camera chụp ảnh check-in hoặc check-out
  const openCamera = async (mode) => {
    if (!shift) {
      return Alert.alert('Chưa có ca làm', 'Bạn chưa được phân công ca làm việc để chấm công.');
    }
    if (!cameraPermission?.granted) {
      const permission = await requestCameraPermission();
      if (!permission.granted) {
        return Alert.alert('Quyền Camera', 'Vui lòng cấp quyền truy cập Camera để chụp ảnh xác nhận.');
      }
    }
    const locationPermission = await Location.requestForegroundPermissionsAsync();
    if (locationPermission.status !== 'granted') {
      Alert.alert('Quyền Vị trí', 'Vui lòng cho phép quyền vị trí để ghi nhận tọa độ ca làm.');
    }
    setCameraMode(mode);
    setCameraVisible(true);
  };

  // Chụp ảnh và gửi chấm công lên máy chủ
  const captureAndSubmit = async () => {
    if (!cameraRef.current || !shift) return;
    setSubmitting(true);
    try {
      const [photo, location] = await Promise.all([
        cameraRef.current.takePictureAsync({ quality: 0.6 }),
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => ({
          coords: { latitude: 10.8168, longitude: 106.6334 },
        })),
      ]);

      const forcedStatus = testMode === 'ON_TIME' ? 'PRESENT' : null;

      const response = await submitSelfieAttendance({
        shiftId: shift.id,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        photoUri: photo.uri,
        forcedStatus,
      });

      setCameraVisible(false);

      if (cameraMode === 'CHECK_IN') {
        const isLate = response.data.status === 'LATE' && response.data.lateMinutes > 0;
        if (isLate) {
          Alert.alert(
            'Check In thành công',
            `Ghi nhận vào ca lúc ${formatTime(response.data.checkInTime)}. Trạng thái: Đi trễ ${response.data.lateMinutes} phút.`
          );
        } else {
          Alert.alert(
            'Check In thành công',
            `Ghi nhận vào ca lúc ${formatTime(response.data.checkInTime)}. Trạng thái: Đúng giờ.`
          );
        }
      } else {
        Alert.alert(
          'Check Out thành công',
          `Ghi nhận ra ca lúc ${formatTime(response.data.checkOutTime)}. Đã hoàn thành ca làm việc!`
        );
      }

      loadData();
    } catch (error) {
      Alert.alert('Chấm công không thành công', error.response?.data?.message || error.message || 'Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  // Màn hình Camera chụp ảnh Check-in / Check-out
  if (cameraVisible) {
    const isCheckIn = cameraMode === 'CHECK_IN';
    return (
      <SafeAreaView style={styles.cameraPage}>
        <StatusBar style="light" />
        <CameraView ref={cameraRef} style={styles.camera} facing={cameraFacing} />
        
        {/* Header trên camera */}
        <View style={styles.cameraTopBar}>
          <Text style={styles.cameraTitle}>
            {isCheckIn ? 'Chụp ảnh Check In (Vào ca)' : 'Chụp ảnh Check Out (Ra ca)'}
          </Text>
          <Text style={styles.cameraSubtitle}>
            {shift ? `${shift.shiftDate} · ${timeRange(shift)}` : ''}
          </Text>
        </View>

        {/* Nút thao tác dưới camera */}
        <View style={styles.cameraOverlay}>
          <View style={styles.cameraActionRow}>
            <TouchableOpacity
              onPress={() => setCameraFacing((prev) => (prev === 'front' ? 'back' : 'front'))}
              style={styles.flipBtn}
            >
              <Text style={styles.flipText}>Đổi Camera</Text>
            </TouchableOpacity>

            <Pressable disabled={submitting} onPress={captureAndSubmit} style={styles.shutter}>
              {submitting ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <View style={[styles.shutterDot, isCheckIn ? styles.shutterCheckIn : styles.shutterCheckOut]} />
              )}
            </Pressable>

            <Pressable onPress={() => setCameraVisible(false)} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Đóng</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
      >
        <Text style={styles.headerTitle}>Chấm công ca làm</Text>

        {/* ══ TUỲ CHỌN CHẾ ĐỘ CHẤM CÔNG KHI TEST ══ */}
        <View style={styles.modeContainer}>
          <Text style={styles.modeLabel}>Chế độ ghi nhận:</Text>
          <View style={styles.modeToggleRow}>
            <TouchableOpacity
              onPress={() => setTestMode('ON_TIME')}
              style={[styles.modeTab, testMode === 'ON_TIME' && styles.modeTabActive]}
            >
              <Text style={[styles.modeTabText, testMode === 'ON_TIME' && styles.modeTabTextActive]}>
                Đúng giờ (Chuẩn)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setTestMode('REAL_TIME')}
              style={[styles.modeTab, testMode === 'REAL_TIME' && styles.modeTabActive]}
            >
              <Text style={[styles.modeTabText, testMode === 'REAL_TIME' && styles.modeTabTextActive]}>
                Theo giờ thực tế
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#18181B" style={styles.loader} />
        ) : (
          <>
            {/* ══ THẺ CA LÀM VIỆC HIỆN TẠI ══ */}
            <View style={styles.shiftCard}>
              <View style={styles.shiftHeaderRow}>
                <Text style={styles.cardShiftDate}>{shift?.shiftDate ? formatDate(shift.shiftDate) : 'Chưa có ca làm'}</Text>
                {todayAttendance?.status && (
                  <View style={[styles.badge, { backgroundColor: statusBadge(todayAttendance.status).bg }]}>
                    <Text style={[styles.badgeText, { color: statusBadge(todayAttendance.status).color }]}>
                      {statusBadge(todayAttendance.status).text}
                    </Text>
                  </View>
                )}
              </View>

              <Text style={styles.shiftTime}>{shift ? timeRange(shift) : 'Không có ca hôm nay'}</Text>
              <Text style={styles.storeName}>{shift?.storeName || 'Highlands Coffee'}</Text>
              <Text style={styles.storeAddress}>{shift?.storeAddress || 'Chi nhánh làm việc'}</Text>

              {/* 2 LẦN CHECK CỦA CA NÀY (BẤM ĐỂ XEM ẢNH HOẶC CHẤM CÔNG) */}
              <View style={styles.checksGrid}>
                {/* LẦN 1: CHECK IN */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    if (todayAttendance?.checkInPhotoBase64) {
                      setPreviewPhoto({
                        uri: `data:image/jpeg;base64,${todayAttendance.checkInPhotoBase64}`,
                        title: 'Ảnh chụp Check In',
                        time: formatTime(todayAttendance.checkInTime),
                      });
                    } else if (!isCheckedIn) {
                      openCamera('CHECK_IN');
                    } else {
                      scrollViewRef.current?.scrollToEnd({ animated: true });
                    }
                  }}
                  style={[styles.checkCol, isCheckedIn && styles.checkColDone]}
                >
                  <Text style={styles.checkColTitle}>Lần 1: Check In</Text>
                  <Text style={styles.checkColTime}>
                    {todayAttendance?.checkInTime ? formatTime(todayAttendance.checkInTime) : 'Chưa vào ca'}
                  </Text>
                  
                  {todayAttendance?.checkInPhotoBase64 ? (
                    <View style={styles.thumbnailWrap}>
                      <Image
                        source={{ uri: `data:image/jpeg;base64,${todayAttendance.checkInPhotoBase64}` }}
                        style={styles.thumbnailPhoto}
                      />
                      <Text style={styles.previewHint}>Bấm xem ảnh</Text>
                    </View>
                  ) : (
                    <View style={styles.noPhotoPlaceholder}>
                      <Text style={styles.noPhotoText}>Chưa có ảnh</Text>
                      {!isCheckedIn && <Text style={styles.actionHint}>Bấm để Check In</Text>}
                    </View>
                  )}
                </TouchableOpacity>

                {/* LẦN 2: CHECK OUT */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    if (todayAttendance?.checkOutPhotoBase64) {
                      setPreviewPhoto({
                        uri: `data:image/jpeg;base64,${todayAttendance.checkOutPhotoBase64}`,
                        title: 'Ảnh chụp Check Out',
                        time: formatTime(todayAttendance.checkOutTime),
                      });
                    } else if (isCheckedIn && !isCheckedOut) {
                      openCamera('CHECK_OUT');
                    } else {
                      scrollViewRef.current?.scrollToEnd({ animated: true });
                    }
                  }}
                  style={[styles.checkCol, isCheckedOut && styles.checkColDone]}
                >
                  <Text style={styles.checkColTitle}>Lần 2: Check Out</Text>
                  <Text style={styles.checkColTime}>
                    {todayAttendance?.checkOutTime ? formatTime(todayAttendance.checkOutTime) : 'Chưa ra ca'}
                  </Text>
                  
                  {todayAttendance?.checkOutPhotoBase64 ? (
                    <View style={styles.thumbnailWrap}>
                      <Image
                        source={{ uri: `data:image/jpeg;base64,${todayAttendance.checkOutPhotoBase64}` }}
                        style={styles.thumbnailPhoto}
                      />
                      <Text style={styles.previewHint}>Bấm xem ảnh</Text>
                    </View>
                  ) : (
                    <View style={styles.noPhotoPlaceholder}>
                      <Text style={styles.noPhotoText}>Chưa có ảnh</Text>
                      {isCheckedIn && !isCheckedOut && <Text style={styles.actionHint}>Bấm để Check Out</Text>}
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* ══ NÚT HÀNH ĐỘNG CHẤM CÔNG (CHỤP ẢNH TRỰC TIẾP) ══ */}
            <View style={styles.actionsContainer}>
              {!isCheckedIn ? (
                <TouchableOpacity
                  disabled={!shift || submitting}
                  onPress={() => openCamera('CHECK_IN')}
                  style={[styles.actionBtn, styles.checkInBtn, !shift && styles.btnDisabled]}
                >
                  <Text style={styles.actionBtnText}>Chụp ảnh Check In</Text>
                </TouchableOpacity>
              ) : !isCheckedOut ? (
                <TouchableOpacity
                  disabled={!shift || submitting}
                  onPress={() => openCamera('CHECK_OUT')}
                  style={[styles.actionBtn, styles.checkOutBtn]}
                >
                  <Text style={styles.actionBtnText}>Chụp ảnh Check Out</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.completedBanner}>
                  <Text style={styles.completedText}>Ca làm việc đã hoàn thành đầy đủ</Text>
                </View>
              )}

              {/* Nút xem lịch sử nhanh */}
              <TouchableOpacity
                onPress={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                style={styles.viewHistoryQuickBtn}
              >
                <Text style={styles.viewHistoryQuickText}>Xem toàn bộ lịch sử chấm công ↓</Text>
              </TouchableOpacity>
            </View>

            {/* ══ LỊCH SỬ CHẤM CÔNG ══ */}
            <View style={styles.historyHeaderRow}>
              <Text style={styles.historySectionTitle}>Lịch sử chấm công</Text>
              <TouchableOpacity onPress={loadData} style={styles.refreshBtn}>
                <Text style={styles.refreshBtnText}>Làm mới</Text>
              </TouchableOpacity>
            </View>

            {attendance.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>Chưa có lịch sử chấm công nào.</Text>
              </View>
            ) : (
              attendance.map((item) => {
                const badge = statusBadge(item.status);
                return (
                  <View key={item.id} style={styles.historyItemCard}>
                    {/* Hàng trên: Ngày + Trạng thái */}
                    <View style={styles.historyItemHeader}>
                      <View>
                        <Text style={styles.historyItemDate}>{formatDate(item.shiftDate)}</Text>
                        <Text style={styles.historyItemStore}>
                          {item.storeName || 'Highlands Coffee'}
                          {item.lateMinutes > 0 ? ` · Trễ ${item.lateMinutes} phút` : ''}
                        </Text>
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
                          <TouchableOpacity
                            onPress={() =>
                              setPreviewPhoto({
                                uri: `data:image/jpeg;base64,${item.checkInPhotoBase64}`,
                                title: 'Ảnh Check In',
                                time: formatTime(item.checkInTime),
                              })
                            }
                            style={styles.historyPhotoWrap}
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
                          <TouchableOpacity
                            onPress={() =>
                              setPreviewPhoto({
                                uri: `data:image/jpeg;base64,${item.checkOutPhotoBase64}`,
                                title: 'Ảnh Check Out',
                                time: formatTime(item.checkOutTime),
                              })
                            }
                            style={styles.historyPhotoWrap}
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
          </>
        )}
      </ScrollView>

      {/* ══ MODAL XEM ẢNH PHÓNG TO ══ */}
      <Modal visible={!!previewPhoto} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{previewPhoto?.title || 'Ảnh chấm công'}</Text>
            <Text style={styles.modalSubtitle}>Thời gian ghi nhận: {previewPhoto?.time}</Text>

            {previewPhoto?.uri && (
              <Image source={{ uri: previewPhoto.uri }} style={styles.modalFullImage} resizeMode="contain" />
            )}

            <TouchableOpacity onPress={() => setPreviewPhoto(null)} style={styles.modalCloseBtn}>
              <Text style={styles.modalCloseText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16, paddingBottom: 40 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#0F172A', marginBottom: 14, textAlign: 'center' },
  loader: { marginTop: 60 },

  // Mode switcher
  modeContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modeLabel: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 },
  modeToggleRow: { flexDirection: 'row', gap: 8 },
  modeTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
  },
  modeTabActive: { backgroundColor: '#0F172A' },
  modeTabText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  modeTabTextActive: { color: '#FFFFFF' },

  // Shift card
  shiftCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    marginBottom: 16,
  },
  shiftHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardShiftDate: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  shiftTime: { fontSize: 24, fontWeight: '800', color: '#0F172A', marginTop: 4 },
  storeName: { fontSize: 14, fontWeight: '600', color: '#334155', marginTop: 2 },
  storeAddress: { fontSize: 12.5, color: '#64748B', marginTop: 2 },

  // Checks grid (Check in & Check out)
  checksGrid: {
    flexDirection: 'row',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderColor: '#F1F5F9',
    gap: 10,
  },
  checkCol: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  checkColDone: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  checkColTitle: { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 2 },
  checkColTime: { fontSize: 15, fontWeight: '800', color: '#0F172A', marginBottom: 8 },
  thumbnailWrap: { alignItems: 'center' },
  thumbnailPhoto: { width: 68, height: 68, borderRadius: 8, backgroundColor: '#E2E8F0' },
  previewHint: { fontSize: 11, fontWeight: '600', color: '#2563EB', marginTop: 4 },
  noPhotoPlaceholder: {
    width: 68,
    height: 68,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noPhotoText: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },
  actionHint: { fontSize: 9.5, color: '#2563EB', fontWeight: '700', marginTop: 2, textAlign: 'center' },

  // Actions
  actionsContainer: { marginBottom: 20 },
  actionBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  checkInBtn: { backgroundColor: '#0F172A' },
  checkOutBtn: { backgroundColor: '#1E293B' },
  btnDisabled: { opacity: 0.5 },
  actionBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  completedBanner: {
    backgroundColor: '#DCFCE7',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  completedText: { color: '#166534', fontSize: 15, fontWeight: '700' },
  viewHistoryQuickBtn: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 6,
  },
  viewHistoryQuickText: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

  // History section
  historyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  historySectionTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  refreshBtn: { paddingVertical: 4, paddingHorizontal: 8 },
  refreshBtnText: { fontSize: 13, fontWeight: '600', color: '#2563EB' },

  emptyCard: { paddingVertical: 24, alignItems: 'center' },
  emptyText: { fontSize: 13.5, color: '#94A3B8' },

  historyItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  historyItemDate: { fontSize: 13.5, fontWeight: '700', color: '#0F172A' },
  historyItemStore: { fontSize: 12, color: '#64748B', marginTop: 2 },

  historyDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
  },
  historyCheckItem: { flex: 1, alignItems: 'center' },
  historyCheckLabel: { fontSize: 11, fontWeight: '600', color: '#64748B' },
  historyCheckTime: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 6 },
  historyPhotoWrap: { alignItems: 'center' },
  historyThumb: { width: 52, height: 52, borderRadius: 6, backgroundColor: '#E2E8F0' },
  thumbSubText: { fontSize: 10.5, fontWeight: '600', color: '#2563EB', marginTop: 2 },
  historyNoPhotoBox: {
    width: 52,
    height: 52,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  historyNoPhotoText: { fontSize: 10, color: '#94A3B8', textAlign: 'center' },
  historyDivider: { width: 1, height: 50, backgroundColor: '#E2E8F0', marginHorizontal: 8 },

  // Badges
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11.5, fontWeight: '700' },

  // Camera screen
  cameraPage: { flex: 1, backgroundColor: '#000000' },
  camera: { flex: 1 },
  cameraTopBar: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 10,
    borderRadius: 12,
  },
  cameraTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  cameraSubtitle: { color: '#CBD5E1', fontSize: 12, marginTop: 2 },

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
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterDot: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  shutterCheckIn: { backgroundColor: '#0F172A' },
  shutterCheckOut: { backgroundColor: '#1E293B' },
  cancelBtn: { paddingHorizontal: 14, paddingVertical: 10 },
  cancelText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  modalSubtitle: { fontSize: 12.5, color: '#64748B', marginTop: 4, marginBottom: 12 },
  modalFullImage: { width: 280, height: 320, borderRadius: 12, backgroundColor: '#000000', marginBottom: 16 },
  modalCloseBtn: {
    backgroundColor: '#0F172A',
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 8,
  },
  modalCloseText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
});
