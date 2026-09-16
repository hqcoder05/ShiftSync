import * as THREE from 'three';

/**
 * StoreFloor
 * Clean, restrained architectural floor plane with subtle secondary metric grid
 * and minimalist entrance indicator.
 */
export default function StoreFloor({ length = 24, width = 16, showGrid = true }) {
  const maxDim = Math.max(length, width);

  return (
    <group position={[0, -0.01, 0]}>
      {/* Base Floor Slab */}
      <mesh receiveShadow position={[0, -0.05, 0]}>
        <boxGeometry args={[length, 0.1, width]} />
        <meshStandardMaterial
          color="#FFFFFF"
          roughness={0.9}
          metalness={0.02}
        />
      </mesh>

      {/* Subtle Perimeter Border Line */}
      <lineSegments position={[0, 0.005, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(length, 0.01, width)]} />
        <lineBasicMaterial color="#E2E8F0" transparent opacity={0.8} />
      </lineSegments>

      {/* Secondary Metric Grid (Never competes with zones) */}
      {showGrid && (
        <gridHelper
          args={[maxDim, Math.round(maxDim), '#F1F5F9', '#F8FAFC']}
          position={[0, 0.008, 0]}
        />
      )}

      {/* Minimalist Entrance Marker */}
      <group position={[0, 0.015, width / 2]}>
        <mesh receiveShadow>
          <boxGeometry args={[2.4, 0.01, 0.25]} />
          <meshStandardMaterial
            color="#10B981"
            roughness={0.5}
            transparent
            opacity={0.7}
          />
        </mesh>
      </group>
    </group>
  );
}
