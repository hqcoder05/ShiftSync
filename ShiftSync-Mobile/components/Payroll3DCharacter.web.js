import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import * as THREE from 'three';

/**
 * Payroll3DCharacter.web.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Nhân vật 3D Low-Poly toàn thân đại diện tiền lương cho Mobile (Web runtime):
 * - Đầy đủ đầu, tóc tạo kiểu, mắt, mũi, miệng cười, tai, má hồng.
 * - Trang phục chỉnh tề: áo sơ mi xanh lá ShiftSync (#469833), cổ áo trắng,
 *   thắt lưng khoá vàng, quần âu xám than và giày sneakers trắng.
 * - Đồng xu vàng 3D cỡ lớn xoay lơ lửng trên tay có ký hiệu '$', kèm 3 đồng xu mini
 *   vệ tinh và sao lấp lánh (sparkles).
 * - Nhún nhảy (bobbing) nhịp nhàng, định kỳ vẫy tay chào (waving), chớp mắt tự nhiên.
 * - Khi rê chuột (Hover) hoặc chạm vào:
 *   + Phóng to mượt mà (Zoom in / Scale up).
 *   + Mắt cười híp tít, miệng mở cười tươi vui sướng.
 *   + Đồng xu xoay nhanh và tỏa sáng rực rỡ.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default function Payroll3DCharacter({
  width = 140,
  height = 140,
  interactive = true,
  style,
}) {
  const mountRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const mousePos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 0.35, 5.0);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'low-power',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window?.devicePixelRatio || 1, 2));

    const domElement = renderer.domElement;
    domElement.style.outline = 'none';
    domElement.style.userSelect = 'none';
    domElement.style.touchAction = 'none';
    container.appendChild(domElement);

    // 2. Lights
    const ambientLight = new THREE.AmbientLight(0xfff8ee, 0.95);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.3);
    mainLight.position.set(3, 5, 4);
    scene.add(mainLight);

    const rimLight = new THREE.DirectionalLight(0x51A33D, 0.6);
    rimLight.position.set(-3, 3, -2);
    scene.add(rimLight);

    const coinGoldLight = new THREE.PointLight(0xffd700, 1.2, 5);
    coinGoldLight.position.set(1.0, 0.8, 0.8);
    scene.add(coinGoldLight);

    // 3. Materials
    const skinMat = new THREE.MeshStandardMaterial({
      color: '#F5CBB0',
      roughness: 0.6,
      metalness: 0.05,
      flatShading: true,
    });
    const hairMat = new THREE.MeshStandardMaterial({
      color: '#2B231D',
      roughness: 0.7,
      flatShading: true,
    });
    const shirtMat = new THREE.MeshStandardMaterial({
      color: '#469833',
      roughness: 0.55,
      flatShading: true,
    });
    const shirtTrimMat = new THREE.MeshStandardMaterial({
      color: '#FFFFFF',
      roughness: 0.5,
      flatShading: true,
    });
    const pantsMat = new THREE.MeshStandardMaterial({
      color: '#2D3748',
      roughness: 0.7,
      flatShading: true,
    });
    const shoesMat = new THREE.MeshStandardMaterial({
      color: '#FFFFFF',
      roughness: 0.4,
      flatShading: true,
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: '#FFD214',
      metalness: 0.75,
      roughness: 0.22,
      flatShading: true,
    });
    const darkGoldMat = new THREE.MeshStandardMaterial({
      color: '#D49B00',
      metalness: 0.85,
      roughness: 0.25,
      flatShading: true,
    });
    const eyeMat = new THREE.MeshBasicMaterial({ color: '#1A202C' });
    const blushMat = new THREE.MeshBasicMaterial({ color: '#FFAAA6' });
    const mouthMat = new THREE.MeshBasicMaterial({ color: '#9B2C2C' });
    const sparkleMat = new THREE.MeshBasicMaterial({ color: '#FFF875' });

    // 4. Mesh Hierarchy
    const characterGroup = new THREE.Group();
    scene.add(characterGroup);

    // Soft Ground Shadow
    const shadowGeo = new THREE.CircleGeometry(1.0, 20);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: '#1E3A18',
      transparent: true,
      opacity: 0.15,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.set(0, -1.48, 0);
    scene.add(shadowMesh);

    // ── BODY & CLOTHING ──
    const bodyGroup = new THREE.Group();
    characterGroup.add(bodyGroup);

    // Thân áo sơ mi
    const torsoMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.46, 1.0, 8), shirtMat);
    torsoMesh.position.set(0, -0.2, 0);
    bodyGroup.add(torsoMesh);

    // Cổ áo trắng
    const collarLeft = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.13, 0.08), shirtTrimMat);
    collarLeft.position.set(-0.15, 0.32, 0.46);
    collarLeft.rotation.set(0, 0.2, -0.25);
    const collarRight = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.13, 0.08), shirtTrimMat);
    collarRight.position.set(0.15, 0.32, 0.46);
    collarRight.rotation.set(0, -0.2, 0.25);
    bodyGroup.add(collarLeft, collarRight);

    // Cúc áo
    for (let i = 0; i < 3; i++) {
      const button = new THREE.Mesh(new THREE.SphereGeometry(0.038, 5, 5), shirtTrimMat);
      button.position.set(0, 0.15 - i * 0.22, 0.5);
      bodyGroup.add(button);
    }

    // Thắt lưng & khoá vàng
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.1, 8), pantsMat);
    belt.position.set(0, -0.66, 0);
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.08), goldMat);
    buckle.position.set(0, -0.66, 0.46);
    bodyGroup.add(belt, buckle);

    // Chân & Giày
    const leftLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.14, 0.68, 7), pantsMat);
    leftLeg.position.set(-0.24, -1.02, 0);
    const rightLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.14, 0.68, 7), pantsMat);
    rightLeg.position.set(0.24, -1.02, 0);
    bodyGroup.add(leftLeg, rightLeg);

    const leftShoe = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.16, 0.44), shoesMat);
    leftShoe.position.set(-0.24, -1.38, 0.08);
    const rightShoe = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.16, 0.44), shoesMat);
    rightShoe.position.set(0.24, -1.38, 0.08);
    bodyGroup.add(leftShoe, rightShoe);

    // ── HEAD & FACE ──
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.68, 0);
    characterGroup.add(headGroup);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.21, 0.24, 7), skinMat);
    neck.position.set(0, -0.3, 0);
    headGroup.add(neck);

    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.7, 9, 8), skinMat);
    headGroup.add(headMesh);

    const leftEar = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.19, 0.11), skinMat);
    leftEar.position.set(-0.7, 0, 0);
    const rightEar = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.19, 0.11), skinMat);
    rightEar.position.set(0.7, 0, 0);
    headGroup.add(leftEar, rightEar);

    // Tóc Low-Poly
    const hairCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.73, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.58),
      hairMat
    );
    hairCap.position.set(0, 0.14, -0.04);
    hairCap.scale.set(1.03, 0.85, 1.05);
    headGroup.add(hairCap);

    const bang1 = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.42, 5), hairMat);
    bang1.position.set(-0.24, 0.53, 0.5);
    bang1.rotation.set(0.5, -0.2, -0.3);
    const bang2 = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.4, 5), hairMat);
    bang2.position.set(0.14, 0.55, 0.52);
    bang2.rotation.set(0.4, 0.15, 0.2);
    headGroup.add(bang1, bang2);

    // Mắt
    const leftEye = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, 0.05), eyeMat);
    leftEye.position.set(-0.23, 0.08, 0.66);
    const rightEye = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, 0.05), eyeMat);
    rightEye.position.set(0.23, 0.08, 0.66);
    headGroup.add(leftEye, rightEye);

    // Mí mắt chớp/nháy
    const leftLid = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.13, 0.06), skinMat);
    leftLid.position.set(-0.23, 0.08, 0.68);
    leftLid.scale.set(1, 0.01, 1);
    const rightLid = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.13, 0.06), skinMat);
    rightLid.position.set(0.23, 0.08, 0.68);
    rightLid.scale.set(1, 0.01, 1);
    headGroup.add(leftLid, rightLid);

    // Mắt cười híp khi hover/chạm
    const smileEyeGeo = new THREE.TorusGeometry(0.075, 0.024, 4, 8, Math.PI);
    const leftSmileEye = new THREE.Mesh(smileEyeGeo, eyeMat);
    leftSmileEye.position.set(-0.23, 0.08, 0.68);
    leftSmileEye.rotation.z = Math.PI;
    leftSmileEye.visible = false;
    const rightSmileEye = new THREE.Mesh(smileEyeGeo, eyeMat);
    rightSmileEye.position.set(0.23, 0.08, 0.68);
    rightSmileEye.rotation.z = Math.PI;
    rightSmileEye.visible = false;
    headGroup.add(leftSmileEye, rightSmileEye);

    // Lông mày & Mũi & Má hồng & Miệng
    const leftBrow = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.05), hairMat);
    leftBrow.position.set(-0.23, 0.21, 0.65);
    const rightBrow = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.05), hairMat);
    rightBrow.position.set(0.23, 0.21, 0.65);
    headGroup.add(leftBrow, rightBrow);

    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.07, 0.09), skinMat);
    nose.position.set(0, -0.04, 0.71);
    headGroup.add(nose);

    const leftBlush = new THREE.Mesh(new THREE.SphereGeometry(0.085, 6, 6), blushMat);
    leftBlush.position.set(-0.36, -0.08, 0.58);
    leftBlush.scale.set(1.2, 0.7, 0.4);
    const rightBlush = new THREE.Mesh(new THREE.SphereGeometry(0.085, 6, 6), blushMat);
    rightBlush.position.set(0.36, -0.08, 0.58);
    rightBlush.scale.set(1.2, 0.7, 0.4);
    headGroup.add(leftBlush, rightBlush);

    const mouthSmile = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.028, 4, 8, Math.PI), mouthMat);
    mouthSmile.position.set(0, -0.21, 0.66);
    mouthSmile.rotation.z = Math.PI;
    const mouthOpen = new THREE.Mesh(new THREE.SphereGeometry(0.085, 7, 5), mouthMat);
    mouthOpen.position.set(0, -0.23, 0.66);
    mouthOpen.scale.set(1.3, 0.9, 0.3);
    mouthOpen.visible = false;
    headGroup.add(mouthSmile, mouthOpen);

    // ── ARMS & HANDS ──
    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-0.6, 0.25, 0);
    const leftArmMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.72, 7), shirtMat);
    leftArmMesh.position.set(0, -0.3, 0);
    leftArmMesh.rotation.z = 0.15;
    const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.13, 6, 6), skinMat);
    leftHand.position.set(-0.06, -0.68, 0);
    leftArmGroup.add(leftArmMesh, leftHand);
    characterGroup.add(leftArmGroup);

    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(0.6, 0.25, 0);
    characterGroup.add(rightArmGroup);

    const rightUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.12, 0.42, 7), shirtMat);
    rightUpperArm.position.set(0.12, -0.15, 0.14);
    rightUpperArm.rotation.set(-0.4, 0, -0.3);
    rightArmGroup.add(rightUpperArm);

    const rightForearmGroup = new THREE.Group();
    rightForearmGroup.position.set(0.22, -0.32, 0.28);
    rightArmGroup.add(rightForearmGroup);

    const rightForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.42, 7), shirtMat);
    rightForearm.position.set(0.14, 0.15, 0.2);
    rightForearm.rotation.set(-0.85, 0.2, -0.25);
    const rightHand = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 6), skinMat);
    rightHand.position.set(0.26, 0.33, 0.38);
    rightForearmGroup.add(rightForearm, rightHand);

    // ── GIANT GOLD COIN (ĐỒNG XU VÀNG KÝ HIỆU $) ──
    const mainCoinGroup = new THREE.Group();
    mainCoinGroup.position.set(0.9, 0.46, 0.55);
    scene.add(mainCoinGroup);

    const coinCylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.13, 18), goldMat);
    coinCylinder.rotation.x = Math.PI / 2;
    mainCoinGroup.add(coinCylinder);

    const coinRim = new THREE.Mesh(new THREE.TorusGeometry(0.54, 0.045, 5, 20), darkGoldMat);
    coinRim.position.set(0, 0, 0.075);
    const coinRimBack = coinRim.clone();
    coinRimBack.position.set(0, 0, -0.075);
    mainCoinGroup.add(coinRim, coinRimBack);

    // Ký hiệu '$'
    const dollarSignGroup = new THREE.Group();
    dollarSignGroup.position.set(0, 0, 0.075);
    mainCoinGroup.add(dollarSignGroup);

    const dollarBar = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.62, 0.055), darkGoldMat);
    dollarSignGroup.add(dollarBar);
    const dollarArcTop = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.04, 4, 10, Math.PI * 1.3), darkGoldMat);
    dollarArcTop.position.set(-0.02, 0.14, 0.01);
    dollarArcTop.rotation.z = -Math.PI * 0.4;
    const dollarArcBot = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.04, 4, 10, Math.PI * 1.3), darkGoldMat);
    dollarArcBot.position.set(0.02, -0.14, 0.01);
    dollarArcBot.rotation.z = Math.PI * 0.6;
    dollarSignGroup.add(dollarArcTop, dollarArcBot);

    const dollarSignBack = dollarSignGroup.clone();
    dollarSignBack.position.set(0, 0, -0.075);
    dollarSignBack.rotation.y = Math.PI;
    mainCoinGroup.add(dollarSignBack);

    // ── 3 ĐỒNG XU MINI VỆ TINH & 4 SPARKLES ──
    const miniCoins = [];
    const miniConfigs = [
      { radius: 1.35, speed: 1.2, yOffset: 0.1, rotSpeed: 2.0 },
      { radius: 1.2, speed: -0.9, yOffset: 0.8, rotSpeed: -1.6 },
      { radius: 1.1, speed: 1.6, yOffset: -0.4, rotSpeed: 2.4 },
    ];
    miniConfigs.forEach((cfg) => {
      const mini = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.045, 10), goldMat);
      mini.rotation.x = Math.PI / 3;
      scene.add(mini);
      miniCoins.push({ mesh: mini, ...cfg });
    });

    const sparkles = [];
    for (let i = 0; i < 4; i++) {
      const sp = new THREE.Mesh(new THREE.OctahedronGeometry(0.07, 0), sparkleMat);
      sp.position.set(
        (Math.random() - 0.3) * 2.2,
        (Math.random() - 0.2) * 2.0,
        0.5 + Math.random() * 0.5
      );
      sp.scale.set(1, 1.8, 1);
      scene.add(sp);
      sparkles.push({
        mesh: sp,
        phase: Math.random() * Math.PI * 2,
        speed: 2 + Math.random() * 2,
      });
    }

    // 5. Animation Loop
    let clock = new THREE.Clock();
    let animId;
    let waveTimer = 0;
    let blinkTimer = 0;
    let isWinking = false;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Bobbing
      const bobFreq = isHovered ? 4.5 : 2.5;
      const bobAmp = isHovered ? 0.07 : 0.04;
      const bob = Math.sin(time * bobFreq) * bobAmp;
      characterGroup.position.y = bob;
      shadowMesh.scale.setScalar(1 - bob * 1.5);

      // Waving
      waveTimer += delta;
      const isWaving = (waveTimer % 7) > 4.5 || isHovered;
      if (isWaving) {
        const waveAngle = Math.sin(time * 12) * 0.35;
        rightArmGroup.rotation.z = THREE.MathUtils.lerp(rightArmGroup.rotation.z, 0.45 + waveAngle * 0.3, 0.15);
        rightArmGroup.rotation.x = THREE.MathUtils.lerp(rightArmGroup.rotation.x, -0.65, 0.15);
        rightForearmGroup.rotation.z = THREE.MathUtils.lerp(rightForearmGroup.rotation.z, 0.8 + waveAngle, 0.2);
      } else {
        rightArmGroup.rotation.z = THREE.MathUtils.lerp(rightArmGroup.rotation.z, 0, 0.1);
        rightArmGroup.rotation.x = THREE.MathUtils.lerp(rightArmGroup.rotation.x, 0, 0.1);
        rightForearmGroup.rotation.z = THREE.MathUtils.lerp(rightForearmGroup.rotation.z, 0, 0.1);
      }

      // Coin spin & levitation
      const coinSpinSpeed = isHovered ? 3.5 : 1.4;
      mainCoinGroup.rotation.y += delta * coinSpinSpeed;
      mainCoinGroup.position.y = 0.5 + Math.sin(time * 3) * 0.06 + (isHovered ? 0.12 : 0);
      mainCoinGroup.position.x = 0.92 + Math.cos(time * 2) * 0.03;
      mainCoinGroup.scale.setScalar(isHovered ? 1.12 : 1.0);

      coinGoldLight.intensity = 1.1 + Math.sin(time * 6) * 0.35;

      miniCoins.forEach((c) => {
        const angle = time * c.speed;
        c.mesh.position.x = 0.9 + Math.cos(angle) * c.radius * 0.55;
        c.mesh.position.z = 0.55 + Math.sin(angle) * c.radius * 0.45;
        c.mesh.position.y = c.yOffset + Math.sin(time * 3 + c.radius) * 0.08;
        c.mesh.rotation.y += delta * c.rotSpeed;
      });

      sparkles.forEach((s) => {
        const pulse = Math.sin(time * s.speed + s.phase);
        s.mesh.scale.set(
          (0.8 + pulse * 0.4) * (isHovered ? 1.3 : 1),
          (1.4 + pulse * 0.6) * (isHovered ? 1.3 : 1),
          (0.8 + pulse * 0.4) * (isHovered ? 1.3 : 1)
        );
        s.mesh.rotation.z += delta * 1.5;
      });

      // Facial Expressions
      blinkTimer += delta;
      const isBlinking = (blinkTimer % 3.8) < 0.15;
      if (blinkTimer > 8) {
        blinkTimer = 0;
        isWinking = Math.random() > 0.4;
      }

      if (isHovered) {
        leftEye.visible = false;
        rightEye.visible = false;
        leftSmileEye.visible = true;
        rightSmileEye.visible = true;
        leftLid.scale.y = 0.01;
        rightLid.scale.y = 0.01;
        mouthSmile.visible = false;
        mouthOpen.visible = true;
        leftBrow.position.y = 0.25;
        rightBrow.position.y = 0.25;
      } else {
        leftSmileEye.visible = false;
        rightSmileEye.visible = false;
        leftEye.visible = true;
        rightEye.visible = true;
        mouthSmile.visible = true;
        mouthOpen.visible = false;
        leftBrow.position.y = 0.21;
        rightBrow.position.y = 0.21;

        if (isBlinking) {
          leftLid.scale.y = 1;
          rightLid.scale.y = isWinking ? 0.01 : 1;
        } else {
          leftLid.scale.y = 0.01;
          rightLid.scale.y = 0.01;
        }
      }

      // Look at
      const targetRotY = isHovered ? mousePos.current.x * 0.45 : Math.sin(time * 0.8) * 0.07;
      const targetRotX = isHovered ? -mousePos.current.y * 0.3 : Math.cos(time * 0.7) * 0.04;
      headGroup.rotation.y = THREE.MathUtils.lerp(headGroup.rotation.y, targetRotY, 0.08);
      headGroup.rotation.x = THREE.MathUtils.lerp(headGroup.rotation.x, targetRotX, 0.08);

      renderer.render(scene, camera);
    };

    animate();

    // 6. Pointer Events
    const handleMouseMove = (e) => {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mousePos.current = { x, y };
    };

    const handleMouseEnter = () => setIsHovered(true);
    const handleMouseLeave = () => {
      setIsHovered(false);
      mousePos.current = { x: 0, y: 0 };
    };

    if (interactive && Platform.OS === 'web') {
      container.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('mouseenter', handleMouseEnter);
      container.addEventListener('mouseleave', handleMouseLeave);
      container.addEventListener('touchstart', handleMouseEnter, { passive: true });
      container.addEventListener('touchend', () => setTimeout(handleMouseLeave, 1200), { passive: true });
    }

    return () => {
      cancelAnimationFrame(animId);
      if (interactive && Platform.OS === 'web') {
        container.removeEventListener('mousemove', handleMouseMove);
        container.removeEventListener('mouseenter', handleMouseEnter);
        container.removeEventListener('mouseleave', handleMouseLeave);
        container.removeEventListener('touchstart', handleMouseEnter);
        container.removeEventListener('touchend', handleMouseLeave);
      }
      scene.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
          else child.material.dispose();
        }
      });
      renderer.dispose();
      if (container.contains(domElement)) {
        container.removeChild(domElement);
      }
    };
  }, [width, height, interactive, isHovered]);

  return (
    <View
      ref={mountRef}
      style={[
        styles.container,
        {
          width,
          height,
          transform: [{ scale: isHovered ? 1.08 : 1.0 }],
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
});
