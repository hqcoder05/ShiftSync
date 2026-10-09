import React from 'react';
import { View, StyleSheet } from 'react-native';

/**
 * Native-safe avatar implementation.
 *
 * Expo Go/Hermes can resolve the CommonJS entry of Three through
 * @react-three/fiber/native before Dashboard renders. The avatar is optional,
 * so native keeps the same footprint with a lightweight React Native visual.
 * Web continues to use Avatar3D.web.js and the Three/R3F implementation.
 */

export default function Avatar3D({
  size         = 80,
  skinColor    = '#F4C5A3',
  eyeColor     = '#3A86FF',
}) {
  const eyeSize = Math.max(4, Math.round(size * 0.1));
  const eyeTop = Math.round(size * 0.37);
  const eyeOffset = Math.round(size * 0.18);
  const mouthWidth = Math.max(10, Math.round(size * 0.28));

  return (
    <View accessible accessibilityLabel="Avatar" style={[styles.container, { width: size, height: size }]}>
      <View style={[styles.face, { width: size * 0.68, height: size * 0.68, borderRadius: size * 0.34, backgroundColor: skinColor }]}>
        <View style={[styles.eye, { width: eyeSize, height: eyeSize, borderRadius: eyeSize / 2, backgroundColor: eyeColor, top: eyeTop, left: eyeOffset }]} />
        <View style={[styles.eye, { width: eyeSize, height: eyeSize, borderRadius: eyeSize / 2, backgroundColor: eyeColor, top: eyeTop, right: eyeOffset }]} />
        <View style={[styles.mouth, { width: mouthWidth, top: size * 0.52, left: (size * 0.68 - mouthWidth) / 2 }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  face: {
    position: 'relative',
    alignItems: 'center',
  },
  eye: {
    position: 'absolute',
  },
  mouth: {
    position: 'absolute',
    height: 2,
    borderRadius: 1,
    backgroundColor: '#6D3B2E',
  },
});
