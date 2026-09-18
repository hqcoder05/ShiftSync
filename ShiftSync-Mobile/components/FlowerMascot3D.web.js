import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import * as THREE from 'three';

/**
 * FlowerMascot3D.web.js — 2 Bé Mascot 3D Popmart, mỗi bé 1 canvas riêng biệt
 * Dùng flex row để 2 bé luôn tách nhau hoàn toàn, không bao giờ dính nhau.
 */
export default function FlowerMascot3D({
  width = 180,
  height = 160,
  interactive = true,
  style,
}) {
  const charW = Math.floor((width - 12) / 2); // mỗi bé chiếm 1 nửa
  const charH = height;

  return (
    <View style={[styles.row, { width, height }, style]}>
      <OctoMascotCanvas width={charW} height={charH} interactive={interactive} />
      <DuckMascotCanvas width={charW} height={charH} interactive={interactive} />
    </View>
  );
}

// ─── SHARED MATERIALS FACTORY ────────────────────────────────────────────────
function makeMaterials() {
  const yellowMat = new THREE.MeshStandardMaterial({ color: '#FFD426', roughness: 0.28, metalness: 0.05 });
  const creamFaceMat = new THREE.MeshStandardMaterial({ color: '#FFFBEB', roughness: 0.35, metalness: 0.02 });
  const whitePorcelainMat = new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.22, metalness: 0.02 });
  const orangeBeakMat = new THREE.MeshStandardMaterial({ color: '#FB923C', roughness: 0.18, metalness: 0.1 });
  const orangeFeetMat = new THREE.MeshStandardMaterial({ color: '#F97316', roughness: 0.3, metalness: 0.05 });
  const redNoseMat = new THREE.MeshStandardMaterial({ color: '#EF4444', roughness: 0.2, metalness: 0.12 });
  const eyeBlackMat = new THREE.MeshStandardMaterial({ color: '#18181B', roughness: 0.15, metalness: 0.1 });
  const eyeGlossMat = new THREE.MeshBasicMaterial({ color: '#FFFFFF' });
  const blushPinkMat = new THREE.MeshStandardMaterial({ color: '#FB7185', roughness: 0.45, metalness: 0.0 });
  const blushLavenderMat = new THREE.MeshStandardMaterial({ color: '#F472B6', roughness: 0.45, metalness: 0.0 });
  const octopusMat = new THREE.MeshStandardMaterial({ color: '#FB7185', roughness: 0.28, metalness: 0.06 });
  const darkMouthMat = new THREE.MeshStandardMaterial({ color: '#991B1B', roughness: 0.3, metalness: 0.05 });
  return {
    yellowMat, creamFaceMat, whitePorcelainMat, orangeBeakMat, orangeFeetMat,
    redNoseMat, eyeBlackMat, eyeGlossMat, blushPinkMat, blushLavenderMat,
    octopusMat, darkMouthMat,
  };
}

function setupLights(scene) {
  scene.add(new THREE.AmbientLight(0xfffdf5, 1.45));
  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(3, 5, 4);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xfef08a, 0.85);
  fill.position.set(-3, 3, 2);
  scene.add(fill);
  const rim1 = new THREE.DirectionalLight(0xf43f5e, 0.5);
  rim1.position.set(2, 4, -3);
  scene.add(rim1);
  const rim2 = new THREE.DirectionalLight(0x38bdf8, 0.4);
  rim2.position.set(-2, 2, -2);
  scene.add(rim2);
}

