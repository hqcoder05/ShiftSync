import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import payrollIcon from '../assets/luong.png';

/**
 * Payroll3DCharacter.native.js
 * Fallback cho Native / Expo GL
 */
export default function Payroll3DCharacterNative({ width = 130, height = 130, style }) {
  return (
    <View style={[styles.container, { width, height }, style]}>
      <Image source={payrollIcon} style={{ width, height, resizeMode: 'contain' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
