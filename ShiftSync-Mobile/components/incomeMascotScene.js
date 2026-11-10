import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mascotMotion } from './mascotMotion.js';

const clamp = THREE.MathUtils.clamp;
const damp = THREE.MathUtils.damp;

function mesh(parent, geometry, material, position = [0, 0, 0], scale = [1, 1, 1]) {
  const item = new THREE.Mesh(geometry, material);
  item.position.set(...position);
  item.scale.set(...scale);
  parent.add(item);
  return item;
}

function line(parent, points, radius, material) {
  const curve = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)));
  return mesh(parent, new THREE.TubeGeometry(curve, 28, radius, 6, false), material);
}

/** A small, original plush companion built entirely from reusable 3D geometry. */
export function createIncomeMascot() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  // A small deterministic height field adds soft fabric grain without image assets.
  const grainSize = 64;
  const grainData = new Uint8Array(grainSize * grainSize * 4);
  for (let y = 0; y < grainSize; y += 1) {
    for (let x = 0; x < grainSize; x += 1) {
      let seed = Math.imul(x + 17, 374761393) ^ Math.imul(y + 43, 668265263);
      seed = Math.imul(seed ^ (seed >>> 13), 1274126177);
      const height = 80 + ((seed ^ (seed >>> 16)) & 127);
      const index = (y * grainSize + x) * 4;
      grainData[index] = height;
      grainData[index + 1] = height;
      grainData[index + 2] = height;
      grainData[index + 3] = 255;
    }
  }
  const grain = new THREE.DataTexture(grainData, grainSize, grainSize, THREE.RGBAFormat);
  grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
  grain.minFilter = grain.magFilter = THREE.LinearFilter;
  grain.repeat.set(5, 5);
  grain.needsUpdate = true;

  const plush = new THREE.MeshPhysicalMaterial({
    color: '#1CA75D', roughness: 0.96, metalness: 0,
    sheen: 0.75, sheenColor: '#78D697', sheenRoughness: 1,
    bumpMap: grain, bumpScale: 0.008,
  });
  const feetMaterial = new THREE.MeshPhysicalMaterial({
    color: '#189A54', roughness: 0.98, metalness: 0,
    sheen: 0.65, sheenColor: '#78D697', sheenRoughness: 1,
    bumpMap: grain, bumpScale: 0.008,
  });
  const thread = new THREE.MeshStandardMaterial({ color: '#168F50', roughness: 1 });
  const face = new THREE.MeshStandardMaterial({ color: '#16392A', roughness: 0.72 });
  const glint = new THREE.MeshBasicMaterial({ color: '#E9FFEC' });
  const cheekMaterial = new THREE.MeshStandardMaterial({ color: '#4BBB7A', roughness: 1 });

  // The face belongs to the body itself, as on a soft toy rather than a human.
  mesh(body, new RoundedBoxGeometry(1.22, 1.27, 0.86, 6, 0.32), plush, [0, 0.14, 0]);
  const shoulderGeometry = new RoundedBoxGeometry(0.3, 0.57, 0.34, 5, 0.145);
  const palmGeometry = new THREE.SphereGeometry(1, 24, 18);
  const armGeometry = shoulderGeometry;
  const arms = [];
  for (const side of [-1, 1]) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.65, 0.35, 0.015);
    body.add(shoulder);
    mesh(shoulder, armGeometry, plush, [0, -0.22, 0]);
    mesh(shoulder, palmGeometry, plush, [0, -0.46, 0.018], [0.153, 0.17, 0.18]);
    shoulder.rotation.z = side * 0.16;
    arms.push(shoulder);
  }

  const legGeometry = new RoundedBoxGeometry(0.365, 0.65, 0.44, 5, 0.16);
  const legs = [];
  for (const side of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(side * 0.24, -0.46, -0.01);
    body.add(hip);
    mesh(hip, legGeometry, feetMaterial, [0, -0.27, 0.025]);
    legs.push(hip);
  }

  // Restrained thread seams and rounded cheeks keep the plush silhouette clean.
  for (const side of [-1, 1]) {
    line(body, [[side * 0.49, 0.53, 0.29], [side * 0.55, 0.16, 0.28], [side * 0.46, -0.25, 0.29]], 0.006, thread);
    mesh(body, palmGeometry, cheekMaterial, [side * 0.29, 0.12, 0.427], [0.079, 0.029, 0.009]);
  }

  const eyes = [];
  const eyeGeometry = new THREE.SphereGeometry(1, 20, 14);
  for (const side of [-1, 1]) {
    const eye = new THREE.Group();
    eye.position.set(side * 0.145, 0.31, 0.44);
    body.add(eye);
    mesh(eye, eyeGeometry, face, [0, 0, 0], [0.027, 0.039, 0.019]);
    mesh(eye, eyeGeometry, glint, [-0.006, 0.012, 0.017], [0.006, 0.007, 0.004]);
    eyes.push(eye);
  }
  const smile = new THREE.Group();
  smile.position.set(0, 0.065, 0.448);
  body.add(smile);
  line(smile, [[-0.16, 0.035, 0], [-0.115, -0.012, 0.008], [0.015, -0.032, 0.012], [0.13, 0.009, 0.005], [0.17, 0.067, 0]], 0.022, face);

  const tuft = new THREE.Group();
  tuft.position.set(0.015, 0.755, -0.035);
  body.add(tuft);
  line(tuft, [[0, 0, 0], [0.024, 0.185, 0], [0.16, 0.305, 0], [0.29, 0.23, 0], [0.23, 0.083, 0], [0.095, 0.04, 0]], 0.011, face);

  // A soft contact shadow anchors the feet; no large presentation pedestal.
  const shadow = mesh(root, new THREE.CircleGeometry(0.76, 48), new THREE.MeshBasicMaterial({ color: '#215C3B', transparent: true, opacity: 0.12 }), [0, -1.073, 0]);
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.y = 0.72;

  body.rotation.y = -0.15;
  root.userData.body = body;
  root.userData.isMascot = true;
  root.userData.disposableTextures = [grain];
  root.userData.rig = {
    leftArm: arms[0], rightArm: arms[1], leftLeg: legs[0], rightLeg: legs[1],
    eyes, smile, tuft, shadow, engagement: 0,
  };
  return root;
}

