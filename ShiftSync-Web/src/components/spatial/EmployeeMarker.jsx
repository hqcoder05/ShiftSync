import { useState, useMemo } from 'react';
import { Html } from '@react-three/drei';
import { toThreeCoords, getRoleColor, getDeterministicPersonOffset } from './spatial.constants';

/**
 * EmployeeMarker
 * Real 3D Human Figure representing an on-shift employee stationed inside a zone.
 * 
 * Anatomy:
 * - Contact Ring / Shadow Disc at ground level
 * - Torso: 3D Capsule geometry colored by staff role / skill
 * - Head: 3D Sphere geometry
 * - Deterministic pseudo-random offset within zone perimeter (fixed seed per zone+index)
 * - Interactive raycasting: Click/Hover opens staff details tooltip
 */
export default function EmployeeMarker({
  employee,
  zone,
  layout,
  indexInZone = 0,
  totalInZone = 1,
  isSelected = false,
  onSelect,
  showLabels = true,
}) {
  const [isHovered, setIsHovered] = useState(false);

  // Compute base zone coordinates in Three.js world space
  const [baseX, baseY, baseZ] = toThreeCoords(
    zone?.x || 0,
    zone?.y || 0,
    zone?.z || 0,
    layout
  );

  // Approximate zone dimensions
  const zoneSizeX = Math.min(4.5, (layout?.length || 24) * 0.22);
  const zoneSizeZ = Math.min(3.8, (layout?.width || 16) * 0.22);

  // Deterministic seed-based offset so figures never jitter across renders
  const [offsetX, offsetZ] = useMemo(() => {
    return getDeterministicPersonOffset(
      zone?.id || zone?.name,
      indexInZone,
      totalInZone,
      zoneSizeX,
      zoneSizeZ
    );
  }, [zone?.id, zone?.name, indexInZone, totalInZone, zoneSizeX, zoneSizeZ]);

  const posX = baseX + offsetX;
  const posY = baseY + 0.08; // Just above the zone floor pad
  const posZ = baseZ + offsetZ;

  const staffRole = employee.skillName || employee.role || employee.position || '';
  const personColor = getRoleColor(staffRole);
  const staffName = employee.staffName || employee.fullName || 'Nhân viên';
  const roleName = staffRole || 'Nhân viên ca trực';

  // Compute initials (max 2 characters)
  const initials = staffName
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || 'NV';

  const handlePointerOver = (e) => {
    e.stopPropagation();
    setIsHovered(true);
  };

  const handlePointerOut = () => {
    setIsHovered(false);
  };

  const handleClick = (e) => {
    e.stopPropagation();
    onSelect?.(employee);
  };

  return (
    <group position={[posX, posY, posZ]}>
      {/* Ground Contact / Shadow Disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.08, 0.38, 24]} />
        <meshBasicMaterial
          color={isSelected ? '#10B981' : isHovered ? personColor : '#1E293B'}
          transparent
          opacity={isSelected ? 0.85 : isHovered ? 0.65 : 0.35}
        />
      </mesh>

      {/* 3D Human Figure Body Group (Interactive Raycasting Target) */}
      <group
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        {/* Torso: 3D Capsule Geometry (Rises from y=0.13 to y=1.23) */}
        <mesh position={[0, 0.68, 0]} castShadow receiveShadow>
          <capsuleGeometry args={[0.22, 0.65, 12, 16]} />
          <meshStandardMaterial
            color={isSelected ? '#10B981' : personColor}
            roughness={0.3}
            metalness={0.15}
          />
        </mesh>

        {/* Head: 3D Sphere Geometry (At y=1.35) */}
        <mesh position={[0, 1.35, 0]} castShadow receiveShadow>
          <sphereGeometry args={[0.22, 20, 20]} />
          <meshStandardMaterial
            color={isSelected ? '#10B981' : personColor}
            roughness={0.25}
            metalness={0.1}
          />
        </mesh>

        {/* Halo / Selection indicator */}
        {isSelected && (
          <mesh position={[0, 1.72, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.25, 0.35, 20]} />
            <meshBasicMaterial color="#10B981" side={2} />
          </mesh>
        )}
      </group>

      {/* Interactive Tooltip: Shown ONLY on Hover or Selection (Zero 2D clutter when idle) */}
      {showLabels && (isHovered || isSelected) && (
        <Html
          position={[0, 1.85, 0]}
          center
          distanceFactor={22}
          zIndexRange={[1000, 1000]}
        >
          <div
            onClick={handleClick}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              backgroundColor: '#0F172A',
              color: '#FFFFFF',
              padding: '4px 10px',
              borderRadius: 14,
              boxShadow: '0 6px 20px rgba(0, 0, 0, 0.3)',
              border: `1.5px solid ${isSelected ? '#10B981' : personColor}`,
              fontFamily: 'var(--ss-font, sans-serif)',
              fontSize: 11,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              userSelect: 'none',
              transform: 'scale(1.05)',
              gap: 7,
              pointerEvents: 'auto',
            }}
          >
            {/* Avatar Dot with Initials */}
            <span
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                backgroundColor: personColor,
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 9.5,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {initials}
            </span>

            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
              <span style={{ fontWeight: 700, fontSize: 11 }}>{staffName}</span>
              <span style={{ fontSize: 9, color: '#94A3B8' }}>
                {roleName} {zone?.name ? `• ${zone.name}` : ''}
              </span>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}
