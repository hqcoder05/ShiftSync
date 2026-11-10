import React, { Component, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, Image, Platform, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { Canvas, useFrame } from './AvatarCanvas';
import { animateGraphicAvatar, createLowPolyAvatar, getAvatarCamera } from './lowPolyAvatarScene';
import { getAvatarSource } from './avatarThumbnails';
import { colors } from '../theme/koreanPalette';

class AvatarBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

function Portrait({ avatarId, reduceMotion, onReady, interaction }) {
  const frames = useRef(0);
  const portrait = useMemo(() => createLowPolyAvatar(avatarId), [avatarId]);
  useEffect(() => () => {
    const geometries = new Set(), materials = new Set();
    portrait.traverse((part) => {
      if (part.geometry) geometries.add(part.geometry);
      if (part.material) materials.add(part.material);
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
  }, [portrait]);
  useFrame(({ clock }, delta) => {
    if (frames.current < 2 && ++frames.current === 2) onReady(true);
    const state = interaction.current;
    animateGraphicAvatar(portrait, reduceMotion ? 0 : clock.elapsedTime, delta, {
      active: !reduceMotion && (state.hovered || state.greetingUntil > Date.now()),
      lookX: state.x,
      lookY: state.y,
    });
  });
  return <primitive object={portrait} dispose={null} />;
}

export default function UserAvatar({ avatarId = 'dilan', size = 56, style, animated = true, framing = 'auto' }) {
  const resolvedFraming = framing === 'auto' ? (size >= 120 ? 'full' : 'head') : framing;
  const cameraPreset = getAvatarCamera(resolvedFraming, avatarId);
  const focused = useIsFocused();
  const [active, setActive] = useState(AppState.currentState !== 'background');
  const [reduceMotion, setReduceMotion] = useState(false);
  const [ready, setReady] = useState(false);
  const interaction = useRef({ hovered: false, greetingUntil: 0, x: 0, y: 0 });
  const lookAtPointer = (event) => {
    const pointer = event.nativeEvent || {};
    const rect = Platform.OS === 'web' ? event.currentTarget?.getBoundingClientRect?.() : null;
    const clientX = pointer.clientX ?? event.clientX;
    const clientY = pointer.clientY ?? event.clientY;
    const x = rect?.width && Number.isFinite(clientX) ? (clientX - rect.left) / rect.width * size : pointer.locationX;
    const y = rect?.height && Number.isFinite(clientY) ? (clientY - rect.top) / rect.height * size : pointer.locationY;
    if (Number.isFinite(x)) interaction.current.x = Math.max(-1, Math.min(1, x / size * 2 - 1));
    if (Number.isFinite(y)) interaction.current.y = Math.max(-1, Math.min(1, 1 - y / size * 2));
  };
  const greet = () => { interaction.current.greetingUntil = Date.now() + 2600; };
  useEffect(() => {
    setReady(false);
    Object.assign(interaction.current, { hovered: false, greetingUntil: 0, x: 0, y: 0 });
  }, [avatarId, resolvedFraming, focused, active]);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => { if (mounted) setReduceMotion(value); }).catch(() => {});
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    const app = AppState.addEventListener('change', (state) => setActive(state === 'active'));
    return () => { mounted = false; motion.remove(); app.remove(); };
  }, []);
  const fallback = <Image source={getAvatarSource(avatarId, resolvedFraming)} style={{ width: size, height: size }} resizeMode="contain" />;
  return <View
    accessibilityLabel="Ảnh đại diện nhân vật 3D"
    onPointerEnter={(event) => { interaction.current.hovered = true; lookAtPointer(event); }}
    onPointerMove={lookAtPointer}
    onPointerLeave={() => { interaction.current.hovered = false; interaction.current.x = 0; interaction.current.y = 0; }}
    onTouchStart={greet}
    onPointerDown={greet}
    style={[{ width: size, height: size, borderRadius: resolvedFraming === 'full' ? size * 0.12 : size / 2, overflow: 'hidden', backgroundColor: colors.lavender, alignItems: 'center', justifyContent: 'center' }, style]}>
    {animated && focused && active && !reduceMotion ? <>
      {!ready && fallback}
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, width: size, height: size }}><AvatarBoundary key={`${avatarId}:${resolvedFraming}`} fallback={fallback}>
      <Canvas style={{ width: size, height: size, opacity: ready ? 1 : 0 }} dpr={1.5} frameloop="always" camera={{ position: cameraPreset.position, fov: cameraPreset.fov }} gl={{ alpha: true, antialias: true }} onCreated={({ camera }) => camera.lookAt(...cameraPreset.target)}>
        <hemisphereLight args={['#FFF7EE', '#8594B2', 2]} />
        <directionalLight position={[-3, 4, 5]} intensity={3} color="#FFF6ED" />
        <directionalLight position={[3, 1, 2]} intensity={1} color="#E5ECFF" />
        <Portrait key={avatarId} avatarId={avatarId} reduceMotion={reduceMotion} onReady={setReady} interaction={interaction} />
      </Canvas>
    </AvatarBoundary></View></> : fallback}
  </View>;
}
