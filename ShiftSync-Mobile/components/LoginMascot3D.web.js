import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import * as THREE from 'three';

/**
 * LoginMascot3D.web.js — Mascot 3D Login: 2 bé TÁCH riêng 2 canvas, flex row
 * Props:
 *  - status: 'idle' | 'email' | 'password' | 'showPassword' | 'error' | 'success'
 *  - emailLength: number
 *  - width, height: tổng kích thước khung chứa
 */
export default function LoginMascot3D({
  status = 'idle',
  emailLength = 0,
  width = 300,
  height = 160,
  gap = 36,
  style,
}) {
  const charW = Math.max(80, Math.floor((width - gap) / 2));

  return (
    <View style={[styles.row, { width, height, gap }, style]}>
      <OctoCanvas
        width={charW}
        height={height}
        status={status}
        emailLength={emailLength}
      />
      <DuckCanvas
        width={charW}
        height={height}
        status={status}
        emailLength={emailLength}
      />
    </View>
  );
}

// ─── Shared lighting setup ───────────────────────────────────────────────────
function addLights(scene) {
  scene.add(new THREE.AmbientLight(0xfffdf5, 1.45));
  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(3, 5, 4); scene.add(key);
  const fill = new THREE.DirectionalLight(0xfef08a, 0.85);
  fill.position.set(-3, 3, 2); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xf43f5e, 0.45);
  rim.position.set(2, 4, -3); scene.add(rim);
}