/** Animate the actual shoulder/hip pivots. Safe to call with a synthetic clock. */
export function animateIncomeMascot(model, time, delta, interaction = {}) {
  const { body, rig } = model.userData;
  if (!body || !rig) return;
  const dt = clamp(Number.isFinite(delta) ? delta : 1 / 60, 0, 0.08);
  const target = interaction.engaged ? 1 : 0;
  rig.engagement = damp(rig.engagement, target, 6, dt);
  const active = rig.engagement;
  const pointerX = clamp(Number(interaction.x) || 0, -1, 1);
  const pointerY = clamp(Number(interaction.y) || 0, -1, 1);

  const motion = mascotMotion(time, active);
  const wave = Math.max(active, motion.idleWave);
  body.position.x = motion.travel;
  body.position.y = -0.06 + 0.015 * Math.sin(time * 1.8) + motion.hop + motion.footLift;
  body.rotation.y = damp(body.rotation.y, -0.15 + Math.sin(time * 0.9) * 0.18 + motion.walk * Math.cos(time * 2.1) * 0.22 + pointerX * active * 0.30, 7, dt);
  body.rotation.x = damp(body.rotation.x, pointerY * active * -0.12 + motion.nod, 7, dt);
  body.rotation.z = motion.sway + motion.step * motion.walk * 0.055;
  const breathing = 0.94 + active * 0.02 + Math.sin(time * 1.7) * 0.008;
  body.scale.set(breathing - motion.squash * 0.55, breathing + motion.squash, breathing - motion.squash * 0.3);

  rig.rightArm.rotation.z = 0.16 + wave * (2.48 + Math.sin(time * (6.5 + active * 3.5)) * 0.36);
  rig.rightArm.rotation.x = -0.08 - wave * 0.18 + motion.stride * (1 - wave);
  rig.rightArm.rotation.y = wave * Math.sin(time * 5.2) * 0.22;
  rig.leftArm.rotation.z = -0.16 - Math.sin(time * 1.65) * 0.07 - active * (0.32 + Math.sin(time * 6) * 0.12) - motion.hop * 1.5;
  rig.leftArm.rotation.x = -motion.stride + Math.sin(time * 1.3) * 0.06;
  rig.leftArm.rotation.y = 0;
  rig.leftLeg.rotation.x = motion.stride - motion.hop * 0.7;
  rig.rightLeg.rotation.x = -motion.stride - motion.hop * 0.7;
  rig.leftLeg.rotation.z = Math.sin(time * 2.2) * 0.035 - motion.hop * 0.30;
  rig.rightLeg.rotation.z = -Math.sin(time * 2.2) * 0.035 + motion.hop * 0.30;
  rig.tuft.rotation.z = Math.sin(time * 2.4) * 0.13 + active * pointerX * 0.1;

  const blinkTime = time % 4.9;
  const blink = blinkTime > 4.53 && blinkTime < 4.73 ? Math.max(0.08, Math.abs((blinkTime - 4.63) / 0.1)) : 1;
  for (const eye of rig.eyes) eye.scale.y = blink * (1 - active * 0.12);
  rig.smile.scale.set(1 + active * 0.12, 1 + active * 0.38, 1);
  rig.shadow.position.x = motion.travel;
  rig.shadow.material.opacity = 0.12 - motion.hop * 0.32;
  rig.shadow.scale.set(1 - motion.hop * 0.55, 0.72 - motion.hop * 0.35, 1);
}
