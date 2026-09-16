/**
 * CameraController.js
 * Manages cinematic camera transitions, orbit framing, and real-time
 * Follow Employee camera tracking for the Digital Twin.
 */

import * as THREE from 'three';

export class CameraController {
  constructor(camera, controls) {
    this.camera = camera;
    this.controls = controls;

    this.targetPos = new THREE.Vector3().copy(camera.position);
    this.targetLookAt = new THREE.Vector3().copy(controls.target);
    this.isTransitioning = false;
    this.lerpSpeed = 0.055;

    // Follow Object state
    this.followingObject = null;
    this.followOffset = new THREE.Vector3(0, 2.6, 3.4);
    this.isFollowing = false;
  }

  /**
   * Smoothly lerps camera to a target position and lookAt vector
   */
  flyTo(pos, lookAt, speed = 0.06) {
    this.stopFollowing();

    if (Array.isArray(pos)) this.targetPos.set(...pos);
    else this.targetPos.copy(pos);

    if (Array.isArray(lookAt)) this.targetLookAt.set(...lookAt);
    else this.targetLookAt.copy(lookAt);

    this.lerpSpeed = speed;
    this.isTransitioning = true;
  }

  /**
   * Engages real-time follow camera tracking a moving employee avatar
   */
  followObject(object3D, offset = null) {
    if (!object3D) return;
    this.followingObject = object3D;
    if (offset) this.followOffset.copy(offset);
    this.isFollowing = true;
    this.isTransitioning = false;
  }

  /**
   * Disengages follow mode
   */
  stopFollowing() {
    this.followingObject = null;
    this.isFollowing = false;
  }

  /**
   * Called in requestAnimationFrame loop
   */
  update() {
    if (this.isFollowing && this.followingObject) {
      const objPos = this.followingObject.position;
      
      // Calculate target lookAt (chest level)
      const lookTarget = new THREE.Vector3(objPos.x, objPos.y + 1.1, objPos.z);
      
      // Desired camera position behind the employee
      const camTarget = new THREE.Vector3(
        objPos.x + this.followOffset.x,
        objPos.y + this.followOffset.y,
        objPos.z + this.followOffset.z
      );

      this.camera.position.lerp(camTarget, 0.08);
      this.controls.target.lerp(lookTarget, 0.08);
      this.controls.update();
      return;
    }

    if (this.isTransitioning) {
      this.camera.position.lerp(this.targetPos, this.lerpSpeed);
      this.controls.target.lerp(this.targetLookAt, this.lerpSpeed);

      const posDist = this.camera.position.distanceTo(this.targetPos);
      const targetDist = this.controls.target.distanceTo(this.targetLookAt);

      if (posDist < 0.05 && targetDist < 0.05) {
        this.camera.position.copy(this.targetPos);
        this.controls.target.copy(this.targetLookAt);
        this.isTransitioning = false;
      }
    }

    this.controls.update();
  }
}
