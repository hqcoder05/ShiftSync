import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, View } from 'react-native';
import { colors } from '../theme/appTheme';

const Block = ({ style }) => <View style={[{ backgroundColor: colors.line, borderRadius: 8 }, style]} />;

export default function ContentSkeleton({ variant = 'list' }) {
  const opacity = useRef(new Animated.Value(0.58)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => { if (active) setReduceMotion(enabled); }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { active = false; subscription.remove(); };
  }, []);
  useEffect(() => {
    if (reduceMotion) { opacity.setValue(1); return undefined; }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 720, useNativeDriver: false }),
      Animated.timing(opacity, { toValue: 0.58, duration: 720, useNativeDriver: false }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [opacity, reduceMotion]);

  const attendance = variant === 'attendance';
  const messages = variant === 'messages';
  return (
    <Animated.View accessibilityLabel="Đang tải nội dung" accessibilityState={{ busy: true }} aria-busy style={{ opacity, padding: 16, gap: 14 }}>
      {messages ? [0, 1, 2, 3, 4].map((key) => <View key={key} style={{ flexDirection: 'row', justifyContent: key % 2 ? 'flex-end' : 'flex-start' }}>
        <Block style={{ width: key === 2 ? '72%' : key % 2 ? '48%' : '60%', height: key === 3 ? 76 : 48, borderRadius: 18, backgroundColor: key % 2 ? colors.subtle : colors.line }} />
      </View>) : <>
        <View style={{ padding: 20, gap: 13, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }}>
          <Block style={{ width: attendance ? '38%' : '54%', height: 12 }} />
          <Block style={{ width: attendance ? '72%' : '84%', height: attendance ? 28 : 22 }} />
          <Block style={{ width: '100%', height: attendance ? 128 : 82, borderRadius: 16, backgroundColor: colors.subtle }} />
        </View>
        {[0, 1, 2].map((key) => <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: 13, padding: 15, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }}>
          <Block style={{ width: 42, height: 42, borderRadius: 14 }} />
          <View style={{ flex: 1, gap: 9 }}><Block style={{ width: key === 1 ? '57%' : '76%', height: 14 }} /><Block style={{ width: key === 2 ? '88%' : '65%', height: 11 }} /></View>
        </View>)}
      </>}
    </Animated.View>
  );
}
