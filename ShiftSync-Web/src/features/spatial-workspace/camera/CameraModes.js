/**
 * CameraModes.js
 * Comprehensive Camera preset definitions and target calculations
 * for the 3D Workforce Digital Twin.
 */

import * as THREE from 'three';

export const CAMERA_MODES = {
  OVERVIEW: 'OVERVIEW',
  ISOMETRIC: 'ISOMETRIC',
  TOP_DOWN: 'TOP_DOWN',
  FOCUS_ZONE: 'FOCUS_ZONE',
  FOCUS_EMPLOYEE: 'FOCUS_EMPLOYEE',
  FOCUS_WORKSTATION: 'FOCUS_WORKSTATION',
  FOLLOW_EMPLOYEE: 'FOLLOW_EMPLOYEE',
  EXPLORE: 'EXPLORE',
};

/**
 * Calculate camera position and lookAt target for Overview mode
 */
export function getOverviewCameraConfig(layout) {
  const len = Number(layout?.length) || 24;
  const wid = Number(layout?.width) || 16;
  const maxDim = Math.max(len, wid);

  return {
    position: [len * 0.9, maxDim * 1.05, wid * 1.15],
    target: [0, 0.5, 0],
    fov: 36,
  };
}

/**
 * Calculate camera position and lookAt target for Top-down mode
 */
export function getTopDownCameraConfig(layout) {
  const len = Number(layout?.length) || 24;
  const wid = Number(layout?.width) || 16;
  const maxDim = Math.max(len, wid);

  return {
    position: [0, maxDim * 1.5, 0.001], // Slight offset to prevent gimbal lock
    target: [0, 0, 0],
    fov: 34,
  };
}

/**
 * Calculate camera position and lookAt target when focusing on a specific Zone
 */
export function getZoneFocusCameraConfig(zonePos) {
  const [zx, zy, zz] = zonePos;
  return {
    position: [zx + 6.5, zy + 6.0, zz + 7.5],
    target: [zx, zy + 0.8, zz],
    fov: 35,
  };
}

/**
 * Calculate camera position and lookAt target when focusing on a specific Employee
 */
export function getEmployeeFocusCameraConfig(employeePos) {
  const [ex, ey, ez] = employeePos;
  return {
    position: [ex + 3.2, ey + 2.8, ez + 3.8],
    target: [ex, ey + 1.1, ez],
    fov: 32,
  };
}

/**
 * Calculate camera position and lookAt target when focusing on a Workstation
 */
export function getWorkstationFocusCameraConfig(wsPos) {
  const [wx, wy, wz] = wsPos;
  return {
    position: [wx + 3.0, wy + 2.5, wz + 3.2],
    target: [wx, wy + 0.9, wz],
    fov: 33,
  };
}
