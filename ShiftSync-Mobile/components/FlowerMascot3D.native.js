import React from 'react';
import { View, StyleSheet } from 'react-native';

/**
 * FlowerMascot3D.native.js
 * Platform entrypoint cho FlowerMascot3D.
 */
export default function FlowerMascot3DNative(props) {
  // Native/Expo Go không có DOM hoặc WebGLRenderer của implementation web.
  // Giữ nguyên footprint của mascot nhưng không chạy browser-only code trên iOS.
  const { width = 180, height = 160, style } = props;
  return <View style={[styles.container, { width, height }, style]} />;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
