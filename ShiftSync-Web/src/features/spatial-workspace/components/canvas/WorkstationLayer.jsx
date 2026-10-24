/**
 * WorkstationLayer.jsx
 * Declarative Workstation Layer for ShiftSync R3F Digital Twin.
 * 
 * - Maps backend workstations to GLB 3D workstation nodes (via mapWorkstationsToGlb).
 * - Falls back to procedural workstation models for surplus or unmapped workstations.
 * - Displays 3D floating tag sprites with live occupancy states:
 *   - ASSIGNED (teal if actual present, blue if scheduled)
 *   - UNASSIGNED (amber)
 *   - UNKNOWN (slate gray)
 * - Synchronizes with WorkstationDragController for interactive layout repositioning and rotation.
 */

import { useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  mapWorkstationsToGlb,
} from '../../scene/DigitalTwinModelLoader.js';
import {
  buildWorkstationObject,
  createWorkstationTagSprite,
} from '../../scene/FurnitureBuilder.js';
import { toThreeCoords } from '../../../../components/spatial/spatial.constants.js';
import { arrangeStoreInterior,getCoffeeZoneFrame } from '../../scene/StoreArrangement.js';
import { disposeHierarchy } from '../../scene/ResourceManager.js';

export default function WorkstationLayer({
  workstations = [],
  workstationOccupancies = new Map(),
  modelData = null,
  layout = { length: 24, width: 16, height: 6 },
  zones = [],
  showWorkstations = true,
  showAttendance = true,
  selectedWorkstation = null,
  onWorkstationMeshesReady = null,
  onPhysicalLayoutReady = null,
}) {
  const surplusGroupRef = useRef(null);
  const activeMeshesRef = useRef([]);

  useLayoutEffect(() => {
    const surplusGroup = surplusGroupRef.current;
    if (surplusGroup) {
      // Clear previous surplus procedural meshes
      while (surplusGroup.children.length > 0) {
        const c = surplusGroup.children[0];
        surplusGroup.remove(c);
        disposeHierarchy(c);
      }
    }

    const currentMeshes = [];

    if (modelData?.workstationsMap) {
      // 1. GLB Mapping Mode
      const customMapped = modelData.customDesign ? workstations.flatMap(ws => {
        const mesh = [...modelData.designNodes.values()].find(node => node.userData.designWorkstationId === ws.id);
        if (!mesh) return [];
        Object.assign(mesh.userData, {isWorkstation:true,isGlbWorkstation:true,workstation:ws,workstationId:ws.id});
        return [{ws,mesh}];
      }) : null;
      const { mappedMeshes, unmappedWorkstations } = customMapped ? {mappedMeshes:customMapped,unmappedWorkstations:[]} : mapWorkstationsToGlb(
        workstations,
        modelData.workstationsMap,
        layout,
        toThreeCoords
      );

      mappedMeshes.forEach(({ ws, mesh }) => {
        mesh.visible = Boolean(showWorkstations);

        // Remove old tag sprites
        const oldTags = [];
        mesh.children.forEach((c) => {
          if (c.userData?.isWorkstationTag) oldTags.push(c);
        });
        oldTags.forEach((t) => {
          mesh.remove(t);
          disposeHierarchy(t);
        });

        // Add 3D floating tag sprite
        if (showWorkstations) {
          const wsOccupancy = workstationOccupancies.get(ws.id);
          const wsTag = createWorkstationTagSprite(ws, wsOccupancy, {
            showAttendance,
            isSelected: selectedWorkstation?.id === ws.id,
          });
          wsTag.position.set(0, 1.6, 0);
          mesh.add(wsTag);
        }

        currentMeshes.push(mesh);
      });

      // Render any surplus workstations that exceed the GLB 4 nodes procedurally
      if (showWorkstations && unmappedWorkstations.length > 0 && surplusGroup) {
        const zoneMap = new Map((zones || []).map((z) => [z.id, z]));

        unmappedWorkstations.forEach((ws) => {
          const parentZone = ws.zoneId ? zoneMap.get(ws.zoneId) : null;
          const rawX = ws.x !== undefined && ws.x !== null ? ws.x : (parentZone?.x ?? 0);
          const rawY = ws.y !== undefined && ws.y !== null ? ws.y : (parentZone?.y ?? 0);
          const rawZ = ws.z !== undefined && ws.z !== null ? ws.z : (parentZone?.z ?? 0);
          const [wx, wy, wz] = toThreeCoords(rawX, rawY, rawZ, layout);

          const wsMesh = buildWorkstationObject(ws);
          wsMesh.position.set(wx, wy, wz);
          surplusGroup.add(wsMesh);
          currentMeshes.push(wsMesh);

          const wsOccupancy = workstationOccupancies.get(ws.id);
          const wsTag = createWorkstationTagSprite(ws, wsOccupancy, {
            showAttendance,
            isSelected: selectedWorkstation?.id === ws.id,
          });
          wsTag.position.set(0, 1.6, 0);
          wsMesh.add(wsTag);
        });
      }
    } else {
      // 2. Procedural Fallback Mode
      if (showWorkstations && workstations && workstations.length > 0 && surplusGroup) {
        const zoneMap = new Map((zones || []).map((z) => [z.id, z]));

        workstations.forEach((ws) => {
          const parentZone = ws.zoneId ? zoneMap.get(ws.zoneId) : null;
          const rawX = ws.x !== undefined && ws.x !== null ? ws.x : (parentZone?.x ?? 0);
          const rawY = ws.y !== undefined && ws.y !== null ? ws.y : (parentZone?.y ?? 0);
          const rawZ = ws.z !== undefined && ws.z !== null ? ws.z : (parentZone?.z ?? 0);
          const [wx, wy, wz] = toThreeCoords(rawX, rawY, rawZ, layout);

          const wsMesh = buildWorkstationObject(ws);
          wsMesh.position.set(wx, wy, wz);
          surplusGroup.add(wsMesh);
          currentMeshes.push(wsMesh);

          const wsOccupancy = workstationOccupancies.get(ws.id);
          const wsTag = createWorkstationTagSprite(ws, wsOccupancy, {
            showAttendance,
            isSelected: selectedWorkstation?.id === ws.id,
          });
          wsTag.position.set(0, 1.6, 0);
          wsMesh.add(wsTag);
        });
      }
    }

    if (modelData?.modelRoot && !modelData.customDesign) arrangeStoreInterior(modelData.modelRoot, currentMeshes, layout, showWorkstations);
    if(onPhysicalLayoutReady) {
      const viewZones=zones.map(zone=>{
        const frame=modelData?.isGlb?getCoffeeZoneFrame(modelData.modelRoot,zone):null;
        return frame?{...zone,x:frame.x+layout.length/2,y:frame.z+layout.width/2,z:0,lengthDim:frame.sizeX,widthDim:frame.sizeZ,physicalFrame:frame}:zone;
      });
      onPhysicalLayoutReady(viewZones);
    }
    activeMeshesRef.current = currentMeshes;
    if (typeof onWorkstationMeshesReady === 'function') {
      onWorkstationMeshesReady(currentMeshes);
    }
  }, [
    workstations,
    workstationOccupancies,
    modelData,
    layout?.length,
    layout?.width,
    layout?.height,
    zones,
    showWorkstations,
    showAttendance,
    selectedWorkstation?.id,
  ]);

  return <group ref={surplusGroupRef} name="surplusWorkstationsGroup" />;
}