// ─── BÉ TRÒN VÀNG ĐỘI BẠCH TUỘC HỒNG ───────────────────────────────────────
function OctoMascotCanvas({ width, height, interactive }) {
  const mountRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const isDragging = useRef(false);
  const prevMouse = useRef({ x: 0, y: 0 });
  const rotVelocity = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const aspect = width / height;
    const fov = 42;
    const camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 100);
    camera.position.set(0, 0.06, 5.2);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window?.devicePixelRatio || 1, 2));
    const domElement = renderer.domElement;
    domElement.style.outline = 'none';
    domElement.style.userSelect = 'none';
    domElement.style.touchAction = 'none';
    domElement.style.cursor = interactive ? 'grab' : 'default';
    container.appendChild(domElement);

    setupLights(scene);
    const m = makeMaterials();

    const root = new THREE.Group();
    scene.add(root);

    // ── Thân tròn vàng ──
    const octoBody = new THREE.Mesh(new THREE.SphereGeometry(0.72, 22, 18), m.yellowMat);
    octoBody.scale.set(1.08, 0.98, 0.96);
    root.add(octoBody);

    const octoFace = new THREE.Mesh(new THREE.SphereGeometry(0.54, 20, 18), m.creamFaceMat);
    octoFace.position.set(0, 0.02, 0.28);
    octoFace.scale.set(0.96, 0.92, 0.88);
    root.add(octoFace);

    const octoNose = new THREE.Mesh(new THREE.SphereGeometry(0.052, 12, 12), m.redNoseMat);
    octoNose.position.set(0, 0.02, 0.78);
    root.add(octoNose);

    // Mắt
    const octoEyeGeo = new THREE.SphereGeometry(0.065, 12, 12);
    const octoGlossGeo = new THREE.SphereGeometry(0.022, 6, 6);

    const octoEyeL = new THREE.Group();
    octoEyeL.position.set(-0.19, 0.12, 0.74);
    const octoEyeLMesh = new THREE.Mesh(octoEyeGeo, m.eyeBlackMat);
    octoEyeLMesh.scale.set(0.85, 1.25, 0.85);
    octoEyeL.add(octoEyeLMesh);
    const octoGlossL = new THREE.Mesh(octoGlossGeo, m.eyeGlossMat);
    octoGlossL.position.set(-0.02, 0.035, 0.05);
    octoEyeL.add(octoGlossL);
    root.add(octoEyeL);

    const octoEyeR = new THREE.Group();
    octoEyeR.position.set(0.19, 0.12, 0.74);
    const octoEyeRMesh = new THREE.Mesh(octoEyeGeo, m.eyeBlackMat);
    octoEyeRMesh.scale.set(0.85, 1.25, 0.85);
    octoEyeR.add(octoEyeRMesh);
    const octoGlossR = new THREE.Mesh(octoGlossGeo, m.eyeGlossMat);
    octoGlossR.position.set(-0.02, 0.035, 0.05);
    octoEyeR.add(octoGlossR);
    root.add(octoEyeR);

    const octoWinkR = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.018, 6, 10, Math.PI), m.eyeBlackMat);
    octoWinkR.position.set(0.19, 0.11, 0.75);
    octoWinkR.rotation.z = Math.PI;
    octoWinkR.visible = false;
    root.add(octoWinkR);

    // Má hồng
    const octoBlushGeo = new THREE.SphereGeometry(0.11, 10, 10);
    const octoBlushL = new THREE.Mesh(octoBlushGeo, m.blushPinkMat);
    octoBlushL.position.set(-0.29, -0.05, 0.70);
    octoBlushL.scale.set(1.2, 0.8, 0.3);
    root.add(octoBlushL);
    const octoBlushR = new THREE.Mesh(octoBlushGeo, m.blushPinkMat);
    octoBlushR.position.set(0.29, -0.05, 0.70);
    octoBlushR.scale.set(1.2, 0.8, 0.3);
    root.add(octoBlushR);

    // Miệng
    const octoMouth = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.015, 6, 10, Math.PI * 0.9), m.darkMouthMat);
    octoMouth.position.set(0.03, -0.09, 0.76);
    octoMouth.rotation.z = -0.2;
    root.add(octoMouth);

    // Chân
    const octoLegGeo = new THREE.CylinderGeometry(0.15, 0.14, 0.28, 12);
    const octoLegL = new THREE.Mesh(octoLegGeo, m.yellowMat);
    octoLegL.position.set(-0.26, -0.74, 0);
    root.add(octoLegL);
    const octoLegR = new THREE.Mesh(octoLegGeo, m.yellowMat);
    octoLegR.position.set(0.26, -0.74, 0);
    root.add(octoLegR);

    // Tay
    const octoArmGeo = new THREE.SphereGeometry(0.14, 10, 10);
    const octoArmLGroup = new THREE.Group();
    octoArmLGroup.position.set(-0.62, 0.02, 0.05);
    const octoArmL = new THREE.Mesh(octoArmGeo, m.yellowMat);
    octoArmL.position.set(-0.12, 0.12, 0);
    octoArmL.scale.set(0.85, 1.4, 0.85);
    octoArmL.rotation.z = -0.25;
    octoArmLGroup.add(octoArmL);
    root.add(octoArmLGroup);

    const octoArmRGroup = new THREE.Group();
    octoArmRGroup.position.set(0.62, 0.02, 0.05);
    const octoArmR = new THREE.Mesh(octoArmGeo, m.yellowMat);
    octoArmR.position.set(0.12, -0.10, 0);
    octoArmR.scale.set(0.85, 1.4, 0.85);
    octoArmR.rotation.z = -0.35;
    octoArmRGroup.add(octoArmR);
    root.add(octoArmRGroup);

    // Mũ bạch tuộc hồng
    const octoHat = new THREE.Group();
    octoHat.position.set(0.28, 0.66, 0.08);
    octoHat.rotation.z = -0.22;
    root.add(octoHat);
    const octoHatHead = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 14), m.octopusMat);
    octoHatHead.scale.set(1.1, 0.95, 1.0);
    octoHat.add(octoHatHead);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const t = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 8), m.octopusMat);
      t.position.set(Math.sin(a) * 0.25, -0.18, Math.cos(a) * 0.25);
      octoHat.add(t);
    }
    const octHL = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), m.eyeBlackMat);
    octHL.position.set(-0.08, 0.05, 0.26);
    octoHat.add(octHL);
    const octHR = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), m.eyeBlackMat);
    octHR.position.set(0.08, 0.05, 0.26);
    octoHat.add(octHR);

    // ── Confetti & sparkles ──
    const confettiColors = ['#F43F5E', '#FBBF24', '#34D399', '#38BDF8', '#A855F7', '#FB923C'];
    const confettiList = [];
    for (let i = 0; i < 16; i++) {
      const cMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(0.09, 0.055),
        new THREE.MeshBasicMaterial({ color: confettiColors[i % confettiColors.length], side: THREE.DoubleSide })
      );
      cMesh.visible = false;
      root.add(cMesh);
      confettiList.push({ mesh: cMesh, speedX: (Math.random() - 0.5) * 0.045, speedY: 0.035 + Math.random() * 0.045, rotSpeed: (Math.random() - 0.5) * 0.15, startX: (Math.random() - 0.5) * 0.6, baseY: -0.2 + Math.random() * 0.4, seed: i * 0.4 });
    }
    const sparkleList = [];
    for (let i = 0; i < 5; i++) {
      const sp = new THREE.Mesh(new THREE.OctahedronGeometry(0.065, 0), new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? '#FDE047' : '#FB7185' }));
      sp.visible = false;
      root.add(sp);
      sparkleList.push({ mesh: sp, seed: i * 0.75 });
    }

    // ── Interaction ──
    const onPointerDown = (e) => {
      isDragging.current = true;
      domElement.style.cursor = 'grabbing';
      prevMouse.current = { x: e.clientX ?? 0, y: e.clientY ?? 0 };
      setIsHovered(true);
    };
    const onPointerMove = (e) => {
      if (!isDragging.current) return;
      const dx = (e.clientX ?? 0) - prevMouse.current.x;
      const dy = (e.clientY ?? 0) - prevMouse.current.y;
      prevMouse.current = { x: e.clientX ?? 0, y: e.clientY ?? 0 };
      rotVelocity.current.y = dx * 0.012;
      root.rotation.y += dx * 0.012;
      root.rotation.x = Math.max(-0.35, Math.min(0.35, root.rotation.x + dy * 0.008));
    };
    const onPointerUp = () => {
      isDragging.current = false;
      domElement.style.cursor = interactive ? 'grab' : 'default';
      setTimeout(() => setIsHovered(false), 1200);
    };
    if (interactive) {
      domElement.addEventListener('pointerdown', onPointerDown);
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      domElement.addEventListener('mouseenter', () => setIsHovered(true));
      domElement.addEventListener('mouseleave', () => { if (!isDragging.current) setIsHovered(false); });
    }

    let animId = null;
    const clock = new THREE.Clock();
    let timer = 0;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      if (!isDragging.current) {
        root.rotation.y += rotVelocity.current.y;
        rotVelocity.current.y *= 0.92;
        root.rotation.y += 0.003;
      }

      const walkFreq = isHovered ? 13 : 7.2;
      const walkPhase = elapsed * walkFreq;

      // Nhún nhảy
      let octoJump = 0;
      const jumpTime = elapsed % 6.2;
      if (jumpTime > 0.8 && jumpTime < 1.9) octoJump = Math.sin(((jumpTime - 0.8) / 1.1) * Math.PI) * 0.38;
      if (isHovered) octoJump = Math.abs(Math.sin(elapsed * 8.5)) * 0.28;

      root.position.y = -0.05 + Math.abs(Math.sin(walkPhase)) * 0.045 + octoJump;
      root.rotation.z = Math.sin(walkPhase) * (isHovered ? 0.06 : 0.035);

      octoLegL.position.z = Math.sin(walkPhase) * 0.12;
      octoLegR.position.z = -Math.sin(walkPhase) * 0.12;
      octoLegL.position.y = -0.74 + Math.max(0, Math.sin(walkPhase)) * 0.06;
      octoLegR.position.y = -0.74 + Math.max(0, -Math.sin(walkPhase)) * 0.06;

      octoHat.position.y = 0.66 + Math.sin(elapsed * 9) * 0.04 + (octoJump > 0.05 ? 0.08 : 0);
      octoHat.rotation.z = -0.22 + Math.sin(elapsed * 7) * 0.10;

      const waveSpeed = isHovered ? 12 : 7;
      octoArmLGroup.rotation.z = 0.85 + Math.sin(elapsed * waveSpeed) * 0.45;
      octoArmLGroup.rotation.x = Math.cos(elapsed * waveSpeed * 0.5) * 0.22;
      octoArmRGroup.rotation.z = -0.35 + Math.sin(walkPhase) * 0.2;

      const targetScale = isHovered ? 1.1 : 1.0;
      root.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.14);

      // Wink
      timer += 0.016;
      const cycle = timer % 6.5;
      if (isHovered || (cycle > 4.2 && cycle < 5.6)) {
        octoEyeR.visible = false; octoWinkR.visible = true;
      } else {
        octoEyeR.visible = true; octoWinkR.visible = false;
      }

      // Confetti
      confettiList.forEach((c, idx) => {
        if (isHovered) {
          c.mesh.visible = true;
          const p = ((elapsed * 1.8 + c.seed) % 1.6);
          c.mesh.position.set(c.startX + c.speedX * p * 40, c.baseY + c.speedY * p * 32 - 0.5 * 9.8 * Math.pow(p * 0.35, 2), Math.sin(elapsed * 2 + idx) * 0.5);
          c.mesh.rotation.x += c.rotSpeed;
          c.mesh.rotation.y += c.rotSpeed * 1.5;
        } else { c.mesh.visible = false; }
      });
      sparkleList.forEach((s, idx) => {
        const always = idx < 2;
        if (isHovered || always) {
          s.mesh.visible = true;
          const spd = isHovered ? 3.0 : 1.2;
          const a = elapsed * spd + s.seed;
          const r = always && !isHovered ? 1.0 + (idx % 2) * 0.2 : 1.2 + (idx % 3) * 0.25;
          s.mesh.position.set(Math.cos(a) * r, 0.55 + Math.sin(elapsed * (spd * 1.2) + idx) * 0.45, Math.sin(a) * 0.5);
          s.mesh.rotation.y += isHovered ? 0.09 : 0.04;
          const sv = isHovered ? 1.2 : 0.8 + Math.sin(elapsed * 4 + idx) * 0.25;
          s.mesh.scale.set(sv, sv, sv);
        } else { s.mesh.visible = false; }
      });

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      if (interactive) {
        domElement.removeEventListener('pointerdown', onPointerDown);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
      }
      if (container.contains(domElement)) container.removeChild(domElement);
      renderer.dispose();
    };
  }, [width, height, interactive, isHovered]);

  return <View ref={mountRef} style={{ width, height }} />;
}