// ─── BÉ TRÒN VÀNG ĐỘI BẠCH TUỘC HỒNG ───────────────────────────────────────
function OctoCanvas({ width, height, status, emailLength }) {
  const mountRef = useRef(null);
  const statusRef = useRef(status);
  const emailRef = useRef(emailLength);

  useEffect(() => { statusRef.current = status; emailRef.current = emailLength; }, [status, emailLength]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 100);
    camera.position.set(0, 0.08, 5.0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window?.devicePixelRatio || 1, 2));
    const dom = renderer.domElement;
    dom.style.outline = 'none';
    dom.style.userSelect = 'none';
    dom.style.touchAction = 'none';
    container.appendChild(dom);

    addLights(scene);

    // Materials
    const yellowMat = new THREE.MeshStandardMaterial({ color: '#FFD426', roughness: 0.28, metalness: 0.05 });
    const creamMat = new THREE.MeshStandardMaterial({ color: '#FFFBEB', roughness: 0.35, metalness: 0.02 });
    const redMat = new THREE.MeshStandardMaterial({ color: '#EF4444', roughness: 0.2, metalness: 0.1 });
    const blackMat = new THREE.MeshStandardMaterial({ color: '#18181B', roughness: 0.15, metalness: 0.1 });
    const whiteMat = new THREE.MeshBasicMaterial({ color: '#FFFFFF' });
    const blushMat = new THREE.MeshStandardMaterial({ color: '#FB7185', roughness: 0.45 });
    const octMat = new THREE.MeshStandardMaterial({ color: '#FB7185', roughness: 0.28, metalness: 0.06 });
    const mouthMat = new THREE.MeshStandardMaterial({ color: '#991B1B', roughness: 0.3 });

    const root = new THREE.Group();
    scene.add(root);

    // Thân tròn vàng
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.72, 22, 18), yellowMat);
    body.scale.set(1.08, 0.98, 0.96); root.add(body);

    const face = new THREE.Mesh(new THREE.SphereGeometry(0.54, 20, 18), creamMat);
    face.position.set(0, 0.02, 0.28); face.scale.set(0.96, 0.92, 0.88); root.add(face);

    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.052, 12, 12), redMat);
    nose.position.set(0, 0.02, 0.78); root.add(nose);

    // Mắt
    const eyeGeo = new THREE.SphereGeometry(0.065, 12, 12);
    const glossGeo = new THREE.SphereGeometry(0.022, 6, 6);

    const eyeL = new THREE.Group(); eyeL.position.set(-0.19, 0.12, 0.74);
    const eyeLM = new THREE.Mesh(eyeGeo, blackMat); eyeLM.scale.set(0.85, 1.25, 0.85); eyeL.add(eyeLM);
    const glossL = new THREE.Mesh(glossGeo, whiteMat); glossL.position.set(-0.02, 0.035, 0.05); eyeL.add(glossL);
    root.add(eyeL);

    const eyeR = new THREE.Group(); eyeR.position.set(0.19, 0.12, 0.74);
    const eyeRM = new THREE.Mesh(eyeGeo, blackMat); eyeRM.scale.set(0.85, 1.25, 0.85); eyeR.add(eyeRM);
    const glossR = new THREE.Mesh(glossGeo, whiteMat); glossR.position.set(-0.02, 0.035, 0.05); eyeR.add(glossR);
    root.add(eyeR);

    const winkGeo = new THREE.TorusGeometry(0.065, 0.018, 6, 10, Math.PI);
    const winkL = new THREE.Mesh(winkGeo, blackMat); winkL.position.set(-0.19, 0.11, 0.75); winkL.rotation.z = Math.PI; winkL.visible = false; root.add(winkL);
    const winkR = new THREE.Mesh(winkGeo, blackMat); winkR.position.set(0.19, 0.11, 0.75); winkR.rotation.z = Math.PI; winkR.visible = false; root.add(winkR);

    // Má hồng
    const blushGeo = new THREE.SphereGeometry(0.11, 10, 10);
    const blL = new THREE.Mesh(blushGeo, blushMat); blL.position.set(-0.29, -0.05, 0.70); blL.scale.set(1.2, 0.8, 0.3); root.add(blL);
    const blR = new THREE.Mesh(blushGeo, blushMat); blR.position.set(0.29, -0.05, 0.70); blR.scale.set(1.2, 0.8, 0.3); root.add(blR);

    const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.015, 6, 10, Math.PI * 0.9), mouthMat);
    mouth.position.set(0.03, -0.09, 0.76); mouth.rotation.z = -0.2; root.add(mouth);

    // Chân
    const legGeo = new THREE.CylinderGeometry(0.15, 0.14, 0.28, 12);
    const legL = new THREE.Mesh(legGeo, yellowMat); legL.position.set(-0.26, -0.74, 0); root.add(legL);
    const legR = new THREE.Mesh(legGeo, yellowMat); legR.position.set(0.26, -0.74, 0); root.add(legR);

    // Tay
    const armGeo = new THREE.SphereGeometry(0.15, 12, 12);
    const armLGroup = new THREE.Group(); armLGroup.position.set(-0.65, 0.02, 0.05);
    const armL = new THREE.Mesh(armGeo, yellowMat); armL.position.set(-0.12, 0.12, 0); armL.scale.set(0.9, 1.45, 0.9); armLGroup.add(armL); root.add(armLGroup);

    const armRGroup = new THREE.Group(); armRGroup.position.set(0.65, 0.02, 0.05);
    const armR = new THREE.Mesh(armGeo, yellowMat); armR.position.set(0.12, -0.08, 0); armR.scale.set(0.9, 1.45, 0.9); armRGroup.add(armR); root.add(armRGroup);

    // Mũ bạch tuộc hồng
    const hat = new THREE.Group(); hat.position.set(0.28, 0.66, 0.08); hat.rotation.z = -0.22; root.add(hat);
    const hatHead = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 14), octMat); hatHead.scale.set(1.1, 0.95, 1.0); hat.add(hatHead);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const t = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 8), octMat);
      t.position.set(Math.sin(a) * 0.25, -0.18, Math.cos(a) * 0.25); hat.add(t);
    }
    const hEL = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), blackMat); hEL.position.set(-0.08, 0.05, 0.26); hat.add(hEL);
    const hER = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), blackMat); hER.position.set(0.08, 0.05, 0.26); hat.add(hER);

    // Confetti
    const confettiColors = ['#F43F5E', '#FBBF24', '#34D399', '#38BDF8', '#A855F7', '#FB923C'];
    const confettiList = [];
    for (let i = 0; i < 14; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.055), new THREE.MeshBasicMaterial({ color: confettiColors[i % confettiColors.length], side: THREE.DoubleSide }));
      m.visible = false; root.add(m);
      confettiList.push({ mesh: m, startX: (Math.random() - 0.5) * 1.5, baseY: 0.8 + Math.random() * 0.8, speedX: (Math.random() - 0.5) * 0.02, speedY: 0.015 + Math.random() * 0.02, rotSpeed: 0.05 + Math.random() * 0.08, seed: Math.random() * 5 });
    }

    let animId = null;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      const st = statusRef.current;
      const eLen = emailRef.current;
      const gazeX = THREE.MathUtils.clamp((eLen - 10) * 0.005, -0.06, 0.06);
      let doWink = false;

      if (st === 'password') {
        armLGroup.position.lerp(new THREE.Vector3(-0.24, 0.12, 0.72), 0.18);
        armLGroup.rotation.set(0.1, 0.2, 1.4);
        armRGroup.position.lerp(new THREE.Vector3(0.24, 0.12, 0.72), 0.18);
        armRGroup.rotation.set(0.1, -0.2, -1.4);
        root.rotation.x = THREE.MathUtils.lerp(root.rotation.x, 0.18, 0.15);
        root.position.y = THREE.MathUtils.lerp(root.position.y, -0.08, 0.1);
        confettiList.forEach(c => { c.mesh.visible = false; });

      } else if (st === 'showPassword') {
        armLGroup.position.lerp(new THREE.Vector3(-0.24, 0.12, 0.72), 0.18);
        armLGroup.rotation.set(0.1, 0.2, 1.4);
        armRGroup.position.lerp(new THREE.Vector3(0.24, 0.12, 0.72), 0.18);
        armRGroup.rotation.set(0.1, -0.2, -1.4);
        root.rotation.x = THREE.MathUtils.lerp(root.rotation.x, 0.18, 0.15);
        confettiList.forEach(c => { c.mesh.visible = false; });

      } else if (st === 'email') {
        armLGroup.position.lerp(new THREE.Vector3(-0.65, 0.02, 0.05), 0.15);
        armLGroup.rotation.set(0, 0, -0.25);
        armRGroup.position.lerp(new THREE.Vector3(0.65, 0.02, 0.05), 0.15);
        armRGroup.rotation.set(0, 0, -0.35);
        const hd = 0.16 + Math.sin(elapsed * 6) * 0.03;
        root.rotation.x = THREE.MathUtils.lerp(root.rotation.x, hd, 0.15);
        root.rotation.y = THREE.MathUtils.lerp(root.rotation.y, gazeX * 3.5, 0.15);
        eyeL.position.x = -0.19 + gazeX;
        eyeR.position.x = 0.19 + gazeX;
        confettiList.forEach(c => { c.mesh.visible = false; });

      } else if (st === 'error') {
        const shake = Math.sin(elapsed * 16) * 0.22;
        root.rotation.y = shake;
        root.rotation.z = -shake * 0.3;
        hat.rotation.z = -0.38 + Math.sin(elapsed * 8) * 0.08;
        armLGroup.position.lerp(new THREE.Vector3(-0.62, -0.15, 0), 0.15);
        armLGroup.rotation.set(0, 0, 0.1);
        armRGroup.position.lerp(new THREE.Vector3(0.62, -0.15, 0), 0.15);
        armRGroup.rotation.set(0, 0, -0.1);
        confettiList.forEach(c => { c.mesh.visible = false; });

      } else if (st === 'success') {
        const jumpY = -0.05 + Math.abs(Math.sin(elapsed * 9)) * 0.38;
        root.position.y = jumpY;
        armLGroup.position.lerp(new THREE.Vector3(-0.62, 0.15, 0), 0.2);
        armLGroup.rotation.set(0, 0, 1.8 + Math.sin(elapsed * 12) * 0.3);
        armRGroup.position.lerp(new THREE.Vector3(0.62, 0.15, 0), 0.2);
        armRGroup.rotation.set(0, 0, -1.8 - Math.sin(elapsed * 12) * 0.3);
        doWink = true;
        confettiList.forEach(c => {
          c.mesh.visible = true;
          const p = (elapsed * 2.2 + c.seed) % 1.8;
          c.mesh.position.set(c.startX + c.speedX * p * 45, c.baseY + c.speedY * p * 30 - 0.5 * 9.8 * Math.pow(p * 0.32, 2), Math.sin(elapsed * 2.5 + c.seed) * 0.5);
          c.mesh.rotation.x += c.rotSpeed;
          c.mesh.rotation.y += c.rotSpeed * 1.6;
        });

      } else {
        // idle
        root.position.y = -0.05 + Math.abs(Math.sin(elapsed * 3.6)) * 0.05;
        root.rotation.x = THREE.MathUtils.lerp(root.rotation.x, 0, 0.1);
        root.rotation.y = THREE.MathUtils.lerp(root.rotation.y, 0.08, 0.08);
        armLGroup.position.lerp(new THREE.Vector3(-0.65, 0.02, 0.05), 0.15);
        armLGroup.rotation.set(0, 0, 0.65 + Math.sin(elapsed * 6) * 0.35);
        armRGroup.position.lerp(new THREE.Vector3(0.65, 0.02, 0.05), 0.15);
        armRGroup.rotation.set(0, 0, -0.35);
        hat.position.y = 0.66 + Math.sin(elapsed * 7) * 0.03;
        confettiList.forEach(c => { c.mesh.visible = false; });
      }

      eyeL.visible = !doWink; eyeR.visible = !doWink;
      winkL.visible = doWink; winkR.visible = doWink;

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      if (container.contains(dom)) container.removeChild(dom);
      renderer.dispose();
    };
  }, [width, height]);

  return <View ref={mountRef} style={{ width, height }} />;
}

