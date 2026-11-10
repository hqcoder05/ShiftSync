import { colors as uiColors } from '../theme/koreanPalette';
import { createAppStyles } from '../theme/appTheme';
import { ensureTouchTarget } from '../utils/touchTarget';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, CameraView } from 'expo-camera';
import * as Location from 'expo-location';
import { checkDeviceStorage } from '../services/deviceDiagnostics';
import BackIcon from '../components/BackIcon';
import api from '../services/api';
import useActionGuard from '../utils/useActionGuard';

const checks = [ ['camera', 'Camera'], ['gps', 'Vị trí GPS'], ['storage', 'Dung lượng lưu trữ'], ['api', 'Kết nối máy chủ'] ];
export default function DeviceDiagnosticScreen({ navigation }) {
  const [results, setResults] = useState({});
  const [cameraVisible, setCameraVisible] = useState(false);
  const cameraCheck = useRef(null);
  const mounted = useRef(true);
  const gpsCheck = useRef(null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; cameraCheck.current?.(new Error('Đã dừng kiểm tra camera.')); gpsCheck.current?.(); }; }, []);
  const { runAction, busy } = useActionGuard();
  const run = () => runAction('diagnostics', async () => {
    setResults({});
    const test = async (key, work) => {
      if (!mounted.current) return;
      setResults((prev) => ({ ...prev, [key]: { status: 'RUNNING', detail: 'Đang kiểm tra…' } }));
      try { const detail = await work(); if (mounted.current) setResults((prev) => ({ ...prev, [key]: { status: 'PASS', detail } })); }
      catch (error) { if (mounted.current) setResults((prev) => ({ ...prev, [key]: { status: 'FAIL', detail: error.response?.data?.message || error.message } })); }
    };
    await test('camera', async () => {
      const permission = await Camera.requestCameraPermissionsAsync();
      if (!permission.granted) throw new Error('Chưa được cấp quyền camera.');
      if (!mounted.current) throw new Error('Đã dừng kiểm tra.');
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => finish(new Error('Camera không mở được trong 10 giây. Hãy đóng ứng dụng đang dùng camera rồi thử lại.')), 10000);
        const finish = (error) => {
          clearTimeout(timer); cameraCheck.current = null;
          if (mounted.current) setCameraVisible(false);
          if (error) reject(error); else resolve();
        };
        cameraCheck.current = finish;
        setCameraVisible(true);
      });
      return 'Đã cấp quyền và mở camera thành công.';
    });
    await test('gps', async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) throw new Error('Chưa được cấp quyền vị trí.');
      if (!mounted.current) throw new Error('Đã dừng kiểm tra.');
      const position = await new Promise((resolve, reject) => {
        let subscription, finished = false;
        const finish = (error, value) => {
          if (finished) return;
          finished = true; clearTimeout(timer); subscription?.remove(); gpsCheck.current = null;
          if (error) reject(error); else resolve(value);
        };
        const timer = setTimeout(() => finish(new Error('Không nhận được GPS trong 10 giây. Hãy bật vị trí và thử ngoài trời.')), 10000);
        gpsCheck.current = () => finish(new Error('Đã dừng kiểm tra GPS.'));
        if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
          const id = navigator.geolocation.watchPosition((value) => finish(null, value), (error) => finish(new Error(error.message || 'Không nhận được vị trí.')),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
          subscription = { remove: () => navigator.geolocation.clearWatch(id) };
          if (finished) subscription.remove();
        } else {
          Location.watchPositionAsync({ accuracy: Location.Accuracy.High, timeInterval: 1000 }, (value) => finish(null, value), (error) => finish(new Error(String(error))))
            .then((value) => { subscription = value; if (finished) subscription.remove(); })
            .catch((error) => finish(error));
        }
      });
      return `Đã nhận GPS · Sai số ${Number.isFinite(position.coords.accuracy) ? `khoảng ${Math.round(position.coords.accuracy)} m` : 'chưa xác định'}.`;
    });
    await test('storage', checkDeviceStorage);
    await test('api', async () => { const started = Date.now(); const response = await api.get('/users/me', { timeout: 5000 }); if (!response.data?.id) throw new Error('Máy chủ chưa xác nhận phiên đăng nhập.'); return `Đã kết nối · ${Date.now() - started} ms.`; });
  });
  return <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
    <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Quay lại" onPress={() => navigation.goBack()} style={ensureTouchTarget(styles.back)}><BackIcon /></Pressable><Text accessibilityRole="header" style={styles.title}>Kiểm tra thiết bị</Text></View>
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.intro}>Kiểm tra quyền camera, GPS, lưu dữ liệu và kết nối trước khi chấm công.</Text>
      {checks.map(([key, label]) => <View key={key} style={styles.card}>
        <View style={styles.row}><Text style={styles.label}>{label}</Text>{results[key]?.status === 'RUNNING' ? <ActivityIndicator color={uiColors.primaryStrong} /> : <Text style={{ color: results[key]?.status === 'PASS' ? uiColors.success : results[key]?.status === 'FAIL' ? uiColors.danger : uiColors.muted, fontWeight: '600' }}>{results[key]?.status || 'Chưa kiểm tra'}</Text>}</View>
        {!!results[key] && <Text style={styles.detail}>{results[key].detail}</Text>}
        {key === 'camera' && cameraVisible && <CameraView style={styles.cameraPreview} facing="front" onCameraReady={() => cameraCheck.current?.()} onMountError={(event) => cameraCheck.current?.(new Error(event.message || 'Không mở được camera.'))} />}
      </View>)}
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!busy.diagnostics, busy: !!busy.diagnostics }} aria-disabled={!!busy.diagnostics} aria-busy={!!busy.diagnostics} disabled={busy.diagnostics} onPress={run} style={ensureTouchTarget([styles.button, busy.diagnostics && { opacity: 0.6 }])}>{busy.diagnostics && <ActivityIndicator color="#FFFFFF" />}<Text style={styles.buttonText}>{busy.diagnostics ? 'Đang kiểm tra…' : 'Bắt đầu kiểm tra'}</Text></Pressable>
    </ScrollView>
  </SafeAreaView>;
}
const styles = createAppStyles({
  safe: { flex: 1, backgroundColor: uiColors.surface }, header: { minHeight: 56, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: uiColors.line },
  back: { padding: 16 }, title: { fontSize: 19, color: uiColors.ink, fontWeight: '600' }, content: { padding: 20 }, intro: { color: uiColors.muted, lineHeight: 21, marginBottom: 16 },
  card: { paddingVertical: 18, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: uiColors.line }, row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  label: { fontSize: 16, color: "#404B57" }, detail: { fontSize: 13, color: uiColors.muted, lineHeight: 19, marginTop: 8 }, button: { padding: 15, marginTop: 24, borderRadius: 24, backgroundColor: uiColors.orange, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }, buttonText: { color: '#FFFFFF', fontWeight: '600' },
  cameraPreview: { width: '100%', height: 140, borderRadius: 12, marginTop: 12, overflow: 'hidden' },
});
