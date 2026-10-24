/**
 * FirstPersonController.jsx
 * First-Person 3D Walking & Collision Controller for ShiftSync R3F Digital Twin.
 * 
 * - WASD movement, Sprint, Jump, and Mouse Look with Pointer Lock.
 * - Human eye level height (1.6m).
 * - AABB sliding collision against GLB columns, service counters, walls, and workstations.
 * - Point Lock (Target Lock) tracking on employees or workstations.
 * - Reticle targeting and nearby entity detection.
 * - High-frequency calculations in useFrame() with throttled HUD status updates.
 */

import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { PlayerController } from '../../explore/PlayerController.js';
import { createPlayerAvatar } from '../../explore/PlayerAvatar.js';
import { extractGlbObstacles } from '../../scene/DigitalTwinModelLoader.js';
import {getCoffeeFloorLayout} from '../../scene/StoreArrangement.js';
import { toThreeCoords } from '../../../../components/spatial/spatial.constants.js';
import { disposeHierarchy } from '../../scene/ResourceManager.js';

export default function FirstPersonController({
  layout = { length: 24, width: 16, height: 6 },
  zones = [],
  staff = [],
  workstations = [],
  modelData = null,
  avatarMeshes = [],
  workstationMeshes = [],
  playerViewMode = 'first_person',
  onTogglePlayerView = null,
  onExitExplore = null,
  onTargetLockChange = null,
  onInteract = null,
  onPlayerStatusUpdate = null,
  initialLockTarget = null,
  playerControllerRef = null,
  paused = false,
}) {
  const { gl, camera } = useThree();
  const playerAvatarRef = useRef(null);
  const controllerRef = useRef(null);
  const frameCountRef = useRef(0);
  const toggleViewRef=useRef(onTogglePlayerView);
  toggleViewRef.current=onTogglePlayerView;

  useEffect(() => {
    const controller = controllerRef.current;
    if (!controller) return;
    controller.setPaused(paused);
  }, [paused]);

  // 1. Initialize PlayerAvatar and PlayerController
  useEffect(() => {
    const avatar = createPlayerAvatar();
    playerAvatarRef.current = avatar;

    const storeLen = Number(layout?.length) || 24.0;
    const storeWid = Number(layout?.width) || 16.0;
    const spawnX = 0;
    const spawnZ = 3.8; // Position inside entrance hall with clear view of store interior
    const spawnYaw = 0; // Face inwards toward store center (-Z)

    avatar.group.position.set(spawnX, 0, spawnZ);

    const controller = new PlayerController(
      gl.domElement,
      camera,
      avatar,
      layout
    );

    controller.position.set(spawnX, 0, spawnZ);
    controller.yaw = spawnYaw;
    controller.pitch = 0.12;
    controller.viewMode = playerViewMode || 'first_person';
    controller.setPaused(paused);

    const glbObstacles = modelData?.modelRoot
      ? extractGlbObstacles(modelData.modelRoot, layout,workstationMeshes)
      : [];
    controller.rebuildObstacles(layout, zones, workstations, toThreeCoords, glbObstacles,modelData?.modelRoot?getCoffeeFloorLayout(modelData.modelRoot,layout):layout);

    controller.onToggleView = (mode) => {
      toggleViewRef.current?.(mode);
    };
    controller.onExit = () => {
      if (typeof onExitExplore === 'function') onExitExplore();
    };
    controller.onTargetLockChange = (tl) => {
      if (typeof onTargetLockChange === 'function') onTargetLockChange(tl);
    };
    controller.onInteract = (entity) => {
      if (typeof onInteract === 'function') onInteract(entity);
    };

    if (initialLockTarget) {
      controller.setTargetLock(initialLockTarget);
    }

    controllerRef.current = controller;
    if (playerControllerRef) {
      playerControllerRef.current = controller;
    }
    window.__playerController = controller;

    return () => {
      controller.detach();
      delete window.__playerController;
      if (playerControllerRef) {
        playerControllerRef.current = null;
      }
      controllerRef.current = null;
      if (avatar?.group) {
        disposeHierarchy(avatar.group);
      }
      playerAvatarRef.current = null;
    };
  }, [layout?.length, layout?.width, layout?.height]);

  // 2. Synchronize view mode (First vs Third person) and set wide immersive FOV
  useEffect(() => {
    if (controllerRef.current) {
      controllerRef.current.viewMode = playerViewMode;
    }
  }, [playerViewMode]);

  // 2b. Set wide immersive FOV for character exploration and restore on exit
  useEffect(() => {
    if (!camera) return;
    const prevFov = camera.fov;
    const prevNear = camera.near;
    const prevFar = camera.far;

    camera.fov = playerViewMode === 'third_person' ? 68 : 75;
    camera.near = 0.1;
    camera.far = 300;
    camera.updateProjectionMatrix();

    return () => {
      camera.fov = prevFov;
      camera.near = prevNear;
      camera.far = prevFar;
      camera.updateProjectionMatrix();
    };
  }, [camera, playerViewMode]);

  // 3. Rebuild obstacles if zones, workstations, or GLB model changes
  useEffect(() => {
    if (!controllerRef.current) return;
    const glbObstacles = modelData?.modelRoot
      ? extractGlbObstacles(modelData.modelRoot, layout,workstationMeshes)
      : [];
    controllerRef.current.rebuildObstacles(layout, zones, workstations, toThreeCoords, glbObstacles,modelData?.modelRoot?getCoffeeFloorLayout(modelData.modelRoot,layout):layout);
  }, [zones, workstations, modelData, layout,workstationMeshes]);

  // 4. Update in useFrame
  useFrame((state, delta) => {
    const controller = controllerRef.current;
    if (!controller || paused) return;

    const clampedDelta = Math.min(delta, 0.08);
    const elapsed = state.clock.getElapsedTime();

    controller.update(
      clampedDelta,
      elapsed,
      zones,
      staff,
      toThreeCoords,
      workstations,
      avatarMeshes,
      workstationMeshes
    );

    frameCountRef.current++;
    if (frameCountRef.current % 3 === 0 && typeof onPlayerStatusUpdate === 'function') {
      onPlayerStatusUpdate({
        position: { x: controller.position.x, z: controller.position.z },
        yaw: controller.yaw,
        nearbyEntity: controller.nearbyEntity,
        reticleTarget: controller.reticleTarget,
        isFlyMode: controller.isFlyMode,
      });
    }
  },-2);

  return playerAvatarRef.current?.group ? (
    <primitive object={playerAvatarRef.current.group} dispose={null} />
  ) : null;
}
