/**
 * Avatar3DScene.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Lõi 3D Low-Poly thời gian thực phong phú và sống động.
 * - Flat-shading trên mọi đa giác, lưới hình học tối giản mang phong cách hiện đại
 * - Đa dạng 18 nhân vật với phụ kiện (mũ len beanie, snapback cap, tai nghe gaming, kính trí thức, râu quai nón...)
 * - Biểu cảm cử động liên tục: Chớp mắt, nháy mắt tinh nghịch (wink), há miệng 'Oh' ngạc nhiên, mỉm cười rạng rỡ
 * - Tương tác cảm ứng / rê chuột (hover & touch) phóng to và phản hồi cảm xúc tức thì
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const PAN_SENSITIVITY = 0.008;
const MAX_ROT_Y       = Math.PI / 3;
const MAX_ROT_X       = Math.PI / 6;
const RETURN_SPEED    = 0.05;
const BREATHE_AMP     = 0.03;
const BREATHE_LERP    = 0.08;
const IDLE_ROT_SPEED  = 0.6;
const IDLE_ROT_AMP    = 0.16;

function lerp(a, b, t) { return a + t * (b - a); }

function darkenColor(hex, amount) {
  try {
    const n = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, ((n >> 16) & 0xff) - Math.round(255 * amount));
    const g = Math.max(0, ((n >> 8)  & 0xff) - Math.round(255 * amount));
    const b = Math.max(0, ( n        & 0xff) - Math.round(255 * amount));
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
  } catch (_) { return hex; }
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: Hair & Accessories (Low-Poly Styles)
// ─────────────────────────────────────────────────────────────────────────────
function HairAndAccessories({
  style = 'short',
  hairColor = '#3D2B1F',
  accessory = 'none',
  accessoryColor = '#FBC02D',
}) {
  const hairMat = (
    <meshStandardMaterial color={hairColor} roughness={0.65} flatShading={true} />
  );
  const accMat = (
    <meshStandardMaterial color={accessoryColor} roughness={0.5} flatShading={true} />
  );

  return (
    <group>
      {/* ── 1. SHORT ── */}
      {style === 'short' && (
        <group>
          <mesh position={[0, 0.58, -0.05]} scale={[1.04, 0.58, 1.04]}>
            <sphereGeometry args={[1, 7, 5, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
            {hairMat}
          </mesh>
          <mesh position={[0, 0.65, 0.62]} rotation={[0.4, 0, 0]} scale={[0.85, 0.28, 0.35]}>
            <coneGeometry args={[1, 1, 5]} />
            {hairMat}
          </mesh>
        </group>
      )}

      {/* ── 2. LONG ── */}
      {style === 'long' && (
        <group>
          <mesh position={[0, 0.55, -0.05]} scale={[1.05, 0.6, 1.05]}>
            <sphereGeometry args={[1, 7, 5, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
            {hairMat}
          </mesh>
          <mesh position={[-0.85, -0.8, -0.15]} rotation={[0, 0, 0.1]} scale={[0.3, 1.3, 0.25]}>
            <cylinderGeometry args={[0.8, 0.4, 1, 5]} />
            {hairMat}
          </mesh>
          <mesh position={[0.85, -0.8, -0.15]} rotation={[0, 0, -0.1]} scale={[0.3, 1.3, 0.25]}>
            <cylinderGeometry args={[0.8, 0.4, 1, 5]} />
            {hairMat}
          </mesh>
          <mesh position={[0, -0.7, -0.8]} scale={[0.75, 1.2, 0.3]}>
            <boxGeometry args={[1, 1, 1]} />
            {hairMat}
          </mesh>
        </group>
      )}

      {/* ── 3. CURLY ── */}
      {style === 'curly' && (
        <group>
          {[
            [0, 1.18, 0, 0.32],
            [-0.48, 1.08, 0.3, 0.28],
            [0.48, 1.08, 0.3, 0.28],
            [-0.8, 0.88, -0.1, 0.28],
            [0.8, 0.88, -0.1, 0.28],
            [-0.35, 1.12, -0.5, 0.28],
            [0.35, 1.12, -0.5, 0.28],
            [0, 0.98, 0.72, 0.27],
          ].map(([x, y, z, r], i) => (
            <mesh key={i} position={[x, y, z]}>
              <icosahedronGeometry args={[r, 0]} />
              {hairMat}
            </mesh>
          ))}
        </group>
      )}

      {/* ── 4. BUN ── */}
      {style === 'bun' && (
        <group>
          <mesh position={[0, 0.54, -0.05]} scale={[1.04, 0.4, 1.04]}>
            <sphereGeometry args={[1, 6, 5, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
            {hairMat}
          </mesh>
          <mesh position={[0, 1.38, -0.12]} scale={[1, 0.85, 1]}>
            <icosahedronGeometry args={[0.38, 0]} />
            {hairMat}
          </mesh>
        </group>
      )}

      {/* ── 5. MOHAWK ── */}
      {style === 'mohawk' && (
        <group>
          <mesh position={[0, 0.92, 0.1]} scale={[0.18, 0.45, 0.75]}>
            <boxGeometry args={[1, 1, 1]} />
            {hairMat}
          </mesh>
          <mesh position={[0, 1.36, 0.04]} scale={[0.14, 0.52, 0.45]}>
            <boxGeometry args={[1, 1, 1]} />
            {hairMat}
          </mesh>
        </group>
      )}

      {/* ── 6. PIGTAILS ── */}
      {style === 'pigtails' && (
        <group>
          <mesh position={[0, 0.54, -0.05]} scale={[1.04, 0.48, 1.04]}>
            <sphereGeometry args={[1, 6, 5, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
            {hairMat}
          </mesh>
          <mesh position={[-0.85, 0.92, -0.1]}>
            <icosahedronGeometry args={[0.34, 0]} />
            {hairMat}
          </mesh>
          <mesh position={[0.85, 0.92, -0.1]}>
            <icosahedronGeometry args={[0.34, 0]} />
            {hairMat}
          </mesh>
        </group>
      )}

      {/* ── 7. SPIKY ── */}
      {style === 'spiky' && (
        <group>
          <mesh position={[0, 0.56, -0.05]} scale={[1.04, 0.5, 1.04]}>
            <sphereGeometry args={[1, 6, 5, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
            {hairMat}
          </mesh>
          {[
            [0, 1.35, 0, 0, 0, 0.3],
            [-0.4, 1.25, 0.2, 0.2, -0.2, 0.26],
            [0.4, 1.25, 0.2, 0.2, 0.2, 0.26],
            [0, 1.25, 0.4, 0.35, 0, 0.28],
            [-0.5, 1.1, -0.2, -0.2, -0.35, 0.25],
            [0.5, 1.1, -0.2, -0.2, 0.35, 0.25],
          ].map(([x, y, z, rx, rz, h], i) => (
            <mesh key={i} position={[x, y, z]} rotation={[rx, 0, rz]}>
              <coneGeometry args={[0.18, h * 2, 4]} />
              {hairMat}
            </mesh>
          ))}
        </group>
      )}

      {/* ── 8. AFRO ── */}
      {style === 'afro' && (
        <group position={[0, 0.35, -0.05]} scale={[1.28, 1.24, 1.25]}>
          <icosahedronGeometry args={[1, 1]} />
          {hairMat}
        </group>
      )}

      {/* ── 9. WAVY ── */}
      {style === 'wavy' && (
        <group>
          <mesh position={[0, 0.58, -0.05]} scale={[1.05, 0.55, 1.05]}>
            <sphereGeometry args={[1, 6, 5, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
            {hairMat}
          </mesh>
          <mesh position={[-0.7, 0.4, 0.5]} rotation={[0.3, 0.2, -0.4]} scale={[0.4, 0.8, 0.3]}>
            <coneGeometry args={[0.8, 1, 4]} />
            {hairMat}
          </mesh>
          <mesh position={[0.7, 0.4, 0.5]} rotation={[0.3, -0.2, 0.4]} scale={[0.4, 0.8, 0.3]}>
            <coneGeometry args={[0.8, 1, 4]} />
            {hairMat}
          </mesh>
        </group>
      )}

      {/* ── 10. BEANIE HAT (Mũ len) ── */}
      {style === 'beanie' && (
        <group>
          {/* Tóc lấp ló phía trước */}
          <mesh position={[0, 0.48, 0.72]} rotation={[0.3, 0, 0]} scale={[0.65, 0.18, 0.2]}>
            <boxGeometry args={[1, 1, 1]} />
            {hairMat}
          </mesh>
          {/* Thân mũ len đa giác */}
          <mesh position={[0, 0.72, -0.05]} scale={[1.08, 0.75, 1.08]}>
            <sphereGeometry args={[1, 7, 5, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
            {accMat}
          </mesh>
          {/* Vành gập nón len */}
          <mesh position={[0, 0.5, -0.02]} scale={[1.12, 0.18, 1.12]}>
            <cylinderGeometry args={[1, 1, 1, 7]} />
            {accMat}
          </mesh>
          {/* Chóp len trên đỉnh */}
          <mesh position={[0, 1.36, -0.1]} scale={[0.18, 0.18, 0.18]}>
            <icosahedronGeometry args={[1, 0]} />
            {accMat}
          </mesh>
        </group>
      )}

      {/* ── 11. CAP / SNAPBACK (Mũ lưỡi trai) ── */}
      {style === 'cap' && (
        <group>
          {/* Mũ úp đầu */}
          <mesh position={[0, 0.62, -0.05]} scale={[1.06, 0.52, 1.06]}>
            <sphereGeometry args={[1, 7, 5, 0, Math.PI * 2, 0, Math.PI * 0.52]} />
            {accMat}
          </mesh>
          {/* Lưỡi trai phẳng phong cách snapback */}
          <mesh position={[0, 0.45, 1.08]} rotation={[-0.15, 0, 0]} scale={[0.82, 0.06, 0.65]}>
            <boxGeometry args={[1, 1, 1]} />
            {accMat}
          </mesh>
          {/* Nút đính đỉnh nón */}
          <mesh position={[0, 1.16, -0.05]} scale={[0.12, 0.08, 0.12]}>
            <cylinderGeometry args={[1, 1, 1, 5]} />
            {hairMat}
          </mesh>
        </group>
      )}

      {/* ── 12. BOB CUT ── */}
      {style === 'bob' && (
        <group>
          <mesh position={[0, 0.56, -0.05]} scale={[1.06, 0.58, 1.06]}>
            <sphereGeometry args={[1, 7, 5, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
            {hairMat}
          </mesh>
          {/* Tóc ôm má trái */}
          <mesh position={[-0.88, -0.15, 0.1]} rotation={[0.1, 0, 0.12]} scale={[0.3, 0.9, 0.45]}>
            <boxGeometry args={[1, 1, 1]} />
            {hairMat}
          </mesh>
          {/* Tóc ôm má phải */}
          <mesh position={[0.88, -0.15, 0.1]} rotation={[0.1, 0, -0.12]} scale={[0.3, 0.9, 0.45]}>
            <boxGeometry args={[1, 1, 1]} />
            {hairMat}
          </mesh>
        </group>
      )}

      {/* ── 13. PONYTAIL (Đuôi ngựa cao) ── */}
      {style === 'ponytail' && (
        <group>
          <mesh position={[0, 0.56, -0.05]} scale={[1.05, 0.55, 1.05]}>
            <sphereGeometry args={[1, 7, 5, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
            {hairMat}
          </mesh>
          {/* Nút thắt đuôi ngựa */}
          <mesh position={[0, 1.1, -0.85]} scale={[0.22, 0.22, 0.18]}>
            <cylinderGeometry args={[1, 1, 1, 5]} />
            <meshStandardMaterial color="#E91E63" roughness={0.4} flatShading={true} />
          </mesh>
          {/* Lọn đuôi ngựa rủ dài */}
          <mesh position={[0, 0.65, -1.25]} rotation={[0.45, 0, 0]} scale={[0.32, 1.1, 0.28]}>
            <coneGeometry args={[1, 1, 4]} />
            {hairMat}
          </mesh>
        </group>
      )}

      {/* ── 14. DREADLOCKS ── */}
      {style === 'dreadlocks' && (
        <group>
          <mesh position={[0, 0.55, -0.05]} scale={[1.05, 0.52, 1.05]}>
            <sphereGeometry args={[1, 7, 5, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
            {hairMat}
          </mesh>
          {[
            [-0.75, -0.2, 0.3,  0.15],
            [-0.9,  -0.4, -0.1, 0.2],
            [-0.6,  -0.5, -0.6, 0.18],
            [0.75,  -0.2, 0.3,  -0.15],
            [0.9,   -0.4, -0.1, -0.2],
            [0.6,   -0.5, -0.6, -0.18],
            [0,     -0.5, -0.9, 0],
          ].map(([x, y, z, rz], i) => (
            <mesh key={i} position={[x, y, z]} rotation={[0, 0, rz]} scale={[0.16, 0.9, 0.16]}>
              <cylinderGeometry args={[0.8, 0.5, 1, 4]} />
              {hairMat}
            </mesh>
          ))}
        </group>
      )}

      {/* ── ACCESSORY: HEADPHONES (Tai nghe gaming) ── */}
      {accessory === 'headphones' && (
        <group>
          {/* Quai đeo đỉnh đầu */}
          <mesh position={[0, 0.95, 0]} scale={[1.15, 0.12, 0.18]}>
            <boxGeometry args={[1, 1, 1]} />
            {accMat}
          </mesh>
          {/* Đệm tai nghe trái */}
          <mesh position={[-1.12, 0.1, 0]} scale={[0.22, 0.46, 0.38]}>
            <cylinderGeometry args={[1, 1, 1, 6]} />
            {accMat}
          </mesh>
          {/* Đệm tai nghe phải */}
          <mesh position={[1.12, 0.1, 0]} scale={[0.22, 0.46, 0.38]}>
            <cylinderGeometry args={[1, 1, 1, 6]} />
            {accMat}
          </mesh>
          {/* Đèn Led neon phát sáng trên ốp tai */}
          <mesh position={[-1.24, 0.1, 0]} scale={[0.04, 0.22, 0.22]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#00E5FF" emissive="#00E5FF" emissiveIntensity={1} />
          </mesh>
          <mesh position={[1.24, 0.1, 0]} scale={[0.04, 0.22, 0.22]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#00E5FF" emissive="#00E5FF" emissiveIntensity={1} />
          </mesh>
        </group>
      )}

      {/* ── ACCESSORY: GLASSES (Kính tri thức thời trang) ── */}
      {accessory === 'glasses' && (
        <group position={[0, 0.12, 0.98]}>
          {/* Mắt kính trái */}
          <mesh position={[-0.34, 0, 0]} scale={[0.36, 0.28, 0.05]}>
            <boxGeometry args={[1, 1, 1]} />
            {accMat}
          </mesh>
          {/* Mắt kính phải */}
          <mesh position={[0.34, 0, 0]} scale={[0.36, 0.28, 0.05]}>
            <boxGeometry args={[1, 1, 1]} />
            {accMat}
          </mesh>
          {/* Cầu nối giữa 2 mắt kính */}
          <mesh position={[0, 0.04, 0]} scale={[0.24, 0.04, 0.04]}>
            <boxGeometry args={[1, 1, 1]} />
            {accMat}
          </mesh>
          {/* Gọng kính trái */}
          <mesh position={[-0.56, 0.02, -0.4]} rotation={[0, -0.2, 0]} scale={[0.04, 0.04, 0.8]}>
            <boxGeometry args={[1, 1, 1]} />
            {accMat}
          </mesh>
          {/* Gọng kính phải */}
          <mesh position={[0.56, 0.02, -0.4]} rotation={[0, 0.2, 0]} scale={[0.04, 0.04, 0.8]}>
            <boxGeometry args={[1, 1, 1]} />
            {accMat}
          </mesh>
        </group>
      )}

      {/* ── ACCESSORY: BEARD (Râu quai nón nam tính) ── */}
      {accessory === 'beard' && (
        <group position={[0, -0.38, 0.65]}>
          {/* Râu viền cằm */}
          <mesh position={[0, -0.22, 0.2]} scale={[0.72, 0.28, 0.42]}>
            <boxGeometry args={[1, 1, 1]} />
            {hairMat}
          </mesh>
          {/* Râu mép */}
          <mesh position={[0, 0.16, 0.32]} scale={[0.42, 0.08, 0.1]}>
            <boxGeometry args={[1, 1, 1]} />
            {hairMat}
          </mesh>
        </group>
      )}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: Eyebrows (Dynamic Low-Poly Facets with Expression Controller)
// ─────────────────────────────────────────────────────────────────────────────
function Eyebrows({ color = '#3D2B1F', eyeShape = 'round', isHovered = false, exprState }) {
  const eyebrowRef = useRef();
  const mat = <meshStandardMaterial color={color} roughness={0.7} flatShading={true} />;

  useFrame((state) => {
    if (!eyebrowRef.current) return;
    const t = state.clock.elapsedTime;
    const mode = exprState?.current?.mode || 'idle';

    let yOffset = 0;
    let rotTilt = 0;

    if (isHovered) {
      // Khi hover / tap: nhướng mày hân hoan
      yOffset = 0.09;
    } else if (mode === 'surprise') {
      // Biểu cảm ngạc nhiên: lông mày nhướng thật cao
      yOffset = 0.14;
      rotTilt = 0.05;
    } else if (mode === 'wink') {
      // Nháy mắt: mày trái hơi hạ, mày phải nhướng
      yOffset = 0.04;
    } else {
      // Nhịp thở idle nhẹ nhàng
      yOffset = Math.sin(t * 2.0) * 0.02;
    }

    eyebrowRef.current.position.y = lerp(eyebrowRef.current.position.y, yOffset, 0.18);
  });

  const yBase = eyeShape === 'wide' ? 0.38 : 0.32;

  return (
    <group ref={eyebrowRef}>
      <mesh position={[-0.34, yBase, 0.94]} rotation={[0.2, 0, -0.15]} scale={[0.26, 0.05, 0.06]}>
        <boxGeometry args={[1, 1, 1]} />
        {mat}
      </mesh>
      <mesh position={[0.34, yBase, 0.94]} rotation={[0.2, 0, 0.15]} scale={[0.26, 0.05, 0.06]}>
        <boxGeometry args={[1, 1, 1]} />
        {mat}
      </mesh>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: EyePair (Chớp mắt + Nháy mắt Wink + Mắt mở to ngạc nhiên)
// ─────────────────────────────────────────────────────────────────────────────
function EyePair({ eyeColor, eyeShape = 'round', exprState }) {
  const leftRef   = useRef();
  const rightRef  = useRef();
  const pupilsRef = useRef();

  const eyeScale = {
    round:  [1,    1,    1],
    almond: [1.25, 0.72, 1],
    wide:   [1.32, 1.25, 1],
  }[eyeShape] || [1, 1, 1];

  const eyeRadius = eyeShape === 'wide' ? 0.17 : 0.15;

  useFrame((state) => {
    const s = exprState.current;
    if (!s) return;

    let targetLeftScaleY  = 1.0;
    let targetRightScaleY = 1.0;
    let targetEyeScaleX   = 1.0;

    if (s.mode === 'blink') {
      // Chớp cả 2 mắt cùng lúc
      const prog = s.timer / s.duration;
      const factor = Math.max(0.06, 1 - Math.sin(Math.PI * prog) * 1.35);
      targetLeftScaleY  = factor;
      targetRightScaleY = factor;
    } else if (s.mode === 'wink') {
      // Nháy mắt tinh nghịch: Mắt trái nhắm lại hình trăng khuyết, mắt phải mở to
      const prog = s.timer / s.duration;
      const factor = Math.max(0.06, 1 - Math.sin(Math.PI * prog) * 1.4);
      targetLeftScaleY  = factor;
      targetRightScaleY = 1.15; // Mắt phải mở to hơn xíu
    } else if (s.mode === 'surprise') {
      // Ngạc nhiên: mắt mở to tròn rạng rỡ
      targetLeftScaleY  = 1.3;
      targetRightScaleY = 1.3;
      targetEyeScaleX   = 1.15;
    }

    if (leftRef.current) {
      leftRef.current.scale.y = lerp(leftRef.current.scale.y, targetLeftScaleY, 0.25);
    }
    if (rightRef.current) {
      rightRef.current.scale.y = lerp(rightRef.current.scale.y, targetRightScaleY, 0.25);
    }

    // Con ngươi liếc nhẹ qua lại khi idle
    if (pupilsRef.current) {
      const t = state.clock.elapsedTime;
      const scan = s.mode === 'surprise' ? 0 : Math.sin(t * 1.3) * 0.02;
      pupilsRef.current.position.x = scan;
    }
  });

  const Eye = ({ xPos }) => (
    <group position={[xPos, 0.1, 0.88]}>
      <mesh scale={eyeScale}>
        <sphereGeometry args={[eyeRadius, 8, 6]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.15} flatShading={true} />
      </mesh>
      <mesh position={[0, 0, eyeRadius * 0.62]}>
        <sphereGeometry args={[eyeRadius * 0.52, 6, 5]} />
        <meshStandardMaterial color={eyeColor} roughness={0.3} flatShading={true} />
      </mesh>
      <mesh position={[eyeRadius * 0.22, eyeRadius * 0.25, eyeRadius * 0.85]}>
        <boxGeometry args={[0.045, 0.045, 0.045]} />
        <meshStandardMaterial color="#FFFFFF" emissive="#FFFFFF" emissiveIntensity={1} />
      </mesh>
    </group>
  );

  return (
    <group ref={pupilsRef}>
      <group ref={leftRef}><Eye xPos={-0.34} /></group>
      <group ref={rightRef}><Eye xPos={0.34} /></group>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: Nose (Faceted Low-Poly Prisms)
// ─────────────────────────────────────────────────────────────────────────────
function Nose({ style = 'button', skinColor }) {
  const darkSkin = darkenColor(skinColor, 0.12);
  const mat = <meshStandardMaterial color={darkSkin} roughness={0.7} flatShading={true} />;

  if (style === 'broad') {
    return (
      <mesh position={[0, -0.07, 0.98]} scale={[0.22, 0.12, 0.12]}>
        <boxGeometry args={[1, 1, 1]} />
        {mat}
      </mesh>
    );
  }

  if (style === 'pointed') {
    return (
      <mesh position={[0, -0.04, 1.04]} rotation={[-0.3, 0, 0]} scale={[0.1, 0.18, 0.16]}>
        <coneGeometry args={[1, 1, 4]} />
        {mat}
      </mesh>
    );
  }

  return (
    <mesh position={[0, -0.06, 1.0]} scale={[0.13, 0.11, 0.1]}>
      <icosahedronGeometry args={[1, 0]} />
      {mat}
    </mesh>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: Mouth (Cười, Há miệng 'Oh' ngạc nhiên, Nhếch mép tinh nghịch)
// ─────────────────────────────────────────────────────────────────────────────
function Mouth({ style = 'smile', isHovered = false, exprState }) {
  const mouthRef = useRef();
  const lipColor = '#c75650';
  const mat = <meshStandardMaterial color={lipColor} roughness={0.6} flatShading={true} />;

  useFrame((state) => {
    if (!mouthRef.current) return;
    const t = state.clock.elapsedTime;
    const s = exprState?.current;
    const mode = s?.mode || 'idle';

    let targetScale = 1.0;
    if (isHovered) {
      targetScale = 1.25;
    } else if (mode === 'surprise') {
      targetScale = 1.35;
    } else if (mode === 'wink') {
      targetScale = 1.15;
    } else {
      targetScale = 1 + Math.sin(t * 3) * 0.04;
    }

    mouthRef.current.scale.x = lerp(mouthRef.current.scale.x, targetScale, 0.2);
    mouthRef.current.scale.y = lerp(mouthRef.current.scale.y, targetScale, 0.2);
  });

  return (
    <group ref={mouthRef} position={[0, -0.29, 0.93]}>
      {/* 1. KHI NGẠC NHIÊN (Surprise 'Oh'): Miệng chữ 'O' tròn to kinh ngạc */}
      {exprState?.current?.mode === 'surprise' ? (
        <group>
          <mesh scale={[1, 1.25, 1]}>
            <torusGeometry args={[0.18, 0.05, 4, 8]} />
            {mat}
          </mesh>
          <mesh scale={[0.9, 1.15, 0.4]}>
            <sphereGeometry args={[0.16, 6, 4]} />
            <meshStandardMaterial color="#351717" roughness={0.9} flatShading={true} />
          </mesh>
        </group>
      ) : style === 'grin' ? (
        /* Cười hớn hở thấy răng trắng */
        <group>
          <mesh rotation={[0, 0, Math.PI]}>
            <torusGeometry args={[0.28, 0.05, 4, 10, Math.PI]} />
            {mat}
          </mesh>
          <mesh position={[0, 0.04, 0.02]} scale={[0.38, 0.06, 0.04]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#FFFFFF" roughness={0.2} flatShading={true} />
          </mesh>
        </group>
      ) : style === 'smirk' ? (
        /* Cười nhếch mép */
        <mesh position={[0.06, 0.01, 0]} rotation={[0, 0, Math.PI + 0.35]}>
          <torusGeometry args={[0.18, 0.042, 4, 8, Math.PI * 0.65]} />
          {mat}
        </mesh>
      ) : style === 'open' ? (
        /* Miệng mở cười */
        <group>
          <mesh scale={[1, 0.7, 1]}>
            <torusGeometry args={[0.2, 0.05, 4, 8]} />
            {mat}
          </mesh>
          <mesh scale={[1, 0.7, 0.4]}>
            <sphereGeometry args={[0.16, 6, 4]} />
            <meshStandardMaterial color="#351717" roughness={0.9} flatShading={true} />
          </mesh>
        </group>
      ) : (
        /* Cười mỉm tự nhiên */
        <mesh rotation={[0, 0, Math.PI]}>
          <torusGeometry args={[0.22, 0.042, 4, 8, Math.PI]} />
          {mat}
        </mesh>
      )}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT: AvatarHead (Faceted Shading & Multi-emotion Lifecycle)
// ─────────────────────────────────────────────────────────────────────────────
function AvatarHead({
  skinColor, eyeColor,
  hairStyle, hairColor,
  eyeShape, noseStyle, mouthStyle,
  hasEyebrows, eyebrowColor,
  accessory, accessoryColor,
  panDelta, isPanning,
  isHovered,
}) {
  const headGroupRef  = useRef();
  const scaleGroupRef = useRef();
  const panRotation   = useRef({ x: 0, y: 0 });
  const currentScale  = useRef(1.15);

  // Bộ điều phối biểu cảm (Expression lifecycle: idle -> blink -> wink -> surprise -> smile)
  const exprState = useRef({
    mode: 'idle', // 'idle' | 'blink' | 'wink' | 'surprise'
    timer: 0,
    duration: 0.2,
    nextSwitch: 2.5 + Math.random() * 2,
  });

  useFrame((state, delta) => {
    const t    = state.clock.elapsedTime;
    const head = headGroupRef.current;
    const sGrp = scaleGroupRef.current;
    if (!head || !sGrp) return;

    // Expression state updater
    const s = exprState.current;
    s.nextSwitch -= delta;
    if (s.mode !== 'idle') {
      s.timer += delta;
      if (s.timer >= s.duration) {
        s.mode = 'idle';
        s.timer = 0;
        s.nextSwitch = 2.0 + Math.random() * 3.0; // Khoảng thời gian tới biểu cảm tiếp theo
      }
    } else if (s.nextSwitch <= 0) {
      // Chọn ngẫu nhiên biểu cảm phong phú
      const dice = Math.random();
      if (dice < 0.4) {
        // Chớp mắt tự nhiên
        s.mode = 'blink';
        s.duration = 0.16;
        s.timer = 0;
      } else if (dice < 0.72) {
        // Nháy mắt tinh nghịch (wink)
        s.mode = 'wink';
        s.duration = 0.42;
        s.timer = 0;
      } else {
        // Ngạc nhiên "Oh!"
        s.mode = 'surprise';
        s.duration = 0.65;
        s.timer = 0;
      }
    }

    // Pan interaction
    if (isPanning && panDelta) {
      const dx = panDelta.dx || 0;
      const dy = panDelta.dy || 0;
      panRotation.current.y += dx * PAN_SENSITIVITY;
      panRotation.current.x += dy * PAN_SENSITIVITY;
      panRotation.current.y = Math.max(-MAX_ROT_Y, Math.min(MAX_ROT_Y, panRotation.current.y));
      panRotation.current.x = Math.max(-MAX_ROT_X, Math.min(MAX_ROT_X, panRotation.current.x));
    } else {
      panRotation.current.y = lerp(panRotation.current.y, 0, RETURN_SPEED);
      panRotation.current.x = lerp(panRotation.current.x, 0, RETURN_SPEED);
    }

    // Idle rotation oscillation
    const idleRotY = IDLE_ROT_AMP * Math.sin(IDLE_ROT_SPEED * t);
    head.rotation.y = idleRotY + panRotation.current.y;
    head.rotation.x = panRotation.current.x;

    // Smooth hover / tap zoom
    const baseTarget = isHovered ? 1.38 : 1.15;
    const targetScale = baseTarget + BREATHE_AMP * Math.sin(1.4 * t);
    currentScale.current = lerp(currentScale.current, targetScale, BREATHE_LERP);
    const scaleVal = currentScale.current;
    sGrp.scale.set(scaleVal, scaleVal, scaleVal);

    // Bounce & Swaying motion
    const bounceSpeed = isHovered ? 5.2 : 3.2;
    const bounceAmp = isHovered ? 0.13 : 0.07;
    const bounceY = Math.sin(t * bounceSpeed) * bounceAmp;
    head.position.y = bounceY - 0.18;

    const swayZ = Math.sin(t * 1.8) * 0.05;
    head.rotation.z = swayZ;
  });

  return (
    <group ref={scaleGroupRef}>
      <group ref={headGroupRef}>
        {/* ĐẦU LOW-POLY (Faceted Sphere: 8x7 segments) */}
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[1, 8, 7]} />
          <meshStandardMaterial
            color={skinColor}
            roughness={0.65}
            metalness={0.02}
            flatShading={true}
          />
        </mesh>

        {/* TAI TRÁI */}
        <mesh position={[-1.02, 0.05, 0]} scale={[0.18, 0.28, 0.15]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={skinColor} roughness={0.7} flatShading={true} />
        </mesh>

        {/* TAI PHẢI */}
        <mesh position={[1.02, 0.05, 0]} scale={[0.18, 0.28, 0.15]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={skinColor} roughness={0.7} flatShading={true} />
        </mesh>

        {/* TÓC & PHỤ KIỆN */}
        <HairAndAccessories
          style={hairStyle}
          hairColor={hairColor}
          accessory={accessory}
          accessoryColor={accessoryColor}
        />

        {/* LÔNG MÀY */}
        {hasEyebrows && (
          <Eyebrows
            color={eyebrowColor}
            eyeShape={eyeShape}
            isHovered={isHovered}
            exprState={exprState}
          />
        )}

        {/* MẮT */}
        <EyePair
          eyeColor={eyeColor}
          eyeShape={eyeShape}
          exprState={exprState}
        />

        {/* MŨI */}
        <Nose style={noseStyle} skinColor={skinColor} />

        {/* MIỆNG */}
        <Mouth
          style={mouthStyle}
          isHovered={isHovered}
          exprState={exprState}
        />
      </group>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTED: Avatar3DScene
// ─────────────────────────────────────────────────────────────────────────────
export default function Avatar3DScene({
  skinColor      = '#F4C5A3',
  eyeColor       = '#3A86FF',
  hairStyle      = 'short',
  hairColor      = '#3D2B1F',
  eyeShape       = 'round',
  noseStyle      = 'button',
  mouthStyle     = 'smile',
  hasEyebrows    = true,
  eyebrowColor   = '#3D2B1F',
  accessory      = 'none',
  accessoryColor = '#FBC02D',
  panDelta       = null,
  isPanning      = false,
  isHovered      = false,
}) {
  return (
    <>
      <ambientLight intensity={0.65} />
      <directionalLight position={[2.5, 3.5, 4]} intensity={1.35} castShadow />
      <pointLight position={[-2.5, 1, 2]} intensity={0.45} color="#ffd8b8" />
      <pointLight position={[0, 1, -3]} intensity={0.3} color="#9ec5ff" />

      <AvatarHead
        skinColor={skinColor}
        eyeColor={eyeColor}
        hairStyle={hairStyle}
        hairColor={hairColor}
        eyeShape={eyeShape}
        noseStyle={noseStyle}
        mouthStyle={mouthStyle}
        hasEyebrows={hasEyebrows}
        eyebrowColor={eyebrowColor}
        accessory={accessory}
        accessoryColor={accessoryColor}
        panDelta={panDelta}
        isPanning={isPanning}
        isHovered={isHovered}
      />
    </>
  );
}
