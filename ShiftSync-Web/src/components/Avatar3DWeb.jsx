import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { getAvatar3DProps } from './avatarConfigs';

/**
 * Avatar3DWeb
 * ─────────────────────────────────────────────────────────────────────────────
 * Component hiển thị Avatar 3D Low-Poly thời gian thực trên nền tảng Web.
 * Sử dụng thuần Three.js để tối ưu 100% hiệu năng, hỗ trợ React 19 mượt mà,
 * không viền tròn và phản hồi hiệu ứng rê chuột (Hover) phóng to sinh động.
 * 
 * Hỗ trợ 18 mẫu nhân vật đa dạng (mũ len beanie, nón lưỡi trai cap, tai nghe
 * gaming, kính tri thức, râu quai nón...) kèm biểu cảm liên tục:
 * - Chớp mắt (blink)
 * - Nháy mắt tinh nghịch (wink)
 * - Há miệng 'Oh' ngạc nhiên (surprise)
 * - Cười tươi rạng ngời (grin/smile)
 * ─────────────────────────────────────────────────────────────────────────────
 */
// Silence Fiber & Three.js internal warnings
if (typeof window !== 'undefined' && !window.__ss_clock_filter_installed) {
  window.__ss_clock_filter_installed = true;
  const _origWarn = console.warn;
  console.warn = (...args) => {
    if (typeof args[0] === 'string' && (args[0].includes('THREE.Clock') || args[0].includes('WEBGL_lose_context'))) {
      return;
    }
    _origWarn.apply(console, args);
  };
}

