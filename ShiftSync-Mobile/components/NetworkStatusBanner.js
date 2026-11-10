import { useEffect, useSyncExternalStore } from 'react';
import { Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getNetworkSnapshot, startNetworkMonitor, subscribeNetwork } from '../services/networkState';
import { colors } from '../theme/appTheme';

export default function NetworkStatusBanner() {
  const state = useSyncExternalStore(subscribeNetwork, getNetworkSnapshot, getNetworkSnapshot);
  useEffect(() => { startNetworkMonitor(); }, []);
  if (state.online) return null;
  return <SafeAreaView edges={['top']} accessibilityRole="alert" style={{ backgroundColor: colors.ink, paddingVertical: 7, paddingHorizontal: 16 }}><Text style={{ color: '#FFFFFF', fontSize: 12, textAlign: 'center' }}>Đang ngoại tuyến · Dữ liệu đã lưu vẫn có thể xem</Text></SafeAreaView>;
}
