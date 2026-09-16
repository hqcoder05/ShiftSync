import { useState } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { getZoneThemeColor, toThreeCoords, getCapacityState, getZoneIcon, getShortZoneName, getOccupancyColor } from './spatial.constants';
import Workstation from './Workstation';

/**
 * StoreZone
 * Interactive 3D spatial zone within the store layout.
 * Features:
 * - Subtle, clean architectural extrusion
 * - Semantic capacity state (EMPTY, PARTIAL, FULL, OVER)
 * - Dynamic occupancy coloring on floor pad:
 *   >= 70% Green (#10B981), 30-70% Yellow (#F59E0B), < 30% Red (#EF4444)
 * - Clear Z-axis elevation staging with vertical structure
 * - Adaptive LOD label with screen-space collision avoidance and focus dimming
 */
export default function StoreZone({
  zone,
  layout,
  assignedCount = 0,
  isSelected = false,
  isAlgorithmTarget = false,
  onSelect,
  showWorkstations = true,
  showLabels = true,
  staggerIndex = 0,
  isCollapsed = false,
  anyZoneFocused = false,
  onHoverChange,
}) {
  const [isHovered, setIsHovered] = useState(false);

  const [threeX, threeY, threeZ] = toThreeCoords(zone.x, zone.y, zone.z, layout);
  const themeColor = getZoneThemeColor(zone);
  const capacity = zone.capacity || 4;
  const occupancyColor = getOccupancyColor(assignedCount, capacity);
  const isElevated = (zone.z || 0) > 0.5;
  const capState = getCapacityState(assignedCount, capacity);
  const zoneIcon = getZoneIcon(zone);
  const shortName = getShortZoneName(zone);

  const isFocused = isSelected || isHovered;
  const isDimmed = anyZoneFocused && !isFocused;

  // Staggering height for connector line and label (Level 0 vs Level 1)
  const stemHeight = staggerIndex === 1 ? 1.65 : 1.25;
  const labelY = stemHeight + 0.12;

  // Determine workstation type based on zoneType or zone name
  const getWorkstationType = () => {
    if (zone.zoneType) {
      const zt = String(zone.zoneType).toUpperCase();
      if (zt === 'CHECKOUT') return 'pos';
      if (zt === 'STORAGE') return 'storage';
      if (zt === 'DISPLAY') return 'display';
      if (zt === 'CONSULTATION') return 'styling';
      if (zt === 'SERVICE_STATION') return 'service';
      if (zt === 'SEATING') return 'dining';
      if (zt === 'PRODUCTION') return 'kitchen';
    }
    const lower = (zone.name || '').toLowerCase();
    if (lower.includes('barista') || lower.includes('pha chế')) return 'barista';
    if (lower.includes('pos') || lower.includes('cashier') || lower.includes('thu ngân')) return 'pos';
    if (lower.includes('kitchen') || lower.includes('bếp') || lower.includes('bakery')) return 'kitchen';
    if (lower.includes('dining') || lower.includes('bàn') || lower.includes('khách')) return 'dining';
    if (lower.includes('display') || lower.includes('trưng bày') || lower.includes('giày') || lower.includes('kệ')) return 'display';
    if (lower.includes('salon') || lower.includes('tóc') || lower.includes('styling') || lower.includes('gội')) return 'styling';
    if (lower.includes('storage') || lower.includes('kho') || lower.includes('tiếp liệu')) return 'storage';
    return 'generic';
  };
  const wsType = getWorkstationType();

  // Zone box dimensions (meters)
  const zoneSizeX = zone.width != null ? Number(zone.width) : Math.min(4.5, (layout.length || 24) * 0.22);
  const zoneSizeZ = zone.length != null ? Number(zone.length) : Math.min(3.8, (layout.width || 16) * 0.22);
  const zoneHeight = zone.height != null ? Number(zone.height) : 0.08;

  // Capacity visual styling
  const opacity = isSelected
    ? 0.42
    : isHovered
    ? 0.32
    : capState === 'EMPTY'
    ? 0.12
    : capState === 'OVER'
    ? 0.32
    : 0.2;

  const borderColor = isAlgorithmTarget
    ? '#F59E0B'
    : isSelected
    ? '#10B981'
    : isHovered
    ? occupancyColor
    : occupancyColor;

  const handlePointerOver = (e) => {
    e.stopPropagation();
    setIsHovered(true);
    onHoverChange?.(true);
  };

  const handlePointerOut = () => {
    setIsHovered(false);
    onHoverChange?.(false);
  };

  return (
    <group position={[threeX, threeY + (isSelected ? 0.03 : 0), threeZ]}>
      {/* If elevated (Mezzanine / 2nd level), render support pillars and floor slab */}
      {isElevated && (
        <group position={[0, -threeY / 2, 0]}>
          <mesh position={[-zoneSizeX / 2 + 0.2, 0, -zoneSizeZ / 2 + 0.2]} castShadow>
            <cylinderGeometry args={[0.06, 0.06, threeY, 12]} />
            <meshStandardMaterial color="#94A3B8" roughness={0.4} metalness={0.2} />
          </mesh>
          <mesh position={[zoneSizeX / 2 - 0.2, 0, -zoneSizeZ / 2 + 0.2]} castShadow>
            <cylinderGeometry args={[0.06, 0.06, threeY, 12]} />
            <meshStandardMaterial color="#94A3B8" roughness={0.4} metalness={0.2} />
          </mesh>
          <mesh position={[-zoneSizeX / 2 + 0.2, 0, zoneSizeZ / 2 - 0.2]} castShadow>
            <cylinderGeometry args={[0.06, 0.06, threeY, 12]} />
            <meshStandardMaterial color="#94A3B8" roughness={0.4} metalness={0.2} />
          </mesh>
          <mesh position={[zoneSizeX / 2 - 0.2, 0, zoneSizeZ / 2 - 0.2]} castShadow>
            <cylinderGeometry args={[0.06, 0.06, threeY, 12]} />
            <meshStandardMaterial color="#94A3B8" roughness={0.4} metalness={0.2} />
          </mesh>

          {/* Elevated Floor Slab */}
          <mesh position={[0, threeY / 2 - 0.04, 0]} receiveShadow>
            <boxGeometry args={[zoneSizeX + 0.15, 0.08, zoneSizeZ + 0.15]} />
            <meshStandardMaterial color="#F8FAFC" roughness={0.8} />
          </mesh>
        </group>
      )}

      {/* Main Interactive Zone Floor Pad (Colored by Occupancy state) */}
      <mesh
        position={[0, zoneHeight / 2, 0]}
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.(zone);
        }}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <boxGeometry args={[zoneSizeX, zoneHeight, zoneSizeZ]} />
        <meshStandardMaterial
          color={occupancyColor}
          transparent
          opacity={opacity}
          roughness={0.4}
        />
      </mesh>

      {/* Zone Perimeter Outline */}
      <lineSegments position={[0, zoneHeight + 0.005, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(zoneSizeX, 0.01, zoneSizeZ)]} />
        <lineBasicMaterial
          color={borderColor}
          linewidth={isSelected || isHovered ? 2.5 : 1}
        />
      </lineSegments>

      {/* Workstation interior */}
      {showWorkstations && wsType && (
        <Workstation type={wsType} position={[0, 0, 0]} />
      )}

      {/* Adaptive LOD Leader Connector Line & Label */}
      {showLabels && (
        <group>
          {/* Vertical leader stem with height staggering */}
          <mesh position={[0, stemHeight / 2, 0]}>
            <cylinderGeometry args={[0.008, 0.008, stemHeight, 6]} />
            <meshBasicMaterial color={isFocused ? occupancyColor : '#94A3B8'} transparent opacity={isFocused ? 0.8 : isDimmed ? 0.2 : 0.45} />
          </mesh>
          {/* Anchor dot on zone pad */}
          <mesh position={[0, zoneHeight + 0.01, 0]}>
            <sphereGeometry args={[0.045, 8, 8]} />
            <meshBasicMaterial color={occupancyColor} />
          </mesh>

          {/* Adaptive LOD Label */}
          <Html
            position={[0, labelY, 0]}
            center
            distanceFactor={28}
            zIndexRange={isFocused ? [1000, 1000] : [100, 0]}
          >
            <div
              onClick={(e) => {
                e.stopPropagation();
                onSelect?.(zone);
              }}
              onMouseEnter={() => {
                setIsHovered(true);
                onHoverChange?.(true);
              }}
              onMouseLeave={() => {
                setIsHovered(false);
                onHoverChange?.(false);
              }}
              style={{
                backgroundColor: isSelected ? '#0F172A' : 'rgba(255, 255, 255, 0.97)',
                color: isSelected ? '#FFFFFF' : '#0F172A',
                padding: isCollapsed && !isFocused ? '3px 6px' : '4px 9px',
                borderRadius: 7,
                boxShadow: isFocused
                  ? '0 6px 20px rgba(0,0,0,0.22)'
                  : isDimmed
                  ? 'none'
                  : '0 2px 8px rgba(0,0,0,0.07)',
                border: `1.5px solid ${isFocused ? '#10B981' : borderColor}`,
                fontFamily: 'var(--ss-font, sans-serif)',
                fontSize: isCollapsed && !isFocused ? 10 : 10.5,
                fontWeight: 600,
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: isCollapsed && !isFocused ? 4 : 6,
                cursor: 'pointer',
                userSelect: 'none',
                opacity: isDimmed ? 0.35 : 1.0,
                transform: isFocused ? 'scale(1.08)' : isDimmed ? 'scale(0.94)' : 'scale(1)',
                transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                pointerEvents: 'auto',
              }}
            >
              {/* Icon */}
              <span style={{ fontSize: 11, lineHeight: 1 }}>{zoneIcon}</span>

              {/* Collapsed State: Icon + Compact Pill Only */}
              {isCollapsed && !isFocused ? (
                <span
                  style={{
                    fontSize: 9,
                    padding: '1px 4px',
                    borderRadius: 4,
                    backgroundColor: isSelected ? '#1E293B' : '#F1F5F9',
                    color: isSelected ? '#94A3B8' : capState === 'OVER' ? '#EF4444' : '#475569',
                    fontWeight: 700,
                  }}
                  title={`${zone.name} (${assignedCount}/${capacity})`}
                >
                  {assignedCount}/{capacity}
                </span>
              ) : (
                /* Full / Standard LOD State */
                <>
                  <span style={{ letterSpacing: '0.15px' }}>
                    {isFocused ? zone.name : shortName}
                  </span>
                  <span
                    style={{
                      fontSize: 9,
                      padding: '1px 5px',
                      borderRadius: 4,
                      backgroundColor: isSelected ? '#1E293B' : '#F1F5F9',
                      color: isSelected ? '#94A3B8' : capState === 'OVER' ? '#EF4444' : '#475569',
                      fontWeight: 700,
                    }}
                  >
                    {assignedCount}/{capacity}
                  </span>
                  {isElevated && (
                    <span
                      style={{
                        fontSize: 8.5,
                        padding: '1px 4px',
                        borderRadius: 4,
                        backgroundColor: '#EEF2FF',
                        color: '#4F46E5',
                        fontWeight: 700,
                      }}
                    >
                      +{zone.z}m
                    </span>
                  )}
                </>
              )}
            </div>
          </Html>
        </group>
      )}
    </group>
  );
}
