import React from 'react';
import { View } from 'react-native';

// Stub cho native — không hiển thị 3D trên native
export default function HoloCard3D({ width = 300, height = 180, style }) {
  return <View style={[{ width, height }, style]} />;
}
