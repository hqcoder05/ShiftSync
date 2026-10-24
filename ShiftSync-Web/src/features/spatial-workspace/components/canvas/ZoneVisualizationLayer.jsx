/**
 * ZoneVisualizationLayer.jsx
 * Declarative Zone Visualization & Heatmap Layer for ShiftSync R3F Digital Twin.
 * 
 * - Floor decals representing store functional zones.
 * - Real-time staffing heatmaps based on shift target requirements.
 * - Floating tag sprites showing occupancy vs requirement quota.
 * - Geofence boundary circle (150m radius).
 */

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { buildZoneDecal, createZoneTagSprite } from '../../scene/ZoneDecals.js';
import { buildZoneFurniture } from '../../scene/FurnitureBuilder.js';
import { toThreeCoords } from '../../../../components/spatial/spatial.constants.js';
import { disposeHierarchy } from '../../scene/ResourceManager.js';
import { getCoffeeZoneFrame } from '../../scene/StoreArrangement.js';

export default function ZoneVisualizationLayer({
  hasStoreModel = false,
  modelRoot = null,
  workstationMeshes = [],
  zones = [],
  staff = [],
  layout = { length: 24, width: 16, height: 6 },
  layers = { showZones: true, showFurniture: true, showGeofence: false },
  selectedZone = null,
  heatmapMode = 'NONE',
  activeSkillFilter = 'ALL',
  zoneReqMap = {},
  workstations = [],
}) {
  const groupRef = useRef(null);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    // Clear old zone entities
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      disposeHierarchy(child);
    }

    if (!layers?.showZones && !layers?.showGeofence) return;

    const storeLen = Number(layout?.length) || 24.0;
    const storeWid = Number(layout?.width) || 16.0;
    const zoneSizeX = Math.min(4.4, storeLen * 0.22);
    const zoneSizeZ = Math.min(3.6, storeWid * 0.22);

    // Group active staff by zone
    const staffByZone = {};
    staff.forEach((s) => {
      const zid = s.zoneId || s.zone?.id;
      if (zid) {
        if (!staffByZone[zid]) staffByZone[zid] = [];
        staffByZone[zid].push(s);
      }
    });

    const zonesWithWorkstations = new Set(
      (workstations || [])
        .map((w) => w.zoneId)
        .filter(Boolean)
    );

    // 1. Zone Decals, Furniture & Floating Sprites
    if (layers?.showZones) {
      zones.forEach((zone) => {
        const physicalFrame=hasStoreModel?getCoffeeZoneFrame(modelRoot,zone):null;
        const [tx, ty, tz] = physicalFrame?[physicalFrame.x,0,physicalFrame.z]:toThreeCoords(zone.x, zone.y, zone.z, layout);
        const sizeX=physicalFrame?.sizeX??Math.min(Number(zone.lengthDim || zone.length) || zoneSizeX, storeLen - 1);
        const sizeZ=physicalFrame?.sizeZ??Math.min(Number(zone.widthDim || zone.width) || zoneSizeZ, storeWid - 1);
        const zoneStaff = staffByZone[zone.id] || [];
        const isSelected = selectedZone?.id === zone.id;
        const isSkillMatched =
          activeSkillFilter !== 'ALL' &&
          ((zone.name || '').toLowerCase().includes(activeSkillFilter.toLowerCase()) ||
            (zone.requiredSkill && (zone.requiredSkill || '').toLowerCase().includes(activeSkillFilter.toLowerCase())));

        const effectiveRequiredStaff =
          zoneReqMap[zone.id] !== undefined ? zoneReqMap[zone.id] : (zone.requiredStaff ?? null);

        const decal = buildZoneDecal({
          zone,
          tx,
          ty,
          tz,
          sizeX,
          sizeZ,
          assignedCount: zoneStaff.length,
          isSelected,
          heatmapMode,
          requiredStaff: effectiveRequiredStaff,
          isSkillMatched,
        });
        decal.userData.physicalZoneFrame=Boolean(physicalFrame);
        group.add(decal);

        // Decorative furniture only if showFurniture is on AND zone has no dedicated workstations
        if (!hasStoreModel && layers?.showFurniture && !zonesWithWorkstations.has(zone.id)) {
          const furniture = buildZoneFurniture(zone.name, zoneSizeX);
          furniture.position.set(tx, ty, tz);
          group.add(furniture);
        }

        const sprite = createZoneTagSprite(
          zone,
          zoneStaff.length,
          zone.capacity || 4,
          isSelected,
          heatmapMode,
          effectiveRequiredStaff,
          isSkillMatched
        );
        sprite.userData = { isZoneTag: true, zoneId: zone.id, isSelected };
        sprite.position.set(tx,ty+1.9,tz+sizeZ*.4);
        group.add(sprite);
      });
    }

    // 2. Geofence Boundary Layer
    if (layers?.showGeofence) {
      const fenceRadius = Math.max(storeLen, storeWid) * 0.72;
      const fenceGeo = new THREE.RingGeometry(fenceRadius - 0.18, fenceRadius + 0.18, 64);
      fenceGeo.rotateX(-Math.PI / 2);
      const fenceMat = new THREE.MeshBasicMaterial({
        color: 0x0284C7,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
      });
      const fenceMesh = new THREE.Mesh(fenceGeo, fenceMat);
      fenceMesh.position.set(0, 0.04, 0);
      group.add(fenceMesh);

      const fenceCanvas = document.createElement('canvas');
      fenceCanvas.width = 384;
      fenceCanvas.height = 76;
      const fctx = fenceCanvas.getContext('2d');
      fctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      fctx.beginPath();
      fctx.roundRect(4, 4, 376, 68, 16);
      fctx.fill();
      fctx.strokeStyle = '#0284C7';
      fctx.lineWidth = 4;
      fctx.stroke();
      fctx.font = 'bold 22px "Segoe UI", sans-serif';
      fctx.fillStyle = '#38BDF8';
      fctx.textAlign = 'center';
      fctx.textBaseline = 'middle';
      fctx.fillText(' Bán Kính Chấm Công Geofence (150m)', 192, 38);

      const fenceTex = new THREE.CanvasTexture(fenceCanvas);
      const fenceSpriteMat = new THREE.SpriteMaterial({ map: fenceTex, transparent: true });
      const fenceSprite = new THREE.Sprite(fenceSpriteMat);
      fenceSprite.scale.set(3.2, 0.65, 1);
      fenceSprite.position.set(0, 1.2, -fenceRadius);
      group.add(fenceSprite);
    }
  }, [
    zones,
    staff,
    layout?.length,
    layout?.width,
    layout?.height,
    layers?.showZones,
    layers?.showFurniture,
    layers?.showGeofence,
    selectedZone,
    heatmapMode,
    activeSkillFilter,
    hasStoreModel,
    modelRoot,
    workstationMeshes,
    zoneReqMap,
    workstations,
  ]);

  return <group ref={groupRef} name="zoneVisualizationGroup" />;
}
