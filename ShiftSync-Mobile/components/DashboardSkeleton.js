import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, View } from 'react-native';
import { colors } from '../theme/appTheme';

export default function DashboardSkeleton() {
  const opacity = useRef(new Animated.Value(0.55)).current;
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => { if (active) setReduceMotion(enabled); }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { active = false; subscription.remove(); };
  }, []);
  useEffect(() => {
    if (reduceMotion) { opacity.setValue(1); return; }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 750, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.55, duration: 750, useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [opacity, reduceMotion]);
  const line = (width, height, extra = {}) => <View style={{ width, height, backgroundColor: colors.line, borderRadius: 5, ...extra }} />;
  return <Animated.View accessibilityLabel="Đang tải trang chủ" accessibilityState={{ busy: true }} aria-busy={true} style={{ opacity }}>
    <View style={{ backgroundColor: colors.surface, margin: 16, marginTop: 12, padding: 20, borderRadius: 22, gap: 18 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>{line(58, 58, { borderRadius: 19 })}<View style={{ flex: 1, gap: 8 }}>{line('48%', 11)}{line('75%', 18)}</View>{line(40, 40, { borderRadius: 14 })}</View>
      {line('45%', 10)}{line('80%', 29)}{line('100%', 74, { backgroundColor: colors.subtle })}
    </View>
    <View style={{ marginHorizontal: 16, padding: 20, borderRadius: 20, backgroundColor: colors.surface, gap: 22 }}>{line('60%', 19)}{[0, 1].map((key) => <View key={key} style={{ flexDirection: 'row', gap: 15 }}>{line(32, 46)}<View style={{ flex: 1, gap: 9 }}>{line('80%', 16)}{line('65%', 13)}</View></View>)}</View>
  </Animated.View>;
}
