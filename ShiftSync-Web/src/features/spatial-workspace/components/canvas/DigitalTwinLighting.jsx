/**
 * DigitalTwinLighting.jsx
 * Declarative Soft Lighting Rig for ShiftSync R3F Digital Twin.
 */

import { useMemo } from 'react';
import * as THREE from 'three';

export default function DigitalTwinLighting({ layout = { length: 24, width: 16, height: 6 } }) {
  const storeLen = Number(layout?.length) || 24.0;
  const storeWid = Number(layout?.width) || 16.0;
  const storeH = Number(layout?.height) || 6.0;

  const frustumSize = Math.max(storeLen, storeWid) * 1.1;

  const dirLightPos = useMemo(
    () => [storeLen * 0.75, storeH * 2.6, storeWid * 0.85],
    [storeLen, storeH, storeWid]
  );

  const fillLightPos = useMemo(
    () => [-storeLen * 0.6, storeH * 1.4, -storeWid * 0.6],
    [storeLen, storeH, storeWid]
  );

  return (
    <>
      <ambientLight intensity={0.3} color="#FFFFFF" />
      <hemisphereLight
        args={[new THREE.Color(0xE0F2FE), new THREE.Color(0xFEF3C7), 0.85]}
      />
      <directionalLight
        position={dirLightPos}
        intensity={1.25}
        color="#FFFBEB"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={120}
        shadow-bias={-0.0004}
        shadow-camera-left={-frustumSize}
        shadow-camera-right={frustumSize}
        shadow-camera-top={frustumSize}
        shadow-camera-bottom={-frustumSize}
      />
      <directionalLight
        position={fillLightPos}
        intensity={0.4}
        color="#E2E8F0"
      />
    </>
  );
}
