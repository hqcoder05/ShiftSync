/**
 * StylizedAvatars.js
 * Lightweight Stylized 3D Character System for ShiftSync Digital Twin.
 * 
 * Key Highlights:
 * 1. Base Character + Modular Outfits architecture.
 * 2. Shared Geometry and Material Singletons (0 per-instance BufferGeometry heap allocation).
 * 3. 3-Tier Distance-Based Level of Detail (LOD 0: ~42 tri, LOD 1: ~250 tri, LOD 2: ~490 tri).
 * 4. High-performance Animation State Machine (WORKING, WALKING, IDLE, BREAK, SELECTED).
 * 5. Smooth movement interpolation with directional heading.
 * 6. 100% backward compatibility with SpatialWorkspace and Simulation Room.
 */

import * as THREE from 'three';
import { getRoleTheme } from '../visualization/ZoneStatus';
import { characterGeometries as geo } from './character/CharacterGeometries';
import { characterMaterials as mat } from './character/CharacterMaterials';
import { buildRoleOutfit } from './character/CharacterOutfits';

/**
 * Creates a lightweight stylized low-poly employee avatar
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
  const roleName = employee?.skillName || employee?.role || employee?.position || 'Nhân viên';
  const roleTheme = getRoleTheme(roleName);
  const normRole = (roleName || '').toLowerCase();
  const safeSeed = seed || Math.random() * 100;

  const group = new THREE.Group();
  group.position.set(x, y, z);

  // 1. Ground Contact / Status Selection Ring
  const contactRing = new THREE.Mesh(
    geo.groundRing,
    isSelected ? mat.ringSelected : mat.ringDefault
  );
  contactRing.rotation.x = -Math.PI / 2;
  contactRing.position.y = 0.015;
  group.add(contactRing);

  // 2. Multi-tier LOD Group Container
  const lodGroup = new THREE.Group();
  lodGroup.name = 'avatarLOD';
  group.add(lodGroup);

  // =========================================================================
  // LOD 0: FAR SILHOUETTE (> 22m) — ~42 Triangles, 2 Meshes
  // =========================================================================
  const lod0Group = new THREE.Group();
  lod0Group.name = 'lod0';

  const roleUniformMat = mat.getRoleUniformMaterial(roleTheme.hexInt);
  const lod0Body = new THREE.Mesh(geo.lod0Capsule, roleUniformMat);
  lod0Body.position.y = 0.58;
  lod0Group.add(lod0Body);

  const lod0Head = new THREE.Mesh(geo.lod0Head, mat.getSkinBySeed(safeSeed));
  lod0Head.position.y = 1.18;
  lod0Group.add(lod0Head);

  lod0Group.visible = false;
  lodGroup.add(lod0Group);

  // =========================================================================
  // LOD 1: MEDIUM DISTANCE (8m - 22m) — ~250 Triangles, 6 Meshes
  // =========================================================================
  const lod1Group = new THREE.Group();
  lod1Group.name = 'lod1';

  const lod1Torso = new THREE.Mesh(geo.torso, roleUniformMat);
  lod1Torso.position.set(0, 0.70, 0);
  lod1Group.add(lod1Torso);

  const lod1Head = new THREE.Mesh(geo.head, mat.getSkinBySeed(safeSeed));
  lod1Head.position.set(0, 1.15, 0);
  lod1Group.add(lod1Head);

  // Simplified legs for LOD 1
  const lod1LeftLeg = new THREE.Mesh(geo.lod1Limb, mat.pantsNavy);
  lod1LeftLeg.position.set(-0.1, 0.22, 0);
  lod1Group.add(lod1LeftLeg);

  const lod1RightLeg = new THREE.Mesh(geo.lod1Limb, mat.pantsNavy);
  lod1RightLeg.position.set(0.1, 0.22, 0);
  lod1Group.add(lod1RightLeg);

  // Simplified arms for LOD 1
  const lod1LeftArm = new THREE.Mesh(geo.arm, mat.shirtWhite);
  lod1LeftArm.position.set(-0.23, 0.65, 0);
  lod1Group.add(lod1LeftArm);

  const lod1RightArm = new THREE.Mesh(geo.arm, mat.shirtWhite);
  lod1RightArm.position.set(0.23, 0.65, 0);
  lod1Group.add(lod1RightArm);

  lod1Group.visible = false;
  lodGroup.add(lod1Group);

  // =========================================================================
  // LOD 2: CLOSE / DETAILED (< 8m or Selected) — ~490 Triangles
  // =========================================================================
  const lod2Group = new THREE.Group();
  lod2Group.name = 'lod2';

  const bodyRoot = new THREE.Group();
  bodyRoot.name = 'avatarBody';
  lod2Group.add(bodyRoot);

  // 2.1 Hip-Pivoted Legs (for natural walking strides)
  const leftLegGroup = new THREE.Group();
  leftLegGroup.position.set(-0.1, 0.48, 0);

  const leftLeg = new THREE.Mesh(geo.leg, mat.pantsNavy);
  leftLeg.position.set(0, -0.21, 0);
  leftLegGroup.add(leftLeg);

  const leftShoe = new THREE.Mesh(geo.shoe, mat.shoeWhite);
  leftShoe.position.set(0, -0.44, 0.02);
  leftLegGroup.add(leftShoe);
  bodyRoot.add(leftLegGroup);

  const rightLegGroup = new THREE.Group();
  rightLegGroup.position.set(0.1, 0.48, 0);

  const rightLeg = new THREE.Mesh(geo.leg, mat.pantsNavy);
  rightLeg.position.set(0, -0.21, 0);
  rightLegGroup.add(rightLeg);

  const rightShoe = new THREE.Mesh(geo.shoe, mat.shoeWhite);
  rightShoe.position.set(0, -0.44, 0.02);
  rightLegGroup.add(rightShoe);
  bodyRoot.add(rightLegGroup);

  // 2.2 Torso & Base Shirt
  const torso = new THREE.Mesh(geo.torso, mat.shirtWhite);
  torso.position.set(0, 0.70, 0);
  torso.castShadow = true; // Key shadow caster
  bodyRoot.add(torso);

  // Staff Name Badge
  const badge = new THREE.Mesh(geo.nameBadge, mat.badgeGold);
  badge.position.set(-0.075, 0.76, 0.125);
  bodyRoot.add(badge);

  // 2.3 Modular Outfits & Accessories
  const outfit = buildRoleOutfit({ roleName, roleTheme, seed: safeSeed });
  outfit.outfitMeshes.forEach((m) => bodyRoot.add(m));

  // 2.4 Animated Limbs: Arms & Hands
  const leftArmGroup = new THREE.Group();
  leftArmGroup.position.set(-0.24, 0.82, 0);

  const leftArm = new THREE.Mesh(geo.arm, mat.shirtWhite);
  leftArm.position.y = -0.17;
  leftArmGroup.add(leftArm);

  const leftHand = new THREE.Mesh(geo.hand, mat.getSkinBySeed(safeSeed));
  leftHand.position.y = -0.36;
  leftArmGroup.add(leftHand);

  if (outfit.leftArmProp) {
    leftArmGroup.add(outfit.leftArmProp);
  }
  bodyRoot.add(leftArmGroup);

  const rightArmGroup = new THREE.Group();
  rightArmGroup.position.set(0.24, 0.82, 0);

  const rightArm = new THREE.Mesh(geo.arm, mat.shirtWhite);
  rightArm.position.y = -0.17;
  rightArmGroup.add(rightArm);

  const rightHand = new THREE.Mesh(geo.hand, mat.getSkinBySeed(safeSeed));
  rightHand.position.y = -0.36;
  rightArmGroup.add(rightHand);

  if (outfit.rightArmProp) {
    rightArmGroup.add(outfit.rightArmProp);
  }
  bodyRoot.add(rightArmGroup);

  // 2.5 Head & Facial Details
  const headGroup = new THREE.Group();
  headGroup.name = 'avatarHead';
  headGroup.position.set(0, 1.15, 0);

  const head = new THREE.Mesh(geo.head, mat.getSkinBySeed(safeSeed));
  head.castShadow = true; // Key shadow caster
  headGroup.add(head);

  // Stylized minimal eyes
  [-0.06, 0.06].forEach((ex) => {
    const eye = new THREE.Mesh(geo.eye, mat.eyes);
    eye.position.set(ex, 0.015, 0.174);
    headGroup.add(eye);
  });

  // Attach role-specific headwear
  outfit.headwearMeshes.forEach((h) => headGroup.add(h));

  // Selection Halo (always present, toggled via isSelected)
  const halo = new THREE.Mesh(geo.selectionHalo, mat.haloSelected);
  halo.name = 'selectionHalo';
  halo.rotation.x = Math.PI / 2;
  halo.position.set(0, 0.24, 0);
  halo.visible = Boolean(isSelected);
  headGroup.add(halo);

  bodyRoot.add(headGroup);
  lod2Group.visible = true; // Default to LOD 2 before camera evaluation
  lodGroup.add(lod2Group);

  // 3. State Machine Data Attributes
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
    roleType: outfit.roleType,
    isSelected: Boolean(isSelected),
  };

  // Attach internal 3D object references as non-enumerable to prevent circular errors during JSON serialization / clone
  const nonEnumRefs = {
    rootGroup: group,
    bodyRoot,
    headGroup,
    leftLegGroup,
    rightLegGroup,
    leftArmGroup,
    rightArmGroup,
    lod0Group,
    lod1Group,
    lod2Group,
    contactRing,
    halo,
    roleProp: outfit.rightArmProp || outfit.leftArmProp,
  };
  for (const [key, val] of Object.entries(nonEnumRefs)) {
    Object.defineProperty(group.userData, key, {
      value: val,
      writable: true,
      enumerable: false,
      configurable: true,
    });
  }

  // Crucial: assign group.userData to all mesh descendants so raycaster finds the employee instantly
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
 * Supports automatic 3-tier distance-based LOD switching when camera is passed
 */
