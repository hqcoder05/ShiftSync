/**
 * DigitalTwinStudioEnvironment.jsx
 * High-End Tier-1 Visual Upgrade for ShiftSync Digital Twin:
 * 
 * 1. Procedural Image-Based Studio Lighting (IBL) via Drei Environment & Lightformers:
 *    - 100% offline, zero external network dependency.
 *    - Realistic specular highlights and reflections on all PBR metals, glass, and polished wood.
 * 2. High-Fidelity Contact Shadows (Soft Micro-AO):
 *    - Grounds every desk leg, chair caster, counter, and booth firmly onto the floor.
 * 3. Polished Reflective Store Floor (MeshReflectorMaterial):
 *    - Subtle showroom floor reflections giving the digital twin an executive SaaS look.
 */

import { useMemo } from 'react';
import { Environment, Lightformer, ContactShadows, MeshReflectorMaterial } from '@react-three/drei';
import * as THREE from 'three';

export default function DigitalTwinStudioEnvironment({
  layout = { length: 24, width: 16, height: 6 },
  showReflections = true,
}) {
  const storeLen = Number(layout?.length) || 24.0;
  const storeWid = Number(layout?.width) || 16.0;
  const storeH = Number(layout?.height) || 6.0;
  const maxDim = Math.max(storeLen, storeWid);

  return (
    <group name="DigitalTwin_Studio_Environment">
      {/* 1. Procedural Image-Based Studio Lighting (IBL) */}
      <Environment background={false}>
        {/* Soft overhead architectural skylight */}
        <Lightformer
          form="rect"
          intensity={1.6}
          color="#FFFDF5"
          position={[0, storeH + 3, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[storeLen * 0.9, storeWid * 0.9, 1]}
        />

        {/* Warm barista & counter key accent */}
        <Lightformer
          form="rect"
          intensity={1.4}
          color="#FEF3C7"
          position={[-storeLen * 0.25, 4.0, storeWid * 0.2]}
          rotation={[0, Math.PI / 4, 0]}
          scale={[7, 4, 1]}
        />

        {/* Cool modern retail rim light */}
        <Lightformer
          form="circle"
          intensity={1.1}
          color="#E0F2FE"
          position={[storeLen * 0.35, 5.0, -storeWid * 0.25]}
          rotation={[0, -Math.PI / 3, 0]}
          scale={8}
        />

        {/* Low horizontal studio fill ring */}
        <Lightformer
          form="ring"
          intensity={0.65}
          color="#F8FAFC"
          position={[0, 1.2, 0]}
          scale={maxDim * 1.2}
        />
      </Environment>

      {/* 2. Real-time Soft Contact Shadows (Grounding all furniture & chair casters) */}
      <ContactShadows
        position={[0, 0.003, 0]}
        opacity={0.68}
        scale={maxDim * 1.15}
        blur={1.8}
        far={4.8}
        resolution={1024}
        color="#0F172A"
      />

      {/* 3. Polished Architectural Floor Reflection Plane */}
      {showReflections && (
        <mesh position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[storeLen - 0.4, storeWid - 0.4]} />
          <MeshReflectorMaterial
            blur={[350, 100]}
            resolution={512}
            mirror={0.28}
            mixBlur={0.82}
            mixStrength={1.4}
            roughness={0.52}
            depthScale={1.2}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.4}
            color="#F5EBE0"
            metalness={0.06}
          />
        </mesh>
      )}
    </group>
  );
}
