/**
 * Avatar3D.native.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Platform wrapper cho React Native.
 * Bỏ viền/vòng tròn, hỗ trợ kéo xoay 3D và hiệu ứng hover/chạm phóng to.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useRef, useState } from 'react';
import { View, PanResponder, StyleSheet } from 'react-native';
import { Canvas } from '@react-three/fiber/native';
import Avatar3DScene from './Avatar3DScene';

export default function Avatar3D({
  size         = 80,
  skinColor    = '#F4C5A3',
  eyeColor     = '#3A86FF',
  hairStyle    = 'short',
  hairColor    = '#3D2B1F',
  eyeShape     = 'round',
  noseStyle    = 'button',
  mouthStyle   = 'smile',
  hasEyebrows  = true,
  eyebrowColor = '#3D2B1F',
  accessory    = 'none',
  accessoryColor = '#FBC02D',
  isHovered    = false,
}) {
  const isPanning  = useRef(false);
  const [panState, setPanState] = useState({ dx: 0, dy: 0, active: false });
  const [touchHover, setTouchHover] = useState(false);

  const prevPos = useRef({ x: 0, y: 0 });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,

      onPanResponderGrant: (_, gestureState) => {
        prevPos.current = { x: gestureState.x0, y: gestureState.y0 };
        isPanning.current = true;
        setTouchHover(true);
      },

      onPanResponderMove: (_, gestureState) => {
        const dx = gestureState.moveX - prevPos.current.x;
        const dy = gestureState.moveY - prevPos.current.y;
        prevPos.current = { x: gestureState.moveX, y: gestureState.moveY };
        setPanState({ dx, dy, active: true });
      },

      onPanResponderRelease: () => {
        isPanning.current = false;
        setPanState({ dx: 0, dy: 0, active: false });
        setTimeout(() => setTouchHover(false), 800);
      },

      onPanResponderTerminate: () => {
        isPanning.current = false;
        setPanState({ dx: 0, dy: 0, active: false });
        setTouchHover(false);
      },
    })
  ).current;

  return (
    <View
      style={[styles.container, { width: size, height: size }]}
      {...panResponder.panHandlers}
    >
      <Canvas
        style={{ width: size, height: size }}
        camera={{ position: [0, 0, 3.5], fov: 45 }}
        dpr={[1, 2]}
        shadows="basic"
        gl={{ antialias: true, alpha: true }}
      >
        <Avatar3DScene
          skinColor={skinColor}
          eyeColor={eyeColor}
          hairStyle={hairStyle}
          hairColor={hairColor}
          eyeShape={eyeShape}
          noseStyle={noseStyle}
          mouthStyle={mouthStyle}
          hasEyebrows={hasEyebrows}
          eyebrowColor={eyebrowColor}
          accessory={accessory}
          accessoryColor={accessoryColor}
          panDelta={panState}
          isPanning={panState.active}
          isHovered={isHovered || touchHover}
        />
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    // Đã bỏ hoàn toàn viền và bo tròn (no circle border)
  },
});
