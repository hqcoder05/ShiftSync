/**
 * StylizedAvatars.js
 * Enhanced 3D Character System for ShiftSync Digital Twin.
 * 
 * Key Highlights:
 * 1. Crew V2 stylized GLB models (Barista, Manager, Cashier, Chef).
 * 2. Shared Geometry and Material Singletons (0 per-instance BufferGeometry heap allocation).
 * 3. Matching procedural Crew V2 fallback with shared cached geometry.
 * 4. High-performance Animation State Machine (WORKING, WALKING, IDLE, BREAK, SELECTED).
 * 5. Smooth movement interpolation with directional heading.
 * 6. Floating 2D billboard name & role badge sprite.
 * 7. Keeps the SpatialWorkspace and Simulation Room avatar contract.
 */

import * as THREE from 'three';
import { characterGeometries as geo } from './character/CharacterGeometries.js';
import { characterMaterials as mat } from './character/CharacterMaterials.js';

import { getAvatarById } from '../../../components/avatarConfigs.js';
import {
  resolveCharacterRole,
  instantiateCharacterModel,
  createStaffTagSprite,
} from './character/CharacterAssetLoader.js';

/**
 * Creates an employee avatar (GLB model if loaded, with procedural fallback)
 */
export function createStylizedAvatar({
  employee,
  zone,
  x = 0,
  y = 0,
  z = 0,
  isSelected = false,
  seed = 0,
}) {
  const savedAvatarId = (typeof localStorage !== 'undefined' && employee?.id) ? localStorage.getItem(`user_profile_avatar_${employee.id}`) : null;
  const canonicalAvatar = savedAvatarId ? getAvatarById(savedAvatarId) : (employee?.avatarId ? getAvatarById(employee.avatarId) : null);
  const roleName = employee?.skillName || employee?.role || employee?.position || canonicalAvatar?.role || 'Nhân viên';
  const normRole = (roleName || '').toLowerCase();
  const safeSeed = seed || (canonicalAvatar?.id ? canonicalAvatar.id.charCodeAt(0) : Math.random() * 100);
  const roleType = resolveCharacterRole(roleName, employee);

  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.name = `avatar_${employee?.id || safeSeed}`;

  // 1. Ground Contact / Status Selection Ring
  const contactRing = new THREE.Mesh(
    geo.groundRing,
    isSelected ? mat.ringSelected : mat.ringDefault
  );
  contactRing.rotation.x = -Math.PI / 2;
  contactRing.position.y = 0.015;
  group.add(contactRing);

  // 2. Selection Halo (placed at head height, toggled via isSelected)
  const halo = new THREE.Mesh(geo.selectionHalo, mat.haloSelected);
  halo.name = 'selectionHalo';
  halo.rotation.x = Math.PI / 2;
  halo.position.set(0, 1.88, 0);
  halo.visible = Boolean(isSelected);
  group.add(halo);

  // 3. Floating 3D Name & Role Tag Billboard Sprite
  const tagSprite = createStaffTagSprite(employee, roleName, roleType);
  group.add(tagSprite);

  // 4. Instantiate 3D GLB Model or Fallback
  const inst = instantiateCharacterModel(roleType, employee);
  const bodyRoot = inst.modelRoot;
  const joints = inst.joints;
  const lodGroup = null;
  group.add(bodyRoot);
  // 5. State Machine Data Attributes
  const currentPos = new THREE.Vector3(x, y, z);
  const targetPos = new THREE.Vector3(x, y, z);

  group.userData = {
    isPerson: true,
    isAvatarRoot: true,
    employee,
    zone,
    seed: safeSeed,
    state: 'WORKING', // 'WORKING' | 'WALKING' | 'IDLE' | 'BREAK'
    currentPos,
    targetPos,
    walkCycle: 0,
    walkSpeed: 2.4, // meters per second
    currentLOD: 2,
    normRole,
    roleType,
    isSelected: Boolean(isSelected),
    joints,
    bodyRoot,
    contactRing,
    halo,
    tagSprite,
    lodGroup,
    isGlbModel: Boolean(inst?.isGlb),
  };

  // Attach internal references
  const nonEnumRefs = {
    rootGroup: group,
    bodyRoot,
    joints,
    contactRing,
    halo,
    tagSprite,
  };
  for (const [key, val] of Object.entries(nonEnumRefs)) {
    Object.defineProperty(group.userData, key, {
      value: val,
      writable: true,
      enumerable: false,
      configurable: true,
    });
  }

  // Assign userData to all descendants so raycasting finds the employee
  group.traverse((child) => {
    if (child.isMesh) {
      child.userData = group.userData;
    }
  });

  return group;
}

