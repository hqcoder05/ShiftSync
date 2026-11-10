import React, { Component, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, Image, Platform, Pressable, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { Canvas, useFrame } from './AvatarCanvas';
import { createIllustration } from './illustrationScene';
import { animateIncomeMascot } from './incomeMascotScene';
import { animateCompanionScene } from './companionMascotScenes';
import { animateAnimalScene } from './animalMascotScenes';
import previews from './illustrationPreviews';
import { ensureTouchTarget } from '../utils/touchTarget';

class SceneBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
function Model({ kind, reduced, onReady, interaction }) {
  const frames = useRef(0);
  const model = useMemo(() => createIllustration(kind), [kind]);
  useEffect(() => () => {
    const geometries = new Set(), materials = new Set();
    model.traverse(part => { if (part.geometry) geometries.add(part.geometry); if (part.material) materials.add(part.material); });
    geometries.forEach(item => item.dispose()); materials.forEach(item => item.dispose());
    model.userData.disposableTextures?.forEach(item => item.dispose());
  }, [model]);
  useFrame(({ clock }, delta) => {
    if (frames.current < 2 && ++frames.current === 2) onReady(true);
    const t = reduced ? 0 : clock.elapsedTime;
    if (model.userData.isAnimalScene) {
      const current = interaction.current;
      animateAnimalScene(model, t, Math.min(delta, 0.1), {
        engaged: !reduced && (current.hovered || current.pressed || current.focused || Date.now() < current.waveUntil),
        x: reduced ? 0 : current.x,
        y: reduced ? 0 : current.y,
      });
      return;
    }
    if (model.userData.isCompanionScene) {
      const current = interaction.current;
      animateCompanionScene(model, t, Math.min(delta, 0.1), {
        engaged: !reduced && (current.hovered || current.pressed || current.focused || Date.now() < current.waveUntil),
        x: reduced ? 0 : current.x,
        y: reduced ? 0 : current.y,
      });
      return;
    }
    if (model.userData.isMascot) {
      const current = interaction.current;
      animateIncomeMascot(model, t, Math.min(delta, 0.1), {
        engaged: !reduced && (current.hovered || current.pressed || current.focused || Date.now() < current.waveUntil),
        x: reduced ? 0 : current.x,
        y: reduced ? 0 : current.y,
      });
      return;
    }
    model.userData.body.rotation.y = -0.32 + Math.sin(t * 0.75) * 0.18;
    model.userData.body.position.y = Math.sin(t * 1.2) * 0.045;
    if (model.userData.float) model.userData.float.position.y = 0.63 + Math.sin(t * 1.7) * 0.09;
  });
  return <primitive object={model} dispose={null} />;
}
const greetings = {
  income: ['income-mascot', 'Chào linh vật thu nhập'],
  'shift-buddies': ['shift-buddies-mascot', 'Chào Kiro và Sora'],
  kiro: ['kiro-mascot', 'Chào Kiro'],
  sora: ['sora-mascot', 'Chào Sora'],
  hako: ['hako-mascot', 'Chào Hako'],
  rabbit: ['rabbit-mascot', 'Chào bạn thỏ'],
  deer: ['deer-mascot', 'Chào bạn hươu'],
  frog: ['frog-mascot', 'Chào bạn ếch'],
  tiger: ['tiger-mascot', 'Chào bạn hổ'],
  beaver: ['beaver-mascot', 'Chào bạn hải ly'],
  raccoon: ['raccoon-mascot', 'Chào bạn gấu mèo'],
  fox: ['fox-mascot', 'Chào bạn cáo'],
  'notification-fox': ['notification-fox-mascot', 'Chào bạn cáo thông báo'],
  'peek-rabbit': ['peek-rabbit-mascot', 'Chào bạn thỏ trên thẻ'],
  'peek-raccoon': ['peek-raccoon-mascot', 'Chào bạn gấu mèo trên thẻ'],
  'peek-fox': ['peek-fox-mascot', 'Chào bạn cáo trên thẻ'],
};

export default function ThreeIllustration({ kind = 'income', size = 100, width = size, height = size, animated = false, interactive = false, style }) {
  const focused = useIsFocused();
  const [active, setActive] = useState(AppState.currentState !== 'background');
  const [reduced, setReduced] = useState(false);
  const [ready, setReady] = useState(false);
  const interaction = useRef({ hovered: false, pressed: false, focused: false, waveUntil: 0, x: 0, y: 0 });
  useEffect(() => {
    setReady(false);
    Object.assign(interaction.current, { hovered: false, pressed: false, focused: false, waveUntil: 0, x: 0, y: 0 });
  }, [kind, focused, active]);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted) setReduced(value); }).catch(() => {});
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    const app = AppState.addEventListener('change', state => setActive(state === 'active'));
    return () => { mounted = false; motion.remove(); app.remove(); };
  }, []);
  const canInteract = interactive && animated;
  const greet = () => { interaction.current.waveUntil = Date.now() + 2400; };
  const movePointer = (event) => {
    if (Platform.OS !== 'web') return;
    const rect = event.currentTarget?.getBoundingClientRect?.();
    if (!rect?.width || !rect.height) return;
    const x = event.nativeEvent?.clientX ?? event.clientX;
    const y = event.nativeEvent?.clientY ?? event.clientY;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    interaction.current.x = Math.max(-1, Math.min(1, ((x - rect.left) / rect.width) * 2 - 1));
    interaction.current.y = Math.max(-1, Math.min(1, ((y - rect.top) / rect.height) * 2 - 1));
  };
  const fallback = <Image source={previews[kind] || previews.income} resizeMode="contain" style={{ width, height }} />;
  const artwork = <View accessible={false} importantForAccessibility="no-hide-descendants" pointerEvents="none" style={{ width, height }}>
    {animated && focused && active && !reduced ? <>
      {!ready && fallback}
      <View style={{ position: 'absolute', top: 0, left: 0, width, height }}><SceneBoundary key={kind} fallback={fallback}>
      <Canvas dpr={1.5} style={{ width, height, opacity: ready ? 1 : 0 }} camera={{ position: [0, 1.5, 5.5], fov: 32 }} gl={{ alpha: true, antialias: true }} onCreated={({ camera }) => camera.lookAt(0, 0, 0)}>
        <hemisphereLight args={['#FFF9EF', '#B5BAD8', 2.3]} />
        <directionalLight position={[-3, 5, 5]} intensity={3} color="#FFF3DE" />
        <directionalLight position={[4, 2, -1]} intensity={2} color="#E8EDFF" />
        <Model key={kind} kind={kind} reduced={reduced} onReady={setReady} interaction={interaction} />
      </Canvas>
    </SceneBoundary></View></> : fallback}
  </View>;
  return canInteract ? <Pressable
    testID={(greetings[kind] || greetings.income)[0]}
    accessibilityRole="button"
    accessibilityLabel={(greetings[kind] || greetings.income)[1]}
    accessibilityHint="Rê chuột hoặc chạm để nhân vật vẫy tay chào"
    style={ensureTouchTarget([{ width, height, borderRadius: 20 }, style])}
    onHoverIn={() => { interaction.current.hovered = true; }}
    onHoverOut={() => { interaction.current.hovered = false; interaction.current.x = 0; interaction.current.y = 0; }}
    onPointerMove={movePointer}
    onFocus={() => { interaction.current.focused = true; }}
    onBlur={() => { interaction.current.focused = false; }}
    onPressIn={() => { interaction.current.pressed = true; }}
    onPressOut={() => { interaction.current.pressed = false; }}
    onPress={greet}
  >{artwork}</Pressable> : <View style={[{ width, height }, style]}>{artwork}</View>;
}
