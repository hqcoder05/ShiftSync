import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

/**
 * FlowerMascot3DWeb.jsx — Bộ Đôi Mascot 3D Popmart Siêu Cưng Tương Tác
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. Bé Tròn Vàng Đội Bạch Tuộc Hồng (Ảnh 2 & 3):
 *    - Thân tròn múp míp, mũi đỏ nhỏ, má hồng tàn nhang, bé bạch tuộc hồng nảy nảy.
 * 2. Bé Vịt Vàng Mỏ Cam Lọn Tóc Xoăn (Ảnh mới):
 *    - Đầu to trùm mũ vàng, mặt trắng sứ, lọn tóc xoắn ốc vàng trên trán,
 *      mỏ vịt cam căng mọng, 2 má hồng pastel, 2 chân vịt cam tròn xoe.
 * 3. Tương tác & Trêu đùa qua lại:
 *    - Hai bé đứng cạnh nhau, nhìn nhau trò chuyện, nhún nhảy so le, vẫy tay chào.
 *    - Định kỳ quay sang nháy mắt với người dùng.
 * 4. Hiệu ứng khi rê chuột / chạm vào (Hover / Touch):
 *    - Phóng to, cả 2 bé cùng nhảy cẫng lên ăn mừng!
 *    - Bắn pháo giấy Confetti 3D ngũ sắc và các ngôi sao lấp lánh (sparkles) rực rỡ!
 *    - Kéo xoay 360 độ mượt mà.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default function FlowerMascot3DWeb({
  width = 200,
  height = 170,
  className = '',
  interactive = true,
}) {
  const mountRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const isDragging = useRef(false);
  const prevMouse = useRef({ x: 0, y: 0 });
  const rotVelocity = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
    camera.position.set(0, 0.1, 4.3); // Kéo camera gần hơn cho 2 nhân vật to rõ

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
    domElement.style.cursor = interactive ? 'grab' : 'default';
    container.appendChild(domElement);

    const ambientLight = new THREE.AmbientLight(0xfffdf5, 1.45);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
    keyLight.position.set(3, 5, 4);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xfef08a, 0.85);
    fillLight.position.set(-3, 3, 2);
    scene.add(fillLight);

    const rimPinkLight = new THREE.DirectionalLight(0xf43f5e, 0.5);
    rimPinkLight.position.set(2, 4, -3);
    scene.add(rimPinkLight);

    const rimCyanLight = new THREE.DirectionalLight(0x38bdf8, 0.4);
    rimCyanLight.position.set(-2, 2, -2);
    scene.add(rimCyanLight);

    // Materials (màu sắc vinyl popmart bóng mịn, nịnh mắt)
    const yellowMat = new THREE.MeshStandardMaterial({
      color: '#FFD426', // Vàng rực rỡ ấm áp
      roughness: 0.28,
      metalness: 0.05,
    });

    const creamFaceMat = new THREE.MeshStandardMaterial({
      color: '#FFFBEB',
      roughness: 0.35,
      metalness: 0.02,
    });

    const whitePorcelainMat = new THREE.MeshStandardMaterial({
      color: '#FFFFFF',
      roughness: 0.28,
      metalness: 0.02,
    });

    const orangeBeakMat = new THREE.MeshStandardMaterial({
      color: '#FB923C',
      roughness: 0.25,
      metalness: 0.08,
    });

    const orangeFeetMat = new THREE.MeshStandardMaterial({
      color: '#F97316',
      roughness: 0.35,
      metalness: 0.05,
    });

    const redNoseMat = new THREE.MeshStandardMaterial({
      color: '#EF4444',
      roughness: 0.25,
      metalness: 0.1,
    });

    const eyeBlackMat = new THREE.MeshStandardMaterial({
      color: '#18181B',
      roughness: 0.18,
      metalness: 0.1,
    });

    const eyeGlossMat = new THREE.MeshBasicMaterial({
      color: '#FFFFFF',
    });

    const blushPinkMat = new THREE.MeshStandardMaterial({
      color: '#FB7185',
      roughness: 0.5,
      metalness: 0.0,
    });

    const blushLavenderMat = new THREE.MeshStandardMaterial({
      color: '#F472B6',
      roughness: 0.5,
      metalness: 0.0,
    });

    const octopusMat = new THREE.MeshStandardMaterial({
      color: '#FB7185',
      roughness: 0.3,
      metalness: 0.05,
    });

    const darkMouthMat = new THREE.MeshStandardMaterial({
      color: '#991B1B',
      roughness: 0.3,
      metalness: 0.05,
    });

    const duoRoot = new THREE.Group();
    scene.add(duoRoot);

    // ── NHÂN VẬT 1: BÉ TRÒN VÀNG ĐỘI BẠCH TUỘC HỒNG (Bên Trái) ──
    const octoMascot = new THREE.Group();
    octoMascot.position.set(-0.70, -0.05, 0); // Đứng gần nhau thân thiết
    octoMascot.rotation.y = 0.28;
    duoRoot.add(octoMascot);

    const octoBodyGeo = new THREE.SphereGeometry(0.72, 22, 18);
    const octoBody = new THREE.Mesh(octoBodyGeo, yellowMat);
    octoBody.scale.set(1.08, 0.98, 0.96);
    octoMascot.add(octoBody);

    const octoFaceGeo = new THREE.SphereGeometry(0.54, 20, 18);
    const octoFace = new THREE.Mesh(octoFaceGeo, creamFaceMat);
    octoFace.position.set(0, 0.02, 0.28);
    octoFace.scale.set(0.96, 0.92, 0.88);
    octoMascot.add(octoFace);

    const octoNoseGeo = new THREE.SphereGeometry(0.052, 12, 12);
    const octoNose = new THREE.Mesh(octoNoseGeo, redNoseMat);
    octoNose.position.set(0, 0.02, 0.78);
    octoMascot.add(octoNose);

    const octoEyeGeo = new THREE.SphereGeometry(0.065, 12, 12);
    const octoGlossGeo = new THREE.SphereGeometry(0.022, 6, 6);

    const octoEyeL = new THREE.Group();
    octoEyeL.position.set(-0.19, 0.12, 0.74);
    const octoEyeLMesh = new THREE.Mesh(octoEyeGeo, eyeBlackMat);
    octoEyeLMesh.scale.set(0.85, 1.25, 0.85);
    octoEyeL.add(octoEyeLMesh);
    const octoGlossL = new THREE.Mesh(octoGlossGeo, eyeGlossMat);
    octoGlossL.position.set(-0.02, 0.035, 0.05);
    octoEyeL.add(octoGlossL);
    octoMascot.add(octoEyeL);

    const octoEyeR = new THREE.Group();
    octoEyeR.position.set(0.19, 0.12, 0.74);
    const octoEyeRMesh = new THREE.Mesh(octoEyeGeo, eyeBlackMat);
    octoEyeRMesh.scale.set(0.85, 1.25, 0.85);
    octoEyeR.add(octoEyeRMesh);
    const octoGlossR = new THREE.Mesh(octoGlossGeo, eyeGlossMat);
    octoGlossR.position.set(-0.02, 0.035, 0.05);
    octoEyeR.add(octoGlossR);
    octoMascot.add(octoEyeR);

    const octoWinkGeo = new THREE.TorusGeometry(0.065, 0.018, 6, 10, Math.PI);
    const octoWinkR = new THREE.Mesh(octoWinkGeo, eyeBlackMat);
    octoWinkR.position.set(0.19, 0.11, 0.75);
    octoWinkR.rotation.z = Math.PI;
    octoWinkR.visible = false;
    octoMascot.add(octoWinkR);

    const octoBlushGeo = new THREE.SphereGeometry(0.11, 10, 10);
    const octoBlushL = new THREE.Mesh(octoBlushGeo, blushPinkMat);
    octoBlushL.position.set(-0.29, -0.05, 0.70);
    octoBlushL.scale.set(1.2, 0.8, 0.3);
    octoMascot.add(octoBlushL);

    const octoBlushR = new THREE.Mesh(octoBlushGeo, blushPinkMat);
    octoBlushR.position.set(0.29, -0.05, 0.70);
    octoBlushR.scale.set(1.2, 0.8, 0.3);
    octoMascot.add(octoBlushR);

    const octoMouthGeo = new THREE.TorusGeometry(0.04, 0.015, 6, 10, Math.PI * 0.9);
    const octoMouth = new THREE.Mesh(octoMouthGeo, darkMouthMat);
    octoMouth.position.set(0.03, -0.09, 0.76);
    octoMouth.rotation.z = -0.2;
    octoMascot.add(octoMouth);

    const octoLegGeo = new THREE.CylinderGeometry(0.15, 0.14, 0.28, 12);
    const octoLegL = new THREE.Mesh(octoLegGeo, yellowMat);
    octoLegL.position.set(-0.26, -0.74, 0);
    octoMascot.add(octoLegL);

    const octoLegR = new THREE.Mesh(octoLegGeo, yellowMat);
    octoLegR.position.set(0.26, -0.74, 0);
    octoMascot.add(octoLegR);

    const octoArmGeo = new THREE.SphereGeometry(0.14, 10, 10);
    const octoArmL = new THREE.Mesh(octoArmGeo, yellowMat);
    octoArmL.position.set(-0.76, -0.1, 0);
    octoArmL.scale.set(0.8, 1.4, 0.8);
    octoArmL.rotation.z = 0.35;
    octoMascot.add(octoArmL);

    const octoArmR = new THREE.Mesh(octoArmGeo, yellowMat);
    octoArmR.position.set(0.76, -0.1, 0);
    octoArmR.scale.set(0.8, 1.4, 0.8);
    octoArmR.rotation.z = -0.35;
    octoMascot.add(octoArmR);

    const octoHat = new THREE.Group();
    octoHat.position.set(0.28, 0.66, 0.08);
    octoHat.rotation.z = -0.22;
    octoMascot.add(octoHat);

    const octHatHeadGeo = new THREE.SphereGeometry(0.28, 14, 14);
    const octHatHead = new THREE.Mesh(octHatHeadGeo, octopusMat);
    octHatHead.scale.set(1.1, 0.95, 1.0);
    octoHat.add(octHatHead);

    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const tGeo = new THREE.SphereGeometry(0.085, 8, 8);
      const t = new THREE.Mesh(tGeo, octopusMat);
      t.position.set(Math.sin(a) * 0.25, -0.18, Math.cos(a) * 0.25);
      octoHat.add(t);
    }

    const octEyeHatGeo = new THREE.SphereGeometry(0.035, 8, 8);
    const octHL = new THREE.Mesh(octEyeHatGeo, eyeBlackMat);
    octHL.position.set(-0.08, 0.05, 0.26);
    octoHat.add(octHL);
    const octHR = new THREE.Mesh(octEyeHatGeo, eyeBlackMat);
    octHR.position.set(0.08, 0.05, 0.26);
    octoHat.add(octHR);

    // ── NHÂN VẬT 2: BÉ VỊT VÀNG MỎ CAM LỌN TÓC XOĂN (Bên Phải) ──
    const duckMascot = new THREE.Group();
    duckMascot.position.set(0.70, -0.05, 0); // Đứng gần bé bạch tuộc
    duckMascot.rotation.y = -0.28;
    duoRoot.add(duckMascot);

    const duckHeadGeo = new THREE.SphereGeometry(0.78, 24, 20);
    const duckHead = new THREE.Mesh(duckHeadGeo, yellowMat);
    duckHead.position.set(0, 0.18, 0);
    duckHead.scale.set(1.04, 1.02, 1.0);
    duckMascot.add(duckHead);

    const duckFaceGeo = new THREE.SphereGeometry(0.60, 22, 20);
    const duckFace = new THREE.Mesh(duckFaceGeo, whitePorcelainMat);
    duckFace.position.set(0, 0.18, 0.26);
    duckFace.scale.set(1.0, 0.98, 0.92);
    duckMascot.add(duckFace);

    const curlGroup = new THREE.Group();
    curlGroup.position.set(0, 0.38, 0.74);
    const curlTorusGeo = new THREE.TorusGeometry(0.065, 0.022, 8, 16, Math.PI * 1.8);
    const curlTorus = new THREE.Mesh(curlTorusGeo, yellowMat);
    curlGroup.add(curlTorus);
    const curlWingGeo = new THREE.TorusGeometry(0.12, 0.022, 6, 12, Math.PI * 0.65);
    const curlWingL = new THREE.Mesh(curlWingGeo, yellowMat);
    curlWingL.position.set(-0.11, -0.03, 0);
    curlWingL.rotation.z = -0.6;
    curlGroup.add(curlWingL);
    const curlWingR = new THREE.Mesh(curlWingGeo, yellowMat);
    curlWingR.position.set(0.11, -0.03, 0);
    curlWingR.rotation.z = 0.6;
    curlWingR.scale.x = -1;
    curlGroup.add(curlWingR);
    duckMascot.add(curlGroup);

    const duckEyeGeo = new THREE.CylinderGeometry(0.038, 0.038, 0.11, 10);
    duckEyeGeo.rotateZ(Math.PI / 2);

    const duckEyeL = new THREE.Mesh(duckEyeGeo, eyeBlackMat);
    duckEyeL.position.set(-0.18, 0.22, 0.74);
    duckMascot.add(duckEyeL);

    const duckEyeR = new THREE.Mesh(duckEyeGeo, eyeBlackMat);
    duckEyeR.position.set(0.18, 0.22, 0.74);
    duckMascot.add(duckEyeR);

    const duckWinkGeo = new THREE.TorusGeometry(0.065, 0.018, 6, 10, Math.PI);
    const duckWinkR = new THREE.Mesh(duckWinkGeo, eyeBlackMat);
    duckWinkR.position.set(0.18, 0.22, 0.75);
    duckWinkR.rotation.z = Math.PI;
    duckWinkR.visible = false;
    duckMascot.add(duckWinkR);

    const beakGroup = new THREE.Group();
    beakGroup.position.set(0, 0.11, 0.76);
    const beakOuterGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.08, 16);
    beakOuterGeo.rotateX(Math.PI / 2);
    const beakOuter = new THREE.Mesh(beakOuterGeo, orangeBeakMat);
    beakOuter.scale.set(1.4, 0.85, 1.2);
    beakGroup.add(beakOuter);
    const beakInnerGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.082, 12);
    beakInnerGeo.rotateX(Math.PI / 2);
    const beakInner = new THREE.Mesh(beakInnerGeo, redNoseMat);
    beakInner.scale.set(1.4, 0.45, 1.25);
    beakGroup.add(beakInner);
    duckMascot.add(beakGroup);

    const duckBlushGeo = new THREE.SphereGeometry(0.09, 10, 10);
    const duckBlushL = new THREE.Mesh(duckBlushGeo, blushLavenderMat);
    duckBlushL.position.set(-0.28, 0.10, 0.68);
    duckBlushL.scale.set(1.3, 0.65, 0.3);
    duckMascot.add(duckBlushL);

    const duckBlushR = new THREE.Mesh(duckBlushGeo, blushLavenderMat);
    duckBlushR.position.set(0.28, 0.10, 0.68);
    duckBlushR.scale.set(1.3, 0.65, 0.3);
    duckMascot.add(duckBlushR);

    const duckBodyGeo = new THREE.CylinderGeometry(0.55, 0.76, 0.52, 18);
    const duckBody = new THREE.Mesh(duckBodyGeo, yellowMat);
    duckBody.position.set(0, -0.32, 0);
    duckMascot.add(duckBody);

    const duckWingGeo = new THREE.SphereGeometry(0.14, 10, 10);
    const duckWingL = new THREE.Mesh(duckWingGeo, yellowMat);
    duckWingL.position.set(-0.62, -0.28, 0.05);
    duckWingL.scale.set(0.7, 1.3, 0.7);
    duckWingL.rotation.z = 0.25;
    duckMascot.add(duckWingL);

    const duckWingR = new THREE.Mesh(duckWingGeo, yellowMat);
    duckWingR.position.set(0.62, -0.28, 0.05);
    duckWingR.scale.set(0.7, 1.3, 0.7);
    duckWingR.rotation.z = -0.25;
    duckMascot.add(duckWingR);

    const duckFootGeo = new THREE.SphereGeometry(0.11, 10, 10);
    const duckFootL = new THREE.Mesh(duckFootGeo, orangeFeetMat);
    duckFootL.position.set(-0.16, -0.66, 0.08);
    duckFootL.scale.set(1.0, 0.8, 1.35);
    duckMascot.add(duckFootL);

    const duckFootR = new THREE.Mesh(duckFootGeo, orangeFeetMat);
    duckFootR.position.set(0.16, -0.66, 0.08);
    duckFootR.scale.set(1.0, 0.8, 1.35);
    duckMascot.add(duckFootR);

    // ── PHÁO GIẤY CONFETTI & SPARKLES ──
    const fxGroup = new THREE.Group();
    duoRoot.add(fxGroup);

    const confettiColors = ['#F43F5E', '#FBBF24', '#34D399', '#38BDF8', '#A855F7', '#FB923C'];
    const confettiList = [];

    for (let i = 0; i < 24; i++) {
      const cGeo = new THREE.PlaneGeometry(0.09, 0.055);
      const cMat = new THREE.MeshBasicMaterial({
        color: confettiColors[i % confettiColors.length],
        side: THREE.DoubleSide,
      });
      const cMesh = new THREE.Mesh(cGeo, cMat);
      cMesh.visible = false;
      fxGroup.add(cMesh);

      confettiList.push({
        mesh: cMesh,
        speedX: (Math.random() - 0.5) * 0.045,
        speedY: 0.035 + Math.random() * 0.045,
        rotSpeed: (Math.random() - 0.5) * 0.15,
        startX: (Math.random() - 0.5) * 0.6,
        baseY: -0.2 + Math.random() * 0.4,
        seed: i * 0.4,
      });
    }

    const sparkleList = [];
    for (let i = 0; i < 8; i++) {
      const spGeo = new THREE.OctahedronGeometry(0.065, 0);
      const spMat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? '#FDE047' : '#FB7185',
      });
      const sp = new THREE.Mesh(spGeo, spMat);
      sp.visible = false;
      fxGroup.add(sp);
      sparkleList.push({ mesh: sp, seed: i * 0.75 });
    }

    // Interaction Handlers
    const onPointerDown = (e) => {
      isDragging.current = true;
      domElement.style.cursor = 'grabbing';
      const x = e.clientX ?? 0;
      const y = e.clientY ?? 0;
      prevMouse.current = { x, y };
      setIsHovered(true);
    };

    const onPointerMove = (e) => {
      if (!isDragging.current) return;
      const x = e.clientX ?? 0;
      const y = e.clientY ?? 0;
      const dx = x - prevMouse.current.x;
      const dy = y - prevMouse.current.y;
      prevMouse.current = { x, y };

      rotVelocity.current.y = dx * 0.012;
      rotVelocity.current.x = dy * 0.008;

      duoRoot.rotation.y += dx * 0.012;
      duoRoot.rotation.x = Math.max(-0.35, Math.min(0.35, duoRoot.rotation.x + dy * 0.008));
    };

    const onPointerUp = () => {
      isDragging.current = false;
      domElement.style.cursor = interactive ? 'grab' : 'default';
      setTimeout(() => setIsHovered(false), 1200);
    };

    const onMouseEnter = () => setIsHovered(true);
    const onMouseLeave = () => {
      if (!isDragging.current) setIsHovered(false);
    };

    if (interactive) {
      domElement.addEventListener('pointerdown', onPointerDown);
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      domElement.addEventListener('mouseenter', onMouseEnter);
      domElement.addEventListener('mouseleave', onMouseLeave);
    }

    let animId = null;
    let clock = new THREE.Clock();
    let timer = 0;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      if (!isDragging.current) {
        duoRoot.rotation.y += rotVelocity.current.y;
        rotVelocity.current.y *= 0.92;
        rotVelocity.current.x *= 0.92;
        duoRoot.rotation.y += 0.0025;
      }

      const freq = isHovered ? 6.8 : 3.4;
      const bounceAmp = isHovered ? 0.14 : 0.055;

      octoMascot.position.y = -0.05 + Math.abs(Math.sin(elapsed * freq)) * bounceAmp;
      octoMascot.rotation.z = Math.sin(elapsed * freq) * (isHovered ? 0.08 : 0.04);
      octoArmR.rotation.z = -0.35 - Math.sin(elapsed * (freq + 2)) * (isHovered ? 0.6 : 0.28);
      octoHat.position.y = 0.66 + Math.sin(elapsed * (freq * 1.6)) * 0.035;

      duckMascot.position.y = -0.05 + Math.abs(Math.cos(elapsed * freq)) * bounceAmp;
      duckMascot.rotation.z = -Math.sin(elapsed * freq) * (isHovered ? 0.08 : 0.04);
      duckWingL.rotation.z = 0.25 + Math.sin(elapsed * (freq + 2)) * (isHovered ? 0.6 : 0.28);
      curlGroup.rotation.z = Math.sin(elapsed * 4.5) * 0.12;

      const talkAngle = Math.sin(elapsed * 1.5) * 0.15;
      octoMascot.rotation.y = 0.25 + talkAngle;
      duckMascot.rotation.y = -0.25 - talkAngle;

      const targetScale = isHovered ? 1.18 : 1.0;
      duoRoot.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.14);

      timer += 0.016;
      const cycle = timer % 6.5;

      if (isHovered) {
        octoEyeR.visible = false;
        octoWinkR.visible = true;
        duckEyeR.visible = false;
        duckWinkR.visible = true;
      } else if (cycle > 4.2 && cycle < 5.6) {
        octoEyeR.visible = false;
        octoWinkR.visible = true;
        duckEyeR.visible = true;
        duckWinkR.visible = false;
      } else if (cycle > 1.8 && cycle < 3.2) {
        octoEyeR.visible = true;
        octoWinkR.visible = false;
        duckEyeR.visible = false;
        duckWinkR.visible = true;
      } else {
        octoEyeR.visible = true;
        octoWinkR.visible = false;
        duckEyeR.visible = true;
        duckWinkR.visible = false;
      }

      confettiList.forEach((c, idx) => {
        if (isHovered) {
          c.mesh.visible = true;
          const progress = ((elapsed * 1.8 + c.seed) % 1.6);
          c.mesh.position.set(
            c.startX + c.speedX * progress * 40,
            c.baseY + c.speedY * progress * 32 - 0.5 * 9.8 * Math.pow(progress * 0.35, 2),
            Math.sin(elapsed * 2 + idx) * 0.5
          );
          c.mesh.rotation.x += c.rotSpeed;
          c.mesh.rotation.y += c.rotSpeed * 1.5;
        } else {
          c.mesh.visible = false;
        }
      });

      sparkleList.forEach((s, idx) => {
        // 3 ngôi sao đầu tiên luôn lấp lánh nhẹ nhàng quanh 2 bé
        const alwaysVisible = idx < 3;
        if (isHovered || alwaysVisible) {
          s.mesh.visible = true;
          const spSpeed = isHovered ? 3.0 : 1.2;
          const a = elapsed * spSpeed + s.seed;
          const radius = alwaysVisible && !isHovered ? 1.0 + (idx % 2) * 0.2 : 1.2 + (idx % 3) * 0.25;
          s.mesh.position.set(
            Math.cos(a) * radius,
            0.55 + Math.sin(elapsed * (spSpeed * 1.2) + idx) * 0.45,
            Math.sin(a) * 0.5
          );
          const spin = isHovered ? 0.09 : 0.04;
          s.mesh.rotation.y += spin;
          s.mesh.rotation.x += spin * 0.7;
          const scaleVal = isHovered ? 1.2 : 0.8 + Math.sin(elapsed * 4 + idx) * 0.25;
          s.mesh.scale.set(scaleVal, scaleVal, scaleVal);
        } else {
          s.mesh.visible = false;
        }
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
        domElement.removeEventListener('mouseenter', onMouseEnter);
        domElement.removeEventListener('mouseleave', onMouseLeave);
      }
      if (container.contains(domElement)) {
        container.removeChild(domElement);
      }
      renderer.dispose();
    };
  }, [width, height, interactive, isHovered]);

  return (
    <div
      ref={mountRef}
      className={className}
      style={{
        width,
        height,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'visible',
      }}
    />
  );
}
