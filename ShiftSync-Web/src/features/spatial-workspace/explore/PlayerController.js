/**
 * PlayerController.js
 * First / Third-Person Exploration Controller for Mode 2 (3D Explore Mode).
 * 
 * Features:
 * - Keyboard WASD / Arrows movement + Shift Sprint + Space Hop
 * - Mouse look with Pointer Lock & Left-Drag fallback
 * - Vertical pitch clamping [-0.45, 0.65] rad
 * - AABB sliding collision detection against store perimeter & furniture
 * - Smooth camera following (3rd Person or 1st Person)
 * - Proximity detection to zones and employees
 */

import * as THREE from 'three';

export class PlayerController {
  constructor(domElement, camera, playerAvatar, layout = { length: 24, width: 16, height: 6 }) {
    this.domElement = domElement;
    this.camera = camera;
    this.avatar = playerAvatar;
    this.layout = layout;

    // Player State
    this.radius = 0.38;
    this.position = new THREE.Vector3(0, 0, (layout.width || 16) * 0.38); // Spawn near store entrance
    this.velocity = new THREE.Vector3();
    this.targetVelocity = new THREE.Vector3();

    this.yaw = 0; // Face inwards toward store center (-Z)
    this.pitch = 0.12;
    this.viewMode = 'third_person'; // 'third_person' or 'first_person'
    this.isPointerLocked = false;

    // Movement speeds
    this.walkSpeed = 3.8;
    this.sprintSpeed = 6.4;
    this.jumpSpeed = 3.6;
    this.gravity = -11.0;
    this.verticalVelocity = 0;
    this.isGrounded = true;

    // Input keys
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      sprint: false,
    };

    // Interaction callbacks
    this.onInteract = null;
    this.onToggleView = null;
    this.onExit = null;
    this.nearbyEntity = null;

    // Obstacle bounding boxes [ { minX, maxX, minZ, maxZ } ]
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
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('pointerlockchange', this._onPointerLockChange);

