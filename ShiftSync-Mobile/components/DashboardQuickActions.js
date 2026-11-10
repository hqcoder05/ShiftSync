import { colors as uiColors } from '../theme/koreanPalette';
import { ensureTouchTarget } from '../utils/touchTarget';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const actions = [
  { label: 'Chấm công', icon: 'time-outline', screen: 'Attendance', color: uiColors.mint },
  { label: 'Chợ ca', icon: 'swap-horizontal-outline', screen: 'Marketplace', color: uiColors.peach },
  { label: 'Đăng ký rảnh', icon: 'calendar-clear-outline', screen: 'Availability', color: uiColors.lavender },
  { label: 'Yêu cầu', icon: 'document-text-outline', screen: 'Request', color: uiColors.sky },
];

function QuickAction({ item, onOpen }) {
  const scale = useRef(new Animated.Value(1)).current;
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => { if (active) setReduceMotion(value); }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { active = false; subscription.remove(); scale.stopAnimation(); };
  }, [scale]);
  const animate = (value) => {
    scale.stopAnimation();
    if (reduceMotion) scale.setValue(1);
    else Animated.spring(scale, { toValue: value, useNativeDriver: true, speed: 32, bounciness: 0 }).start();
  };
  return <Animated.View style={[styles.action, { transform: [{ scale }] }]}>
    <Pressable accessibilityRole="button" accessibilityLabel={item.label} style={ensureTouchTarget(styles.button)}
      onPressIn={() => { animate(0.94); if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {}); }}
      onPressOut={() => animate(1)} onPress={() => onOpen(item.screen)}>
      <View style={[styles.icon, { backgroundColor: item.color }]}><Ionicons name={item.icon} size={23} color="#404B57" accessible={false} /></View>
      <Text numberOfLines={2} style={styles.label}>{item.label}</Text>
    </Pressable>
  </Animated.View>;
}

export default function DashboardQuickActions({ onOpen }) {
  return <View accessibilityLabel="Thao tác nhanh" style={styles.row}>{actions.map((item) => <QuickAction key={item.screen} item={item} onOpen={onOpen} />)}</View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', paddingHorizontal: 14, paddingTop: 18, paddingBottom: 6, gap: 4 },
  action: { flex: 1, minWidth: 0 }, button: { minHeight: 81, alignItems: 'center', paddingHorizontal: 2, paddingVertical: 4 },
  icon: { width: 43, height: 43, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 7 },
  label: { textAlign: 'center', fontSize: 12, lineHeight: 17, color: "#404B57" },
});
