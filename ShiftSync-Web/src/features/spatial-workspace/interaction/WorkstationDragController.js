/**
 * WorkstationDragController.js
 * 3D Raycasting Drag-and-Drop Controller for Workstations in the ShiftSync Digital Twin.
 * 
 * Features:
 * - Raycast selection and direct spatial dragging across store floor plane
 * - Ground boundary clamping based on store dimensions
 * - Real-time collision detection against other workstations
 * - Visual highlight ring & collision status indicator
 * - Safe preview with instant rollback capability upon cancel/error
 * - OrbitControls locking during drag to prevent camera jitter
 */

import * as THREE from 'three';
import { toBackendCoords, toThreeCoords } from '../../../components/spatial/spatial.constants.js';

export const WORKSTATION_COLLISION_RADIUS = 1.1; // Minimum distance (meters) between workstations

// Only registered assembly roots can move, regardless of which child was hit.
export function getWorkstationDragRoot(object, roots) {
  const allowed = new Set(roots);
  for (let node = object; node; node = node.parent) {
    if (allowed.has(node)) return node;
  }
  return null;
}

export class WorkstationDragController {
  constructor({
    domElement,
    camera,
    scene,
    controls,
    layout = { length: 24, width: 16 },
    onSelect,
    onDragStart,
    onDragMove,
    onDragEnd,
    onValidationChange,
  }) {
    this.dom = domElement;
    this.camera = camera;
    this.scene = scene;
    this.controls = controls;
    this.layout = layout;
    this.onSelect = onSelect;
    this.onDragStart = onDragStart;
    this.onDragMove = onDragMove;
    this.onDragEnd = onDragEnd;
    this.onValidationChange = onValidationChange;

    this.enabled = false;
    this.isDragging = false;
    this.selectedWorkstation = null;
    this.selectedMesh = null;
    this.draggedMesh = null;
    this.originalPosition = new THREE.Vector3();
    this.originalRotation = 0;
    this.pendingPointer = null;
    this.dragOffset = new THREE.Vector3();
    this.previewPosition = null;
    this.previewRotation = null;
    this.originalBackendCoords = null;
    this.currentBackendCoords = null;
    this.isPositionValid = true;

    this.workstationMeshes = [];
    this.workstationsData = [];

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.planeIntersectPoint = new THREE.Vector3();

    // Visual selection and drag indicator ring
    const ringGeo = new THREE.RingGeometry(0.7, 0.85, 36);
    ringGeo.rotateX(-Math.PI / 2);
    this.dragRingMat = new THREE.MeshBasicMaterial({
      color: 0x0284c7, // Sky blue for selection
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.dragRing = new THREE.Mesh(ringGeo, this.dragRingMat);
    this.dragRing.position.set(0, 0.05, 0);
    this.dragRing.visible = false;
    this.scene.add(this.dragRing);

    // Event bindings
    this._onPointerDown = this.onPointerDown.bind(this);
    this._onPointerMove = this.onPointerMove.bind(this);
    this._onPointerUp = this.onPointerUp.bind(this);

    this.attach();
  }

  attach() {
    if (this.dom?.addEventListener) {
      this.dom.addEventListener('pointerdown', this._onPointerDown);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('pointermove', this._onPointerMove);
      window.addEventListener('pointerup', this._onPointerUp);
    }
  }

  detach() {
    if (this.dom?.removeEventListener) {
      this.dom.removeEventListener('pointerdown', this._onPointerDown);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('pointermove', this._onPointerMove);
      window.removeEventListener('pointerup', this._onPointerUp);
    }
    if (this.dragRing && this.dragRing.parent) {
      this.dragRing.parent.remove(this.dragRing);
    }
  }

  setEnabled(val) {
    this.enabled = Boolean(val);
    if (!this.enabled) {
      if (this.isDragging) {
        this.cancelDrag();
      }
      this.clearSelection();
    }
  }

  updateContext({ workstationMeshes = [], workstations = [], layout = null }) {
    this.workstationMeshes = workstationMeshes;
    this.workstationsData = workstations;
    if (layout) this.layout = layout;

    // Refresh selected mesh reference if needed
    if (this.selectedWorkstation) {
      const match = this.workstationMeshes.find(
        (m) => m.userData?.workstationId === this.selectedWorkstation.id
      );
      if (match) {
        if (this.previewPosition) match.position.copy(this.previewPosition);
        if (this.previewRotation != null && match.rotation) match.rotation.y = this.previewRotation;
        this.selectedMesh = match;
        this.updateRingPosition(match.position);
      }
    }
  }

  selectWorkstation(ws) {
    if (!ws) {
      this.clearSelection();
      return;
    }
    if (this.selectedWorkstation?.id === ws.id && this.selectedMesh) return;
    this.revertPosition();
    this.previewPosition = null;
    this.previewRotation = null;
    this.selectedWorkstation = ws;
    const mesh = this.workstationMeshes.find(
      (m) => m.userData?.workstationId === ws.id
    );
    this.selectedMesh = mesh || null;

    if (this.selectedMesh) {
      this.originalPosition.copy(this.selectedMesh.position);
      this.originalRotation = this.selectedMesh.rotation?.y || 0;
      this.originalBackendCoords = {
        x: ws.x ?? 0,
        y: ws.y ?? 0,
        z: ws.z ?? 0,
      };
      this.currentBackendCoords = { ...this.originalBackendCoords };
      this.updateRingPosition(this.selectedMesh.position);
      this.dragRing.visible = true;
      this.dragRingMat.color.setHex(0x0284c7); // Cyan/Sky blue for selected
    } else {
      this.dragRing.visible = false;
    }

    this.onSelect?.(ws, this.selectedMesh);
  }

  clearSelection() {
    if (this.pendingPointer || this.isDragging) this.cancelDrag();
    this.revertPosition();
    this.previewPosition = null;
    this.previewRotation = null;
    this.selectedWorkstation = null;
    this.selectedMesh = null;
    this.dragRing.visible = false;
  }

  updateRingPosition(pos) {
    this.dragRing.position.set(pos.x, 0.05, pos.z);
  }

  checkCollision(wsId, testBackendCoords) {
    if (!testBackendCoords || !Array.isArray(this.workstationsData)) {
      return { isColliding: false, conflictingWorkstation: null };
    }

    for (const other of this.workstationsData) {
      if (other.id === wsId) continue;
      const ox = Number(other.x);
      const oy = Number(other.y);
      if (isNaN(ox) || isNaN(oy)) continue;

      const dist = Math.hypot(testBackendCoords.x - ox, testBackendCoords.y - oy);
      if (dist < WORKSTATION_COLLISION_RADIUS) {
        return { isColliding: true, conflictingWorkstation: other, distance: dist };
      }
    }

    return { isColliding: false, conflictingWorkstation: null };
  }

  clampCoordinates(backendX, backendY) {
    const storeLen = Number(this.layout?.length) || 24.0;
    const storeWid = Number(this.layout?.width) || 16.0;
    const padding = 0.8; // Maintain minimum distance from external walls

    const clampedX = Math.max(padding, Math.min(storeLen - padding, backendX));
    const clampedY = Math.max(padding, Math.min(storeWid - padding, backendY));

    return {
      x: Number(clampedX.toFixed(2)),
      y: Number(clampedY.toFixed(2)),
    };
  }

  onPointerDown(e) {
    if (!this.enabled || e.button !== 0) return; // Only left click

    const rect = this.dom.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hitables = (this.workstationMeshes || []).filter(Boolean);
    const hits = this.raycaster.intersectObjects(hitables, true);

    const target = hits.map(hit => getWorkstationDragRoot(hit.object, hitables)).find(node => node?.userData?.workstation && node.visible);
    if (!target) return;
    const ws = target.userData.workstation;
    this.selectWorkstation(ws);
    this.draggedMesh = target;
    this.pendingPointer = { x: e.clientX, y: e.clientY, id: e.pointerId };
    this.dragOffset.set(0, 0, 0);
    if (this.raycaster.ray.intersectPlane(this.dragPlane, this.planeIntersectPoint)) {
      this.dragOffset.copy(target.getWorldPosition(new THREE.Vector3())).sub(this.planeIntersectPoint);
    }
    this.controlsWereEnabled = this.controls?.enabled;
    if (this.controls) this.controls.enabled = false;
  }

  onPointerMove(e) {
    if (!this.pendingPointer || !this.draggedMesh || e.pointerId !== this.pendingPointer.id) return;
    if (!this.isDragging) {
      if (Math.hypot(e.clientX - this.pendingPointer.x, e.clientY - this.pendingPointer.y) < 6) return;
      this.isDragging = true;
      this.onDragStart?.(this.selectedWorkstation);
    }

    const rect = this.dom.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    if (this.raycaster.ray.intersectPlane(this.dragPlane, this.planeIntersectPoint)) {
      this.planeIntersectPoint.add(this.dragOffset);
      // 1. Convert raw Three.js floor intersection to backend coords
      const rawBackend = toBackendCoords(
        this.planeIntersectPoint.x,
        this.draggedMesh.position.y,
        this.planeIntersectPoint.z,
        this.layout
      );

      // 2. Clamp within store floor boundaries
      const clamped = this.clampCoordinates(Math.round(rawBackend.x * 4) / 4, Math.round(rawBackend.y * 4) / 4);
      const elevation = Number(this.selectedWorkstation?.z) || 0.0;
      const targetBackend = {
        x: clamped.x,
        y: clamped.y,
        z: elevation,
      };

      // 3. Map back to Three.js coordinates for preview
      const [newThreeX, newThreeY, newThreeZ] = toThreeCoords(
        targetBackend.x,
        targetBackend.y,
        targetBackend.z,
        this.layout
      );

      // 4. Update preview mesh position
      const worldPosition = new THREE.Vector3(newThreeX, newThreeY, newThreeZ);
      if (this.draggedMesh.parent) this.draggedMesh.parent.worldToLocal(worldPosition);
      this.draggedMesh.position.set(worldPosition.x, this.originalPosition.y, worldPosition.z);
      this.previewPosition = this.draggedMesh.position.clone();
      this.updateRingPosition(this.draggedMesh.position);

      // 5. Check collision against other workstations
      const collision = this.checkCollision(this.selectedWorkstation.id, targetBackend);
      this.isPositionValid = !collision.isColliding;

      if (this.isPositionValid) {
        this.dragRingMat.color.setHex(0x10b981); // Green (valid)
      } else {
        this.dragRingMat.color.setHex(0xef4444); // Red (collision/invalid)
      }

      this.currentBackendCoords = targetBackend;
      this.onDragMove?.(this.selectedWorkstation, targetBackend, this.isPositionValid, collision);
      this.onValidationChange?.({
        isValid: this.isPositionValid,
        collision,
        coords: targetBackend,
      });
    }
  }

  onPointerUp(e) {
    if (!this.pendingPointer || (e && e.pointerId !== this.pendingPointer.id)) return;
    const wasDragging = this.isDragging;
    this.pendingPointer = null;
    this.isDragging = false;
    if (this.controls) {
      this.controls.enabled = this.controlsWereEnabled ?? true;
    }

    if (wasDragging && this.draggedMesh && this.selectedWorkstation) {
      this.onDragEnd?.(
        this.selectedWorkstation,
        this.currentBackendCoords || this.originalBackendCoords,
        this.isPositionValid
      );
    }

    this.draggedMesh = null;
  }

  revertPosition() {
    if (this.selectedMesh && this.originalPosition) {
      this.selectedMesh.position.copy(this.originalPosition);
      if (this.selectedMesh.rotation) this.selectedMesh.rotation.y = this.originalRotation;
      this.updateRingPosition(this.originalPosition);
    }
    this.previewPosition = null;
    this.previewRotation = null;
    this.currentBackendCoords = this.originalBackendCoords;
    this.isPositionValid = true;
    this.dragRingMat.color.setHex(0x0284c7);
  }

  commitPosition() {
    this.previewPosition = null;
    this.previewRotation = null;
    if (this.selectedMesh) {
      this.originalPosition.copy(this.selectedMesh.position);
      this.originalRotation = this.selectedMesh.rotation?.y || 0;
    }
    if (this.currentBackendCoords) {
      this.originalBackendCoords = { ...this.currentBackendCoords };
    }
    this.dragRingMat.color.setHex(0x0284c7);
  }

  /**
   * Rotates the currently selected workstation mesh around the Y-axis
   * @param {number} deltaRad - Rotation step in radians (default: 90 degrees / Math.PI / 2)
   * @returns {number|null} new rotation angle in radians or null if no workstation selected
   */
  rotateSelected(deltaRad = Math.PI / 2) {
    if (!this.selectedMesh || !this.selectedWorkstation) return null;
    const currentRot = this.selectedMesh.rotation.y || 0;
    const newRot = (currentRot + deltaRad) % (Math.PI * 2);
    this.selectedMesh.rotation.y = newRot;

    // Preview only; never mutate the API snapshot or children's local transforms.
    this.previewRotation = newRot;
    return newRot;
  }

  cancelDrag() {
    this.pendingPointer = null;
    this.isDragging = false;
    if (this.controls) {
      this.controls.enabled = true;
    }
    this.revertPosition();
    this.draggedMesh = null;
  }

  dispose() {
    this.cancelDrag();
    this.detach();
    if (this.dragRing) {
      if (this.dragRing.parent) {
        this.dragRing.parent.remove(this.dragRing);
      }
      this.dragRing.geometry?.dispose();
      this.dragRing.material?.dispose();
    }
  }
}

