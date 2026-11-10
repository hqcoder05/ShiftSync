import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated } from 'react-native';
import { useIsFocused } from '@react-navigation/native';

// One short entrance per visit; no repeating animation around working content.
export default function ScreenEntrance({ children }) {
  const focused = useIsFocused();
  const progress = useRef(new Animated.Value(1)).current;
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted) setReduced(value); }).catch(() => {});
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { mounted = false; listener.remove(); };
  }, []);
  useEffect(() => {
    progress.stopAnimation();
    if (!focused || reduced) { progress.setValue(1); return undefined; }
    progress.setValue(0);
    const animation = Animated.timing(progress, { toValue: 1, duration: 260, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [focused, reduced, progress]);
  return <Animated.View style={{ flex: 1, opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }}>{children}</Animated.View>;
}
