import React from 'react';
import { View, Platform } from 'react-native';

// Stub cho native — không hiển thị 3D trên native
export default function AttendanceBadge3D({ width = 200, height = 220, style }) {
  return <View style={[{ width, height }, style]} />;
}
