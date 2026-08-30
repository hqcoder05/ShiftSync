import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { StatusBar } from 'expo-status-bar';
import { getMyAttendance, getMyShifts, submitSelfieAttendance } from '../services/attendanceService';

const localDateISO = (value = new Date()) => {
  const timezoneOffset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - timezoneOffset).toISOString().slice(0, 10);
};
const formatTime = (value) => value ? new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : '—';
const formatDate = (value) => value ? new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(`${value}T00:00:00`)) : '';
const timeRange = (shift) => `${String(shift.startTime).slice(0, 5)} – ${String(shift.endTime).slice(0, 5)}`;
const statusText = (status) => ({ PRESENT: 'Đúng giờ', LATE: 'Đi trễ', EARLY_LEAVE: 'Về sớm', ABSENT: 'Vắng' }[status] || 'Chưa rõ');

export default function AttendanceScreenLive() {
  const cameraRef = useRef(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [attendance, setAttendance] = useState([]);
  const [shift, setShift] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cameraVisible, setCameraVisible] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [attendanceRes, shiftsRes] = await Promise.all([getMyAttendance(), getMyShifts()]);
      setAttendance(attendanceRes.data || []);
      const today = localDateISO();
      const available = (shiftsRes.data || []).filter((item) => item.status === 'PUBLISHED' || item.status === 'COMPLETED');
      setShift(available.find((item) => item.shiftDate === today) || null);
    } catch (error) {
      Alert.alert('Không tải được dữ liệu', 'Hãy kiểm tra kết nối đến máy chủ rồi thử lại.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const beginAttendance = async () => {
    if (!shift) return Alert.alert('Chưa có ca làm', 'Bạn chưa được phân công ca để chấm công.');
    if (!cameraPermission?.granted) {
      const permission = await requestCameraPermission();
      if (!permission.granted) return Alert.alert('Cần quyền camera', 'Hãy cho phép camera để chụp ảnh xác thực.');
    }
    const locationPermission = await Location.requestForegroundPermissionsAsync();
    if (locationPermission.status !== 'granted') return Alert.alert('Cần quyền vị trí', 'Hãy cho phép vị trí chính xác để chấm công.');
    setCameraVisible(true);
  };

  const captureAndSubmit = async () => {
    if (!cameraRef.current || !shift) return;
    setSubmitting(true);
    try {
      const [photo, location] = await Promise.all([
        cameraRef.current.takePictureAsync({ quality: 0.55 }),
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      ]);
      const response = await submitSelfieAttendance({
        shiftId: shift.id, latitude: location.coords.latitude, longitude: location.coords.longitude, photoUri: photo.uri,
      });
      setCameraVisible(false);
      Alert.alert('Chấm công thành công', response.data.checkOutTime ? 'Đã ghi nhận giờ ra ca.' : 'Đã ghi nhận giờ vào ca.');
      loadData();
    } catch (error) {
      Alert.alert('Chấm công không thành công', error.response?.data?.message || error.message || 'Vui lòng thử lại.');
    } finally { setSubmitting(false); }
  };

  if (cameraVisible) return <SafeAreaView style={styles.cameraPage}>
    <StatusBar style="light" /><CameraView ref={cameraRef} style={styles.camera} facing="front" mirror />
    <View style={styles.cameraOverlay}><Text style={styles.cameraHint}>Đặt khuôn mặt vào khung rồi chụp ảnh</Text>
      <Pressable disabled={submitting} onPress={captureAndSubmit} style={styles.shutter}>{submitting ? <ActivityIndicator color="#333" /> : <View style={styles.shutterDot} />}</Pressable>
      <Pressable onPress={() => setCameraVisible(false)}><Text style={styles.cancel}>Hủy</Text></Pressable>
    </View>
  </SafeAreaView>;

  return <SafeAreaView style={styles.safe}><StatusBar style="dark" />
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>Chấm công</Text>
      {loading ? <ActivityIndicator size="large" color="#428531" style={styles.loader} /> : <>
        <View style={styles.locationBanner}><Text style={styles.locationLabel}>Vị trí chấm công</Text><Text style={styles.locationSub}>GPS sẽ được xác thực tại thời điểm chụp ảnh</Text></View>
        <View style={styles.shiftCard}><Text style={styles.cardLabel}>Ca làm được phân công</Text>
          <Text style={styles.shiftTime}>{shift ? timeRange(shift) : 'Chưa có ca hôm nay'}</Text>
          <Text style={styles.cardNote}>Ảnh selfie, thời gian máy chủ và vị trí GPS thực tế sẽ được lưu.</Text>
        </View>
        <Pressable disabled={!shift} onPress={beginAttendance} style={[styles.attendanceButton, !shift && styles.attendanceButtonDisabled]}><Text style={styles.attendanceButtonText}>Chụp ảnh chấm công</Text></Pressable>
        <Text style={styles.historyTitle}>Lịch sử chấm công</Text>
        {attendance.length === 0 ? <Text style={styles.empty}>Chưa có lịch sử chấm công.</Text> : attendance.map((item) => <View key={item.id} style={styles.historyCard}>
          <Image source={item.checkInPhotoBase64 ? { uri: `data:image/jpeg;base64,${item.checkInPhotoBase64}` } : undefined} style={styles.historyPhoto} />
          <View style={styles.historyInfo}><Text style={styles.historyDate}>{formatDate(item.shiftDate)}</Text><Text style={styles.historyLine}>Vào: {formatTime(item.checkInTime)} · Ra: {formatTime(item.checkOutTime)}</Text><Text style={styles.historyLine}>{item.storeName || 'Cửa hàng'} · {statusText(item.status)}</Text></View>
          {item.status === 'LATE' && <Text style={styles.warning}>▲</Text>}
        </View>)}
      </>}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' }, content: { padding: 22, paddingBottom: 42 }, title: { fontSize: 24, fontWeight: '700', textAlign: 'center', color: '#333', marginBottom: 22 }, loader: { marginTop: 80 },
  locationBanner: { borderRadius: 14, backgroundColor: '#ECF9E8', padding: 18, marginBottom: 14 }, locationLabel: { fontWeight: '700', fontSize: 16, color: '#333' }, locationSub: { color: '#596459', marginTop: 6, fontSize: 14 },
  shiftCard: { backgroundColor: '#ECF9E8', borderRadius: 15, padding: 20 }, cardLabel: { color: '#626B61', fontSize: 14 }, shiftTime: { fontSize: 25, fontWeight: '700', color: '#333', marginTop: 6 }, cardNote: { color: '#626B61', marginTop: 12, lineHeight: 20 },
  attendanceButton: { alignSelf: 'center', backgroundColor: '#ECF9E8', borderRadius: 10, paddingVertical: 13, paddingHorizontal: 25, marginVertical: 24, borderWidth: 1, borderColor: '#C8E8C0' }, attendanceButtonDisabled: { opacity: 0.45 }, attendanceButtonText: { fontSize: 18, fontWeight: '700', color: '#333' },
  historyTitle: { fontSize: 21, fontWeight: '700', color: '#333', borderBottomWidth: 2, borderColor: '#F0ECEC', paddingBottom: 12, marginBottom: 12 }, empty: { textAlign: 'center', color: '#777', marginTop: 28 }, historyCard: { minHeight: 94, borderWidth: 1, borderColor: '#F0ECEC', borderRadius: 14, marginBottom: 12, padding: 10, flexDirection: 'row', alignItems: 'center' }, historyPhoto: { width: 64, height: 64, borderRadius: 10, backgroundColor: '#ECF9E8' }, historyInfo: { flex: 1, marginLeft: 11 }, historyDate: { fontWeight: '700', color: '#333', textTransform: 'capitalize' }, historyLine: { color: '#626B61', fontSize: 13, marginTop: 4 }, warning: { color: '#E6AD00', fontSize: 25, marginLeft: 4 },
  cameraPage: { flex: 1, backgroundColor: '#000' }, camera: { flex: 1 }, cameraOverlay: { position: 'absolute', left: 0, right: 0, bottom: 38, alignItems: 'center', gap: 18 }, cameraHint: { color: '#fff', fontSize: 16, fontWeight: '600', backgroundColor: 'rgba(0,0,0,.45)', padding: 10, borderRadius: 8 }, shutter: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }, shutterDot: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#ECF9E8', borderWidth: 2, borderColor: '#428531' }, cancel: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