    this.domElement.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mouseup', this._onMouseUp);
  }

  detach() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('pointerlockchange', this._onPointerLockChange);

    this.domElement.removeEventListener('mousedown', this._onMouseDown);
    window.removeEventListener('mouseup', this._onMouseUp);

    if (document.pointerLockElement === this.domElement) {
      document.exitPointerLock();
    }
  }

  requestPointerLock() {
    if (this.domElement && this.domElement.requestPointerLock) {
      this.domElement.requestPointerLock();
    }
  }

  exitPointerLock() {
    if (document.pointerLockElement === this.domElement) {
      document.exitPointerLock();
    }
  }

  handlePointerLockChange() {
    this.isPointerLocked = document.pointerLockElement === this.domElement;
  }

  handleMouseDown(e) {
    if (e.button === 0) {
      this.isDragging = true;
      this.prevMouseX = e.clientX;
      this.prevMouseY = e.clientY;

      // Optional: Request pointer lock on click if user wants full immersive mode
      if (!this.isPointerLocked && !e.target.closest('button, input, select')) {
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

    // Clamp pitch to avoid neck inversion
    this.pitch = Math.max(-0.45, Math.min(0.68, this.pitch));
  }

  handleKeyDown(e) {
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
      case 'Space':
        if (this.isGrounded) {
          this.verticalVelocity = this.jumpSpeed;
          this.isGrounded = false;
        }
        e.preventDefault();
        break;
      case 'KeyE':
        if (this.nearbyEntity && this.onInteract) {
          this.onInteract(this.nearbyEntity);
        }
        break;
      case 'KeyV':
        this.viewMode = this.viewMode === 'third_person' ? 'first_person' : 'third_person';
        if (this.onToggleView) this.onToggleView(this.viewMode);
        break;
      case 'Escape':
        if (this.isPointerLocked) {
          this.exitPointerLock();
        } else if (this.onExit) {
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
      case 'ShiftLeft':
      case 'ShiftRight':
        this.keys.sprint = false;
        break;
      default:
        break;
    }
  }

  rebuildObstacles(layout, zones = [], toThreeCoords) {
    this.layout = layout;
    this.obstacles = [];

    const storeLen = Number(layout?.length) || 24.0;
    const storeWid = Number(layout?.width) || 16.0;

    // Store Outer Perimeter boundary limits
    this.bounds = {
      minX: -storeLen / 2 + this.radius + 0.35,
      maxX: storeLen / 2 - this.radius - 0.35,
      minZ: -storeWid / 2 + this.radius + 0.35,
      maxZ: storeWid / 2 - this.radius - 0.35,
    };

    // Add obstacles for zone furniture if provided
    if (zones.length > 0 && toThreeCoords) {
      const zoneSizeX = Math.min(4.4, storeLen * 0.22);
      const zoneSizeZ = Math.min(3.6, storeWid * 0.22);

      zones.forEach((z) => {
        const [tx, , tz] = toThreeCoords(z.x, z.y, z.z, layout);
        // Solid counter footprint in center of zone
        this.obstacles.push({
          minX: tx - zoneSizeX * 0.32,
          maxX: tx + zoneSizeX * 0.32,
          minZ: tz - zoneSizeZ * 0.30,
          maxZ: tz + zoneSizeZ * 0.30,
          name: z.name,
        });
      });
    }
  }

  teleportTo(x, z, yaw) {
    this.position.set(x, 0, z);
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
  }

  update(deltaTime, elapsedTime, zones = [], staff = [], toThreeCoords) {
    const dt = Math.min(deltaTime, 0.05);

    // 1. Calculate input movement direction relative to camera yaw
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

    // 2. Jump & Gravity
    if (!this.isGrounded) {
      this.verticalVelocity += this.gravity * dt;
      this.position.y += this.verticalVelocity * dt;
      if (this.position.y <= 0) {
        this.position.y = 0;
        this.verticalVelocity = 0;
        this.isGrounded = true;
      }
    }

    // 3. Collision Detection with sliding response
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

    // 4. Update Avatar Visual Mesh & Animation
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

    // 5. Update Camera
    if (this.viewMode === 'third_person') {
      const camDistance = 2.45;
      const targetY = this.position.y + 1.18;

      // Position camera back along yaw and pitch
      const camX = this.position.x + Math.sin(this.yaw) * Math.cos(this.pitch) * camDistance;
      const camY = targetY + Math.sin(this.pitch) * camDistance + 0.35;
      const camZ = this.position.z + Math.cos(this.yaw) * Math.cos(this.pitch) * camDistance;

      // Keep camera above floor
      this.camera.position.set(camX, Math.max(0.4, camY), camZ);
      this.camera.lookAt(this.position.x, targetY, this.position.z);
    } else {
      // First Person: Camera at player eye level
      const eyeY = this.position.y + 1.28;
      this.camera.position.set(this.position.x, eyeY, this.position.z);

      // Look direction vector
      const lookDist = 5.0;
      const lookX = this.position.x - Math.sin(this.yaw) * Math.cos(this.pitch) * lookDist;
      const lookY = eyeY - Math.sin(this.pitch) * lookDist;
      const lookZ = this.position.z - Math.cos(this.yaw) * Math.cos(this.pitch) * lookDist;

      this.camera.lookAt(lookX, lookY, lookZ);
    }

    // 6. Proximity Check for Interactive Objects
    this.updateProximity(zones, staff, toThreeCoords);
  }

  updateProximity(zones, staff, toThreeCoords) {
    if (!toThreeCoords || zones.length === 0) return;

    let closest = null;
    let minDist = 2.8; // Interaction radius (meters)

    // Check staff first
    for (const emp of staff) {
      const zone = zones.find((z) => z.id === (emp.zoneId || emp.zone?.id));
      if (zone) {
        const [tx, , tz] = toThreeCoords(zone.x, zone.y, zone.z, this.layout);
        // Note: employee has slight offset within zone, approximate by zone center + 0.4
        const dist = Math.hypot(this.position.x - tx, this.position.z - tz);
        if (dist < minDist) {
          minDist = dist;
          closest = {
            type: 'staff',
            item: emp,
            zone,
            distance: dist,
            name: emp.fullName || emp.name || 'Nhân viên trực',
          };
        }
      }
    }

    // Check zones
    if (!closest) {
      for (const z of zones) {
        const [tx, , tz] = toThreeCoords(z.x, z.y, z.z, this.layout);
        const dist = Math.hypot(this.position.x - tx, this.position.z - tz);
        if (dist < minDist) {
          minDist = dist;
          closest = {
            type: 'zone',
            item: z,
            zone: z,
            distance: dist,
            name: z.name,
          };
        }
      }
    }

    this.nearbyEntity = closest;
  }
}
