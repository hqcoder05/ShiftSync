import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  Modal,
  Easing,
} from 'react-native';
import Svg, { Path, Polygon, Defs, LinearGradient, Stop, Circle } from 'react-native-svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * PaperPlane3D.native.js — Máy bay giấy 3D bay chéo qua toàn màn hình điện thoại
 * ─────────────────────────────────────────────────────────────────────────────
 * Bay từ góc dưới-trái (bottom-left) chéo qua góc trên-phải (top-right)
 * Mesh origami 3D to, rõ ràng, với vệt sáng trail và confetti rực rỡ.
 */
export default function PaperPlane3D({
  launched = false,
  color = '#4ade80',
  width = 90,
  height = 65,
  style,
}) {
  const [showOverlay, setShowOverlay] = useState(false);

  // Animation values for flight
  const flightProgress = useRef(new Animated.Value(0)).current;
  const idleAnim = useRef(new Animated.Value(0)).current;

  // Idle floating animation
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(idleAnim, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(idleAnim, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  // Launch trigger
  useEffect(() => {
    if (launched) {
      setShowOverlay(true);
      flightProgress.setValue(0);

      Animated.timing(flightProgress, {
        toValue: 1,
        duration: 2600,
        easing: Easing.bezier(0.2, 0.0, 0.3, 1),
        useNativeDriver: true,
      }).start(() => {
        setShowOverlay(false);
      });
    }
  }, [launched]);

  // Interpolations for flight trajectory:
  // Start: bottom-left corner (x: -120, y: SCREEN_HEIGHT + 60)
  // End:   top-right corner  (x: SCREEN_WIDTH + 120, y: -130)
  const translateX = flightProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-120, SCREEN_WIDTH + 130],
  });

  const translateY = flightProgress.interpolate({
    inputRange: [0, 0.25, 0.6, 1],
    outputRange: [
      SCREEN_HEIGHT + 60,   // bắt đầu: góc dưới-trái
      SCREEN_HEIGHT * 0.72, // sủa sang cuối 1/4 chuỗi bay
      SCREEN_HEIGHT * 0.3,  // giữa đoạn bay
      -130,                 // kết thúc: góc trên-phải
    ],
  });

  const rotateZ = flightProgress.interpolate({
    inputRange: [0, 0.15, 0.5, 0.85, 1],
    outputRange: ['-40deg', '-37deg', '-33deg', '-37deg', '-42deg'],
  });

  const planeScale = flightProgress.interpolate({
    inputRange: [0, 0.1, 0.5, 0.85, 1],
    outputRange: [1.0, 1.55, 1.45, 1.3, 0.75],
  });

  // Trail particles interpolations
  const trailOpacity = flightProgress.interpolate({
    inputRange: [0, 0.15, 0.75, 0.95, 1],
    outputRange: [0, 0.85, 0.7, 0.2, 0],
  });

  // Idle plane bobbing
  const idleTranslateY = idleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-4, 4],
  });

  const idleRotate = idleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-3deg', '4deg'],
  });

  return (
    <>
      {/* ── Small Idle Plane ── */}
      <View style={[styles.container, { width, height }, style]}>
        <Animated.View
          style={{
            transform: [
              { translateY: idleTranslateY },
              { rotateZ: idleRotate },
            ],
          }}
        >
          <PaperPlaneSvg size={54} color={color} />
        </Animated.View>
      </View>

      {/* ── Fullscreen Overlay Flight ── */}
      {showOverlay && (
        <Modal transparent visible={showOverlay} animationType="none" statusBarTranslucent>
          <View style={[styles.overlay, { pointerEvents: 'none' }]}>
            {/* Trail Sparkles */}
            <Animated.View
              style={[
                styles.trailContainer,
                {
                  transform: [{ translateX }, { translateY }],
                  opacity: trailOpacity,
                },
              ]}
            >
              {[1, 2, 3, 4, 5, 6].map((idx) => (
                <View
                  key={idx}
                  style={[
                    styles.trailDot,
                    {
                      width: 14 - idx * 1.8,
                      height: 14 - idx * 1.8,
                      borderRadius: (14 - idx * 1.8) / 2,
                      backgroundColor: idx % 2 === 0 ? '#fbbf24' : '#4ade80',
                      transform: [
                        { translateX: -idx * 16 - 10 },
                        { translateY: idx * 12 + 8 },
                      ],
                      opacity: 1 - idx * 0.15,
                    },
                  ]}
                />
              ))}
            </Animated.View>

            {/* Flying 3D Paper Plane */}
            <Animated.View
              style={[
                styles.flyingPlane,
                {
                  transform: [
                    { translateX },
                    { translateY },
                    { rotateZ },
                    { scale: planeScale },
                  ],
                },
              ]}
            >
              <PaperPlaneSvg size={130} color={color} isLarge />
            </Animated.View>
          </View>
        </Modal>
      )}
    </>
  );
}

/**
 * PaperPlaneSvg — Mô hình 3D origami máy bay giấy đa chiều với bóng và gờ nếp gấp
 */
function PaperPlaneSvg({ size = 70, color = '#4ade80', isLarge = false }) {
  const w = size;
  const h = size * 0.72;

  return (
    <Svg width={w} height={h} viewBox="0 0 100 72">
      <Defs>
        <LinearGradient id="mainWingGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#86efac" />
          <Stop offset="0.6" stopColor={color} />
          <Stop offset="1" stopColor="#22c55e" />
        </LinearGradient>
        <LinearGradient id="foldGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#16a34a" />
          <Stop offset="1" stopColor="#15803d" />
        </LinearGradient>
        <LinearGradient id="shadowWingGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#4ade80" />
          <Stop offset="1" stopColor="#166534" />
        </LinearGradient>
      </Defs>

      {/* Underbody Shadow */}
      <Polygon points="10,48 95,22 45,55" fill="#14532d" opacity="0.6" />

      {/* Right Wing (phía dưới, tối hơn tạo chiều sâu 3D) */}
      <Polygon points="95,22 10,48 40,65" fill="url(#shadowWingGrad)" />

      {/* Center Crease / Fuselage (thân gập giữa) */}
      <Polygon points="95,22 40,65 48,36" fill="url(#foldGrad)" />

      {/* Left Main Wing (cánh chính hướng lên, sáng rực rỡ) */}
      <Polygon points="95,22 48,36 12,8" fill="url(#mainWingGrad)" />

      {/* Tail Fin Accent */}
      <Polygon points="48,36 12,8 24,28" fill="#bbf7d0" opacity="0.8" />

      {/* Nose Tip Gleam (ánh sáng mũi máy bay) */}
      <Circle cx="94" cy="23" r={isLarge ? 3 : 2} fill="#ffffff" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999,
  },
  flyingPlane: {
    position: 'absolute',
    top: 0,
    left: 0,
    shadowColor: '#4ade80',
    shadowOpacity: 0.65,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  trailContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  trailDot: {
    position: 'absolute',
    shadowColor: '#4ade80',
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 6,
  },
});
