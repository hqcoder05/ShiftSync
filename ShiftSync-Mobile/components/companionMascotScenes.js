import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mascotMotion } from './mascotMotion.js';

const { clamp, damp, smoothstep, lerp } = THREE.MathUtils;
const COLORS = {
  kiro: { body: '#E6AD27', feet: '#D59B1F', sheen: '#FFE291', face: '#4C361B', cheek: '#F4C66B' },
  sora: { body: '#3C9DDA', feet: '#3287C8', sheen: '#A2DDF8', face: '#234158', cheek: '#79BEEA' },
  hako: { body: '#E95CAE', feet: '#D94B9D', sheen: '#FFC4E8', face: '#61234A', cheek: '#FA92CF' },
};

function mesh(parent, geometry, material, position = [0, 0, 0], scale = [1, 1, 1]) {
  const result = new THREE.Mesh(geometry, material);
  result.position.set(...position); result.scale.set(...scale); parent.add(result);
  return result;
}
function thread(parent, points, radius, material) {
  return mesh(parent, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), 24, radius, 6, false), material);
}
function fabricGrain() {
  const size = 64, bytes = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let seed = Math.imul(x + 17, 374761393) ^ Math.imul(y + 43, 668265263);
    seed = Math.imul(seed ^ (seed >>> 13), 1274126177);
    const value = 80 + ((seed ^ (seed >>> 16)) & 127), offset = (y * size + x) * 4;
    bytes[offset] = bytes[offset + 1] = bytes[offset + 2] = value; bytes[offset + 3] = 255;
  }
  const texture = new THREE.DataTexture(bytes, size, size, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = texture.magFilter = THREE.LinearFilter;
  texture.repeat.set(5, 5); texture.needsUpdate = true;
  return texture;
}
function plushMaterial(color, sheenColor, texture) {
  return new THREE.MeshPhysicalMaterial({ color, roughness: 0.97, metalness: 0, sheen: 0.72, sheenColor, sheenRoughness: 1, bumpMap: texture, bumpScale: 0.008 });
}
function pearGeometry() {
  // A rounded triangular toy, deliberately distinct from the green box body.
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.78);
  shape.bezierCurveTo(0.22, 0.79, 0.25, 0.58, 0.37, 0.38);
  shape.lineTo(0.60, -0.12);
  shape.bezierCurveTo(0.77, -0.43, 0.64, -0.53, 0.42, -0.53);
  shape.lineTo(-0.42, -0.53);
  shape.bezierCurveTo(-0.64, -0.53, -0.77, -0.43, -0.60, -0.12);
  shape.lineTo(-0.37, 0.38);
  shape.bezierCurveTo(-0.25, 0.58, -0.22, 0.79, 0, 0.78);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.48, bevelEnabled: true, bevelSize: 0.10, bevelThickness: 0.10, bevelSegments: 5, curveSegments: 16, steps: 1 });
  geometry.translate(0, 0, -0.24); return geometry;
}

