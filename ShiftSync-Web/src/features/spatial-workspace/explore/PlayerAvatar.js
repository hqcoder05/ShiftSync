/**
 * PlayerAvatar.js
 * Stylized low-poly Manager / Visitor 3D Avatar for Mode 2 Exploration.
 * 
 * Fits the Play Together aesthetic:
 * - Stylized proportions (rounded geometric body, cute proportions)
 * - Navy blazer, lanyard badge, manager tablet
 * - Dynamic walking leg stride & arm swing animations
 * - Idle breathing & subtle head tilt
 */

import * as THREE from 'three';

export function createPlayerAvatar() {
  const root = new THREE.Group();
  root.name = 'playerAvatarRoot';

  // Materials
  const skinMat = new THREE.MeshLambertMaterial({ color: 0xFFE4D6 });
  const blazerMat = new THREE.MeshLambertMaterial({ color: 0x1E3A8A }); // Royal navy blazer
  const shirtMat = new THREE.MeshLambertMaterial({ color: 0xFFFFFF }); // White shirt
  const pantsMat = new THREE.MeshLambertMaterial({ color: 0x334155 }); // Slate trousers
  const shoesMat = new THREE.MeshLambertMaterial({ color: 0x0F172A }); // Dark oxfords
  const hairMat = new THREE.MeshLambertMaterial({ color: 0x271912 }); // Espresso brown hair
  const eyesMat = new THREE.MeshBasicMaterial({ color: 0x0F172A });
  const blushMat = new THREE.MeshBasicMaterial({ color: 0xFB7185, transparent: true, opacity: 0.5 });
  const badgeMat = new THREE.MeshLambertMaterial({ color: 0xF8FAFC });
  const lanyardMat = new THREE.MeshBasicMaterial({ color: 0x3B82F6 });
  const tabletMat = new THREE.MeshLambertMaterial({ color: 0x1E293B });
  const screenMat = new THREE.MeshBasicMaterial({ color: 0x38BDF8 });

  // Body container (moves vertically with bobbing/breathing)
  const bodyGroup = new THREE.Group();
  bodyGroup.name = 'bodyGroup';
  root.add(bodyGroup);

  // 1. Torso
  const torsoGeo = new THREE.BoxGeometry(0.40, 0.50, 0.26);
  const torsoMesh = new THREE.Mesh(torsoGeo, blazerMat);
  torsoMesh.position.y = 0.72;
  torsoMesh.castShadow = true;
  bodyGroup.add(torsoMesh);

  // Shirt Collar V-neck insert
  const collarGeo = new THREE.BufferGeometry();
  const vPos = new Float32Array([
    -0.08, 0.95, 0.132,
     0.08, 0.95, 0.132,
     0.00, 0.76, 0.132,
  ]);
  collarGeo.setAttribute('position', new THREE.BufferAttribute(vPos, 3));
  collarGeo.computeVertexNormals();
  const collarMesh = new THREE.Mesh(collarGeo, shirtMat);
  bodyGroup.add(collarMesh);

  // Lanyard Ribbon around neck
  const ribbonGeo = new THREE.BoxGeometry(0.18, 0.22, 0.01);
  const ribbonMesh = new THREE.Mesh(ribbonGeo, lanyardMat);
  ribbonMesh.position.set(0, 0.78, 0.134);
  bodyGroup.add(ribbonMesh);

  // ID Badge Card
  const badgeGeo = new THREE.BoxGeometry(0.09, 0.12, 0.015);
  const badgeMesh = new THREE.Mesh(badgeGeo, badgeMat);
  badgeMesh.position.set(0, 0.65, 0.138);
  bodyGroup.add(badgeMesh);

  // 2. Head Group
  const headGroup = new THREE.Group();
  headGroup.position.y = 1.14;
  bodyGroup.add(headGroup);

  // Head Box
  const headGeo = new THREE.BoxGeometry(0.34, 0.34, 0.32);
  const headMesh = new THREE.Mesh(headGeo, skinMat);
  headMesh.castShadow = true;
  headGroup.add(headMesh);

  // Hair Cap (stylized side-parted hair)
  const hairGeo = new THREE.BoxGeometry(0.36, 0.16, 0.34);
  const hairMesh = new THREE.Mesh(hairGeo, hairMat);
  hairMesh.position.set(0, 0.12, -0.01);
  hairMesh.castShadow = true;
  headGroup.add(hairMesh);

  // Hair Bangs front
  const bangsGeo = new THREE.BoxGeometry(0.32, 0.08, 0.06);
  const bangsMesh = new THREE.Mesh(bangsGeo, hairMat);
  bangsMesh.position.set(0.02, 0.07, 0.16);
  headGroup.add(bangsMesh);

  // Cute Button Eyes
  const eyeGeo = new THREE.SphereGeometry(0.026, 8, 8);
  const leftEye = new THREE.Mesh(eyeGeo, eyesMat);
  leftEye.position.set(-0.085, 0.01, 0.162);
  headGroup.add(leftEye);

  const rightEye = new THREE.Mesh(eyeGeo, eyesMat);
  rightEye.position.set(0.085, 0.01, 0.162);
  headGroup.add(rightEye);

  // Blush Cheeks
  const blushGeo = new THREE.PlaneGeometry(0.05, 0.025);
  const leftBlush = new THREE.Mesh(blushGeo, blushMat);
  leftBlush.position.set(-0.11, -0.055, 0.162);
  headGroup.add(leftBlush);

  const rightBlush = new THREE.Mesh(blushGeo, blushMat);
  rightBlush.position.set(0.11, -0.055, 0.162);
  headGroup.add(rightBlush);

  // 3. Arms & Hands
  // Left Arm (holds manager tablet)
  const leftArmGroup = new THREE.Group();
  leftArmGroup.position.set(-0.25, 0.90, 0);
  bodyGroup.add(leftArmGroup);

  const armGeo = new THREE.BoxGeometry(0.10, 0.36, 0.11);
  const leftArmMesh = new THREE.Mesh(armGeo, blazerMat);
  leftArmMesh.position.y = -0.16;
  leftArmMesh.castShadow = true;
  leftArmGroup.add(leftArmMesh);

  const handGeo = new THREE.SphereGeometry(0.045, 8, 8);
  const leftHandMesh = new THREE.Mesh(handGeo, skinMat);
  leftHandMesh.position.y = -0.34;
  leftArmGroup.add(leftHandMesh);

  // Manager Tablet held in left hand
  const tabletGroup = new THREE.Group();
  tabletGroup.position.set(0.04, -0.30, 0.12);
  tabletGroup.rotation.x = -Math.PI / 3;
  tabletGroup.rotation.y = 0.2;

  const tabletBody = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.015), tabletMat);
  tabletGroup.add(tabletBody);
  const tabletScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.21), screenMat);
  tabletScreen.position.z = 0.009;
  tabletGroup.add(tabletScreen);
  leftArmGroup.add(tabletGroup);

  // Right Arm (swings naturally)
  const rightArmGroup = new THREE.Group();
  rightArmGroup.position.set(0.25, 0.90, 0);
  bodyGroup.add(rightArmGroup);

  const rightArmMesh = new THREE.Mesh(armGeo, blazerMat);
  rightArmMesh.position.y = -0.16;
  rightArmMesh.castShadow = true;
  rightArmGroup.add(rightArmMesh);

  const rightHandMesh = new THREE.Mesh(handGeo, skinMat);
  rightHandMesh.position.y = -0.34;
  rightArmGroup.add(rightHandMesh);

  // 4. Legs & Shoes
  const legGeo = new THREE.BoxGeometry(0.12, 0.40, 0.13);
  const shoeGeo = new THREE.BoxGeometry(0.125, 0.08, 0.17);

  // Left Leg Pivot (at hip)
  const leftLegGroup = new THREE.Group();
  leftLegGroup.position.set(-0.11, 0.46, 0);
  root.add(leftLegGroup);

  const leftLegMesh = new THREE.Mesh(legGeo, pantsMat);
  leftLegMesh.position.y = -0.19;
  leftLegMesh.castShadow = true;
  leftLegGroup.add(leftLegMesh);

  const leftShoeMesh = new THREE.Mesh(shoeGeo, shoesMat);
  leftShoeMesh.position.set(0, -0.40, 0.02);
  leftShoeMesh.castShadow = true;
  leftLegGroup.add(leftShoeMesh);

  // Right Leg Pivot (at hip)
  const rightLegGroup = new THREE.Group();
  rightLegGroup.position.set(0.11, 0.46, 0);
  root.add(rightLegGroup);

  const rightLegMesh = new THREE.Mesh(legGeo, pantsMat);
  rightLegMesh.position.y = -0.19;
  rightLegMesh.castShadow = true;
  rightLegGroup.add(rightLegMesh);

  const rightShoeMesh = new THREE.Mesh(shoeGeo, shoesMat);
  rightShoeMesh.position.set(0, -0.40, 0.02);
  rightShoeMesh.castShadow = true;
  rightLegGroup.add(rightShoeMesh);

  // 5. Soft Circular Floor Shadow Decal
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 64;
  shadowCanvas.height = 64;
  const ctx = shadowCanvas.getContext('2d');
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

  // Animation controller state
  let walkPhase = 0;

  return {
    group: root,
    update: (speed, deltaTime, elapsedTime) => {
      if (speed > 0.04) {
        // Walking or Sprinting
        const strideSpeed = Math.min(speed * 9.0, 16.0);
        walkPhase += deltaTime * strideSpeed;

        const legAngle = Math.sin(walkPhase) * 0.65;
        leftLegGroup.rotation.x = legAngle;
        rightLegGroup.rotation.x = -legAngle;

        // Right arm swings naturally, left arm swings gently while holding tablet
        rightArmGroup.rotation.x = -legAngle * 0.75;
        leftArmGroup.rotation.x = (legAngle * 0.35) - 0.2;

        // Bobbing & head sway
        bodyGroup.position.y = Math.abs(Math.sin(walkPhase * 2)) * 0.04;
        headGroup.rotation.z = Math.sin(walkPhase) * 0.035;
        headGroup.rotation.y = Math.cos(walkPhase) * 0.02;
      } else {
        // Idle
        // Smoothly return limbs to resting posture
        leftLegGroup.rotation.x = THREE.MathUtils.lerp(leftLegGroup.rotation.x, 0, deltaTime * 8);
        rightLegGroup.rotation.x = THREE.MathUtils.lerp(rightLegGroup.rotation.x, 0, deltaTime * 8);
        rightArmGroup.rotation.x = THREE.MathUtils.lerp(rightArmGroup.rotation.x, 0, deltaTime * 8);
        leftArmGroup.rotation.x = THREE.MathUtils.lerp(leftArmGroup.rotation.x, -0.15, deltaTime * 8);

        // Breathing cycle
        bodyGroup.position.y = Math.sin(elapsedTime * 2.4) * 0.015;
        headGroup.rotation.z = Math.sin(elapsedTime * 1.2) * 0.01;
        headGroup.rotation.y = 0;
      }
    },
    setVisible: (visible) => {
      root.visible = visible;
    },
  };
}
