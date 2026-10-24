/**
 * AvatarLayer.jsx
 * Declarative Workforce Avatars Layer for ShiftSync R3F Digital Twin.
 * 
 * - Reconciles staff avatars with deterministic floor positioning.
 * - Drives smooth walking animations, working postures, and dynamic LOD via useFrame().
 * - Interacts with selection and simulation transfers.
 * - Renders 3D GLB workforce characters (Barista, Manager, Cashier, Chef).
 */

import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  createStylizedAvatar,
  setAvatarSelected,
  setAvatarTargetPosition,
  updateAvatarStateMachine,
} from '../../scene/StylizedAvatars.js';
import { preloadAllCharacterModels } from '../../scene/character/CharacterAssetLoader.js';
import { getStaffId, areSameStaff } from '../../utils/staffIdentity.js';
import { resolveCharacterGender } from '../../utils/characterGender.js';
import { toThreeCoords, getDeterministicPersonOffset } from '../../../../components/spatial/spatial.constants.js';
import { getStaffAnchor,getZoneStaffAnchor,getCoffeeZoneFrame } from '../../scene/StoreArrangement.js';
import { disposeHierarchy } from '../../scene/ResourceManager.js';

export default function AvatarLayer({
  modelRoot = null,
  staff = [],
  zones = [],
  workstations = [],
  workstationMeshes = [],
  layout = { length: 24, width: 16, height: 6 },
  selectedStaff = null,
  showStaff = true,
  onAvatarMeshesReady = null,
}) {
  const groupRef = useRef(null);
  const avatarMeshesRef = useRef([]);
  const [modelsLoaded, setModelsLoaded] = useState(false);

  // 0. Preload all 4 character GLB models on mount
  useEffect(() => {
    let active = true;
    preloadAllCharacterModels().then(() => {
      if (active) setModelsLoaded(true);
    });
    return () => {
      active = false;
    };
  }, []);

  // 1. Reconcile Avatars on Staff / Zone / Layout / Models change
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    if (!showStaff) {
      avatarMeshesRef.current.forEach((a) => {
        group.remove(a);
        disposeHierarchy(a);
      });
      avatarMeshesRef.current = [];
      if (typeof onAvatarMeshesReady === 'function') {
        onAvatarMeshesReady([]);
      }
      return;
    }

    const storeLen = Number(layout?.length) || 24.0;
    const storeWid = Number(layout?.width) || 16.0;
    const zoneSizeX = Math.min(4.4, storeLen * 0.22);
    const zoneSizeZ = Math.min(3.6, storeWid * 0.22);

    // Group active staff by zone
    const staffByZone = {};
    staff.forEach((s) => {
      const stationId = s.workstationId || s.workstation?.id;
      const station = workstations.find(ws => ws.id === stationId);
      if (stationId && !station) return;
      const zid = station?.zoneId || s.zoneId || s.zone?.id;
      if (zid) {
        if (!staffByZone[zid]) staffByZone[zid] = [];
        staffByZone[zid].push(s);
      }
    });

    const activeEmpIds = new Set(Object.entries(staffByZone)
      .filter(([zoneId]) => zones.some(zone => zone.id === zoneId))
      .flatMap(([, people]) => people.map(getStaffId)).filter(Boolean));

    // Remove obsolete avatars
    const survivingAvatars = [];
    avatarMeshesRef.current.forEach((avatar) => {
      const empId = getStaffId(avatar.userData?.employee);
      const incoming = staff.find(person => getStaffId(person) === empId);
      if (!empId || !activeEmpIds.has(empId) || resolveCharacterGender(incoming) !== resolveCharacterGender(avatar.userData?.employee)) {
        group.remove(avatar);
        disposeHierarchy(avatar);
      } else {
        survivingAvatars.push(avatar);
      }
    });
    avatarMeshesRef.current = survivingAvatars;

    // Create or update avatars for each zone
    zones.forEach((zone) => {
      const physicalFrame=zone.physicalFrame||getCoffeeZoneFrame(modelRoot,zone);
      const [tx, ty, tz] = toThreeCoords(zone.x, zone.y, zone.z, layout);
      const zoneStaff = staffByZone[zone.id] || [];

      zoneStaff.forEach((emp, sIdx) => {
        const [ox, oz] = getDeterministicPersonOffset(
          zone.id,
          sIdx,
          zoneStaff.length,
          zoneSizeX,
          zoneSizeZ
        );
        const workstationId = emp.workstationId || emp.workstation?.id;
        const workstation = workstations.find(ws => ws.id === workstationId);
        // Invalid station references must not be displayed at another station.
        if (workstationId && !workstation) return;
        const stationPosition = workstation ? toThreeCoords(workstation.x, workstation.y, workstation.z, layout) : null;
        const mesh = workstationMeshes.find(item => item.userData.workstationId === workstationId);
        const sameStation = zoneStaff.filter(item => (item.workstationId || item.workstation?.id) === workstationId);
        const slot = sameStation.indexOf(emp);
        const anchor = mesh ? getStaffAnchor(mesh, layout, slot, sameStation.length) : !workstationId ? getZoneStaffAnchor(physicalFrame,slot,sameStation.length) : null;
        const targetX = anchor ? anchor.x : stationPosition ? stationPosition[0] : tx + ox;
        const targetY = anchor ? anchor.y : stationPosition ? stationPosition[1] : ty;
        const targetZ = anchor ? anchor.z : stationPosition ? stationPosition[2] - 1.2 : tz + oz;

        const isSelected = areSameStaff(selectedStaff, emp);

        const existingAvatar = avatarMeshesRef.current.find((a) =>
          areSameStaff(a.userData?.employee, emp)
        );

        if (existingAvatar) {
          setAvatarSelected(existingAvatar, isSelected);
          setAvatarTargetPosition(existingAvatar, targetX, targetY, targetZ, zone);
          existingAvatar.userData.employee = emp;
          existingAvatar.userData.workRotation = anchor?.rotation;
        } else {
          const avatar = createStylizedAvatar({
            employee: emp,
            zone,
            x: targetX,
            y: targetY,
            z: targetZ,
            isSelected,
            seed: sIdx * 15 + (zone.x || 1),
          });

          avatar.userData.workRotation = anchor?.rotation;
          if(anchor) avatar.rotation.y = anchor.rotation;
          group.add(avatar);
          avatarMeshesRef.current.push(avatar);
        }
      });
    });

    if (typeof onAvatarMeshesReady === 'function') {
      onAvatarMeshesReady(avatarMeshesRef.current);
    }
  }, [staff, zones, workstations, workstationMeshes, modelRoot,layout?.length, layout?.width, layout?.height, showStaff, selectedStaff, modelsLoaded]);

  // 2. High-Frequency Animation Tick in useFrame (Smooth Walking & Idle Breathing)
  useFrame((state, delta) => {
    const elapsed = state.clock.getElapsedTime();
    const clampedDelta = Math.min(delta, 0.08);

    avatarMeshesRef.current.forEach((avatar) => {
      updateAvatarStateMachine(avatar, clampedDelta, elapsed, state.camera);
    });
  }, -1);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (groupRef.current) {
        avatarMeshesRef.current.forEach((a) => disposeHierarchy(a));
        avatarMeshesRef.current = [];
      }
    };
  }, []);

  return <group ref={groupRef} name="avatarLayerGroup" />;
}
