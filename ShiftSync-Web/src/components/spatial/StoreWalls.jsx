
/**
 * StoreWalls
 * Lightweight, visually quiet architectural perimeter boundary with open entrance cutout.
 * Never obscures interior zones or employee markers.
 */
export default function StoreWalls({ length = 24, width = 16, height = 3.5, visible = true }) {
  if (!visible) return null;

  const wallThickness = 0.08;
  const halfLen = length / 2;
  const halfWid = width / 2;
  const halfH = height / 2;
  const doorWidth = 3.5;

  // Subtle architectural perimeter boundary materials (opacity ~0.55 to avoid occluding interior)
  const glassProps = {
    color: '#E2E8F0',
    transparent: true,
    opacity: 0.55,
    roughness: 0.3,
    metalness: 0.05,
    depthWrite: false,
  };

  const wireCapProps = {
    color: '#94A3B8',
    roughness: 0.5,
    transparent: true,
    opacity: 0.75,
  };

  return (
    <group>
      {/* Back Wall (North / -Z) */}
      <mesh position={[0, halfH, -halfWid]}>
        <boxGeometry args={[length, height, wallThickness]} />
        <meshStandardMaterial {...glassProps} />
      </mesh>
      <mesh position={[0, height, -halfWid]}>
        <boxGeometry args={[length, 0.03, wallThickness + 0.02]} />
        <meshStandardMaterial {...wireCapProps} />
      </mesh>

      {/* Left Wall (West / -X) */}
      <mesh position={[-halfLen, halfH, 0]}>
        <boxGeometry args={[wallThickness, height, width]} />
        <meshStandardMaterial {...glassProps} />
      </mesh>
      <mesh position={[-halfLen, height, 0]}>
        <boxGeometry args={[wallThickness + 0.02, 0.03, width]} />
        <meshStandardMaterial {...wireCapProps} />
      </mesh>

      {/* Right Wall (East / +X) */}
      <mesh position={[halfLen, halfH, 0]}>
        <boxGeometry args={[wallThickness, height, width]} />
        <meshStandardMaterial {...glassProps} />
      </mesh>
      <mesh position={[halfLen, height, 0]}>
        <boxGeometry args={[wallThickness + 0.02, 0.03, width]} />
        <meshStandardMaterial {...wireCapProps} />
      </mesh>

      {/* Front Wall Left Segment (South / +Z) */}
      <mesh position={[-(halfLen + doorWidth / 2) / 2, halfH, halfWid]}>
        <boxGeometry args={[halfLen - doorWidth / 2, height, wallThickness]} />
        <meshStandardMaterial {...glassProps} />
      </mesh>
      <mesh position={[-(halfLen + doorWidth / 2) / 2, height, halfWid]}>
        <boxGeometry args={[halfLen - doorWidth / 2, 0.03, wallThickness + 0.02]} />
        <meshStandardMaterial {...wireCapProps} />
      </mesh>

      {/* Front Wall Right Segment (South / +Z) */}
      <mesh position={[(halfLen + doorWidth / 2) / 2, halfH, halfWid]}>
        <boxGeometry args={[halfLen - doorWidth / 2, height, wallThickness]} />
        <meshStandardMaterial {...glassProps} />
      </mesh>
      <mesh position={[(halfLen + doorWidth / 2) / 2, height, halfWid]}>
        <boxGeometry args={[halfLen - doorWidth / 2, 0.03, wallThickness + 0.02]} />
        <meshStandardMaterial {...wireCapProps} />
      </mesh>

      {/* Door Header Lint (Above entrance) */}
      <mesh position={[0, height - 0.2, halfWid]}>
        <boxGeometry args={[doorWidth, 0.4, wallThickness]} />
        <meshStandardMaterial {...glassProps} />
      </mesh>
      <mesh position={[0, height, halfWid]}>
        <boxGeometry args={[doorWidth, 0.03, wallThickness + 0.02]} />
        <meshStandardMaterial {...wireCapProps} />
      </mesh>
    </group>
  );
}
