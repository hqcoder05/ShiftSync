/**
 * PlayerController.js
 * First / Third-Person Exploration Controller for Mode 2 (3D Explore Mode).
 * 
 * Features:
 * - Keyboard WASD / Arrows movement + Shift Sprint + Space Hop
 * - Mouse look with Pointer Lock & Left-Drag fallback
 * - Human eye-level height clamping (1.6m)
 * - Vertical pitch clamping [-0.45, 0.65] rad
 * - AABB sliding collision detection against store perimeter, zones & workstations
 * - Smooth camera following (3rd Person or 1st Person)
 * - Center Crosshair Raycasting & Proximity detection to zones, workstations and employees
 * - Point Lock (Target Lock): Locks camera orientation onto selected employee / workstation while walking
 * - Hierarchical Escape Key: Releases Point Lock first; then pointer lock; then exits
 */

import * as THREE from 'three';
import { getStaffId, areSameStaff } from '../utils/staffIdentity.js';

export class PlayerController {
  constructor(domElement, camera, playerAvatar, layout = { length: 24, width: 16, height: 6 }) {
    this.domElement = domElement;
    this.camera = camera;
    this.avatar = playerAvatar;
    this.layout = layout;

    // Player State
    this.radius = 0.38;
    this.playerHeight = 1.6; // Human eye level in meters
    this.position = new THREE.Vector3(0, 0, (layout.width || 16) * 0.38); // Spawn near store entrance
    this.velocity = new THREE.Vector3();
    this.targetVelocity = new THREE.Vector3();

    this.yaw = 0; // Face inwards toward store center (-Z)
    this.pitch = 0.12;
    this.viewMode = 'first_person'; // Default to first person for immersive walkthrough
    this.isPointerLocked = false;

    // Point Lock (Target Lock) Subsystem
    this.targetLock = null; // { id, type, name, position, targetMesh, item }
    this.onTargetLockChange = null;
    this.reticleTarget = null; // Entity aimed at by center crosshair

    // Movement speeds & Fly mode
    this.walkSpeed = 3.8;
    this.sprintSpeed = 6.4;
    this.jumpSpeed = 3.6;
    this.gravity = -11.0;
    this.verticalVelocity = 0;
    this.isGrounded = true;
    this.isFlyMode = false;

    // Input keys
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      sprint: false,
      flyUp: false,
      flyDown: false,
    };

    // Interaction callbacks
    this.onInteract = null;
    this.onToggleView = null;
    this.onFlyModeChange = null;
    this.onExit = null;
    this.nearbyEntity = null;

    // Obstacle bounding boxes [ { minX, maxX, minZ, maxZ, name, type, id } ]
    this.obstacles = [];
    this.rebuildObstacles(layout);

    // Event listeners bound
    this._onKeyDown = this.handleKeyDown.bind(this);
    this._onKeyUp = this.handleKeyUp.bind(this);
    this._onMouseMove = this.handleMouseMove.bind(this);
    this._onMouseDown = this.handleMouseDown.bind(this);
    this._onMouseUp = this.handleMouseUp.bind(this);
    this._onPointerLockChange = this.handlePointerLockChange.bind(this);

    this.isDragging = false;
    this.prevMouseX = 0;
    this.prevMouseY = 0;