function makeCharacter(kind, grain) {
  const palette = COLORS[kind], anchor = new THREE.Group(), body = new THREE.Group(); anchor.add(body);
  const plush = plushMaterial(palette.body, palette.sheen, grain);
  const feet = plushMaterial(palette.feet, palette.sheen, grain);
  const face = new THREE.MeshStandardMaterial({ color: palette.face, roughness: 0.8 });
  const blush = new THREE.MeshStandardMaterial({ color: palette.cheek, roughness: 1 });
  const shine = new THREE.MeshBasicMaterial({ color: '#FFF7EE' });
  const sphere = new THREE.SphereGeometry(1, 26, 18);

  if (kind === 'kiro') mesh(body, pearGeometry(), plush, [0, 0.06, 0]);
  else {
    // Sora has eight cloud puffs; Hako has five broad, rounded flower petals.
    const count = kind === 'sora' ? 8 : 5;
    const ring = kind === 'sora' ? 0.46 : 0.49;
    for (let i = 0; i < count; i++) {
      const angle = Math.PI / 2 + i * Math.PI * 2 / count;
      const radius = kind === 'sora' ? (i % 2 ? 0.30 : 0.34) : 0.36;
      mesh(body, sphere, plush, [Math.cos(angle) * ring, 0.13 + Math.sin(angle) * ring * 0.92, -0.02], [radius, radius, 0.33]);
    }
    mesh(body, sphere, plush, [0, 0.12, 0.04], [0.56, 0.58, 0.35]);
  }

  const arms = [], armGeometry = new RoundedBoxGeometry(0.29, 0.55, 0.32, 5, 0.14);
  for (const side of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(side * 0.66, 0.22, 0);
    body.add(arm);
    mesh(arm, armGeometry, plush, [0, -0.22, 0]);
    const palm = mesh(arm, sphere, plush, [0, -0.45, 0.015], [0.15, 0.17, 0.17]);
    arm.rotation.z = side * 0.16; arms.push({ pivot: arm, palm });
  }
  const legs = [], legGeometry = new RoundedBoxGeometry(0.35, 0.63, 0.43, 5, 0.16);
  for (const side of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(side * 0.23, -0.44, -0.015); body.add(leg);
    mesh(leg, legGeometry, feet, [0, -0.28, 0.025]); legs.push(leg);
  }

  const faceZ = kind === 'kiro' ? 0.365 : 0.425;
  const eyes = [];
  for (const side of [-1, 1]) {
    const eye = new THREE.Group(); eye.position.set(side * 0.145, 0.32, faceZ); body.add(eye);
    if (kind === 'sora') thread(eye, [[-0.07, 0.015, 0], [-0.025, -0.024, 0.005], [0.03, -0.029, 0.005], [0.07, 0.006, 0]], 0.017, face);
    else {
      mesh(eye, sphere, face, [0, 0, 0], [0.024, kind === 'hako' ? 0.048 : 0.033, 0.016]);
      mesh(eye, sphere, shine, [-0.005, 0.012, 0.013], [0.005, 0.006, 0.003]);
    }
    eyes.push(eye);
    mesh(body, sphere, blush, [side * 0.29, 0.13, faceZ - 0.012], [0.069, 0.026, 0.009]);
  }
  const mouth = new THREE.Group(); mouth.position.set(0, 0.10, faceZ + 0.015); body.add(mouth);
  if (kind === 'kiro') {
    // An open, happy mouth with a tiny warm tongue.
    mesh(mouth, sphere, face, [0, -0.045, 0], [0.13, 0.13, 0.025]);
    mesh(mouth, sphere, new THREE.MeshStandardMaterial({ color: '#F19A70', roughness: 1 }), [0.015, -0.115, 0.022], [0.076, 0.035, 0.008]);
    thread(mouth, [[-0.13, 0.055, 0.02], [0, 0.045, 0.026], [0.13, 0.055, 0.02]], 0.017, face);
  } else if (kind === 'sora') {
    mesh(mouth, new THREE.TorusGeometry(0.047, 0.016, 8, 20), face, [0.015, -0.025, 0]);
    mesh(mouth, sphere, face, [0.11, 0.055, -0.005], [0.018, 0.022, 0.01]);
  } else thread(mouth, [[-0.19, 0.045, 0], [-0.13, -0.065, 0.012], [0, -0.13, 0.021], [0.14, -0.065, 0.012], [0.20, 0.06, 0]], 0.024, face);

  const tuft = new THREE.Group(); tuft.position.set(0.02, kind === 'kiro' ? 0.86 : 0.84, -0.065); body.add(tuft);
  thread(tuft, [[0, 0, 0], [0.035, 0.17, 0], [0.17, 0.27, 0], [0.28, 0.17, 0], [0.20, 0.055, 0], [0.08, 0.035, 0]], 0.01, face);
  const shadow = mesh(anchor, new THREE.CircleGeometry(0.77, 40), new THREE.MeshBasicMaterial({ color: '#334258', transparent: true, opacity: 0.10 }), [0, -1.06, 0]);
  shadow.rotation.x = -Math.PI / 2; shadow.scale.y = 0.72;
  body.rotation.y = -0.12;
  anchor.userData = { kind, body, rig: { leftArm: arms[0].pivot, rightArm: arms[1].pivot, palms: arms.map(item => item.palm), legs, eyes, mouth, tuft, shadow } };
  return anchor;
}

export function createCompanionScene(kind = 'hako') {
  if (!['kiro', 'sora', 'hako', 'shift-buddies'].includes(kind)) throw new Error(`Unknown companion scene: ${kind}`);
  const root = new THREE.Group(), grain = fabricGrain(), pair = kind === 'shift-buddies';
  const characters = (pair ? ['kiro', 'sora'] : [kind]).map(name => makeCharacter(name, grain));
  characters.forEach((character, index) => {
    if (pair) { character.scale.setScalar(0.88); character.position.x = index === 0 ? -0.81 : 0.81; character.position.y = -0.015; }
    root.add(character);
  });
  root.userData = { isCompanionScene: true, kind, body: characters[0].userData.body, characters, disposableTextures: [grain], engagement: 0 };
  return root;
}

function envelope(value, start, riseEnd, fallStart, end) {
  return smoothstep(value, start, riseEnd) * (1 - smoothstep(value, fallStart, end));
}

