import * as THREE from 'three';
import { toThreeCoords } from './spatial.constants';

/**
 * AlgorithmVisualizer
 * Visualizes the physical dispersion network links between allocated staff zones.
 * Metrics and explanation are rendered in the 2D Screen-space Drawer.
 */
export default function AlgorithmVisualizer({
  zones = [],
  layout,
  allocatedSequence = [], // array of zone IDs in order of allocation
  active = false,
}) {
  if (!active || zones.length < 2) return null;

  // Map sequence of allocated zones
  const orderedZones = allocatedSequence.length > 0
    ? allocatedSequence.map((id) => zones.find((z) => z.id === id)).filter(Boolean)
    : zones.slice(0, 4);

  return (
    <group>
      {/* Dispersion Network Links */}
      {orderedZones.map((zA, i) => {
        if (i === orderedZones.length - 1) return null;
        const zB = orderedZones[i + 1];
        const [x1, y1, z1] = toThreeCoords(zA.x, zA.y, zA.z, layout);
        const [x2, y2, z2] = toThreeCoords(zB.x, zB.y, zB.z, layout);

        const points = [
          new THREE.Vector3(x1, y1 + 0.4, z1),
          new THREE.Vector3(x2, y2 + 0.4, z2),
        ];
        const geo = new THREE.BufferGeometry().setFromPoints(points);

        return (
          <line key={`alg-link-${zA.id || i}-${zB.id}`}>
            <primitive object={geo} attach="geometry" />
            <lineBasicMaterial color="#F59E0B" linewidth={2.5} />
          </line>
        );
      })}
    </group>
  );
}
