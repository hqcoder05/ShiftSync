import { useState, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls } from '@react-three/drei';
import SceneLighting from './SceneLighting';
import StoreFloor from './StoreFloor';
import StoreWalls from './StoreWalls';
import StoreZone from './StoreZone';
import EmployeeMarker from './EmployeeMarker';
import SpatialDistanceLines from './SpatialDistanceLines';
import AlgorithmVisualizer from './AlgorithmVisualizer';
import { toThreeCoords } from './spatial.constants';

/**
 * StoreScene
 * Root R3F 3D spatial scene composing lighting, floor, architectural walls,
 * zones, employee markers, distance lines, and controls.
 * Integrates dynamic screen-space collision avoidance for zone labels.
 */
export default function StoreScene({
  layout = { length: 24, width: 16, height: 5 },
  zones = [],
  staff = [],
  selectedZone = null,
  onSelectZone,
  selectedStaff = null,
  onSelectStaff,

  // Visibility Toggles
  showZones = true,
  showStaff = true,
  showWorkstations = true,
  showDistances = false,
  showAlgorithm = false,
  showGrid = true,
  showWalls = true,
  showLabels = true,
  allocatedSequence = [],

  // Orbit controls ref forwarded
  controlsRef,
}) {
  const storeLen = layout?.length || 24;
  const storeWid = layout?.width || 16;
  const storeH = layout?.height || 5;

  // Group staff by zone
  const staffByZone = {};
  staff.forEach((s) => {
    const zid = s.zoneId || s.zone?.id;
    if (zid) {
      if (!staffByZone[zid]) staffByZone[zid] = [];
      staffByZone[zid].push(s);
    }
  });

  const { camera, size } = useThree();
  const [collapsedZoneIds, setCollapsedZoneIds] = useState(() => new Set());
  const [hoveredZoneId, setHoveredZoneId] = useState(null);
  const lastCollapsedRef = useRef(new Set());
  const frameCountRef = useRef(0);

  // Dynamic Screen-Space Collision Avoidance (Điều chỉnh 1)
  useFrame(() => {
    frameCountRef.current++;
    // Throttled to run every 4 frames (~15fps update rate, smooth & zero lag)
    if (frameCountRef.current % 4 !== 0) return;
    if (!showLabels || zones.length < 2) return;

    const projected = [];
    zones.forEach((zone, idx) => {
      const [tx, ty, tz] = toThreeCoords(zone.x, zone.y, zone.z, layout);
      const staggerY = idx % 2 === 1 ? 1.65 : 1.25;
      const v = new THREE.Vector3(tx, ty + staggerY, tz);
      v.project(camera);

      // Convert NDC to canvas pixel coordinates
      const px = (v.x * 0.5 + 0.5) * size.width;
      const py = -(v.y * 0.5 - 0.5) * size.height;
      const isFacing = v.z < 1; // Not behind camera
      const staffCount = (staffByZone[zone.id] || []).length;

      projected.push({
        id: zone.id,
        px,
        py,
        isFacing,
        staffCount,
        capacity: zone.capacity || 4,
        idx,
      });
    });

    const nextCollapsed = new Set();
    const COLLISION_THRESHOLD_PX = 80; // Overlap pixel distance threshold

    for (let i = 0; i < projected.length; i++) {
      for (let j = i + 1; j < projected.length; j++) {
        const a = projected[i];
        const b = projected[j];
        if (!a.isFacing || !b.isFacing) continue;

        const dist = Math.hypot(a.px - b.px, a.py - b.py);
        if (dist < COLLISION_THRESHOLD_PX) {
          // Rule: If either zone in the pair is hovered or selected, expand BOTH
          const isAActive = a.id === hoveredZoneId || a.id === selectedZone?.id;
          const isBActive = b.id === hoveredZoneId || b.id === selectedZone?.id;
          if (isAActive || isBActive) {
            continue;
          }

          // Otherwise, collapse the one with lower occupancy / priority
          if (a.staffCount > b.staffCount) {
            nextCollapsed.add(b.id);
          } else if (b.staffCount > a.staffCount) {
            nextCollapsed.add(a.id);
          } else if (a.capacity > b.capacity) {
            nextCollapsed.add(b.id);
          } else if (b.capacity > a.capacity) {
            nextCollapsed.add(a.id);
          } else {
            nextCollapsed.add(b.id);
          }
        }
      }
    }

    // Check if set of collapsed IDs actually changed before triggering state update
    let hasChanged = nextCollapsed.size !== lastCollapsedRef.current.size;
    if (!hasChanged) {
      for (const id of nextCollapsed) {
        if (!lastCollapsedRef.current.has(id)) {
          hasChanged = true;
          break;
        }
      }
    }

    if (hasChanged) {
      lastCollapsedRef.current = nextCollapsed;
      setCollapsedZoneIds(new Set(nextCollapsed));
    }
  });

  const anyFocused = Boolean(hoveredZoneId || selectedZone);

  return (
    <>
      <SceneLighting />

      {/* OrbitControls with damping & restricted polar angle so camera doesn't go below floor */}
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.05}
        minPolarAngle={0.15}
        maxPolarAngle={Math.PI / 2 - 0.05} // Do not flip below floor
        minDistance={8}
        maxDistance={55}
      />

      {/* Store Architectural Shell */}
      <StoreFloor length={storeLen} width={storeWid} showGrid={showGrid} />
      <StoreWalls length={storeLen} width={storeWid} height={storeH} visible={showWalls} />

      {/* 3D Zones */}
      {showZones &&
        zones.map((zone, idx) => {
          const zoneStaff = staffByZone[zone.id] || [];
          const isCollapsed = collapsedZoneIds.has(zone.id);
          return (
            <StoreZone
              key={zone.id || zone.name}
              zone={zone}
              layout={layout}
              assignedCount={zoneStaff.length}
              isSelected={selectedZone?.id === zone.id}
              isAlgorithmTarget={showAlgorithm && allocatedSequence.includes(zone.id)}
              onSelect={onSelectZone}
              showWorkstations={showWorkstations}
              showLabels={showLabels}
              staggerIndex={idx % 2}
              isCollapsed={isCollapsed}
              anyZoneFocused={anyFocused}
              onHoverChange={(isHov) => setHoveredZoneId(isHov ? zone.id : null)}
            />
          );
        })}

      {/* 3D Employee Markers */}
      {showStaff &&
        zones.map((zone) => {
          const zoneStaff = staffByZone[zone.id] || [];
          return zoneStaff.map((emp, sIdx) => (
            <EmployeeMarker
              key={emp.id || `${zone.id}-${sIdx}`}
              employee={emp}
              zone={zone}
              layout={layout}
              indexInZone={sIdx}
              totalInZone={zoneStaff.length}
              isSelected={selectedStaff?.id === emp.id}
              onSelect={onSelectStaff}
              showLabels={showLabels}
            />
          ));
        })}

      {/* Progressive-disclosure distance lines (only shows when employee is selected or distance layer active) */}
      <SpatialDistanceLines
        zones={zones}
        layout={layout}
        selectedStaff={selectedStaff}
        selectedZone={selectedZone}
        active={showDistances}
      />

      {/* Spatial Algorithm Max-Min Dispersion Visualizer */}
      <AlgorithmVisualizer
        zones={zones}
        layout={layout}
        allocatedSequence={allocatedSequence}
        active={showAlgorithm}
      />
    </>
  );
}