export function animateCompanionScene(model, time, delta, interaction = {}) {
  const state = model.userData;
  if (!state.isCompanionScene) return;
  const dt = clamp(Number.isFinite(delta) ? delta : 1 / 60, 0, 0.08);
  state.engagement = damp(state.engagement, interaction.engaged ? 1 : 0, 6, dt);
  const active = state.engagement, pointerX = clamp(Number(interaction.x) || 0, -1, 1), pointerY = clamp(Number(interaction.y) || 0, -1, 1);
  const pair = state.kind === 'shift-buddies', cycle = time % 12;
  // The two inner palms meet during this shared beat, then both return to rest.
  const highFive = pair ? envelope(cycle, 4.2, 5.5, 6.6, 8.0) * (1 - active) : 0;
  state.pairBeat = highFive;
  state.characters.forEach((character, index) => {
    const { body, rig } = character.userData, phase = time + index * 0.6;
    const motion = mascotMotion(time, active, pair ? index * 0.12 : 0, pair);
    const call = pair ? (index === 0 ? envelope(cycle, 0.2, 0.9, 1.7, 2.5) : envelope(cycle, 2.0, 2.8, 3.5, 4.3)) : envelope((time + 0.6) % 7, 0, 0.7, 1.7, 2.6);
    const wave = Math.max(active, call * (1 - active));
    const towardPartner = index === 0 ? 1 : -1;
    const yaw = pair ? towardPartner * highFive * 0.23 : -0.10;
    body.rotation.y = damp(body.rotation.y, yaw + Math.sin(phase * 0.9) * 0.13 * (1 - highFive) + motion.walk * Math.cos(time * 2.1) * 0.20 + pointerX * active * 0.28, 7, dt);
    body.rotation.x = damp(body.rotation.x, -pointerY * active * 0.12 + motion.nod, 7, dt);
    body.rotation.z = (motion.sway + motion.step * motion.walk * 0.05) * (1 - highFive) + towardPartner * highFive * -0.025;
    body.position.x = motion.travel;
    body.position.y = (pair ? 0 : -0.05) + Math.sin(phase * 1.8) * 0.015 + motion.hop + motion.footLift;
    const breathing = (pair ? 1 : 0.95) + Math.sin(phase * 1.6) * 0.006 + active * 0.02;
    body.scale.set(breathing - motion.squash * 0.55, breathing + motion.squash, breathing - motion.squash * 0.3);

    const gesture = 2.45 + Math.sin(time * (6.5 + active * 3.5) + index) * 0.34;
    // Pair outer hands trade a call-and-response; singles use their right hand.
    const outerLeft = pair && index === 0;
    rig.leftArm.rotation.z = -0.16 - (outerLeft ? wave * gesture : 0) - (pair && index === 1 ? highFive * 2.39 : 0);
    rig.rightArm.rotation.z = 0.16 + (!outerLeft ? wave * gesture : 0) + (pair && index === 0 ? highFive * 2.39 : 0);
    rig.leftArm.rotation.x = -wave * 0.15 - motion.stride * (1 - highFive);
    rig.rightArm.rotation.x = -wave * 0.15 + motion.stride * (1 - highFive);
    rig.leftArm.rotation.y = highFive * (index === 1 ? 0.08 : 0);
    rig.rightArm.rotation.y = highFive * (index === 0 ? -0.08 : 0);
    rig.legs[0].rotation.x = motion.stride - motion.hop * 0.7;
    rig.legs[1].rotation.x = -motion.stride - motion.hop * 0.7;
    rig.legs[0].rotation.z = Math.sin(phase * 2.2) * 0.03 - motion.hop * 0.30;
    rig.legs[1].rotation.z = -Math.sin(phase * 2.2) * 0.03 + motion.hop * 0.30;
    rig.tuft.rotation.z = Math.sin(phase * 2.4) * 0.13 + pointerX * active * 0.08;
    const blinkPhase = (time + index * 1.1) % 4.8;
    const blink = blinkPhase > 4.43 && blinkPhase < 4.63 ? Math.max(0.08, Math.abs((blinkPhase - 4.53) / 0.1)) : 1;
    rig.eyes.forEach(eye => { eye.scale.y = blink * (1 - active * 0.1); });
    rig.mouth.scale.set(1 + active * 0.1, 1 + active * 0.2, 1);
    rig.shadow.position.x = motion.travel;
    rig.shadow.material.opacity = 0.10 - motion.hop * 0.28;
    rig.shadow.scale.set(1 - motion.hop * 0.55, 0.72 - motion.hop * 0.35, 1);
  });
}
