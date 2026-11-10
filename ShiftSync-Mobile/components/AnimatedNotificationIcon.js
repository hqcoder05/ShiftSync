import { colors as uiColors } from '../theme/koreanPalette';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing } from 'react-native';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';

export default function AnimatedNotificationIcon({ variant = 'bell', size = 34, animated = true }) {
  const swing = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => listener.remove();
  }, []);
  useEffect(() => {
    swing.setValue(0);
    if (!animated || reduceMotion) return;
    const loop = Animated.loop(Animated.sequence(variant === 'megaphone' ? [
      Animated.timing(swing, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(swing, { toValue: -1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(swing, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ] : [
      Animated.timing(swing, { toValue: 1, duration: 320, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(swing, { toValue: -1, duration: 640, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(swing, { toValue: 0, duration: 320, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.delay(500),
    ]));
    loop.start();
    return () => loop.stop();
  }, [animated, reduceMotion, swing, variant]);
  return <Animated.View accessible={false} style={{ width: size, height: size, transform: [{ translateY: -size * 0.25 }, { rotate: swing.interpolate({ inputRange: [-1, 1], outputRange: ['-19deg', '19deg'] }) }, { translateY: size * 0.25 }] }}>
    {variant === 'megaphone' ? <Svg width={size} height={size} viewBox="0 0 150 150" fill="none">
      <G stroke={uiColors.ink} strokeWidth="3.1" strokeLinecap="round" strokeLinejoin="round" transform="rotate(-17 75 75)">
        <Path d="M34 73c-10 1-15 8-15 17s6 14 16 14" />
        <Path d="M49 106l-1 24c0 4 3 6 7 6h10c4 0 6-2 6-5l-2-22" fill="#FFFFFF" />
        <Path d="M33 73c8-6 16-6 24-7l42-19v67l-42-9c-12-1-21-8-24-16-2-6-2-12 0-16Z" fill="#FFFFFF" />
        <Path d="M56 66c-5 13-3 27 2 39" />
        <Ellipse cx="100" cy="81" rx="14" ry="35" fill="#FFFFFF" />
        <Ellipse cx="103" cy="81" rx="8" ry="26" fill={uiColors.ink} strokeWidth="1.5" />
        <Path d="M119 45l5-8M128 61l9-3M129 83l10 3" />
      </G>
    </Svg> : <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Circle cx="32" cy="11" r="3.5" fill="#FFFFFF" stroke={uiColors.ink} strokeWidth="2.3" />
      <Path d="M18 39V29c0-9 5-16 14-16s14 7 14 16v10l5 7c2 3 0 4-3 4H16c-3 0-5-1-3-4Z" fill="#FFFFFF" stroke={uiColors.ink} strokeWidth="2.4" strokeLinejoin="round" />
      <Path d="M26 54c1 6 11 6 12 0" stroke={uiColors.ink} strokeWidth="2.4" strokeLinecap="round" />
    </Svg>}
  </Animated.View>;
}
