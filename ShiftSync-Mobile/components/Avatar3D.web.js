/**
 * Avatar3D.web.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Platform wrapper cho Web (react-native-web + Expo web).
 * Bỏ hoàn toàn viền/vòng tròn, hỗ trợ hiệu ứng hover phóng to và kéo xoay 3D.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useRef, useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Canvas } from '@react-three/fiber';
import Avatar3DScene from './Avatar3DScene';

// Silence Fiber internal THREE.Clock deprecation warning
if (typeof window !== 'undefined' && !window.__ss_clock_filter_installed) {
  window.__ss_clock_filter_installed = true;
  const _origWarn = console.warn;
  console.warn = (...args) => {
    if (typeof args[0] === 'string' && (args[0].includes('THREE.Clock') || args[0].includes('WEBGL_lose_context'))) {
      return;
    }
    _origWarn.apply(console, args);
  };
}

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
  const [panState, setPanState]     = useState({ dx: 0, dy: 0, active: false });
  const [localHover, setLocalHover] = useState(false);
  const prevPos   = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);

  const handlePointerDown = useCallback((e) => {
    isDragging.current = true;
    prevPos.current = { x: e.clientX, y: e.clientY };
    e.target.setPointerCapture?.(e.pointerId);
    setPanState(prev => ({ ...prev, active: true }));
  }, []);

  const handlePointerMove = useCallback((e) => {
    if (!isDragging.current) return;
    const dx = e.clientX - prevPos.current.x;
    const dy = e.clientY - prevPos.current.y;
    prevPos.current = { x: e.clientX, y: e.clientY };
    setPanState({ dx, dy, active: true });
  }, []);

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
    setPanState({ dx: 0, dy: 0, active: false });
  }, []);

  return (
    <View
      style={[styles.container, { width: size, height: size }]}
      onMouseEnter={() => setLocalHover(true)}
      onMouseLeave={() => setLocalHover(false)}
    >
      <Canvas
        style={{
          width: size,
          height: size,
          cursor: panState.active ? 'grabbing' : 'grab',
          backgroundColor: 'transparent',
        }}
        camera={{ position: [0, 0, 3.5], fov: 45 }}
        dpr={[1, 2]}
        shadows="basic"
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
        frameloop="always"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => {
          handlePointerUp();
          setLocalHover(false);
        }}
        onPointerEnter={() => setLocalHover(true)}
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
          isHovered={isHovered || localHover}
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
