import * as THREE from 'three';
import { AVATAR_OPTIONS, getAvatar3DProps } from './avatarConfigs';

const thumbnailCache = {};

/**
 * Builds the 3D head mesh hierarchy for a specific avatar prop configuration.
 */
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

  // 1. Head
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

  // Accessories
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
  headGroup.add(browL, browR);

  // 5. Eyes
  const eyeRadius = eyeS === 'wide' ? 0.17 : 0.15;
  const createEye = (x) => {
    const g = new THREE.Group();
    g.position.set(x, 0.1, 0.88);
    const whiteMesh = new THREE.Mesh(new THREE.SphereGeometry(eyeRadius, 8, 6), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.15, flatShading: true }));
    if (eyeS === 'almond') whiteMesh.scale.set(1.25, 0.72, 1);
    g.add(whiteMesh);

    const pupilMesh = new THREE.Mesh(new THREE.SphereGeometry(eyeRadius * 0.52, 6, 5), new THREE.MeshStandardMaterial({ color: eyeC, roughness: 0.3, flatShading: true }));
    pupilMesh.position.set(0, 0, eyeRadius * 0.62);
    g.add(pupilMesh);

    const glintMesh = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.045, 0.045), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1 }));
    glintMesh.position.set(eyeRadius * 0.22, eyeRadius * 0.25, eyeRadius * 0.85);
    g.add(glintMesh);
    return g;
  };
  headGroup.add(createEye(-0.34), createEye(0.34));

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

  // 7. Mouth (Smile)
  const mouthMat = new THREE.MeshStandardMaterial({ color: 0xc75650, roughness: 0.6, flatShading: true });
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.042, 4, 8, Math.PI), mouthMat);
  mouth.position.set(0, -0.29, 0.93);
  mouth.rotation.z = Math.PI;
  headGroup.add(mouth);

  return headGroup;
}

/**
 * Returns a dictionary mapping each avatarId -> base64 PNG data URL thumbnail.
 * Renders cleanly in < 30ms on offscreen WebGL canvas and then immediately frees context.
 */
export function getAllAvatarThumbnails() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return thumbnailCache;
  }

  // If already computed all 18, return immediately
  if (Object.keys(thumbnailCache).length >= AVATAR_OPTIONS.length) {
    return thumbnailCache;
  }

  try {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: 'low-power',
    });
    renderer.setSize(size, size);
    renderer.setPixelRatio(1);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 3.4);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight.position.set(2.5, 3.5, 4);
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0xffd8b8, 0.6);
    pointLight.position.set(-2.5, 1, 2);
    scene.add(pointLight);

    // Render each avatar once and snapshot to DataURL
    for (const item of AVATAR_OPTIONS) {
      if (thumbnailCache[item.id]) continue;

      const props = getAvatar3DProps(item.id);
      const head = buildAvatarHeadMesh(props);
      head.rotation.y = 0.15; // Slightly angled handsome 3/4 pose
      head.rotation.x = -0.05;
      scene.add(head);

      renderer.render(scene, camera);
      thumbnailCache[item.id] = canvas.toDataURL('image/png');

      // Cleanup meshes for next render
      scene.remove(head);
      head.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
          else child.material.dispose();
        }
      });
    }

    // Immediately dispose the offscreen WebGL renderer to free hardware context!
    try {
      renderer.dispose();
    } catch (e) { /* ignore */ }
  } catch (err) {
    console.warn('Failed to pre-render avatar thumbnails:', err);
  }

  return thumbnailCache;
}

export function getAvatarThumbnail(avatarId) {
  if (thumbnailCache[avatarId]) return thumbnailCache[avatarId];
  const all = getAllAvatarThumbnails();
  return all[avatarId] || null;
}