// ─── BÉ VỊT VÀNG MỎ CAM LỌN TÓC XOĂN ──────────────────────────────────────
function DuckMascotCanvas({ width, height, interactive }) {
  const mountRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const isDragging = useRef(false);
  const prevMouse = useRef({ x: 0, y: 0 });
  const rotVelocity = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const aspect = width / height;
    const camera = new THREE.PerspectiveCamera(42, aspect, 0.1, 100);
    camera.position.set(0, 0.1, 5.5);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window?.devicePixelRatio || 1, 2));
    const domElement = renderer.domElement;
    domElement.style.outline = 'none';
    domElement.style.userSelect = 'none';
    domElement.style.touchAction = 'none';
    domElement.style.cursor = interactive ? 'grab' : 'default';
    container.appendChild(domElement);

    setupLights(scene);
    const m = makeMaterials();

    const root = new THREE.Group();
    scene.add(root);

    // Đầu to tròn vàng
    const duckHead = new THREE.Mesh(new THREE.SphereGeometry(0.78, 24, 20), m.yellowMat);
    duckHead.position.set(0, 0.18, 0);
    duckHead.scale.set(1.04, 1.02, 1.0);
    root.add(duckHead);

    // Mặt trắng sứ
    const duckFace = new THREE.Mesh(new THREE.SphereGeometry(0.60, 22, 20), m.whitePorcelainMat);
    duckFace.position.set(0, 0.18, 0.26);
    duckFace.scale.set(1.0, 0.98, 0.92);
    root.add(duckFace);

    // Lọn tóc xoăn
    const curlGroup = new THREE.Group();
    curlGroup.position.set(0, 0.38, 0.74);
    curlGroup.add(new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.022, 8, 16, Math.PI * 1.8), m.yellowMat));
    const cwGeo = new THREE.TorusGeometry(0.12, 0.022, 6, 12, Math.PI * 0.65);
    const cwL = new THREE.Mesh(cwGeo, m.yellowMat);
    cwL.position.set(-0.11, -0.03, 0); cwL.rotation.z = -0.6;
    curlGroup.add(cwL);
    const cwR = new THREE.Mesh(cwGeo, m.yellowMat);
    cwR.position.set(0.11, -0.03, 0); cwR.rotation.z = 0.6; cwR.scale.x = -1;
    curlGroup.add(cwR);
    root.add(curlGroup);

    // Mắt dẹt
    const duckEyeGeo = new THREE.CylinderGeometry(0.038, 0.038, 0.11, 10);
    duckEyeGeo.rotateZ(Math.PI / 2);
    const duckEyeL = new THREE.Mesh(duckEyeGeo, m.eyeBlackMat);
    duckEyeL.position.set(-0.18, 0.22, 0.74);
    root.add(duckEyeL);
    const duckEyeR = new THREE.Mesh(duckEyeGeo, m.eyeBlackMat);
    duckEyeR.position.set(0.18, 0.22, 0.74);
    root.add(duckEyeR);

    const duckWinkR = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.018, 6, 10, Math.PI), m.eyeBlackMat);
    duckWinkR.position.set(0.18, 0.22, 0.75);
    duckWinkR.rotation.z = Math.PI;
    duckWinkR.visible = false;
    root.add(duckWinkR);

    // Mỏ cam
    const beakGroup = new THREE.Group();
    beakGroup.position.set(0, 0.11, 0.76);
    const beakOuterGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.08, 16);
    beakOuterGeo.rotateX(Math.PI / 2);
    const beakOuter = new THREE.Mesh(beakOuterGeo, m.orangeBeakMat);
    beakOuter.scale.set(1.4, 0.85, 1.2);
    beakGroup.add(beakOuter);
    const beakInnerGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.082, 12);
    beakInnerGeo.rotateX(Math.PI / 2);
    const beakInner = new THREE.Mesh(beakInnerGeo, m.redNoseMat);
    beakInner.scale.set(1.4, 0.45, 1.25);
    beakGroup.add(beakInner);
    root.add(beakGroup);

    // Má hồng pastel
    const duckBlushGeo = new THREE.SphereGeometry(0.09, 10, 10);
    const dbL = new THREE.Mesh(duckBlushGeo, m.blushLavenderMat);
    dbL.position.set(-0.28, 0.10, 0.68); dbL.scale.set(1.3, 0.65, 0.3);
    root.add(dbL);
    const dbR = new THREE.Mesh(duckBlushGeo, m.blushLavenderMat);
    dbR.position.set(0.28, 0.10, 0.68); dbR.scale.set(1.3, 0.65, 0.3);
    root.add(dbR);

    // Thân choàng vàng
    const duckBody = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.76, 0.52, 18), m.yellowMat);
    duckBody.position.set(0, -0.32, 0);
    root.add(duckBody);

    // Cánh tay
    const duckWingGeo = new THREE.SphereGeometry(0.14, 10, 10);
    const duckWingLGroup = new THREE.Group();
    duckWingLGroup.position.set(-0.55, -0.22, 0.05);
    const dwL = new THREE.Mesh(duckWingGeo, m.yellowMat);
    dwL.position.set(-0.08, -0.08, 0); dwL.scale.set(0.75, 1.3, 0.75); dwL.rotation.z = 0.25;
    duckWingLGroup.add(dwL);
    root.add(duckWingLGroup);

    const duckWingRGroup = new THREE.Group();
    duckWingRGroup.position.set(0.55, -0.22, 0.05);
    const dwR = new THREE.Mesh(duckWingGeo, m.yellowMat);
    dwR.position.set(0.10, 0.12, 0); dwR.scale.set(0.75, 1.3, 0.75); dwR.rotation.z = -0.25;
    duckWingRGroup.add(dwR);
    root.add(duckWingRGroup);

    // Chân vịt
    const duckFootGeo = new THREE.SphereGeometry(0.11, 10, 10);
    const duckFootL = new THREE.Mesh(duckFootGeo, m.orangeFeetMat);
    duckFootL.position.set(-0.16, -0.66, 0.08); duckFootL.scale.set(1.0, 0.8, 1.35);
    root.add(duckFootL);
    const duckFootR = new THREE.Mesh(duckFootGeo, m.orangeFeetMat);
    duckFootR.position.set(0.16, -0.66, 0.08); duckFootR.scale.set(1.0, 0.8, 1.35);
    root.add(duckFootR);

    // Confetti & sparkles
    const confettiColors = ['#F43F5E', '#FBBF24', '#34D399', '#38BDF8', '#A855F7', '#FB923C'];
    const confettiList = [];
    for (let i = 0; i < 16; i++) {
      const cMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.055), new THREE.MeshBasicMaterial({ color: confettiColors[i % confettiColors.length], side: THREE.DoubleSide }));
      cMesh.visible = false;
      root.add(cMesh);
      confettiList.push({ mesh: cMesh, speedX: (Math.random() - 0.5) * 0.045, speedY: 0.035 + Math.random() * 0.045, rotSpeed: (Math.random() - 0.5) * 0.15, startX: (Math.random() - 0.5) * 0.6, baseY: -0.2 + Math.random() * 0.4, seed: i * 0.4 });
    }
    const sparkleList = [];
    for (let i = 0; i < 5; i++) {
      const sp = new THREE.Mesh(new THREE.OctahedronGeometry(0.065, 0), new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? '#FDE047' : '#FB7185' }));
      sp.visible = false; root.add(sp);
      sparkleList.push({ mesh: sp, seed: i * 0.75 });
    }

    // Interaction
    const onPointerDown = (e) => {
      isDragging.current = true;
      domElement.style.cursor = 'grabbing';
      prevMouse.current = { x: e.clientX ?? 0, y: e.clientY ?? 0 };
      setIsHovered(true);
    };
    const onPointerMove = (e) => {
      if (!isDragging.current) return;
      const dx = (e.clientX ?? 0) - prevMouse.current.x;
      const dy = (e.clientY ?? 0) - prevMouse.current.y;
      prevMouse.current = { x: e.clientX ?? 0, y: e.clientY ?? 0 };
      rotVelocity.current.y = dx * 0.012;
      root.rotation.y += dx * 0.012;
      root.rotation.x = Math.max(-0.35, Math.min(0.35, root.rotation.x + dy * 0.008));
    };
    const onPointerUp = () => {
      isDragging.current = false;
      domElement.style.cursor = interactive ? 'grab' : 'default';
      setTimeout(() => setIsHovered(false), 1200);
    };
    if (interactive) {
      domElement.addEventListener('pointerdown', onPointerDown);
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      domElement.addEventListener('mouseenter', () => setIsHovered(true));
      domElement.addEventListener('mouseleave', () => { if (!isDragging.current) setIsHovered(false); });
    }

    let animId = null;
    const clock = new THREE.Clock();
    let timer = 0;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      if (!isDragging.current) {
        root.rotation.y += rotVelocity.current.y;
        rotVelocity.current.y *= 0.92;
        root.rotation.y -= 0.003; // xoay ngược chiều với octo cho khác biệt
      }

      const walkFreq = isHovered ? 13 : 7.2;
      const walkPhase = elapsed * walkFreq + 0.6; // lệch pha với octo

      let duckJump = 0;
      const jumpTime = elapsed % 6.2;
      if (jumpTime > 3.4 && jumpTime < 4.5) duckJump = Math.sin(((jumpTime - 3.4) / 1.1) * Math.PI) * 0.38;
      if (isHovered) duckJump = Math.abs(Math.cos(elapsed * 8.5)) * 0.28;

      root.position.y = -0.05 + Math.abs(Math.cos(walkPhase)) * 0.045 + duckJump;
      root.rotation.z = -Math.sin(walkPhase) * (isHovered ? 0.06 : 0.035);

      duckFootL.position.z = Math.sin(walkPhase) * 0.10;
      duckFootR.position.z = -Math.sin(walkPhase) * 0.10;
      duckFootL.position.y = -0.66 + Math.max(0, Math.sin(walkPhase)) * 0.05;
      duckFootR.position.y = -0.66 + Math.max(0, -Math.sin(walkPhase)) * 0.05;

      curlGroup.rotation.z = Math.sin(elapsed * 5.0) * 0.15;

      const waveSpeed = isHovered ? 12 : 7;
      duckWingRGroup.rotation.z = -0.75 - Math.sin(elapsed * waveSpeed + 1.2) * 0.42;
      duckWingRGroup.rotation.x = Math.cos(elapsed * waveSpeed * 0.5 + 1.2) * 0.20;
      duckWingLGroup.rotation.z = 0.25 - Math.sin(walkPhase) * 0.2;

      const targetScale = isHovered ? 1.1 : 1.0;
      root.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.14);

      timer += 0.016;
      const cycle = timer % 6.5;
      if (isHovered || (cycle > 1.8 && cycle < 3.2)) {
        duckEyeR.visible = false; duckWinkR.visible = true;
      } else {
        duckEyeR.visible = true; duckWinkR.visible = false;
      }

      confettiList.forEach((c, idx) => {
        if (isHovered) {
          c.mesh.visible = true;
          const p = ((elapsed * 1.8 + c.seed) % 1.6);
          c.mesh.position.set(c.startX + c.speedX * p * 40, c.baseY + c.speedY * p * 32 - 0.5 * 9.8 * Math.pow(p * 0.35, 2), Math.sin(elapsed * 2 + idx) * 0.5);
          c.mesh.rotation.x += c.rotSpeed;
          c.mesh.rotation.y += c.rotSpeed * 1.5;
        } else { c.mesh.visible = false; }
      });
      sparkleList.forEach((s, idx) => {
        const always = idx < 2;
        if (isHovered || always) {
          s.mesh.visible = true;
          const spd = isHovered ? 3.0 : 1.2;
          const a = elapsed * spd + s.seed;
          const r = always && !isHovered ? 1.0 + (idx % 2) * 0.2 : 1.2 + (idx % 3) * 0.25;
          s.mesh.position.set(Math.cos(a) * r, 0.55 + Math.sin(elapsed * (spd * 1.2) + idx) * 0.45, Math.sin(a) * 0.5);
          s.mesh.rotation.y += isHovered ? 0.09 : 0.04;
          const sv = isHovered ? 1.2 : 0.8 + Math.sin(elapsed * 4 + idx) * 0.25;
          s.mesh.scale.set(sv, sv, sv);
        } else { s.mesh.visible = false; }
      });

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      if (interactive) {
        domElement.removeEventListener('pointerdown', onPointerDown);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
      }
      if (container.contains(domElement)) container.removeChild(domElement);
      renderer.dispose();
    };
  }, [width, height, interactive, isHovered]);

  return <View ref={mountRef} style={{ width, height }} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'visible',
  },
});