export default function Avatar3DWeb({
  avatarId,
  size = 60,
  skinColor,
  hairColor,
  hairStyle,
  accessory,
  accessoryColor,
  eyeColor,
  eyeShape,
  noseStyle,
  mouthStyle,
  interactive = true,
}) {
  const mountRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const mousePos = useRef({ x: 0, y: 0 });

  // Resolve props từ avatarId nếu có
  const resolved = avatarId ? getAvatar3DProps(avatarId) : {};
  const skin = skinColor || resolved.skinColor || '#F4C5A3';
  const hairC = hairColor || resolved.hairColor || '#2b2b2b';
  const hairS = hairStyle || resolved.hairStyle || 'short';
  const acc = accessory || resolved.accessory || 'none';
  const accC = accessoryColor || resolved.accessoryColor || '#FBC02D';
  const eyeC = eyeColor || resolved.eyeColor || '#3A86FF';
  const eyeS = eyeShape || resolved.eyeShape || 'almond';
  const noseS = noseStyle || resolved.noseStyle || 'button';
  const mouthS = mouthStyle || resolved.mouthStyle || 'smile';

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 3.5);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight.position.set(2.5, 3.5, 4);
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0xffd8b8, 0.5);
    pointLight.position.set(-2.5, 1, 2);
    scene.add(pointLight);

    // Root Group
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    const headGroup = new THREE.Group();
    rootGroup.add(headGroup);

    // 1. Head (Low-Poly faceted sphere: 8x7)
    const headGeo = new THREE.SphereGeometry(1, 8, 7);
    const headMat = new THREE.MeshStandardMaterial({
      color: skin,
      roughness: 0.65,
      metalness: 0.02,
      flatShading: true,
    });
    const headMesh = new THREE.Mesh(headGeo, headMat);
    headGroup.add(headMesh);

    // 2. Ears
    const earGeo = new THREE.BoxGeometry(0.18, 0.28, 0.15);
    const earMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.7, flatShading: true });
    const leftEar = new THREE.Mesh(earGeo, earMat);
    leftEar.position.set(-1.02, 0.05, 0);
    const rightEar = new THREE.Mesh(earGeo, earMat);
    rightEar.position.set(1.02, 0.05, 0);
    headGroup.add(leftEar, rightEar);

    // 3. Hair & Accessories
    const hairMat = new THREE.MeshStandardMaterial({ color: hairC, roughness: 0.65, flatShading: true });
    const accMat = new THREE.MeshStandardMaterial({ color: accC, roughness: 0.5, flatShading: true });
    const hairGroup = new THREE.Group();

    if (hairS === 'short') {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(1, 7, 5, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat);
      cap.position.set(0, 0.58, -0.05);
      cap.scale.set(1.04, 0.58, 1.04);
      const bangs = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 5), hairMat);
      bangs.position.set(0, 0.65, 0.62);
      bangs.rotation.x = 0.4;
      bangs.scale.set(0.85, 0.28, 0.35);
      hairGroup.add(cap, bangs);
    } else if (hairS === 'bun') {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(1, 6, 5, 0, Math.PI * 2, 0, Math.PI * 0.5), hairMat);
      cap.position.set(0, 0.54, -0.05);
      cap.scale.set(1.04, 0.4, 1.04);
      const bun = new THREE.Mesh(new THREE.IcosahedronGeometry(0.38, 0), hairMat);
      bun.position.set(0, 1.38, -0.12);
      hairGroup.add(cap, bun);
    } else if (hairS === 'mohawk') {
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.45, 0.75), hairMat);
      base.position.set(0, 0.92, 0.1);
      const crest = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.52, 0.45), hairMat);
      crest.position.set(0, 1.36, 0.04);
      hairGroup.add(base, crest);
    } else if (hairS === 'long') {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(1, 7, 5, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat);
      cap.position.set(0, 0.55, -0.05);
      cap.scale.set(1.05, 0.6, 1.05);
      const lockL = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.4, 1, 5), hairMat);
      lockL.position.set(-0.85, -0.8, -0.15);
      lockL.scale.set(0.3, 1.3, 0.25);
      const lockR = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.4, 1, 5), hairMat);
      lockR.position.set(0.85, -0.8, -0.15);
      lockR.scale.set(0.3, 1.3, 0.25);
      hairGroup.add(cap, lockL, lockR);
    } else if (hairS === 'pigtails') {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(1, 6, 5, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat);
      cap.position.set(0, 0.54, -0.05);
      cap.scale.set(1.04, 0.48, 1.04);
      const puffL = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34, 0), hairMat);
      puffL.position.set(-0.85, 0.92, -0.1);
      const puffR = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34, 0), hairMat);
      puffR.position.set(0.85, 0.92, -0.1);
      hairGroup.add(cap, puffL, puffR);
    } else if (hairS === 'curly') {
      const curls = [
        [0, 1.18, 0, 0.32],
        [-0.48, 1.08, 0.3, 0.28],
        [0.48, 1.08, 0.3, 0.28],
        [-0.8, 0.88, -0.1, 0.28],
        [0.8, 0.88, -0.1, 0.28],
        [0, 0.98, 0.72, 0.27],
      ];
      curls.forEach(([x, y, z, r]) => {
        const c = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), hairMat);
        c.position.set(x, y, z);
        hairGroup.add(c);
      });
    } else if (hairS === 'afro') {
      const afro = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), hairMat);
      afro.position.set(0, 0.35, -0.05);
      afro.scale.set(1.28, 1.24, 1.25);
      hairGroup.add(afro);
    } else if (hairS === 'wavy') {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(1, 6, 5, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat);
      cap.position.set(0, 0.58, -0.05);
      cap.scale.set(1.05, 0.55, 1.05);
      const waveL = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1, 4), hairMat);
      waveL.position.set(-0.7, 0.4, 0.5);
      waveL.rotation.set(0.3, 0.2, -0.4);
      waveL.scale.set(0.4, 0.8, 0.3);
      const waveR = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1, 4), hairMat);
      waveR.position.set(0.7, 0.4, 0.5);
      waveR.rotation.set(0.3, -0.2, 0.4);
      waveR.scale.set(0.4, 0.8, 0.3);
      hairGroup.add(cap, waveL, waveR);
    } else if (hairS === 'spiky') {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(1, 6, 5, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat);
      cap.position.set(0, 0.56, -0.05);
      cap.scale.set(1.04, 0.5, 1.04);
      hairGroup.add(cap);
      [
        [0, 1.35, 0, 0, 0, 0.3],
        [-0.4, 1.25, 0.2, 0.2, -0.2, 0.26],
        [0.4, 1.25, 0.2, 0.2, 0.2, 0.26],
        [0, 1.25, 0.4, 0.35, 0, 0.28],
      ].forEach(([x, y, z, rx, rz, h]) => {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.18, h * 2, 4), hairMat);
        spike.position.set(x, y, z);
        spike.rotation.set(rx, 0, rz);
        hairGroup.add(spike);
      });
    } else if (hairS === 'beanie') {
      // Mũ len Beanie
      const bangs = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.18, 0.2), hairMat);
      bangs.position.set(0, 0.48, 0.72);
      bangs.rotation.x = 0.3;
      const beanieDome = new THREE.Mesh(new THREE.SphereGeometry(1, 7, 5, 0, Math.PI * 2, 0, Math.PI * 0.6), accMat);
      beanieDome.position.set(0, 0.72, -0.05);
      beanieDome.scale.set(1.08, 0.75, 1.08);
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 7), accMat);
      brim.position.set(0, 0.5, -0.02);
      brim.scale.set(1.12, 0.18, 1.12);
      hairGroup.add(bangs, beanieDome, brim);
    } else if (hairS === 'cap') {
      // Mũ Snapback Cap
      const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 7, 5, 0, Math.PI * 2, 0, Math.PI * 0.52), accMat);
      dome.position.set(0, 0.62, -0.05);
      dome.scale.set(1.06, 0.52, 1.06);
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.06, 0.65), accMat);
      visor.position.set(0, 0.45, 1.08);
      visor.rotation.x = -0.15;
      hairGroup.add(dome, visor);
    } else if (hairS === 'bob') {
      // Tóc Bob ngắn ôm má
      const cap = new THREE.Mesh(new THREE.SphereGeometry(1, 7, 5, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat);
      cap.position.set(0, 0.56, -0.05);
      cap.scale.set(1.06, 0.58, 1.06);
      const sideL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.9, 0.45), hairMat);
      sideL.position.set(-0.88, -0.15, 0.1);
      sideL.rotation.z = 0.12;
      const sideR = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.9, 0.45), hairMat);
      sideR.position.set(0.88, -0.15, 0.1);
      sideR.rotation.z = -0.12;
      hairGroup.add(cap, sideL, sideR);
    } else if (hairS === 'ponytail') {
      // Đuôi ngựa cao
      const cap = new THREE.Mesh(new THREE.SphereGeometry(1, 7, 5, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat);
      cap.position.set(0, 0.56, -0.05);
      cap.scale.set(1.05, 0.55, 1.05);
      const tail = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 4), hairMat);
      tail.position.set(0, 0.65, -1.25);
      tail.rotation.x = 0.45;
      tail.scale.set(0.32, 1.1, 0.28);
      hairGroup.add(cap, tail);
    } else if (hairS === 'dreadlocks') {
      // Dreadlocks
      const cap = new THREE.Mesh(new THREE.SphereGeometry(1, 7, 5, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat);
      cap.position.set(0, 0.55, -0.05);
      cap.scale.set(1.05, 0.52, 1.05);
      hairGroup.add(cap);
      [
        [-0.75, -0.2, 0.3, 0.15],
        [-0.9, -0.4, -0.1, 0.2],
        [0.75, -0.2, 0.3, -0.15],
        [0.9, -0.4, -0.1, -0.2],
        [0, -0.5, -0.9, 0],
      ].forEach(([x, y, z, rz]) => {
        const loc = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.5, 1, 4), hairMat);
        loc.position.set(x, y, z);
        loc.rotation.z = rz;
        loc.scale.set(0.16, 0.9, 0.16);
        hairGroup.add(loc);
      });
    } else {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(1, 7, 5, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat);
      cap.position.set(0, 0.58, -0.05);
      cap.scale.set(1.04, 0.58, 1.04);
      hairGroup.add(cap);
    }

    // Extra Accessories (Headphones, Glasses, Beard)
    if (acc === 'headphones') {
      const band = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.12, 0.18), accMat);
      band.position.set(0, 0.95, 0);
      const cupL = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 6), accMat);
      cupL.position.set(-1.12, 0.1, 0);
      cupL.scale.set(0.22, 0.46, 0.38);
      const cupR = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 6), accMat);
      cupR.position.set(1.12, 0.1, 0);
      cupR.scale.set(0.22, 0.46, 0.38);
      hairGroup.add(band, cupL, cupR);
    } else if (acc === 'glasses') {
      const glassGroup = new THREE.Group();
      glassGroup.position.set(0, 0.12, 0.98);
      const rimL = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.28, 0.05), accMat);
      rimL.position.set(-0.34, 0, 0);
      const rimR = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.28, 0.05), accMat);
      rimR.position.set(0.34, 0, 0);
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.04, 0.04), accMat);
      bridge.position.set(0, 0.04, 0);
      glassGroup.add(rimL, rimR, bridge);
      hairGroup.add(glassGroup);
    } else if (acc === 'beard') {
      const beard = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.28, 0.42), hairMat);
      beard.position.set(0, -0.48, 0.75);
      const stache = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 0.1), hairMat);
      stache.position.set(0, -0.22, 0.96);
      hairGroup.add(beard, stache);
    }

    headGroup.add(hairGroup);

    // 4. Eyebrows
    const browGeo = new THREE.BoxGeometry(0.26, 0.05, 0.06);
    const browMat = new THREE.MeshStandardMaterial({ color: hairC, roughness: 0.7, flatShading: true });
    const browL = new THREE.Mesh(browGeo, browMat);
    browL.position.set(-0.34, 0.34, 0.94);
    browL.rotation.set(0.2, 0, -0.15);
    const browR = new THREE.Mesh(browGeo, browMat);
    browR.position.set(0.34, 0.34, 0.94);
    browR.rotation.set(0.2, 0, 0.15);
    const browGroup = new THREE.Group();
    browGroup.add(browL, browR);
    headGroup.add(browGroup);

    // 5. Eyes
    const eyeRadius = eyeS === 'wide' ? 0.17 : 0.15;
    const eyeGroup = new THREE.Group();

    const createEye = (x) => {
      const g = new THREE.Group();
      g.position.set(x, 0.1, 0.88);

      const whiteGeo = new THREE.SphereGeometry(eyeRadius, 8, 6);
      const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.15, flatShading: true });
      const whiteMesh = new THREE.Mesh(whiteGeo, whiteMat);
      if (eyeS === 'almond') whiteMesh.scale.set(1.25, 0.72, 1);
      g.add(whiteMesh);

      const pupilGeo = new THREE.SphereGeometry(eyeRadius * 0.52, 6, 5);
      const pupilMat = new THREE.MeshStandardMaterial({ color: eyeC, roughness: 0.3, flatShading: true });
      const pupilMesh = new THREE.Mesh(pupilGeo, pupilMat);
      pupilMesh.position.set(0, 0, eyeRadius * 0.62);
      g.add(pupilMesh);

      const glintGeo = new THREE.BoxGeometry(0.045, 0.045, 0.045);
      const glintMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1 });
      const glintMesh = new THREE.Mesh(glintGeo, glintMat);
      glintMesh.position.set(eyeRadius * 0.22, eyeRadius * 0.25, eyeRadius * 0.85);
      g.add(glintMesh);

      return g;
    };

    const eyeL = createEye(-0.34);
    const eyeR = createEye(0.34);
    eyeGroup.add(eyeL, eyeR);
    headGroup.add(eyeGroup);

    // 6. Nose
    const noseMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.7, flatShading: true });
    let noseMesh;
    if (noseS === 'broad') {
      noseMesh = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.12), noseMat);
      noseMesh.position.set(0, -0.07, 0.98);
    } else if (noseS === 'pointed') {
      noseMesh = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.18, 4), noseMat);
      noseMesh.position.set(0, -0.04, 1.04);
      noseMesh.rotation.x = -0.3;
    } else {
      noseMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 0), noseMat);
      noseMesh.position.set(0, -0.06, 1.0);
    }
    headGroup.add(noseMesh);

    // 7. Mouth (Biểu cảm linh hoạt)
    const mouthMat = new THREE.MeshStandardMaterial({ color: 0xc75650, roughness: 0.6, flatShading: true });
    const mouthGroup = new THREE.Group();
    mouthGroup.position.set(0, -0.29, 0.93);

    const normalMouth = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.042, 4, 8, Math.PI), mouthMat);
    normalMouth.rotation.z = Math.PI;
    mouthGroup.add(normalMouth);

    const surprisedMouth = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.05, 4, 8), mouthMat);
    surprisedMouth.scale.set(1, 1.25, 1);
    surprisedMouth.visible = false;
    mouthGroup.add(surprisedMouth);

    headGroup.add(mouthGroup);

    // Animation Loop with Emotion Cycle (Blink, Wink, Surprise Oh, Smile)
    let animId;
    let lastTime = performance.now();
    let currentScaleVal = 1.15;

    // Expression state
    let exprMode = 'idle'; // 'idle' | 'blink' | 'wink' | 'surprise'
    let exprTimer = 0;
    let exprDuration = 0.2;
    let nextExprSwitch = 2.0 + Math.random() * 2.5;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const now = performance.now();
      const delta = Math.min((now - lastTime) * 0.001, 0.1);
      lastTime = now;
      const elapsed = now * 0.001;

      // State machine for expression lifecycle
      nextExprSwitch -= delta;
      if (exprMode !== 'idle') {
        exprTimer += delta;
        if (exprTimer >= exprDuration) {
          exprMode = 'idle';
          exprTimer = 0;
          nextExprSwitch = 2.0 + Math.random() * 3.0;
        }
      } else if (nextExprSwitch <= 0) {
        const dice = Math.random();
        if (dice < 0.4) {
          // Chớp mắt
          exprMode = 'blink';
          exprDuration = 0.16;
          exprTimer = 0;
        } else if (dice < 0.72) {
          // Nháy mắt tinh nghịch (Wink)
          exprMode = 'wink';
          exprDuration = 0.42;
          exprTimer = 0;
        } else {
          // Ngạc nhiên há miệng "Oh!"
          exprMode = 'surprise';
          exprDuration = 0.65;
          exprTimer = 0;
        }
      }

      // Eye movements according to mode
      if (exprMode === 'blink') {
        const prog = exprTimer / exprDuration;
        const sY = Math.max(0.06, 1 - Math.sin(Math.PI * prog) * 1.35);
        eyeL.scale.y = sY;
        eyeR.scale.y = sY;
      } else if (exprMode === 'wink') {
        // Nháy mắt trái, mắt phải mở to
        const prog = exprTimer / exprDuration;
        const sY = Math.max(0.06, 1 - Math.sin(Math.PI * prog) * 1.4);
        eyeL.scale.y = sY;
        eyeR.scale.y = 1.15;
      } else if (exprMode === 'surprise') {
        eyeL.scale.y = 1.3;
        eyeR.scale.y = 1.3;
      } else {
        eyeL.scale.y = 1;
        eyeR.scale.y = 1;
      }

      // Mouth according to mode
      if (exprMode === 'surprise') {
        normalMouth.visible = false;
        surprisedMouth.visible = true;
        surprisedMouth.scale.set(1.3, 1.4, 1);
      } else {
        normalMouth.visible = true;
        surprisedMouth.visible = false;
      }

      // Eyebrows height
      if (isHovered) {
        browGroup.position.y = 0.1;
      } else if (exprMode === 'surprise') {
        browGroup.position.y = 0.15;
      } else {
        browGroup.position.y = Math.sin(elapsed * 2.0) * 0.02;
      }

      // Hover scale & tilt
      const targetScale = isHovered ? 1.38 : 1.15;
      currentScaleVal += (targetScale - currentScaleVal) * 0.1;
      const breathe = Math.sin(elapsed * 1.5) * 0.02;
      rootGroup.scale.set(
        currentScaleVal + breathe,
        currentScaleVal + breathe,
        currentScaleVal + breathe
      );

      // Bounce & Sway
      const bounceSpeed = isHovered ? 5.2 : 3.2;
      const bounceAmp = isHovered ? 0.13 : 0.07;
      headGroup.position.y = Math.sin(elapsed * bounceSpeed) * bounceAmp - 0.18;
      headGroup.rotation.z = Math.sin(elapsed * 1.8) * 0.04;

      // Mouse tracking tilt when hovered
      if (isHovered && interactive) {
        headGroup.rotation.y += (mousePos.current.x * 0.4 - headGroup.rotation.y) * 0.08;
        headGroup.rotation.x += (-mousePos.current.y * 0.25 - headGroup.rotation.x) * 0.08;
      } else {
        const idleRotY = Math.sin(elapsed * 0.6) * 0.15;
        headGroup.rotation.y += (idleRotY - headGroup.rotation.y) * 0.05;
        headGroup.rotation.x += (0 - headGroup.rotation.x) * 0.05;
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      try {
        renderer.forceContextLoss?.();
        renderer.dispose();
      } catch (e) { /* ignore */ }
      headGeo.dispose();
      headMat.dispose();
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, [size, skin, hairC, hairS, acc, accC, eyeC, eyeS, noseS, mouthS, isHovered, interactive]);

  const handleMouseMove = (e) => {
    if (!interactive || !mountRef.current) return;
    const rect = mountRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    mousePos.current = { x, y };
  };

  return (
    <div
      ref={mountRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        mousePos.current = { x: 0, y: 0 };
      }}
      onMouseMove={handleMouseMove}
      style={{
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: interactive ? 'pointer' : 'default',
        background: 'transparent',
        userSelect: 'none',
      }}
    />
  );
}
