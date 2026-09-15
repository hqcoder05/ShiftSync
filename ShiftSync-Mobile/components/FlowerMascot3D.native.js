import React from 'react';
import FlowerMascot3DWeb from './FlowerMascot3D.web';

/**
 * FlowerMascot3D.native.js
 * Platform entrypoint cho FlowerMascot3D.
 */
export default function FlowerMascot3DNative(props) {
  // Tương thích đa nền tảng
  return <FlowerMascot3DWeb {...props} />;
}
