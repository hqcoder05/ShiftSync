import React from 'react';
import { Image, View } from 'react-native';
import previews from './illustrationPreviews';

// Use the generated artwork on native. The WebGL renderer currently fails to
// load reliably in the Android emulator, and these previews keep app screens
// usable without importing Three.js or Expo GL at startup.
export default function ThreeIllustration({ kind = 'income', size = 100, width = size, height = size, style }) {
  return (
    <View accessible={false} style={[{ width, height }, style]}>
      <Image
        source={previews[kind] || previews.income}
        resizeMode="contain"
        style={{ width, height }}
      />
    </View>
  );
}