/**
 * Sets avatar selection visual state
 */
export function setAvatarSelected(avatarGroup, isSelected) {
  if (!avatarGroup?.userData) return;
  const ud = avatarGroup.userData;
  ud.isSelected = Boolean(isSelected);
  if (ud.halo) ud.halo.visible = ud.isSelected;
  if (ud.contactRing) {
    ud.contactRing.material = ud.isSelected ? mat.ringSelected : mat.ringDefault;
  }
}

/**
 * Assigns a new target position to an avatar to initiate smooth walking
 */
export function setAvatarTargetPosition(avatarGroup, tx, ty, tz, newZone = null) {
  if (!avatarGroup?.userData) return;
  const ud = avatarGroup.userData;
  ud.targetPos.set(tx, ty, tz);
  if (newZone) ud.zone = newZone;

  const dist = ud.currentPos.distanceTo(ud.targetPos);
  if (dist > 0.18) {
    ud.state = 'WALKING';
  }
}

/**
 * Master State Machine updater for individual avatar in animation loop
 */
export function updateAvatarStateMachine(avatarGroup, delta = 0.016, time = 0, camera = null) {
  if (!avatarGroup?.userData) return;
  const ud = avatarGroup.userData;
  const seed = ud.seed || 0;

  // 0. Visual Selection Sync & Holographic Halo Animation
  if (ud.halo) {
    ud.halo.visible = Boolean(ud.isSelected);
    if (ud.isSelected) {
      ud.halo.rotation.z = time * 1.5;
      ud.halo.position.y = 1.88 + Math.sin(time * 3.0) * 0.015;
    }
  }
  if (ud.contactRing) {
    ud.contactRing.material = ud.isSelected ? mat.ringSelected : mat.ringDefault;
  }

  if (ud.state !== 'WALKING' && Number.isFinite(ud.workRotation)) avatarGroup.rotation.y = ud.workRotation;

  // 1. Tag Billboard Visibility (Distance Culling)
  if (ud.tagSprite && camera) {
    const distSq = avatarGroup.position.distanceToSquared(camera.position);
    ud.tagSprite.visible = distSq < 900 || ud.isSelected; // visible within 30m or when selected
  }

  // 2. Movement & Walking Animation
  if (ud.state === 'WALKING') {
    const dx = ud.targetPos.x - ud.currentPos.x;
    const dz = ud.targetPos.z - ud.currentPos.z;
    const dist = Math.hypot(dx, dz);

    if (dist > 0.08) {
      // Rotate avatar smoothly to face destination
      const targetAngle = Math.atan2(dx, dz);
      avatarGroup.rotation.y = targetAngle;

      // Advance along vector
      const step = Math.min(dist, ud.walkSpeed * delta);
      const nx = dx / dist;
      const nz = dz / dist;
      ud.currentPos.x += nx * step;
      ud.currentPos.z += nz * step;
      avatarGroup.position.copy(ud.currentPos);

      // Stride animations
      ud.walkCycle += delta * 8.5;
      const stride = Math.sin(ud.walkCycle);

      if (ud.joints) {
        // High-fidelity GLB Joint Animation
        if (ud.joints.leftHip) ud.joints.leftHip.rotation.x = stride * 0.55;
        if (ud.joints.rightHip) ud.joints.rightHip.rotation.x = -stride * 0.55;
        if (ud.joints.leftShoulder) ud.joints.leftShoulder.rotation.x = -stride * 0.45;
        if (ud.joints.rightShoulder) ud.joints.rightShoulder.rotation.x = stride * 0.45;
        if (ud.joints.leftKnee) ud.joints.leftKnee.rotation.x = Math.max(0,-stride)*.48;
        if (ud.joints.rightKnee) ud.joints.rightKnee.rotation.x = Math.max(0,stride)*.48;
        if (ud.joints.leftElbow) ud.joints.leftElbow.rotation.x = -.14;
        if (ud.joints.rightElbow) ud.joints.rightElbow.rotation.x = -.14;
        if (ud.joints.hips) ud.joints.hips.position.y = 0.76 + Math.abs(Math.sin(ud.walkCycle * 2)) * 0.035;
      } else if (ud.bodyRoot) {
        // Fallback procedural bobbing
        ud.bodyRoot.position.y = Math.abs(Math.sin(ud.walkCycle * 2)) * 0.035;
      }
    } else {
      // Arrived at destination
      ud.currentPos.copy(ud.targetPos);
      avatarGroup.position.copy(ud.currentPos);
      ud.state = 'WORKING';

      if (ud.joints) {
        for(const name of ['leftKnee','rightKnee'])if(ud.joints[name])ud.joints[name].rotation.x=0;
        if (ud.joints.leftHip) ud.joints.leftHip.rotation.x = 0;
        if (ud.joints.rightHip) ud.joints.rightHip.rotation.x = 0;
        if (ud.joints.hips) ud.joints.hips.position.y = 0.76;
        if (ud.joints.leftShoulder) ud.joints.leftShoulder.rotation.x = ud.roleType === 'cashier' ? -0.30 : ud.roleType === 'chef' ? 0.15 : 0;
        if (ud.joints.rightShoulder) ud.joints.rightShoulder.rotation.x = ud.roleType === 'barista' ? -0.35 : 0;
      } else if (ud.bodyRoot) {
        ud.bodyRoot.position.y = 0;
      }
    }
  }
  // 3. Working State (Role Gestures & Organic Micro-actions)
  else if (ud.state === 'WORKING') {
    if (ud.joints) {
      for(const name of ['leftKnee','rightKnee'])if(ud.joints[name])ud.joints[name].rotation.x=0;
      if(ud.joints.leftElbow)ud.joints.leftElbow.rotation.x=ud.roleType==='cashier'?-.28:-.1;
      if(ud.joints.rightElbow)ud.joints.rightElbow.rotation.x=ud.roleType==='barista'?-.32:-.1;
      // Spine natural breathing
      if (ud.joints.spine) {
        ud.joints.spine.position.y = 0.08 + Math.sin(time * 2.0 + seed) * 0.008;
      }

      // Head looking around
      if (ud.joints.head) {
        ud.joints.head.rotation.y = Math.sin(time * 0.75 + seed) * 0.08;
        ud.joints.head.rotation.x = Math.sin(time * 1.1 + seed) * 0.02;
      }

      // Role-specific gestures
      if (ud.roleType === 'barista' && ud.joints.rightShoulder) {
        ud.joints.rightShoulder.rotation.x = -0.35 + Math.sin(time * 2.2 + seed) * 0.08;
        ud.joints.rightShoulder.rotation.z = Math.cos(time * 1.8 + seed) * 0.04;
      } else if (ud.roleType === 'cashier' && ud.joints.leftShoulder) {
        ud.joints.leftShoulder.rotation.x = -0.30 + Math.sin(time * 3.5 + seed) * 0.06;
      } else if (ud.roleType === 'chef' && ud.joints.leftShoulder) {
        ud.joints.leftShoulder.rotation.x = 0.15 + Math.sin(time * 1.6 + seed) * 0.03;
      } else if (ud.roleType === 'manager' && ud.joints.leftShoulder) {
        ud.joints.leftShoulder.rotation.x = -0.25 + Math.sin(time * 1.4 + seed) * 0.03;
      }
    } else if (ud.bodyRoot) {
      ud.bodyRoot.position.y = Math.sin(time * 2.0 + seed) * 0.015;
    }
  }
  // 4. Idle / Break State
  else {
    if (ud.joints) {
      if (ud.joints.spine) {
        ud.joints.spine.position.y = 0.08 + Math.sin(time * 1.6 + seed) * 0.006;
      }
      if (ud.joints.head) {
        ud.joints.head.rotation.y = Math.sin(time * 0.6 + seed) * 0.06;
      }
    } else if (ud.bodyRoot) {
      ud.bodyRoot.position.y = Math.sin(time * 1.6 + seed) * 0.012;
    }
  }
}

/**
 * Backwards compatibility helper
 */
export function updateAvatarIdle(avatarGroup, time = 0) {
  updateAvatarStateMachine(avatarGroup, 0.016, time);
}