export function updateAvatarStateMachine(avatarGroup, delta = 0.016, time = 0, camera = null) {
  if (!avatarGroup?.userData?.bodyRoot) return;
  const ud = avatarGroup.userData;
  const seed = ud.seed;

  // 0. Visual Selection Sync & Holographic Halo Micro-animation
  if (ud.halo) {
    ud.halo.visible = Boolean(ud.isSelected);
    if (ud.isSelected) {
      ud.halo.rotation.z = time * 1.5;
      ud.halo.position.y = 0.42 + Math.sin(time * 3.0) * 0.015;
    }
  }
  if (ud.contactRing) {
    ud.contactRing.material = ud.isSelected ? mat.ringSelected : mat.ringDefault;
  }

  // 1. Distance-based Level of Detail (LOD) Evaluation
  if (camera && ud.lod0Group && ud.lod1Group && ud.lod2Group) {
    const distSq = avatarGroup.position.distanceToSquared(camera.position);

    if (ud.isSelected || distSq < 64) {
      // Distance < 8m or Selected: LOD 2 (Full Detail)
      if (ud.currentLOD !== 2) {
        ud.lod2Group.visible = true;
        ud.lod1Group.visible = false;
        ud.lod0Group.visible = false;
        ud.currentLOD = 2;
      }
    } else if (distSq < 484) {
      // Distance between 8m and 22m: LOD 1 (Medium Humanoid)
      if (ud.currentLOD !== 1) {
        ud.lod2Group.visible = false;
        ud.lod1Group.visible = true;
        ud.lod0Group.visible = false;
        ud.currentLOD = 1;
      }
    } else {
      // Distance > 22m: LOD 0 (Far Silhouette)
      if (ud.currentLOD !== 0) {
        ud.lod2Group.visible = false;
        ud.lod1Group.visible = false;
        ud.lod0Group.visible = true;
        ud.currentLOD = 0;
      }
    }
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

      // Natural walking stride animation (skip fine calculations if LOD 0)
      if (ud.currentLOD > 0) {
        ud.walkCycle += delta * 8.5;
        const stride = Math.sin(ud.walkCycle);

        if (ud.leftLegGroup) ud.leftLegGroup.rotation.x = stride * 0.55;
        if (ud.rightLegGroup) ud.rightLegGroup.rotation.x = -stride * 0.55;

        // Counter-arm swings
        if (ud.leftArmGroup) ud.leftArmGroup.rotation.x = -stride * 0.45;
        if (ud.rightArmGroup) ud.rightArmGroup.rotation.x = stride * 0.45;

        // Vertical bobbing
        ud.bodyRoot.position.y = Math.abs(Math.sin(ud.walkCycle * 2)) * 0.035;
      }
    } else {
      // Arrived at destination
      ud.currentPos.copy(ud.targetPos);
      avatarGroup.position.copy(ud.currentPos);
      ud.state = 'WORKING';

      // Reset limbs to resting / working pose
      if (ud.leftLegGroup) ud.leftLegGroup.rotation.x = 0;
      if (ud.rightLegGroup) ud.rightLegGroup.rotation.x = 0;
      if (ud.leftArmGroup) ud.leftArmGroup.rotation.x = ud.roleType === 'server' ? -0.45 : ud.roleType === 'cashier' ? -0.3 : 0;
      if (ud.rightArmGroup) ud.rightArmGroup.rotation.x = ud.roleType === 'barista' ? -0.35 : 0;
      ud.bodyRoot.position.y = 0;
    }
  }
  // 3. Working State (Contextual actions by role)
  else if (ud.state === 'WORKING') {
    // Only compute micro-gestures if avatar is at LOD 2 or LOD 1
    if (ud.currentLOD === 2) {
      ud.bodyRoot.position.y = Math.sin(time * 2.0 + seed) * 0.015;
      ud.bodyRoot.rotation.z = Math.sin(time * 1.4 + seed) * 0.010;

      if (ud.headGroup) {
        ud.headGroup.rotation.y = Math.sin(time * 0.75 + seed) * 0.05;
        ud.headGroup.rotation.x = Math.sin(time * 1.1 + seed) * 0.02;
      }

      if (ud.roleType === 'barista' && ud.rightArmGroup) {
        // Frothing / pouring motion
        ud.rightArmGroup.rotation.x = -0.35 + Math.sin(time * 2.2 + seed) * 0.08;
        ud.rightArmGroup.rotation.z = Math.cos(time * 1.8 + seed) * 0.05;
      } else if (ud.roleType === 'cashier' && ud.leftArmGroup) {
        // POS touchscreen tapping gesture
        ud.leftArmGroup.rotation.x = -0.30 + Math.sin(time * 3.5 + seed) * 0.06;
      } else if (ud.roleType === 'server' && ud.leftArmGroup) {
        // Platter balancing
        ud.leftArmGroup.rotation.z = Math.sin(time * 1.5 + seed) * 0.03;
      } else if (ud.roleType === 'kitchen' && ud.bodyRoot) {
        // Food prep / kneading rhythm
        ud.bodyRoot.rotation.x = Math.sin(time * 1.6 + seed) * 0.04;
      } else if (ud.roleType === 'stock' && ud.leftArmGroup) {
        // Inventory inspection
        ud.leftArmGroup.rotation.x = -0.28 + Math.sin(time * 1.8 + seed) * 0.04;
      } else if (ud.roleType === 'security' && ud.headGroup) {
        // Vigilant scanning gaze
        ud.headGroup.rotation.y = Math.sin(time * 0.5 + seed) * 0.25;
      }
    } else if (ud.currentLOD === 1) {
      // Subtle breathing for LOD 1
      ud.lod1Group.position.y = Math.sin(time * 1.8 + seed) * 0.010;
    }
  }
  // 4. Idle / Break State
  else {
    if (ud.currentLOD === 2) {
      ud.bodyRoot.position.y = Math.sin(time * 1.6 + seed) * 0.012;
      if (ud.headGroup) {
        ud.headGroup.rotation.y = Math.sin(time * 0.6 + seed) * 0.08;
      }
    }
  }
}

/**
 * Backwards compatibility helper
 */
export function updateAvatarIdle(avatarGroup, time = 0) {
  updateAvatarStateMachine(avatarGroup, 0.016, time);
}
