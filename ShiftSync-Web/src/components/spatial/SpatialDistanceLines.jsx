import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { toThreeCoords, calculateZoneDistance } from './spatial.constants';

/**
 * SpatialDistanceLines
 * Progressive-disclosure distance visualizer.
 * In accordance with enterprise UX rules:
 * - Default: NO distance lines (eliminates visual spaghetti).
 * - When an employee is selected: displays single leader line between Selected Employee -> Assigned Zone.
 * - When a zone is selected with distance layer active: displays distances to nearest neighboring zones only.
 */
export default function SpatialDistanceLines({
  zones = [],
  layout,
  selectedStaff = null,
  selectedZone = null,
  active = false,
}) {
  // Case 1: An employee is selected -> Show ONLY Selected Employee -> Assigned Zone Anchor
  if (selectedStaff) {
    const assignedZoneId = selectedStaff.zoneId || selectedStaff.zone?.id;
    const targetZone = zones.find((z) => z.id === assignedZoneId);

    if (targetZone) {
      const [zx, zy, zz] = toThreeCoords(targetZone.x, targetZone.y, targetZone.z, layout);
      // Selected employee pin head position
      const empPos = new THREE.Vector3(zx, zy + 0.75, zz);
      const zoneAnchor = new THREE.Vector3(zx, zy + 0.08, zz);

      const lineGeo = new THREE.BufferGeometry().setFromPoints([empPos, zoneAnchor]);

      return (
        <group>
          <line geometry={lineGeo}>
            <lineDashedMaterial
              color="#10B981"
              dashSize={0.2}
              gapSize={0.1}
              linewidth={2}
            />
          </line>
        </group>
      );
    }
  }

  // If distance layer is NOT active and no zone selected, show nothing
  if (!active || zones.length < 2) return null;

  // Case 2: A zone is selected and distance layer is active -> show connections from this zone to nearest neighbors
  const connections = [];

  if (selectedZone) {
    const [x1, y1, z1] = toThreeCoords(selectedZone.x, selectedZone.y, selectedZone.z, layout);

    // Compute distances to all other zones, sort by distance, take nearest 3 to avoid clutter
    const sortedNeighbors = zones
      .filter((z) => z.id !== selectedZone.id)
      .map((zB) => ({
        zone: zB,
        dist: calculateZoneDistance(selectedZone, zB),
      }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 3);

    sortedNeighbors.forEach(({ zone: zB, dist }) => {
      const [x2, y2, z2] = toThreeCoords(zB.x, zB.y, zB.z, layout);
      connections.push({
        id: `${selectedZone.id}-${zB.id}`,
        start: new THREE.Vector3(x1, y1 + 0.25, z1),
        end: new THREE.Vector3(x2, y2 + 0.25, z2),
        mid: new THREE.Vector3((x1 + x2) / 2, (y1 + y2) / 2 + 0.4, (z1 + z2) / 2),
        distance: dist.toFixed(1),
      });
    });
  } else {
    // Case 3: Distance layer active with no zone selected -> Chain consecutive zones (perimeter sequence)
    // instead of N*(N-1)/2 all-to-all lines
    for (let i = 0; i < zones.length - 1; i++) {
      const zA = zones[i];
      const zB = zones[i + 1];
      const [x1, y1, z1] = toThreeCoords(zA.x, zA.y, zA.z, layout);
      const [x2, y2, z2] = toThreeCoords(zB.x, zB.y, zB.z, layout);
      const dist = calculateZoneDistance(zA, zB);

      connections.push({
        id: `${zA.id || i}-${zB.id || i + 1}`,
        start: new THREE.Vector3(x1, y1 + 0.25, z1),
        end: new THREE.Vector3(x2, y2 + 0.25, z2),
        mid: new THREE.Vector3((x1 + x2) / 2, (y1 + y2) / 2 + 0.35, (z1 + z2) / 2),
        distance: dist.toFixed(1),
      });
    }
  }

  return (
    <group>
      {connections.map((conn) => {
        const lineGeo = new THREE.BufferGeometry().setFromPoints([conn.start, conn.end]);

        return (
          <group key={conn.id}>
            <line geometry={lineGeo}>
              <lineDashedMaterial
                color="#6366F1"
                dashSize={0.4}
                gapSize={0.2}
                linewidth={1.5}
                transparent
                opacity={0.55}
              />
            </line>

            {/* Subtle distance pill */}
            <Html position={[conn.mid.x, conn.mid.y, conn.mid.z]} center distanceFactor={26}>
              <div
                style={{
                  backgroundColor: 'rgba(238, 242, 255, 0.95)',
                  color: '#4338CA',
                  padding: '2px 5px',
                  borderRadius: 4,
                  fontSize: 9.5,
                  fontWeight: 700,
                  border: '1px solid #C7D2FE',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                }}
              >
                {conn.distance}m
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}
