/**
 * PlayerAvatar.js
 * Crew V2 manager / visitor for exploration.
 * GLB and matching cached fallback use the same articulated joint hierarchy.
 */

import * as THREE from 'three';
import { instantiateCharacterModel } from '../scene/character/CharacterAssetLoader.js';

export function createPlayerAvatar() {
  const root = new THREE.Group();
  root.name = 'playerAvatarRoot';

  const inst = instantiateCharacterModel('manager');
  root.add(inst.modelRoot);
  const joints = inst.joints;
  // Soft Circular Floor Shadow Decal
  if (typeof document !== 'undefined') {
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 64;
    shadowCanvas.height = 64;
    const ctx = shadowCanvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(32, 32, 4, 32, 32, 30);
      grad.addColorStop(0, 'rgba(15, 23, 42, 0.45)');
      grad.addColorStop(0.7, 'rgba(15, 23, 42, 0.15)');
      grad.addColorStop(1, 'rgba(15, 23, 42, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);
      const shadowTexture = new THREE.CanvasTexture(shadowCanvas);

      const shadowGeo = new THREE.PlaneGeometry(0.7, 0.7);
      const shadowMat = new THREE.MeshBasicMaterial({
        map: shadowTexture,
        transparent: true,
        depthWrite: false,
      });
      const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
      shadowMesh.rotation.x = -Math.PI / 2;
      shadowMesh.position.y = 0.015;
      root.add(shadowMesh);
    }
  }

  // Animation controller state
  let walkPhase = 0;

  return {
    group: root,
    update: (speed, deltaTime, elapsedTime) => {
      if (joints) {
        // Articulated joint animation (shared by GLB and fallback).
        if (speed > 0.04) {
          const strideSpeed = Math.min(speed * 9.0, 16.0);
          walkPhase += deltaTime * strideSpeed;
          const legAngle = Math.sin(walkPhase) * 0.65;

          if (joints.leftHip) joints.leftHip.rotation.x = legAngle;
          if (joints.rightHip) joints.rightHip.rotation.x = -legAngle;
          if (joints.rightShoulder) joints.rightShoulder.rotation.x = -legAngle * 0.55;
          if (joints.leftShoulder) joints.leftShoulder.rotation.x = (legAngle * 0.35) - 0.2;
          if(joints.leftKnee)joints.leftKnee.rotation.x=Math.max(0,-Math.sin(walkPhase))*.48;
          if(joints.rightKnee)joints.rightKnee.rotation.x=Math.max(0,Math.sin(walkPhase))*.48;
          if (joints.hips) joints.hips.position.y = 0.76 + Math.abs(Math.sin(walkPhase * 2)) * 0.04;
          if (joints.head) {
            joints.head.rotation.z = Math.sin(walkPhase) * 0.035;
            joints.head.rotation.y = Math.cos(walkPhase) * 0.02;
          }
        } else {
          // Idle
          if(joints.leftKnee)joints.leftKnee.rotation.x=0;
          if(joints.rightKnee)joints.rightKnee.rotation.x=0;
          if (joints.leftHip) joints.leftHip.rotation.x = THREE.MathUtils.lerp(joints.leftHip.rotation.x, 0, deltaTime * 8);
          if (joints.rightHip) joints.rightHip.rotation.x = THREE.MathUtils.lerp(joints.rightHip.rotation.x, 0, deltaTime * 8);
          if (joints.rightShoulder) joints.rightShoulder.rotation.x = THREE.MathUtils.lerp(joints.rightShoulder.rotation.x, 0, deltaTime * 8);
          if (joints.leftShoulder) joints.leftShoulder.rotation.x = THREE.MathUtils.lerp(joints.leftShoulder.rotation.x, -0.2, deltaTime * 8);
          if (joints.hips) joints.hips.position.y = 0.76;
          if (joints.spine) joints.spine.position.y = 0.08 + Math.sin(elapsedTime * 2.4) * 0.01;
          if (joints.head) {
            joints.head.rotation.z = Math.sin(elapsedTime * 1.2) * 0.01;
            joints.head.rotation.y = 0;
          }
        }
      }
    },
    setVisible: (visible) => {
      root.visible = visible;
    },
  };
}