    this.attach();
  }

  attach() {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this._onKeyDown);
      window.addEventListener('keyup', this._onKeyUp);
      window.addEventListener('mousemove', this._onMouseMove);
      window.addEventListener('mouseup', this._onMouseUp);
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('pointerlockchange', this._onPointerLockChange);
    }

    if (this.domElement?.addEventListener) {
      this.domElement.addEventListener('mousedown', this._onMouseDown);
    }
  }

  detach() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this._onKeyDown);
      window.removeEventListener('keyup', this._onKeyUp);
      window.removeEventListener('mousemove', this._onMouseMove);
      window.removeEventListener('mouseup', this._onMouseUp);
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('pointerlockchange', this._onPointerLockChange);
      if (document.pointerLockElement === this.domElement) {
        document.exitPointerLock();
      }
    }

    if (this.domElement?.removeEventListener) {
      this.domElement.removeEventListener('mousedown', this._onMouseDown);
    }
  }

  requestPointerLock() {
    if (this.domElement && this.domElement.requestPointerLock) {
      // Opening a card can release the mouse before the browser grants this request.
      // A rejected request leaves drag-to-look available and must not become a page error.
      try {
        this.domElement.requestPointerLock()?.catch?.(() => { this.isPointerLocked = false; });
      } catch {
        this.isPointerLocked = false;
      }
    }
  }

  setPaused(paused) {
    this.paused = paused;
    if (!paused) return;
    Object.keys(this.keys).forEach(key => { this.keys[key] = false; });
    this.isDragging = false;
    this.exitPointerLock();
  }

  lookAtTarget(target) {
    const position = this.camera.position;
    this.yaw = Math.atan2(position.x - target.x, position.z - target.z);
    this.pitch = Math.atan2(position.y - target.y, Math.hypot(position.x - target.x, position.z - target.z));
    this.camera.lookAt(target);
    this.camera.updateMatrixWorld();
  }

  exitPointerLock() {
    if (document.pointerLockElement === this.domElement) {
      document.exitPointerLock();
    }
  }

  handlePointerLockChange() {
    this.isPointerLocked = document.pointerLockElement === this.domElement;
    if (this.isPointerLocked && this.paused) this.exitPointerLock();
  }

  handleMouseDown(e) {
    if (this.paused) return;
    if (e.button === 0) {
      this.isDragging = true;
      this.prevMouseX = e.clientX;
      this.prevMouseY = e.clientY;

      if (!this.isPointerLocked && !e.target.closest('button, input, select, textarea, [data-interactive="true"]')) {
        this.requestPointerLock();
      }
    }
  }

  handleMouseUp(e) {
    if (e.button === 0) {
      this.isDragging = false;
    }
  }

  handleMouseMove(e) {
    if (this.paused) return;
    // When Point Lock is active, camera orientation is driven by the locked target
    if (this.targetLock) return;

    let deltaX = 0;
    let deltaY = 0;

    if (this.isPointerLocked) {
      deltaX = e.movementX || 0;
      deltaY = e.movementY || 0;
    } else if (this.isDragging) {
      deltaX = e.clientX - this.prevMouseX;
      deltaY = e.clientY - this.prevMouseY;
      this.prevMouseX = e.clientX;
      this.prevMouseY = e.clientY;
    } else {
      return;
    }

    const sensitivity = 0.0028;
    this.yaw -= deltaX * sensitivity;
    this.pitch += deltaY * sensitivity;

    // Expand pitch range to nearly 90 degrees (look straight up at ceiling lights or down at floor)
    this.pitch = Math.max(-1.48, Math.min(1.48, this.pitch));
  }

  /**
   * Engages Point Lock onto a specific target entity
   * @param {Object|null} target - { id, type, name, position, targetMesh, item }
   */
  setTargetLock(target) {
    if (!target) {
      this.releaseTargetLock();
      return;
    }

    const targetId = target.id || getStaffId(target) || getStaffId(target.item) || (target.position ? `${target.position.x}_${target.position.z}` : null);
    
    // Toggle off if already locked on same target
    if (this.targetLock && this.targetLock.id === targetId) {
      this.releaseTargetLock();
      return;
    }

    this.targetLock = {
      id: targetId,
      type: target.type || (target.staffId || target.fullName ? 'staff' : (target.workstationType ? 'workstation' : 'zone')),
      name: target.name || target.fullName || target.code || 'Mục tiêu',
      position: target.position ? target.position.clone() : new THREE.Vector3(),
      targetMesh: target.targetMesh || null,
      item: target.item || target,
    };

    if (typeof this.onTargetLockChange === 'function') {
      this.onTargetLockChange(this.targetLock);
    }
  }

  /**
   * Releases active Point Lock and restores free camera orientation
   */
  releaseTargetLock() {
    if (!this.targetLock) return;
    this.targetLock = null;
    if (typeof this.onTargetLockChange === 'function') {
      this.onTargetLockChange(null);
    }
  }

  /**
   * Helper to set Point Lock from a nearby or reticle entity
   */
  setTargetLockFromEntity(entity, avatarMeshes = [], workstationMeshes = []) {
    if (!entity) return;

    let targetMesh = null;
    const targetPos = new THREE.Vector3();

    if (entity.type === 'staff') {
      const empId = getStaffId(entity.item || entity);
      const avatar = avatarMeshes.find((a) => areSameStaff(a.userData?.employee, entity.item || entity));
      if (avatar) {
        targetMesh = avatar;
        avatar.getWorldPosition(targetPos);
      }
    } else if (entity.type === 'workstation') {
      const wsId = entity.item?.id || entity.id;
      const wsMesh = workstationMeshes.find((w) => w.userData?.workstation?.id === wsId);
      if (wsMesh) {
        targetMesh = wsMesh;
        wsMesh.getWorldPosition(targetPos);
      }
    }

    this.setTargetLock({
      id: entity.id || getStaffId(entity.item || entity),
      type: entity.type || 'entity',
      name: entity.name || entity.item?.fullName || entity.item?.name || 'Mục tiêu',
      position: targetPos,
      targetMesh,
      item: entity.item || entity,
    });
  }

  handleKeyDown(e) {
    if (this.paused) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.keys.forward = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.keys.backward = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.keys.left = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.keys.right = true;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.keys.sprint = true;
        break;
      case 'KeyC':
        this.isFlyMode = !this.isFlyMode;
        if (this.isFlyMode) {
          this.isGrounded = false;
        }
        if (typeof this.onFlyModeChange === 'function') {
          this.onFlyModeChange(this.isFlyMode);
        }
        break;
      case 'Space':
        if (this.isFlyMode) {
          this.keys.flyUp = true;
        } else if (this.isGrounded) {
          this.verticalVelocity = this.jumpSpeed;
          this.isGrounded = false;
        }
        e.preventDefault();
        break;
      case 'KeyQ':
        if (this.isFlyMode) {
          this.keys.flyDown = true;
        }
        break;
      case 'KeyE':
        // Interact with nearby entity or locked target
        const activeEntity = this.nearbyEntity || (this.targetLock ? {
          type: this.targetLock.type,
          item: this.targetLock.item,
          name: this.targetLock.name,
        } : null);

        if (activeEntity && this.onInteract) {
          this.onInteract(activeEntity);
        }
        break;
      case 'KeyF':
      case 'KeyL':
        // Toggle Point Lock
        if (this.targetLock) {
          this.releaseTargetLock();
        } else if (this.reticleTarget) {
          this.setTargetLock(this.reticleTarget);
        } else if (this.nearbyEntity) {
          this.setTargetLock({
            id: this.nearbyEntity.id || getStaffId(this.nearbyEntity.item),
            type: this.nearbyEntity.type,
            name: this.nearbyEntity.name,
            position: this.nearbyEntity.position || new THREE.Vector3(),
            targetMesh: this.nearbyEntity.targetMesh,
            item: this.nearbyEntity.item,
          });
        }
        break;
      case 'KeyV':
        this.viewMode = this.viewMode === 'third_person' ? 'first_person' : 'third_person';
        if (this.onToggleView) this.onToggleView(this.viewMode);
        break;
      case 'Escape':
        // Point Lock Escape Hierarchy:
        // 1. Release Point Lock if active
        // 2. Release Pointer Lock if pointer is locked
        // 3. Exit exploration mode
        if (this.targetLock) {
          this.releaseTargetLock();
          e.preventDefault();
          if (typeof e.stopPropagation === 'function') e.stopPropagation();
          return;
        }
        if (this.isPointerLocked) {
          this.exitPointerLock();
          return;
        }
        if (this.onExit) {
          this.onExit();
        }
        break;
      default:
        break;
    }
  }

  handleKeyUp(e) {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.keys.forward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.keys.backward = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.keys.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.keys.right = false;
        break;
      case 'Space':
        this.keys.flyUp = false;
        break;
      case 'KeyQ':
        this.keys.flyDown = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.keys.sprint = false;
        break;
      default:
        break;
    }
  }

  rebuildObstacles(layout, zones = [], workstations = [], toThreeCoords = null, customObstacles = [],physicalLayout = layout) {
    this.layout = layout;
    this.obstacles = [];

    const storeLen = Number(physicalLayout?.length) || 24.0;
    const storeWid = Number(physicalLayout?.width) || 16.0;
    const hasPhysicalGeometry=customObstacles.length>0;

    // Store Outer Perimeter boundary limits
    this.bounds = {
      minX: -storeLen / 2 + this.radius + 0.35,
      maxX: storeLen / 2 - this.radius - 0.35,
      minZ: -storeWid / 2 + this.radius + 0.35,
      maxZ: storeWid / 2 - this.radius - 0.35,
    };

    // Add obstacles for interior architectural structural columns
    const colHalf = 0.38;
    (hasPhysicalGeometry?[]:[-storeLen * 0.16, storeLen * 0.16]).forEach((cx, idx) => {
      const cz = -storeWid * 0.08;
      this.obstacles.push({
        minX: cx - colHalf,
        maxX: cx + colHalf,
        minZ: cz - colHalf,
        maxZ: cz + colHalf,
        name: `Cột kiến trúc ${idx + 1}`,
        type: 'column',
      });
    });

    // Add obstacles for zone counters if provided
    if (!hasPhysicalGeometry && zones.length > 0 && toThreeCoords) {
      const zoneSizeX = Math.min(4.4, storeLen * 0.22);
      const zoneSizeZ = Math.min(3.6, storeWid * 0.22);

      zones.forEach((z) => {
        const [tx, , tz] = toThreeCoords(z.x, z.y, z.z, layout);
        this.obstacles.push({
          minX: tx - zoneSizeX * 0.32,
          maxX: tx + zoneSizeX * 0.32,
          minZ: tz - zoneSizeZ * 0.30,
          maxZ: tz + zoneSizeZ * 0.30,
          name: z.name,
          type: 'zone',
          id: z.id,
        });
      });
    }

    // Add obstacles for dedicated workstations if provided
    if (!hasPhysicalGeometry && Array.isArray(workstations) && workstations.length > 0 && toThreeCoords) {
      workstations.forEach((ws) => {
        if (ws.x !== undefined && ws.z !== undefined) {
          const [wx, , wz] = toThreeCoords(ws.x, ws.y || 0, ws.z, layout);
          this.obstacles.push({
            minX: wx - 0.75,
            maxX: wx + 0.75,
            minZ: wz - 0.65,
            maxZ: wz + 0.65,
            name: ws.name || ws.code || 'Trạm làm việc',
            type: 'workstation',
            id: ws.id,
          });
        }
      });
    }

    // Add custom obstacles (e.g. from GLB model partitions and counters)
    if (Array.isArray(customObstacles) && customObstacles.length > 0) {
      customObstacles.forEach((obs) => {
        if (obs && typeof obs.minX === 'number' && typeof obs.maxX === 'number') {
          // Avoid duplicate obstacle entries
          const exists = this.obstacles.some(
            (o) => Math.abs(o.minX - obs.minX) < 0.1 && Math.abs(o.minZ - obs.minZ) < 0.1
          );
          if (!exists) {
            this.obstacles.push(obs);
          }
        }
      });
    }
  }

  teleportTo(x, z, yaw) {
    const clear=(px,pz)=>px>=this.bounds.minX&&px<=this.bounds.maxX&&pz>=this.bounds.minZ&&pz<=this.bounds.maxZ&&!this.obstacles.some(b=>px+this.radius+.08>b.minX&&px-this.radius-.08<b.maxX&&pz+this.radius+.08>b.minZ&&pz-this.radius-.08<b.maxZ);
    let target=clear(x,z)?{x,z}:null;
    for(let distance=.5;!target&&distance<=4;distance+=.5){
      for(let angle=0;angle<Math.PI*2;angle+=Math.PI/8){const px=x+Math.sin(angle)*distance,pz=z+Math.cos(angle)*distance;if(clear(px,pz)){target={x:px,z:pz};break;}}
    }
    if(!target)return false;
    this.position.set(target.x, 0, target.z);
    this.velocity.set(0, 0, 0);
    this.targetVelocity.set(0, 0, 0);
    this.verticalVelocity = 0;
    this.isGrounded = true;
    if (typeof yaw === 'number') {
      this.yaw = yaw;
    }
    if (this.avatar?.group) {
      this.avatar.group.position.copy(this.position);
      this.avatar.group.rotation.y = this.yaw - Math.PI;
    }
    return true;
  }

  update(deltaTime, elapsedTime, zones = [], staff = [], toThreeCoords = null, workstations = [], avatarMeshes = [], workstationMeshes = []) {
    const dt = Math.min(deltaTime, 0.05);

    // 1. Point Lock Camera Tracking: orient yaw & pitch towards target
    if (this.targetLock) {
      let targetWorldPos = this.targetLock.position;
      if (this.targetLock.targetMesh) {
        targetWorldPos = new THREE.Vector3();
        this.targetLock.targetMesh.getWorldPosition(targetWorldPos);
      } else if (this.targetLock.type === 'staff') {
        const foundAvatar = avatarMeshes.find((a) => areSameStaff(a.userData?.employee, this.targetLock.item || this.targetLock.id));
        if (foundAvatar) {
          targetWorldPos = new THREE.Vector3();
          foundAvatar.getWorldPosition(targetWorldPos);
          this.targetLock.targetMesh = foundAvatar;
        }
      }

      if (targetWorldPos) {
        const eyeY = this.position.y + (this.viewMode === 'first_person' ? this.playerHeight : 1.25);
        const dx = targetWorldPos.x - this.position.x;
        const targetOffsetY = this.targetLock.type === 'staff' ? 0.95 : (this.targetLock.type === 'workstation' ? 0.75 : 0.5);
        const dy = (targetWorldPos.y + targetOffsetY) - eyeY;
        const dz = targetWorldPos.z - this.position.z;
        const horizDist = Math.hypot(dx, dz);

        const desiredYaw = Math.atan2(-dx, -dz);
        const desiredPitch = Math.atan2(dy, Math.max(0.2, horizDist));

        // Smooth angle interpolation with wrap-around
        let diffYaw = (desiredYaw - this.yaw) % (Math.PI * 2);
        if (diffYaw < -Math.PI) diffYaw += Math.PI * 2;
        if (diffYaw > Math.PI) diffYaw -= Math.PI * 2;

        const lockDamping = Math.min(1.0, dt * 10.0);
        this.yaw += diffYaw * lockDamping;
        this.pitch = THREE.MathUtils.lerp(
          this.pitch,
          Math.max(-0.45, Math.min(0.68, desiredPitch)),
          lockDamping
        );
      }
    }

    if (this.isFlyMode) {
      // Free Fly (Noclip 3D Flight) - camera look vector translation
      const lookDir = new THREE.Vector3();
      this.camera.getWorldDirection(lookDir);
      const rightDir = new THREE.Vector3().crossVectors(lookDir, new THREE.Vector3(0, 1, 0)).normalize();
      const upDir = new THREE.Vector3(0, 1, 0);

      const flyDir = new THREE.Vector3();
      if (this.keys.forward) flyDir.add(lookDir);
      if (this.keys.backward) flyDir.sub(lookDir);
      if (this.keys.right) flyDir.add(rightDir);
      if (this.keys.left) flyDir.sub(rightDir);
      if (this.keys.flyUp) flyDir.add(upDir);
      if (this.keys.flyDown) flyDir.sub(upDir);

      if (flyDir.lengthSq() > 0.0001) {
        flyDir.normalize();
      }

      const flySpeed = this.keys.sprint ? this.sprintSpeed * 2.0 : this.walkSpeed * 1.5;
      this.targetVelocity.copy(flyDir).multiplyScalar(flySpeed);

      const accel = 14.0;
      this.velocity.lerp(this.targetVelocity, Math.min(1.0, dt * accel));
      this.position.addScaledVector(this.velocity, dt);

      // Generous flight boundary limits
      const storeLen = Number(this.layout?.length) || 24.0;
      const storeWid = Number(this.layout?.width) || 16.0;
      this.position.x = Math.max(-storeLen * 1.2, Math.min(storeLen * 1.2, this.position.x));
      this.position.z = Math.max(-storeWid * 1.2, Math.min(storeWid * 1.2, this.position.z));
      this.position.y = Math.max(0.2, Math.min(30.0, this.position.y));

      this.verticalVelocity = 0;
      this.isGrounded = this.position.y <= 0.25;
    } else {
      // 2. Calculate input movement direction relative to camera yaw
      const forwardX = -Math.sin(this.yaw);
      const forwardZ = -Math.cos(this.yaw);
      const rightX = Math.cos(this.yaw);
      const rightZ = -Math.sin(this.yaw);

      let moveX = 0;
      let moveZ = 0;

      if (this.keys.forward) {
        moveX += forwardX;
        moveZ += forwardZ;
      }
      if (this.keys.backward) {
        moveX -= forwardX;
        moveZ -= forwardZ;
      }
      if (this.keys.left) {
        moveX -= rightX;
        moveZ -= rightZ;
      }
      if (this.keys.right) {
        moveX += rightX;
        moveZ += rightZ;
      }

      // Normalize input
      const inputLen = Math.hypot(moveX, moveZ);
      if (inputLen > 0.001) {
        moveX /= inputLen;
        moveZ /= inputLen;
      }

      const currentSpeed = this.keys.sprint ? this.sprintSpeed : this.walkSpeed;
      this.targetVelocity.set(moveX * currentSpeed, 0, moveZ * currentSpeed);

      // Smooth lerp velocity
      const accel = 12.0;
      this.velocity.x += (this.targetVelocity.x - this.velocity.x) * dt * accel;
      this.velocity.z += (this.targetVelocity.z - this.velocity.z) * dt * accel;

      // 3. Jump & Gravity
      if (!this.isGrounded) {
        this.verticalVelocity += this.gravity * dt;
        this.position.y += this.verticalVelocity * dt;
        if (this.position.y <= 0) {
          this.position.y = 0;
          this.verticalVelocity = 0;
          this.isGrounded = true;
        }
      }

      // 4. Collision Detection with sliding response
      const deltaMoveX = this.velocity.x * dt;
      const deltaMoveZ = this.velocity.z * dt;

      // Test X move
      let nextX = this.position.x + deltaMoveX;
      // Boundary clamp
      nextX = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, nextX));
      // Obstacles check on X
      let collidesX = false;
      for (const obs of this.obstacles) {
        if (
          nextX + this.radius > obs.minX &&
          nextX - this.radius < obs.maxX &&
          this.position.z + this.radius > obs.minZ &&
          this.position.z - this.radius < obs.maxZ
        ) {
          collidesX = true;
          break;
        }
      }
      if (!collidesX) {
        this.position.x = nextX;
      } else {
        this.velocity.x = 0;
      }

      // Test Z move
      let nextZ = this.position.z + deltaMoveZ;
      // Boundary clamp
      nextZ = Math.max(this.bounds.minZ, Math.min(this.bounds.maxZ, nextZ));
      // Obstacles check on Z
      let collidesZ = false;
      for (const obs of this.obstacles) {
        if (
          this.position.x + this.radius > obs.minX &&
          this.position.x - this.radius < obs.maxX &&
          nextZ + this.radius > obs.minZ &&
          nextZ - this.radius < obs.maxZ
        ) {
          collidesZ = true;
          break;
        }
      }
      if (!collidesZ) {
        this.position.z = nextZ;
      } else {
        this.velocity.z = 0;
      }
    }

    // 5. Update Avatar Visual Mesh & Animation
    const speed = Math.hypot(this.velocity.x, this.velocity.z);
    if (this.avatar?.group) {
      this.avatar.group.position.copy(this.position);

      // Rotate avatar to face moving direction or camera
      if (speed > 0.08) {
        const moveAngle = Math.atan2(this.velocity.x, this.velocity.z);
        this.avatar.group.rotation.y = THREE.MathUtils.lerp(
          this.avatar.group.rotation.y,
          moveAngle,
          dt * 14
        );
      } else {
        // Face camera direction when stopped
        this.avatar.group.rotation.y = THREE.MathUtils.lerp(
          this.avatar.group.rotation.y,
          this.yaw - Math.PI,
          dt * 6
        );
      }

      this.avatar.update(speed, dt, elapsedTime);
      this.avatar.setVisible(this.viewMode === 'third_person');
    }

    // 6. Update Camera Viewport
    if (this.viewMode === 'third_person') {
      const camDistance = 2.45;
      const targetY = this.position.y + 1.25;

      const camX = this.position.x + Math.sin(this.yaw) * Math.cos(this.pitch) * camDistance;
      const camY = targetY + Math.sin(this.pitch) * camDistance + 0.35;
      const camZ = this.position.z + Math.cos(this.yaw) * Math.cos(this.pitch) * camDistance;

      this.camera.position.set(camX, Math.max(0.4, camY), camZ);
      this.camera.lookAt(this.position.x, targetY, this.position.z);
    } else {
      // First Person: Camera at player eye level (1.6m)
      const eyeY = this.position.y + this.playerHeight;
      this.camera.position.set(this.position.x, eyeY, this.position.z);

      const lookDist = 5.0;
      const lookX = this.position.x - Math.sin(this.yaw) * Math.cos(this.pitch) * lookDist;
      const lookY = eyeY - Math.sin(this.pitch) * lookDist;
      const lookZ = this.position.z - Math.cos(this.yaw) * Math.cos(this.pitch) * lookDist;

      this.camera.lookAt(lookX, lookY, lookZ);
    }

    // 7. Proximity & Center Reticle Check for Interactive Objects
    this.updateProximityAndReticle(zones, staff, toThreeCoords, workstations, avatarMeshes, workstationMeshes);
  }

  updateProximityAndReticle(zones, staff, toThreeCoords, workstations = [], avatarMeshes = [], workstationMeshes = []) {
    if (!toThreeCoords) return;

    let closest = null;
    let minDist = 2.8; // Interaction radius (meters)

    let bestReticleTarget = null;
    let bestReticleAngle = 0.55; // Angle cone in radians
    const camDir = new THREE.Vector3();
    this.camera.getWorldDirection(camDir);

    // 1. Check Staff Avatars
    if (Array.isArray(staff) && staff.length > 0) {
      for (const emp of staff) {
        let tx = 0;
        let tz = 0;
        let avatarMesh = null;

        // Try to get real-time position from avatar mesh
        const empId = getStaffId(emp);
        const avatar = avatarMeshes.find((a) => areSameStaff(a.userData?.employee, emp));
        if (avatar) {
          avatarMesh = avatar;
          const pos = new THREE.Vector3();
          avatar.getWorldPosition(pos);
          tx = pos.x;
          tz = pos.z;
        } else {
          const zone = zones.find((z) => z.id === (emp.zoneId || emp.zone?.id));
          if (zone) {
            const [zx, , zz] = toThreeCoords(zone.x, zone.y, zone.z, this.layout);
            tx = zx;
            tz = zz;
          } else {
            continue;
          }
        }

        const dist = Math.hypot(this.position.x - tx, this.position.z - tz);
        if (dist < minDist) {
          minDist = dist;
          closest = {
            id: empId,
            type: 'staff',
            item: emp,
            targetMesh: avatarMesh,
            position: new THREE.Vector3(tx, 0, tz),
            distance: dist,
            name: emp.fullName || emp.staffName || emp.name || 'Nhân viên trực',
          };
        }

        // Check Reticle alignment
        if (dist < 7.0) {
          const toTarget = new THREE.Vector3(tx - this.position.x, 0, tz - this.position.z).normalize();
          const angle = Math.acos(Math.max(-1, Math.min(1, camDir.x * toTarget.x + camDir.z * toTarget.z)));
          if (angle < bestReticleAngle) {
            bestReticleAngle = angle;
            bestReticleTarget = {
              id: empId,
              type: 'staff',
              item: emp,
              targetMesh: avatarMesh,
              position: new THREE.Vector3(tx, 0, tz),
              name: emp.fullName || emp.staffName || emp.name || 'Nhân viên trực',
            };
          }
        }
      }
    }

    // 2. Check Workstations
    if (Array.isArray(workstations) && workstations.length > 0) {
      for (const ws of workstations) {
        const [wx, , wz] = toThreeCoords(ws.x || 0, ws.y || 0, ws.z || 0, this.layout);
        const dist = Math.hypot(this.position.x - wx, this.position.z - wz);

        if (dist < minDist) {
          minDist = dist;
          const wsMesh = workstationMeshes.find((m) => m.userData?.workstation?.id === ws.id);
          closest = {
            id: ws.id,
            type: 'workstation',
            item: ws,
            targetMesh: wsMesh,
            position: new THREE.Vector3(wx, 0, wz),
            distance: dist,
            name: ws.name || ws.code || 'Trạm làm việc',
          };
        }

        if (dist < 7.0) {
          const toTarget = new THREE.Vector3(wx - this.position.x, 0, wz - this.position.z).normalize();
          const angle = Math.acos(Math.max(-1, Math.min(1, camDir.x * toTarget.x + camDir.z * toTarget.z)));
          if (angle < bestReticleAngle) {
            bestReticleAngle = angle;
            const wsMesh = workstationMeshes.find((m) => m.userData?.workstation?.id === ws.id);
            bestReticleTarget = {
              id: ws.id,
              type: 'workstation',
              item: ws,
              targetMesh: wsMesh,
              position: new THREE.Vector3(wx, 0, wz),
              name: ws.name || ws.code || 'Trạm làm việc',
            };
          }
        }
      }
    }

    // 3. Check Zones
    if (!closest && Array.isArray(zones)) {
      for (const z of zones) {
        const [tx, , tz] = toThreeCoords(z.x, z.y, z.z, this.layout);
        const dist = Math.hypot(this.position.x - tx, this.position.z - tz);
        if (dist < minDist) {
          minDist = dist;
          closest = {
            id: z.id,
            type: 'zone',
            item: z,
            position: new THREE.Vector3(tx, 0, tz),
            distance: dist,
            name: z.name,
          };
        }
      }
    }

    this.nearbyEntity = closest;
    this.reticleTarget = bestReticleTarget;
  }
}
