import { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { getAvatar3DProps, getAvatarForEmployee, AVATAR_OPTIONS } from './avatarConfigs';
import { getAvatarThumbnail } from './avatarThumbnails';

/**
 * Avatar3DWeb
 * ─────────────────────────────────────────────────────────────────────────────
 * Component hiển thị Avatar 3D Low-Poly thời gian thực trên nền tảng Web.
 * 
 * Kiến trúc Hybrid thông minh:
 * - Kích thước lớn (size >= 70 & interactive): Khởi chạy WebGL Three.js tương tác
 *   thời gian thực, theo dõi chuột (head tilt) và chu kỳ biểu cảm chớp mắt/cười.
 * - Kích thước nhỏ / Bảng danh sách / Ma trận ca (size < 70): Tự động render qua
 *   3D WebGL snapshot cache siêu mượt 60 FPS, không tiêu tốn WebGL context,
 *   ngăn chặn triệt để lỗi WebGL context exhaustion khi hiển thị hàng chục nhân sự.
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

// Global 3D snapshot cache
const snapshotCache = new Map();

// Helper to build 3D Head Mesh
function buildAvatarHeadMesh(props) {
  const skin = props.skinColor || '#F4C5A3';
  const hairC = props.hairColor || '#2b2b2b';
  const hairS = props.hairStyle || 'short';
  const acc = props.accessory || 'none';
  const accC = props.accessoryColor || '#FBC02D';
  const eyeC = props.eyeColor || '#3A86FF';
  const eyeS = props.eyeShape || 'almond';
  const noseS = props.noseStyle || 'button';

  const headGroup = new THREE.Group();

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
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 7, 5, 0, Math.PI * 2, 0, Math.PI * 0.52), accMat);
    dome.position.set(0, 0.62, -0.05);
    dome.scale.set(1.06, 0.52, 1.06);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.06, 0.65), accMat);
    visor.position.set(0, 0.45, 1.08);
    visor.rotation.x = -0.15;
    hairGroup.add(dome, visor);
  } else if (hairS === 'bob') {
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
    const cap = new THREE.Mesh(new THREE.SphereGeometry(1, 7, 5, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat);
    cap.position.set(0, 0.56, -0.05);
    cap.scale.set(1.05, 0.55, 1.05);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 4), hairMat);
    tail.position.set(0, 0.65, -1.25);
    tail.rotation.x = 0.45;
    tail.scale.set(0.32, 1.1, 0.28);
    hairGroup.add(cap, tail);
  } else if (hairS === 'dreadlocks') {
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

  // Extra Accessories
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

  // 7. Mouth
  const mouthMat = new THREE.MeshStandardMaterial({ color: 0xc75650, roughness: 0.6, flatShading: true });
  const mouthGroup = new THREE.Group();
  mouthGroup.position.set(0, -0.29, 0.93);
  const normalMouth = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.042, 4, 8, Math.PI), mouthMat);
  normalMouth.rotation.z = Math.PI;
  mouthGroup.add(normalMouth);
  headGroup.add(mouthGroup);

  return { headGroup, eyeL, eyeR, normalMouth, browGroup };
}

export default function Avatar3DWeb({
  avatarId,
  name,
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
  interactive = false,
  className = '',
  style = {},
}) {
  const mountRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [webglError, setWebglError] = useState(false);
  const mousePos = useRef({ x: 0, y: 0 });

  // Resolve safe avatar id
  const resolvedAvatarId = useMemo(() => {
    if (avatarId && typeof avatarId === 'string') return avatarId;
    if (name) return getAvatarForEmployee(name);
    return 'dilan';
  }, [avatarId, name]);

  // Resolve props từ avatarId nếu có
  const resolved = useMemo(() => (resolvedAvatarId ? getAvatar3DProps(resolvedAvatarId) : {}), [resolvedAvatarId]);
  const finalProps = useMemo(() => ({
    skinColor: skinColor || resolved.skinColor || '#F4C5A3',
    hairColor: hairColor || resolved.hairColor || '#2b2b2b',
    hairStyle: hairStyle || resolved.hairStyle || 'short',
    accessory: accessory || resolved.accessory || 'none',
    accessoryColor: accessoryColor || resolved.accessoryColor || '#FBC02D',
    eyeColor: eyeColor || resolved.eyeColor || '#3A86FF',
    eyeShape: eyeShape || resolved.eyeShape || 'almond',
    noseStyle: noseStyle || resolved.noseStyle || 'button',
    mouthStyle: mouthStyle || resolved.mouthStyle || 'smile',
  }), [skinColor, hairColor, hairStyle, accessory, accessoryColor, eyeColor, eyeShape, noseStyle, mouthStyle, resolved]);

  // Determine if full live WebGL should be used
  const shouldRenderLiveWebGL = Boolean(interactive && size >= 70 && !webglError);

  // Pre-rendered 3D Snapshot for instant 60 FPS rendering without WebGL context exhaustion
  const snapshotUri = useMemo(() => {
    try {
      return getAvatarThumbnail(resolvedAvatarId);
    } catch (e) {
      return null;
    }
  }, [resolvedAvatarId]);

  useEffect(() => {
    if (!shouldRenderLiveWebGL) return;
    const container = mountRef.current;
    if (!container) return;

    let renderer, animId;
    try {
      // Scene & Camera
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      camera.position.set(0, 0, 3.5);

      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
      renderer.setSize(size, size);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

      // Handle WebGL context loss safely
      renderer.domElement.addEventListener('webglcontextlost', (e) => {
        e.preventDefault();
        setWebglError(true);
      });

      container.innerHTML = '';
      container.appendChild(renderer.domElement);

      const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
      scene.add(ambientLight);

      const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
      dirLight.position.set(2.5, 3.5, 4);
      scene.add(dirLight);

      const pointLight = new THREE.PointLight(0xffd8b8, 0.5);
      pointLight.position.set(-2.5, 1, 2);
      scene.add(pointLight);

      const rootGroup = new THREE.Group();
      scene.add(rootGroup);

      const { headGroup, eyeL, eyeR, normalMouth, browGroup } = buildAvatarHeadMesh(finalProps);
      rootGroup.add(headGroup);

      let lastTime = performance.now();
      let currentScaleVal = 1.15;
      let exprMode = 'idle';
      let exprTimer = 0;
      let exprDuration = 0.2;
      let nextExprSwitch = 2.0 + Math.random() * 2.5;

      const animate = () => {
        animId = requestAnimationFrame(animate);
        const now = performance.now();
        const delta = Math.min((now - lastTime) * 0.001, 0.1);
        lastTime = now;
        const elapsed = now * 0.001;

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
            exprMode = 'blink';
            exprDuration = 0.16;
            exprTimer = 0;
          } else if (dice < 0.72) {
            exprMode = 'wink';
            exprDuration = 0.42;
            exprTimer = 0;
          } else {
            exprMode = 'surprise';
            exprDuration = 0.65;
            exprTimer = 0;
          }
        }

        if (exprMode === 'blink') {
          const prog = exprTimer / exprDuration;
          const sY = Math.max(0.06, 1 - Math.sin(Math.PI * prog) * 1.35);
          eyeL.scale.y = sY;
          eyeR.scale.y = sY;
        } else if (exprMode === 'wink') {
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

        if (isHovered) {
          browGroup.position.y = 0.1;
        } else if (exprMode === 'surprise') {
          browGroup.position.y = 0.15;
        } else {
          browGroup.position.y = Math.sin(elapsed * 2.0) * 0.02;
        }

        const targetScale = isHovered ? 1.38 : 1.15;
        currentScaleVal += (targetScale - currentScaleVal) * 0.1;
        const breathe = Math.sin(elapsed * 1.5) * 0.02;
        rootGroup.scale.set(
          currentScaleVal + breathe,
          currentScaleVal + breathe,
          currentScaleVal + breathe
        );

        const bounceSpeed = isHovered ? 5.2 : 3.2;
        const bounceAmp = isHovered ? 0.13 : 0.07;
        headGroup.position.y = Math.sin(elapsed * bounceSpeed) * bounceAmp - 0.18;
        headGroup.rotation.z = Math.sin(elapsed * 1.8) * 0.04;

        if (isHovered) {
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
    } catch (err) {
      setWebglError(true);
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
      if (renderer) {
        try {
          renderer.forceContextLoss?.();
          renderer.dispose();
        } catch (e) { /* ignore */ }
        if (renderer.domElement && renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
      }
    };
  }, [shouldRenderLiveWebGL, size, finalProps, isHovered]);

  const handleMouseMove = (e) => {
    if (!shouldRenderLiveWebGL || !mountRef.current) return;
    const rect = mountRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    mousePos.current = { x, y };
  };

  // If live WebGL is enabled, render the live canvas container
  if (shouldRenderLiveWebGL) {
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
          cursor: 'pointer',
          background: 'transparent',
          userSelect: 'none',
        }}
      />
    );
  }

  // Otherwise, render the ultra-fast 3D WebGL rendered snapshot
  return (
    <div
      className={`avatar-3d-wrap ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        borderRadius: '50%',
        overflow: 'hidden',
        background: 'transparent',
        transition: 'transform 0.18s ease-out',
        transform: isHovered ? 'scale(1.08)' : 'scale(1)',
        userSelect: 'none',
        ...style,
      }}
      title={resolvedAvatarId ? `3D Avatar: ${resolvedAvatarId}` : '3D Avatar'}
    >
      {snapshotUri ? (
        <img
          src={snapshotUri}
          alt={resolvedAvatarId || '3D Avatar'}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            pointerEvents: 'none',
          }}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #10B981, #059669)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: size * 0.4,
          }}
        >
          {String(resolvedAvatarId || '3D').slice(0, 2).toUpperCase()}
        </div>
      )}
    </div>
  );
}


