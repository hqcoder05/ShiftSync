/**
 * CameraManager.js
 * Centralized Camera Subsystem Facade for the 3D Workforce Digital Twin.
 * 
 * ADR-ARC-001 (DEC-03 / ARC-IMP-02):
 * - Encapsulates dual cameras: PerspectiveCamera (3D Overview, Focus, Exploration)
 *   and OrthographicCamera (2D Architectural Top-Down Blueprint).
 * - Manages OrbitControls lifecycle, damping, and polar angle constraints
 *   ([0.1, 1.48] for 3D orbit, [0, 0] locked for top-down plan).
 * - Orchestrates cinematic transitions and real-time employee tracking
 *   via CameraController integration.
 * - Centralizes aspect-ratio resizing and WebGL resource cleanup.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CameraController } from './CameraController.js';
import {
  CAMERA_MODES,
  getOverviewCameraConfig,
  getTopDownCameraConfig,
  getZoneFocusCameraConfig,
  getEmployeeFocusCameraConfig,
  getWorkstationFocusCameraConfig,
} from './CameraModes.js';

export class CameraManager {
  /**
   * @param {Object} options
   * @param {HTMLElement} [options.domElement] - Canvas container / DOM element for OrbitControls
   * @param {Object} [options.layout] - Store floor layout { length, width, height }
   * @param {number} [options.width=900] - Initial viewport width
   * @param {number} [options.height=600] - Initial viewport height
   * @param {Function} [options.toThreeCoordsFn] - Optional coordinate conversion function
   * @param {Function} [options.onUserOrbitStart] - Callback when user manually orbits
   */
  constructor({
    domElement = null,
    scene = null,
    layout = { length: 24, width: 16, height: 6 },
    width = 900,
    height = 600,
    fov = 36,
    toThreeCoordsFn = null,
    onUserOrbitStart = null,
  } = {}) {
    this.layout = layout;
    this.scene = scene;
    this.toThreeCoordsFn = toThreeCoordsFn;
    this.onUserOrbitStart = onUserOrbitStart;

    const aspect = width / (height || 1);
    const storeLen = Number(layout?.length) || 24.0;
    const storeWid = Number(layout?.width) || 16.0;
    this.maxDim = Math.max(storeLen, storeWid);
    this.orthoFrustum = this.maxDim * 1.15;

    // 1. Perspective Camera (Overview, Focus, Follow, Explore)
    this.perspectiveCamera = new THREE.PerspectiveCamera(fov, aspect, 0.5, 300);
    const initCam = getOverviewCameraConfig(layout);
    this.perspectiveCamera.position.set(...initCam.position);

    // 2. True Orthographic Camera (Top-Down Blueprint)
    this.orthographicCamera = new THREE.OrthographicCamera(
      (-this.orthoFrustum * aspect) / 2,
      (this.orthoFrustum * aspect) / 2,
      this.orthoFrustum / 2,
      -this.orthoFrustum / 2,
      0.5,
      200
    );
    this.orthographicCamera.position.set(0, 45, 0.0001);
    this.orthographicCamera.lookAt(0, 0, 0);
    this.orthographicCamera.updateProjectionMatrix();

    // Default active camera is Perspective
    this.activeCamera = this.perspectiveCamera;

    // 3. OrbitControls
    this.controls = null;
    this._orbitStartListener = () => {
      if (this.cameraController?.isFollowing) {
        this.cameraController.stopFollowing();
      }
      if (this.cameraController) {
        this.cameraController.isTransitioning = false;
      }
      if (typeof this.onUserOrbitStart === 'function') {
        this.onUserOrbitStart();
      }
    };

    if (domElement) {
      this.controls = new OrbitControls(this.activeCamera, domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.08;
      this.controls.minPolarAngle = 0.01; // Can look directly top-down
      this.controls.maxPolarAngle = 1.565; // ~89.7 deg, can view horizontally at eye level
      this.controls.minDistance = 0.2; // Can zoom right up to character face / details
      this.controls.maxDistance = 180;
      this.controls.enablePan = true;
      this.controls.screenSpacePanning = true;
      this.controls.keyPanSpeed = 16.0;
      this.controls.target.set(...initCam.target);
      this.controls.addEventListener('start', this._orbitStartListener);
    }

    // 4. CameraController (cinematic transitions & follow tracking)
    this.cameraController = new CameraController(this.activeCamera, this.controls);
    // Provide moveTo alias for flyTo compatibility
    this.cameraController.moveTo = (pos, target, speed) => this.cameraController.flyTo(pos, target, speed || 0.06);

    this.currentMode = CAMERA_MODES.OVERVIEW;
  }

  /**
   * Retrieves the currently active camera (Perspective or Orthographic).
   */
  getActiveCamera() {
    return this.activeCamera;
  }

  /**
   * Retrieves the Perspective Camera.
   */
  getPerspectiveCamera() {
    return this.perspectiveCamera;
  }

  /**
   * Retrieves the Orthographic Camera.
   */
  getOrthographicCamera() {
    return this.orthographicCamera;
  }

  /**
   * Retrieves the OrbitControls instance.
   */
  getControls() {
    return this.controls;
  }

  /**
   * Retrieves the CameraController instance.
   */
  getCameraController() {
    return this.cameraController;
  }

  /**
   * Updates store layout dimensions.
   */
  setLayout(layout) {
    this.layout = layout;
    const storeLen = Number(layout?.length) || 24.0;
    const storeWid = Number(layout?.width) || 16.0;
    this.maxDim = Math.max(storeLen, storeWid);
    this.orthoFrustum = this.maxDim * 1.15;
  }

  /**
   * Activates Perspective projection with standard 3D orbit constraints.
   * @private
   */
  _activatePerspective() {
    this.activeCamera = this.perspectiveCamera;
    if (this.controls) {
      this.controls.object = this.perspectiveCamera;
      this.controls.minPolarAngle = 0.01;
      this.controls.maxPolarAngle = 1.565;
      this.controls.minDistance = 0.2;
    }
    if (this.cameraController) {
      this.cameraController.camera = this.perspectiveCamera;
    }
  }

  /**
   * Activates Orthographic projection with locked 2D top-down constraints.
   * @private
   */
  _activateOrthographic() {
    // A previous fly-to must not continue moving the newly activated camera.
    if (this.cameraController) this.cameraController.isTransitioning = false;
    this.orthographicCamera.position.set(0, 45, 0.0001);
    this.orthographicCamera.zoom = 1;
    this.orthographicCamera.lookAt(0, 0, 0);
    this.orthographicCamera.updateProjectionMatrix();
    this.activeCamera = this.orthographicCamera;
    if (this.controls) {
      this.controls.object = this.orthographicCamera;
      this.controls.target.set(0, 0, 0);
      this.controls.minPolarAngle = 0;
      this.controls.maxPolarAngle = 0; // Pure 2D blueprint projection
      this.controls.update();
    }
    if (this.cameraController) {
      this.cameraController.camera = this.orthographicCamera;
    }
  }

  _clearFocusPosition(position, target) {
    if (!this.scene) return position;
    const boxes = [];
    this.scene.updateMatrixWorld(true);
    this.scene.traverse(node => {
      if (node.userData?.isColumn || node.userData?.isWall) {
        boxes.push(new THREE.Box3().setFromObject(node).expandByScalar(.15));
      }
    });
    const aim = new THREE.Vector3(...target), requested = new THREE.Vector3(...position);
    const offset = requested.clone().sub(aim);
    const radius = Math.hypot(offset.x, offset.z);
    const bearing = Math.atan2(offset.x, offset.z);
    const clear = candidate => {
      const length = candidate.distanceTo(aim);
      const ray = new THREE.Ray(candidate, aim.clone().sub(candidate).normalize());
      return boxes.every(box => {
        if (box.containsPoint(candidate)) return false;
        const hit = ray.intersectBox(box, new THREE.Vector3());
        return !hit || hit.distanceTo(candidate) >= length - .2;
      });
    };
    for (const elevation of [offset.y, Math.max(offset.y, 5), Math.max(offset.y, 8)]) {
      for (const angle of [0, Math.PI/4, -Math.PI/4, Math.PI/2, -Math.PI/2, Math.PI]) {
        const candidate = new THREE.Vector3(aim.x+Math.sin(bearing+angle)*radius, aim.y+elevation, aim.z+Math.cos(bearing+angle)*radius);
        if (clear(candidate)) return candidate.toArray();
      }
    }
    return position;
  }

  /**
   * Transitions camera mode according to predefined camera specifications.
   * @param {string} mode - A value from CAMERA_MODES
   * @param {Object} [options] - Additional parameters for focus/follow
   */
  setCameraMode(mode, options = {}) {
    this.currentMode = mode;

    switch (mode) {
      case CAMERA_MODES.OVERVIEW: {
        this.cameraController?.stopFollowing();
        this._activatePerspective();
        const cfg = getOverviewCameraConfig(this.layout);
        this.cameraController?.flyTo(this._clearFocusPosition(cfg.position, cfg.target), cfg.target);
        break;
      }

      case CAMERA_MODES.TOP_DOWN: {
        this.cameraController?.stopFollowing();
        this._activateOrthographic();
        break;
      }

      case CAMERA_MODES.FOCUS_ZONE: {
        this.cameraController?.stopFollowing();
        this._activatePerspective();
        let targetCoords = options.targetCoords;
        // A coffee zone follows its rendered physical counter, including navigator focus.
        if (options.zone && this.scene) {
          this.scene.traverse(node => {
            if (node.isGroup && node.userData?.physicalZoneFrame && node.userData.zone?.id === options.zone.id) {
              targetCoords = node.getWorldPosition(new THREE.Vector3()).toArray();
            }
          });
        }
        if (!targetCoords && options.zone && typeof this.toThreeCoordsFn === 'function') {
          targetCoords = this.toThreeCoordsFn(options.zone.x, options.zone.y, options.zone.z, this.layout);
        }
        if (targetCoords) {
          const cfg = getZoneFocusCameraConfig(targetCoords);
          this.cameraController?.flyTo(this._clearFocusPosition(cfg.position, cfg.target), cfg.target);
        }
        break;
      }

      case CAMERA_MODES.FOCUS_EMPLOYEE: {
        this.cameraController?.stopFollowing();
        this._activatePerspective();
        let targetCoords = options.targetCoords;
        if (!targetCoords && options.employee && options.zone && typeof this.toThreeCoordsFn === 'function') {
          targetCoords = this.toThreeCoordsFn(options.zone.x, options.zone.y, options.zone.z, this.layout);
        }
        if (targetCoords) {
          const cfg = getEmployeeFocusCameraConfig(targetCoords);
          this.cameraController?.flyTo(this._clearFocusPosition(cfg.position, cfg.target), cfg.target);
        }
        break;
      }

      case CAMERA_MODES.FOLLOW_EMPLOYEE: {
        this._activatePerspective();
        if (options.avatar) {
          const offset = options.offset || new THREE.Vector3(0, 2.4, 3.2);
          this.cameraController?.followObject(options.avatar, offset);
        }
        break;
      }

      case CAMERA_MODES.FOCUS_WORKSTATION: {
        this.cameraController?.stopFollowing();
        this._activatePerspective();
        let targetCoords = options.targetCoords;
        if (!targetCoords && options.workstation && typeof this.toThreeCoordsFn === 'function') {
          targetCoords = this.toThreeCoordsFn(
            options.workstation.x,
            options.workstation.y,
            options.workstation.z,
            this.layout
          );
        }
        if (targetCoords) {
          const cfg = getWorkstationFocusCameraConfig(targetCoords);
          this.cameraController?.flyTo(this._clearFocusPosition(cfg.position, cfg.target), cfg.target, 0.08);
        }
        break;
      }

      default: {
        if (options.position && options.target) {
          this._activatePerspective();
          this.cameraController?.flyTo(options.position, options.target, options.speed || 0.06);
        }
        break;
      }
    }
  }

  /**
   * Smooth fly transition to arbitrary position and target.
   */
  flyTo(pos, target, speed = 0.06) {
    this._activatePerspective();
    this.cameraController?.flyTo(pos, target, speed);
  }

  /**
   * Alias for flyTo.
   */
  moveTo(pos, target, speed = 0.06) {
    this.flyTo(pos, target, speed);
  }

  /**
   * Engages real-time follow camera tracking.
   */
  followObject(object3D, offset = null) {
    this._activatePerspective();
    this.cameraController?.followObject(object3D, offset);
  }

  /**
   * Stops real-time follow camera tracking.
   */
  stopFollowing() {
    this.cameraController?.stopFollowing();
  }

  /**
   * Returns whether follow mode is currently engaged.
   */
  isFollowing() {
    return Boolean(this.cameraController?.isFollowing);
  }

  /**
   * Sets new OrbitControls target and smoothly frames the target point.
   */
  setOrbitTarget(targetPos, distance = null) {
    if (!targetPos) return;
    this._activatePerspective();
    const tX = targetPos.x !== undefined ? targetPos.x : targetPos[0];
    const tY = targetPos.y !== undefined ? targetPos.y : targetPos[1];
    const tZ = targetPos.z !== undefined ? targetPos.z : targetPos[2];
    const newTarget = new THREE.Vector3(tX, tY, tZ);

    if (this.controls) {
      if (distance) {
        const dir = new THREE.Vector3().subVectors(this.perspectiveCamera.position, this.controls.target).normalize();
        const newPos = new THREE.Vector3().copy(newTarget).addScaledVector(dir, distance);
        this.cameraController?.flyTo(newPos, newTarget, 0.08);
      } else {
        const offset = new THREE.Vector3().subVectors(this.perspectiveCamera.position, this.controls.target);
        const newPos = new THREE.Vector3().copy(newTarget).add(offset);
        this.cameraController?.flyTo(newPos, newTarget, 0.08);
      }
    }
  }

  /**
   * Handles container resize by synchronizing both cameras' projection matrices.
   */
  handleResize(width, height) {
    if (!width || !height || width <= 0 || height <= 0) return;
    const aspect = width / height;

    // 1. Perspective
    this.perspectiveCamera.aspect = aspect;
    this.perspectiveCamera.updateProjectionMatrix();

    // 2. Orthographic
    this.orthographicCamera.left = (-this.orthoFrustum * aspect) / 2;
    this.orthographicCamera.right = (this.orthoFrustum * aspect) / 2;
    this.orthographicCamera.top = this.orthoFrustum / 2;
    this.orthographicCamera.bottom = -this.orthoFrustum / 2;
    this.orthographicCamera.updateProjectionMatrix();
  }

  /**
   * Must be called inside the requestAnimationFrame render loop.
   */
  update(delta = 1 / 60) {
    this.cameraController?.update(delta);
  }

  /**
   * Disposes controls and clears listeners to prevent memory leaks.
   */
  dispose() {
    if (this.controls) {
      this.controls.removeEventListener('start', this._orbitStartListener);
      if (typeof this.controls.dispose === 'function') {
        this.controls.dispose();
      }
      this.controls = null;
    }
    this.cameraController?.stopFollowing();
    this.cameraController = null;
    this.onUserOrbitStart = null;
    this.toThreeCoordsFn = null;
  }
}
