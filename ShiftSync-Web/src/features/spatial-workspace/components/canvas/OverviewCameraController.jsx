/**
 * OverviewCameraController.jsx
 * Declarative Camera Subsystem & Orbit Controls Controller for ShiftSync R3F Digital Twin.
 * 
 * - Manages dual cameras (Perspective and Orthographic Blueprint).
 * - Orchestrates smooth camera transitions (Overview, Top-Down, Focus Zone, Focus Workstation, Follow Staff).
 * - Coordinates with R3F render loop via useFrame() for smooth damping and transitions.
 * - Safely disables controls during First-Person exploration or Workstation dragging.
 */

import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { CameraManager } from '../../camera/CameraManager.js';
import { CAMERA_MODES } from '../../camera/CameraModes.js';
import { toThreeCoords } from '../../../../components/spatial/spatial.constants.js';
import {findStaffAvatar,belongsToScene} from '../../camera/cameraTargets.js';

export default function OverviewCameraController({
  layout = { length: 24, width: 16, height: 6 },
  cameraMode = CAMERA_MODES.OVERVIEW,
  cameraFocusTarget = null,
  isExploreMode = false,
  isDraggingObject = false,
  onUserOrbitStart = null,
  cameraManagerRef = null,
}) {
  const { gl, size, camera, scene, set } = useThree();
  const managerInstanceRef = useRef(null);
  const followSuppressed=useRef(false),followTarget=useRef(null);

  // 1. Initialize CameraManager Facade
  useEffect(() => {
    const manager = new CameraManager({
      domElement: gl.domElement,
      scene,
      layout,
      width: size.width || 900,
      height: size.height || 600,
      toThreeCoordsFn: toThreeCoords,
      onUserOrbitStart:()=>{followSuppressed.current=true;onUserOrbitStart?.();},
    });

    managerInstanceRef.current = manager;
    if (cameraManagerRef) {
      cameraManagerRef.current = manager;
    }

    return () => {
      manager.dispose();
      managerInstanceRef.current = null;
      if (cameraManagerRef) {
        cameraManagerRef.current = null;
      }
    };
  }, [layout?.length, layout?.width, layout?.height]);

  // 2. Handle Viewport Resize
  useEffect(() => {
    if (managerInstanceRef.current && size.width > 0 && size.height > 0) {
      managerInstanceRef.current.handleResize(size.width, size.height);
    }
  }, [size.width, size.height]);

  // 3. Handle Camera Mode & Target Transitions
  useEffect(() => {
    const manager = managerInstanceRef.current;
    if (!manager || isExploreMode) return;
    followSuppressed.current=false;
    followTarget.current=null;

    if (cameraMode === CAMERA_MODES.OVERVIEW) {
      manager.setCameraMode(CAMERA_MODES.OVERVIEW);
    } else if (cameraMode === CAMERA_MODES.TOP_DOWN) {
      manager.setCameraMode(CAMERA_MODES.TOP_DOWN);
    } else if (cameraMode === CAMERA_MODES.FOCUS_ZONE && cameraFocusTarget?.zone) {
      manager.setCameraMode(CAMERA_MODES.FOCUS_ZONE, { zone: cameraFocusTarget.zone });
    } else if (cameraMode === CAMERA_MODES.FOCUS_WORKSTATION && cameraFocusTarget?.workstation) {
      manager.setCameraMode(CAMERA_MODES.FOCUS_WORKSTATION, { workstation: cameraFocusTarget.workstation });
    } else if (cameraMode === CAMERA_MODES.FOCUS_EMPLOYEE && cameraFocusTarget?.employee) {
      manager.setCameraMode(CAMERA_MODES.FOCUS_EMPLOYEE, {
        employee: cameraFocusTarget.employee,
        zone: cameraFocusTarget.zone,
      });
    } else if (cameraMode === CAMERA_MODES.FOLLOW_EMPLOYEE) {
      const avatar=cameraFocusTarget?.avatar||findStaffAvatar(scene,cameraFocusTarget?.employee);
      followTarget.current=avatar;
      manager.setCameraMode(CAMERA_MODES.FOLLOW_EMPLOYEE, { avatar });
    }

    const activeCam = manager.getActiveCamera();
    if (activeCam && activeCam !== camera) {
      set({ camera: activeCam });
    }
  }, [cameraMode, cameraFocusTarget, isExploreMode]);

  // 4. OrbitControls enabling / disabling
  useEffect(() => {
    const manager = managerInstanceRef.current;
    if (!manager) return;

    const controls = manager.getControls();
    if (controls) {
      controls.enabled = !isExploreMode && !isDraggingObject;
    }
  }, [isExploreMode, isDraggingObject]);

  // 5. Update Camera Transitions in useFrame
  useFrame((_, delta) => {
    if (isExploreMode) return; // PlayerController owns the camera in explore mode
    const manager = managerInstanceRef.current;
    if (!manager) return;

    if(cameraMode===CAMERA_MODES.FOLLOW_EMPLOYEE&&!followSuppressed.current){
      const previous=followTarget.current;
      const avatar=belongsToScene(previous,scene)?previous:findStaffAvatar(scene,cameraFocusTarget?.employee);
      if(avatar!==previous){
        if(avatar)manager.followObject(avatar);
        else manager.stopFollowing();
        followTarget.current=avatar;
      }
    }
    manager.update(delta);
  },-2);

  return null;
}