// ─── BÉ VỊT VÀNG MỎ CAM LỌN TÓC XOĂN ──────────────────────────────────────
function DuckCanvas({ width, height, status, emailLength }) {
  const mountRef = useRef(null);
  const statusRef = useRef(status);
  const emailRef = useRef(emailLength);

  useEffect(() => { statusRef.current = status; emailRef.current = emailLength; }, [status, emailLength]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 100);
    camera.position.set(0, 0.1, 5.5);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window?.devicePixelRatio || 1, 2));
    const dom = renderer.domElement;
    dom.style.outline = 'none';
    dom.style.userSelect = 'none';
    dom.style.touchAction = 'none';
    container.appendChild(dom);

    addLights(scene);

    const yellowMat = new THREE.MeshStandardMaterial({ color: '#FFD426', roughness: 0.28, metalness: 0.05 });
    const whiteMat2 = new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.25, metalness: 0.02 });
    const orangeBeakMat = new THREE.MeshStandardMaterial({ color: '#FB923C', roughness: 0.2, metalness: 0.08 });
    const orangeFeetMat = new THREE.MeshStandardMaterial({ color: '#F97316', roughness: 0.3, metalness: 0.05 });
    const redMat = new THREE.MeshStandardMaterial({ color: '#EF4444', roughness: 0.2, metalness: 0.1 });
    const blackMat = new THREE.MeshStandardMaterial({ color: '#18181B', roughness: 0.15, metalness: 0.1 });
    const blushLavMat = new THREE.MeshStandardMaterial({ color: '#F472B6', roughness: 0.45 });

    const root = new THREE.Group();
    scene.add(root);

    // Đầu to tròn vàng
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.78, 24, 20), yellowMat);
    head.position.set(0, 0.18, 0); head.scale.set(1.04, 1.02, 1.0); root.add(head);

    const face = new THREE.Mesh(new THREE.SphereGeometry(0.60, 22, 20), whiteMat2);
    face.position.set(0, 0.18, 0.26); face.scale.set(1.0, 0.98, 0.92); root.add(face);

    // Lọn tóc xoăn
    const curlGroup = new THREE.Group(); curlGroup.position.set(0, 0.38, 0.74);
    curlGroup.add(new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.022, 8, 16, Math.PI * 1.8), yellowMat));
    const cwG = new THREE.TorusGeometry(0.12, 0.022, 6, 12, Math.PI * 0.65);
    const cwL = new THREE.Mesh(cwG, yellowMat); cwL.position.set(-0.11, -0.03, 0); cwL.rotation.z = -0.6; curlGroup.add(cwL);
    const cwR = new THREE.Mesh(cwG, yellowMat); cwR.position.set(0.11, -0.03, 0); cwR.rotation.z = 0.6; cwR.scale.x = -1; curlGroup.add(cwR);
    root.add(curlGroup);

    // Mắt dẹt
    const duckEyeGeo = new THREE.CylinderGeometry(0.038, 0.038, 0.11, 10);
    duckEyeGeo.rotateZ(Math.PI / 2);
    const eyeL = new THREE.Mesh(duckEyeGeo, blackMat); eyeL.position.set(-0.18, 0.22, 0.74); root.add(eyeL);
    const eyeR = new THREE.Mesh(duckEyeGeo, blackMat); eyeR.position.set(0.18, 0.22, 0.74); root.add(eyeR);

    const winkGeo = new THREE.TorusGeometry(0.065, 0.018, 6, 10, Math.PI);
    const winkL = new THREE.Mesh(winkGeo, blackMat); winkL.position.set(-0.18, 0.22, 0.75); winkL.rotation.z = Math.PI; winkL.visible = false; root.add(winkL);
    const winkR = new THREE.Mesh(winkGeo, blackMat); winkR.position.set(0.18, 0.22, 0.75); winkR.rotation.z = Math.PI; winkR.visible = false; root.add(winkR);

    // Mỏ cam
    const beakG = new THREE.Group(); beakG.position.set(0, 0.11, 0.76);
    const bkOGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.08, 16); bkOGeo.rotateX(Math.PI / 2);
    const bkO = new THREE.Mesh(bkOGeo, orangeBeakMat); bkO.scale.set(1.4, 0.85, 1.2); beakG.add(bkO);
    const bkIGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.082, 12); bkIGeo.rotateX(Math.PI / 2);
    const bkI = new THREE.Mesh(bkIGeo, redMat); bkI.scale.set(1.4, 0.45, 1.25); beakG.add(bkI);
    root.add(beakG);

    // Má hồng pastel
    const bGeo = new THREE.SphereGeometry(0.09, 10, 10);
    const dbL = new THREE.Mesh(bGeo, blushLavMat); dbL.position.set(-0.28, 0.10, 0.68); dbL.scale.set(1.3, 0.65, 0.3); root.add(dbL);
    const dbR = new THREE.Mesh(bGeo, blushLavMat); dbR.position.set(0.28, 0.10, 0.68); dbR.scale.set(1.3, 0.65, 0.3); root.add(dbR);

    // Thân choàng
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.76, 0.52, 18), yellowMat);
    body.position.set(0, -0.32, 0); root.add(body);

    // Cánh
    const wingGeo = new THREE.SphereGeometry(0.15, 10, 10);
    const wingLGroup = new THREE.Group(); wingLGroup.position.set(-0.55, -0.20, 0.05);
    const wL = new THREE.Mesh(wingGeo, yellowMat); wL.position.set(-0.08, -0.08, 0); wL.scale.set(0.8, 1.4, 0.8); wL.rotation.z = 0.25; wingLGroup.add(wL); root.add(wingLGroup);

    const wingRGroup = new THREE.Group(); wingRGroup.position.set(0.55, -0.20, 0.05);
    const wR = new THREE.Mesh(wingGeo, yellowMat); wR.position.set(0.10, 0.12, 0); wR.scale.set(0.8, 1.4, 0.8); wR.rotation.z = -0.25; wingRGroup.add(wR); root.add(wingRGroup);

    // Chân
    const footGeo = new THREE.SphereGeometry(0.11, 10, 10);
    const footL = new THREE.Mesh(footGeo, orangeFeetMat); footL.position.set(-0.16, -0.66, 0.08); footL.scale.set(1.0, 0.8, 1.35); root.add(footL);
    const footR = new THREE.Mesh(footGeo, orangeFeetMat); footR.position.set(0.16, -0.66, 0.08); footR.scale.set(1.0, 0.8, 1.35); root.add(footR);

    // Confetti
    const confettiColors = ['#F43F5E', '#FBBF24', '#34D399', '#38BDF8', '#A855F7', '#FB923C'];
    const confettiList = [];
    for (let i = 0; i < 14; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.055), new THREE.MeshBasicMaterial({ color: confettiColors[i % confettiColors.length], side: THREE.DoubleSide }));
      m.visible = false; root.add(m);
      confettiList.push({ mesh: m, startX: (Math.random() - 0.5) * 1.5, baseY: 0.8 + Math.random() * 0.8, speedX: (Math.random() - 0.5) * 0.02, speedY: 0.015 + Math.random() * 0.02, rotSpeed: 0.05 + Math.random() * 0.08, seed: Math.random() * 5 });
    }

    let animId = null;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      const st = statusRef.current;
      const eLen = emailRef.current;
      const gazeX = THREE.MathUtils.clamp((eLen - 10) * 0.005, -0.06, 0.06);
      let doWink = false;

      if (st === 'password') {
        wingLGroup.position.lerp(new THREE.Vector3(-0.20, 0.20, 0.72), 0.18);
        wingLGroup.rotation.set(0.1, 0.15, 1.35);
        wingRGroup.position.lerp(new THREE.Vector3(0.20, 0.20, 0.72), 0.18);
        wingRGroup.rotation.set(0.1, -0.15, -1.35);
        root.rotation.x = THREE.MathUtils.lerp(root.rotation.x, 0.18, 0.15);
        root.position.y = THREE.MathUtils.lerp(root.position.y, -0.08, 0.1);
        confettiList.forEach(c => { c.mesh.visible = false; });

      } else if (st === 'showPassword') {
        // Bé vịt hé mắt nhìn trộm — tay trái vẫn che, tay phải hạ xuống
        wingLGroup.position.lerp(new THREE.Vector3(-0.20, 0.20, 0.72), 0.18);
        wingLGroup.rotation.set(0.1, 0.15, 1.35);
        wingRGroup.position.lerp(new THREE.Vector3(0.48, -0.05, 0.25), 0.18);
        wingRGroup.rotation.set(0, 0, -0.3);
        root.rotation.z = THREE.MathUtils.lerp(root.rotation.z, -0.18, 0.12);
        root.rotation.x = THREE.MathUtils.lerp(root.rotation.x, 0.05, 0.12);
        confettiList.forEach(c => { c.mesh.visible = false; });

      } else if (st === 'email') {
        wingLGroup.position.lerp(new THREE.Vector3(-0.55, -0.20, 0.05), 0.15);
        wingLGroup.rotation.set(0, 0, 0.25);
        wingRGroup.position.lerp(new THREE.Vector3(0.55, -0.20, 0.05), 0.15);
        wingRGroup.rotation.set(0, 0, -0.25);
        const hd = 0.16 + Math.sin(elapsed * 6) * 0.03;
        root.rotation.x = THREE.MathUtils.lerp(root.rotation.x, hd, 0.15);
        root.rotation.y = THREE.MathUtils.lerp(root.rotation.y, gazeX * 3.5, 0.15);
        eyeL.position.x = -0.18 + gazeX;
        eyeR.position.x = 0.18 + gazeX;
        confettiList.forEach(c => { c.mesh.visible = false; });

      } else if (st === 'error') {
        const shake = Math.sin(elapsed * 16) * 0.22;
        root.rotation.y = shake;
        root.rotation.z = shake * 0.3;
        wingLGroup.position.lerp(new THREE.Vector3(-0.52, -0.30, 0), 0.15);
        wingRGroup.position.lerp(new THREE.Vector3(0.52, -0.30, 0), 0.15);
        confettiList.forEach(c => { c.mesh.visible = false; });

      } else if (st === 'success') {
        root.position.y = -0.05 + Math.abs(Math.sin(elapsed * 9)) * 0.38;
        wingLGroup.position.lerp(new THREE.Vector3(-0.52, 0.05, 0), 0.2);
        wingLGroup.rotation.set(0, 0, 1.6 + Math.sin(elapsed * 12) * 0.3);
        wingRGroup.position.lerp(new THREE.Vector3(0.52, 0.05, 0), 0.2);
        wingRGroup.rotation.set(0, 0, -1.6 - Math.sin(elapsed * 12) * 0.3);
        doWink = true;
        confettiList.forEach(c => {
          c.mesh.visible = true;
          const p = (elapsed * 2.2 + c.seed) % 1.8;
          c.mesh.position.set(c.startX + c.speedX * p * 45, c.baseY + c.speedY * p * 30 - 0.5 * 9.8 * Math.pow(p * 0.32, 2), Math.sin(elapsed * 2.5 + c.seed) * 0.5);
          c.mesh.rotation.x += c.rotSpeed;
          c.mesh.rotation.y += c.rotSpeed * 1.6;
        });

      } else {
        // idle
        root.position.y = -0.05 + Math.abs(Math.cos(elapsed * 3.6)) * 0.05;
        root.rotation.x = THREE.MathUtils.lerp(root.rotation.x, 0, 0.1);
        root.rotation.y = THREE.MathUtils.lerp(root.rotation.y, -0.08, 0.08);
        root.rotation.z = THREE.MathUtils.lerp(root.rotation.z, 0, 0.1);
        wingLGroup.position.lerp(new THREE.Vector3(-0.55, -0.20, 0.05), 0.15);
        wingLGroup.rotation.set(0, 0, 0.25);
        wingRGroup.position.lerp(new THREE.Vector3(0.55, -0.20, 0.05), 0.15);
        wingRGroup.rotation.set(0, 0, -0.55 - Math.sin(elapsed * 6 + 1.2) * 0.3);
        curlGroup.rotation.z = Math.sin(elapsed * 4.5) * 0.12;
        confettiList.forEach(c => { c.mesh.visible = false; });
      }

      eyeL.visible = !doWink; eyeR.visible = !doWink;
      winkL.visible = doWink; winkR.visible = doWink;

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      if (container.contains(dom)) container.removeChild(dom);
      renderer.dispose();
    };
  }, [width, height]);

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
