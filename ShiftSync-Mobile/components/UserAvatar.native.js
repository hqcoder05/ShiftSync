import React from 'react';
import { Image, View } from 'react-native';
import { getAvatarSource } from './avatarThumbnails';
import { colors } from '../theme/koreanPalette';

export default function UserAvatar({ avatarId = 'dilan', size = 56, style, framing = 'auto' }) {
  const resolvedFraming = framing === 'auto' ? (size >= 120 ? 'full' : 'head') : framing;

  return (
    <View
      accessibilityLabel="Ảnh đại diện nhân vật"
      style={[
        {
          width: size,
          height: size,
          borderRadius: resolvedFraming === 'full' ? size * 0.12 : size / 2,
          overflow: 'hidden',
          backgroundColor: colors.lavender,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Image
        source={getAvatarSource(avatarId, resolvedFraming)}
        resizeMode="contain"
        style={{ width: size, height: size }}
      />
    </View>
  );
}
