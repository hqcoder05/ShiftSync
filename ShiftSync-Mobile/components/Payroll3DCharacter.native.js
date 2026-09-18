import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * Payroll3DCharacter.native.js
 * Fallback cho Native / Expo GL
 */
export default function Payroll3DCharacterNative({ width = 130, height = 130, style }) {
  return (
    <View style={[styles.container, { width, height }, style]}>
      <Ionicons name="wallet-outline" size={width * 0.5} color="#16A34A" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
