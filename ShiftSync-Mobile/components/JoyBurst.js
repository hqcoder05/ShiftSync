import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, View } from 'react-native';

const pieces = [
  [-92, -48, '#D6B878', -24], [89, -42, '#8EAF9D', 24],
  [-64, -83, '#B4A7C8', 35], [54, -91, '#D89780', -35],
  [-108, 6, '#A4B6CB', 15], [108, 10, '#CBB58A', -15],
];

// A brief acknowledgement of a completed action, with no animation loop.
export default function JoyBurst({ run = false }) {
  const progress = useRef(new Animated.Value(0)).current;
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then(reduced => { if (mounted) setAllowed(!reduced); }).catch(() => {});
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', reduced => setAllowed(!reduced));
    return () => { mounted = false; motion.remove(); };
  }, []);
  useEffect(() => {
    if (!run || !allowed) return;
    progress.setValue(0);
    const animation = Animated.timing(progress, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [run, allowed, progress]);
  if (!run || !allowed) return null;
  return <View pointerEvents="none" accessible={false} style={{ position: 'absolute', top: 48, left: '50%', zIndex: 5 }}>
    {pieces.map(([x, y, color, angle], index) => <Animated.View key={index} style={{ position: 'absolute', width: 7, height: index % 2 ? 10 : 7, borderRadius: 2, backgroundColor: color, opacity: progress.interpolate({ inputRange: [0, 0.1, 0.7, 1], outputRange: [0, 1, 1, 0] }), transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, x] }) }, { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, y] }) }, { rotate: `${angle}deg` }] }} />)}
  </View>;
}
