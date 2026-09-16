/**
 * DragTransfer.js
 * 3D Raycasting Drag-and-Drop Controller for Employee Avatars in the Simulation Room.
 * 
 * Enables direct spatial workforce manipulation:
 * - Click & hold on an employee avatar to lift and drag across the store floor
 * - Highlights target zones with subtle green glow (valid) or amber/red outline (invalid)
 * - Computes real-time drop compatibility (skill requirements & zone capacity)
 * - Snaps into position upon valid drop or smoothly bounces back upon invalid release
 */

import * as THREE from 'three';
import { validateEmployeeTransfer } from '../simulation/SimulationValidator';

export class DragTransfer {
  constructor({
    domElement,
    camera,
    scene,
    controls,
    layout,
    toThreeCoords,
    onTransferComplete,
    onValidationChange,
    onDragStateChange,
  }) {
    this.dom = domElement;
    this.camera = camera;
    this.scene = scene;
    this.controls = controls;
    this.layout = layout;
    this.toThreeCoords = toThreeCoords;
    this.onTransferComplete = onTransferComplete;
    this.onValidationChange = onValidationChange;
    this.onDragStateChange = onDragStateChange;

    this.enabled = false;
    this.isDragging = false;
    this.draggedAvatar = null;
    this.originalPosition = new THREE.Vector3();
    this.currentHoverZone = null;
    this.validationState = null;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // Horizontal floor plane
    this.planeIntersectPoint = new THREE.Vector3();

    // Visual drag ring indicator
    const ringGeo = new THREE.RingGeometry(0.45, 0.55, 32);
    ringGeo.rotateX(-Math.PI / 2);
    this.dragRingMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.dragRing = new THREE.Mesh(ringGeo, this.dragRingMat);
    this.dragRing.visible = false;
    this.scene.add(this.dragRing);

    // Event bindings
    this._onPointerDown = this.onPointerDown.bind(this);
    this._onPointerMove = this.onPointerMove.bind(this);
    this._onPointerUp = this.onPointerUp.bind(this);

    this.attach();
  }

  attach() {
    this.dom.addEventListener('pointerdown', this._onPointerDown);
    window.addEventListener('pointermove', this._onPointerMove);
    window.addEventListener('pointerup', this._onPointerUp);
  }

  detach() {
    this.dom.removeEventListener('pointerdown', this._onPointerDown);
    window.removeEventListener('pointermove', this._onPointerMove);
    window.removeEventListener('pointerup', this._onPointerUp);
    if (this.dragRing && this.dragRing.parent) {
      this.dragRing.parent.remove(this.dragRing);
    }
  }

  setEnabled(val) {
    this.enabled = Boolean(val);
    if (!this.enabled && this.isDragging) {
      this.cancelDrag();
    }
  }

  updateContext({ avatarMeshes = [], zones = [], simulatedStaff = [] }) {
    this.avatarMeshes = avatarMeshes;
    this.zones = zones;
    this.simulatedStaff = simulatedStaff;
  }

  onPointerDown(e) {
    if (!this.enabled || e.button !== 0) return; // Only Left Click

    const rect = this.dom.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hitables = (this.avatarMeshes || []).map((a) => a.group || a);
    const hits = this.raycaster.intersectObjects(hitables, true);

    if (hits.length > 0) {
      // Traverse upward to root avatar group
      let hitGroup = hits[0].object;
      while (hitGroup && !hitGroup.userData?.isPerson && hitGroup.parent) {
        hitGroup = hitGroup.parent;
      }

      if (hitGroup?.userData?.isPerson && hitGroup.userData?.employee) {
        // Start dragging
        this.isDragging = true;
        this.draggedAvatar = hitGroup;
        this.originalPosition.copy(hitGroup.position);

        // Temporarily disable OrbitControls to avoid camera rotation while dragging
        if (this.controls) {
          this.controls.enabled = false;
        }

        // Lift avatar slightly
        hitGroup.position.y += 0.35;
        this.dragRing.visible = true;
        this.dragRing.position.set(hitGroup.position.x, 0.05, hitGroup.position.z);

        this.onDragStateChange?.(true, hitGroup.userData.employee);
      }
    }
  }

  onPointerMove(e) {
    if (!this.enabled || !this.isDragging || !this.draggedAvatar) return;

    const rect = this.dom.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Intersect floor drag plane
    if (this.raycaster.ray.intersectPlane(this.dragPlane, this.planeIntersectPoint)) {
      this.draggedAvatar.position.x = this.planeIntersectPoint.x;
      this.draggedAvatar.position.z = this.planeIntersectPoint.z;
      this.dragRing.position.x = this.planeIntersectPoint.x;
      this.dragRing.position.z = this.planeIntersectPoint.z;

      // Find nearest zone within 3.5m radius
      let nearestZone = null;
      let minDistance = Infinity;

      (this.zones || []).forEach((z) => {
        const [zx, , zz] = this.toThreeCoords(z.x, z.y, z.z, this.layout);
        const dist = Math.hypot(this.planeIntersectPoint.x - zx, this.planeIntersectPoint.z - zz);
        if (dist < 3.5 && dist < minDistance) {
          minDistance = dist;
          nearestZone = z;
        }
      });

      this.currentHoverZone = nearestZone;

      if (nearestZone) {
        const emp = this.draggedAvatar.userData.employee;
        const fromZone = this.draggedAvatar.userData.zone;
        const staffInZone = (this.simulatedStaff || []).filter(
          (s) => (s.zoneId || s.zone?.id) === nearestZone.id && (s.id || s.staffId) !== (emp.id || emp.staffId)
        );

        const check = validateEmployeeTransfer({
          employee: emp,
          fromZone,
          toZone: nearestZone,
          staffInTargetZone: staffInZone,
        });

        this.validationState = check;
        this.dragRingMat.color.setHex(check.valid ? 0x10b981 : 0xef4444);
        this.onValidationChange?.(check, nearestZone);
      } else {
        this.validationState = null;
        this.dragRingMat.color.setHex(0x94a3b8);
        this.onValidationChange?.(null, null);
      }
    }
  }

  onPointerUp() {
    if (!this.enabled || !this.isDragging || !this.draggedAvatar) return;

    if (this.controls) {
      this.controls.enabled = true;
    }

    this.dragRing.visible = false;
    const emp = this.draggedAvatar.userData.employee;
    const targetZone = this.currentHoverZone;
    const validation = this.validationState;

    if (targetZone && validation?.valid) {
      // Valid drop: execute transfer
      this.onTransferComplete?.(emp, targetZone);
    } else {
      // Invalid drop: bounce back to original position
      this.draggedAvatar.position.copy(this.originalPosition);
      if (validation && !validation.valid) {
        this.onValidationChange?.(validation, targetZone);
      }
    }

    this.isDragging = false;
    this.draggedAvatar = null;
    this.currentHoverZone = null;
    this.validationState = null;
    this.onDragStateChange?.(false, null);
    this.onValidationChange?.(null, null);
  }

  cancelDrag() {
    if (this.isDragging && this.draggedAvatar) {
      this.draggedAvatar.position.copy(this.originalPosition);
      this.isDragging = false;
      this.draggedAvatar = null;
      this.dragRing.visible = false;
      if (this.controls) {
        this.controls.enabled = true;
      }
      this.onDragStateChange?.(false, null);
      this.onValidationChange?.(null, null);
    }
  }
}
