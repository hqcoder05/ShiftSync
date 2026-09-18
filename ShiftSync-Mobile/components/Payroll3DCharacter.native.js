import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * Payroll3DCharacter.native.js
 * Fallback cho Native / Expo GL
 */
export default function Payroll3DCharacterNative({ width = 130, height = 130, style }) {
  return (
    <View style={[styles.container, { width, height }, style]}>
      <Text style={{ fontSize: width * 0.4 }}>💰</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
