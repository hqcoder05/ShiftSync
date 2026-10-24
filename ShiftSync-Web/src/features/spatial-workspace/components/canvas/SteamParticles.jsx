/**
 * SteamParticles.jsx
 * Ambient rising coffee steam particles for cafe/barista counters in R3F.
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function SteamParticles({ layout = { length: 24, width: 16 } }) {
  const storeLen = Number(layout?.length) || 24.0;
  const storeWid = Number(layout?.width) || 16.0;

  const groupRef = useRef(null);

  const particleData = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => ({
      initX: (Math.random() - 0.5) * 0.22,
      initY: Math.random() * 0.7,
      initZ: (Math.random() - 0.5) * 0.22,
      speed: 0.25 + Math.random() * 0.2,
      seed: i * 1.8,
    }));
  }, []);

  const meshesRef = useRef([]);

  useFrame((_, delta) => {
    particleData.forEach((data, i) => {
      const mesh = meshesRef.current[i];
      if (!mesh) return;

      mesh.position.y += data.speed * delta;
      // Slight horizontal drift
      mesh.position.x = data.initX + Math.sin(mesh.position.y * 5 + data.seed) * 0.03;
      mesh.position.z = data.initZ + Math.cos(mesh.position.y * 5 + data.seed) * 0.03;

      // Reset when reaching top
      if (mesh.position.y > 0.9) {
        mesh.position.y = 0;
      }

      // Fade out as it rises
      if (mesh.material) {
        const progress = mesh.position.y / 0.9;
        mesh.material.opacity = Math.max(0, 0.35 * (1 - progress));
      }
    });
  });

  const geo = useMemo(() => new THREE.SphereGeometry(0.038, 8, 8), []);

  return (
    <group
      ref={groupRef}
      name="steamGroup"
      position={[-storeLen * 0.22, 1.75, -storeWid * 0.18]}
    >
      {particleData.map((data, i) => (
        <mesh
          key={i}
          ref={(el) => (meshesRef.current[i] = el)}
          position={[data.initX, data.initY, data.initZ]}
          geometry={geo}
        >
          <meshBasicMaterial
            color="#FFFFFF"
            transparent
            opacity={0.3}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}
