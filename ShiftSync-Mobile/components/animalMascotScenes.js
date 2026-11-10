import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mascotMotion } from './mascotMotion.js';

const { clamp, damp } = THREE.MathUtils;
const PALETTES = {
  rabbit: ['#D957A0', '#A9337D', '#FFB6D6', '#61284A', '#FFD0E4'],
  deer: ['#A96B49', '#875033', '#E4B38E', '#56331F', '#EDC39F'],
  frog: ['#74BD24', '#55951A', '#AEDE55', '#345C18', '#BDEB77'],
  tiger: ['#E69036', '#BC6426', '#FFD695', '#6D391C', '#FFE4B8'],
  beaver: ['#CA8B32', '#A66A22', '#EAC283', '#5C3A23', '#FFE2AE'],
  raccoon: ['#96949B', '#77747F', '#D8D5DA', '#393840', '#E9E7EC'],
  fox: ['#E88735', '#C36527', '#FFC77F', '#69391F', '#FFF1D5'],
};

function add(parent, geometry, material, position = [0, 0, 0], scale = [1, 1, 1]) {
  const part = new THREE.Mesh(geometry, material);
  part.position.set(...position); part.scale.set(...scale); parent.add(part); return part;
}
function curve(parent, points, radius, material) {
  return add(parent, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), 24, radius, 6, false), material);
}
function grainTexture() {
  const size = 64, data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let hash = Math.imul(x + 71, 374761393) ^ Math.imul(y + 29, 668265263);
    hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
    const value = 95 + ((hash ^ (hash >>> 16)) & 111), at = (y * size + x) * 4;
    data[at] = data[at + 1] = data[at + 2] = value; data[at + 3] = 255;
  }
  const grain = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  grain.wrapS = grain.wrapT = THREE.RepeatWrapping; grain.repeat.set(5, 5);
  grain.minFilter = grain.magFilter = THREE.LinearFilter; grain.needsUpdate = true; return grain;
}
function fabric(color, sheenColor, grain) {
  return new THREE.MeshPhysicalMaterial({ color, roughness: 0.97, metalness: 0, sheen: 0.6, sheenColor, sheenRoughness: 1, bumpMap: grain, bumpScale: 0.007 });
}

function makeAnimal(species, grain, peeking, cardPeek = false) {
  const [baseColor, shade, light, faceColor, cream] = PALETTES[species];
  const animal = new THREE.Group(), body = new THREE.Group(); animal.add(body);
  const fur = fabric(baseColor, light, grain), feet = fabric(shade, light, grain), pale = fabric(cream, '#FFF9EE', grain);
  const detail = new THREE.MeshStandardMaterial({ color: faceColor, roughness: 0.85 });
  const lightFur = fabric(light, cream, grain), white = new THREE.MeshStandardMaterial({ color: '#FFF9EC', roughness: 0.8 });
  const sphere = new THREE.SphereGeometry(1, 28, 20), ears = [], eyes = [];
  const bodyGeometry = new RoundedBoxGeometry(species === 'frog' ? 1.12 : 1.02, cardPeek ? 0.92 : species === 'frog' ? 1.07 : 1.28, 0.77, 6, 0.30);
  add(body, bodyGeometry, fur, [0, cardPeek ? 0.23 : species === 'frog' ? -0.02 : 0.04, 0]);
  const belly = add(body, sphere, species === 'frog' ? lightFur : pale, [0, -0.29, 0.385], [0.29, 0.31, 0.045]);
  if (species !== 'frog') {
    curve(belly, [[-0.10, -0.05, 1.025], [0.10, 0.05, 1.025]], 0.018, detail);
    curve(belly, [[-0.10, 0.05, 1.025], [0.10, -0.05, 1.025]], 0.018, detail);
  }

  const arms = [], armGeometry = new RoundedBoxGeometry(0.27, 0.52, 0.31, 5, 0.13);
  for (const side of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(side * 0.55, 0.23, 0); body.add(arm);
    add(arm, armGeometry, fur, [0, -0.20, 0]);
    add(arm, sphere, fur, [0, -0.42, 0.02], [0.14, 0.16, 0.17]);
    arm.rotation.z = side * 0.14; arms.push(arm);
  }
  const legs = [], legGeometry = new RoundedBoxGeometry(0.30, 0.52, 0.40, 5, 0.14);
  for (const side of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(side * 0.215, -0.52, 0); body.add(leg);
    add(leg, legGeometry, feet, [0, -0.22, 0.03]); legs.push(leg);
  }

  if (species === 'rabbit') {
    for (const side of [-1, 1]) {
      const ear = new THREE.Group(); ear.position.set(side * 0.24, 0.63, -0.03); ear.rotation.z = side * -0.07; body.add(ear);
      add(ear, new RoundedBoxGeometry(0.23, 0.77, 0.23, 5, 0.11), fur, [0, 0.32, 0]);
      add(ear, new RoundedBoxGeometry(0.115, 0.56, 0.045, 4, 0.055), lightFur, [0, 0.34, 0.12]); ears.push(ear);
    }
    // An original small daisy gives the bunny a friendly, recognisable accent.
    const flower = new THREE.Group(); flower.position.set(-0.43, 0.66, 0.30); flower.rotation.z = -0.2; body.add(flower);
    for (let i = 0; i < 5; i++) {
      const a = i * Math.PI * 2 / 5;
      add(flower, sphere, white, [Math.cos(a) * 0.10, Math.sin(a) * 0.10, 0], [0.075, 0.075, 0.025]);
    }
    add(flower, sphere, new THREE.MeshStandardMaterial({ color: '#F7CB4C', roughness: 0.9 }), [0, 0, 0.025], [0.061, 0.061, 0.025]);
  } else if (species === 'deer') {
    for (const side of [-1, 1]) {
      const antler = new THREE.Group(); antler.position.set(side * 0.25, 0.65, -0.03); body.add(antler);
      curve(antler, [[0, 0, 0], [side * 0.035, 0.18, 0], [side * 0.15, 0.32, 0], [side * 0.15, 0.51, 0]], 0.038, detail);
      curve(antler, [[side * 0.035, 0.18, 0], [-side * 0.09, 0.29, 0], [-side * 0.10, 0.44, 0]], 0.033, detail);
      const ear = add(body, sphere, fur, [side * 0.55, 0.50, 0], [0.23, 0.115, 0.11]); ear.rotation.z = side * 0.25; ears.push(antler);
      add(body, sphere, lightFur, [side * 0.55, 0.50, 0.085], [0.14, 0.055, 0.035]);
    }
  } else if (species !== 'frog') {
    for (const side of [-1, 1]) {
      const ear = new THREE.Group(); ear.position.set(side * 0.38, 0.61, -0.03); body.add(ear);
      if (species === 'fox' || species === 'raccoon') {
        const triangle = add(ear, new THREE.ConeGeometry(0.22, 0.46, 3, 1), fur, [0, 0.10, 0]); triangle.rotation.y = Math.PI;
        const inner = add(ear, new THREE.ConeGeometry(0.13, 0.30, 3, 1), pale, [0, 0.10, 0.085]); inner.rotation.y = Math.PI;
      } else {
        add(ear, sphere, fur, [0, 0.06, 0], [0.18, 0.18, 0.14]);
        add(ear, sphere, pale, [0, 0.065, 0.11], [0.10, 0.10, 0.035]);
      }
      ears.push(ear);
    }
  }

  const eyeY = species === 'frog' ? 0.68 : 0.35;
  const eyeX = species === 'frog' ? 0.275 : 0.16;
  if (species === 'frog') for (const side of [-1, 1]) add(body, sphere, fur, [side * eyeX, 0.55, 0.06], [0.235, 0.235, 0.29]);
  for (const side of [-1, 1]) {
    const eye = new THREE.Group(); eye.position.set(side * eyeX, eyeY, species === 'frog' ? 0.325 : 0.39); body.add(eye);
    if (species === 'raccoon') {
      const mask = add(body, sphere, detail, [side * eyeX, eyeY, 0.39], [0.18, 0.13, 0.035]); mask.rotation.z = side * 0.16;
      add(eye, sphere, white, [0, 0, 0.042], [0.054, 0.064, 0.014]);
      add(eye, sphere, detail, [0.005, 0, 0.058], [0.026, 0.040, 0.010]);
    } else add(eye, sphere, detail, [0, 0, 0.018], [0.027, species === 'frog' ? 0.055 : 0.040, 0.021]);
    add(eye, sphere, white, [-0.006, 0.012, species === 'raccoon' ? 0.066 : 0.036], [0.007, 0.008, 0.004]); eyes.push(eye);
  }

  const mouth = new THREE.Group(); mouth.position.set(0, species === 'frog' ? 0.33 : 0.13, 0.425); body.add(mouth);
  if (['fox', 'deer', 'tiger', 'raccoon', 'beaver'].includes(species)) {
    for (const side of [-1, 1]) add(mouth, sphere, pale, [side * 0.075, 0.02, -0.004], [0.135, 0.095, 0.055]);
    add(mouth, sphere, detail, [0, 0.075, 0.055], [0.066, 0.043, 0.035]);
  }
  curve(mouth, [[-0.12, 0.005, 0.057], [-0.065, -0.055, 0.065], [0.035, -0.063, 0.067], [0.12, 0.005, 0.057]], 0.016, detail);
  if (species === 'beaver') for (const side of [-1, 1]) add(mouth, new RoundedBoxGeometry(0.066, 0.12, 0.035, 3, 0.015), white, [side * 0.036, -0.065, 0.085]);
  if (species === 'rabbit') {
    add(mouth, sphere, lightFur, [0, 0.055, 0.025], [0.046, 0.030, 0.025]);
    for (const side of [-1, 1]) curve(mouth, [[side * 0.12, 0.03, 0], [side * 0.25, 0.055, -0.02]], 0.007, pale);
  }
  if (species === 'frog') add(mouth, sphere, white, [0, -0.02, 0.025], [0.10, 0.035, 0.015]);

  if (species === 'tiger') {
    for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
      const stripe = add(body, new THREE.ConeGeometry(0.055, 0.22, 3), detail, [side * (0.40 - i * 0.008), 0.50 - i * 0.19, 0.33]); stripe.rotation.z = side * 1.12;
    }
    for (let i = -1; i <= 1; i++) {
      const stripe = add(body, new THREE.ConeGeometry(0.045, 0.18, 3), detail, [i * 0.14, 0.58 - Math.abs(i) * 0.015, 0.32]); stripe.rotation.z = Math.PI;
    }
  }

  const tail = new THREE.Group(); tail.position.set(0.44, -0.36, -0.25); body.add(tail);
  if (species === 'beaver') {
    const paddle = add(tail, sphere, feet, [0.20, 0.13, -0.05], [0.28, 0.45, 0.10]); paddle.rotation.z = -0.55;
    for (let i = 0; i < 3; i++) curve(tail, [[0.03, -0.06 + i * 0.13, 0.06], [0.39, 0.10 + i * 0.13, 0.06]], 0.008, detail);
  } else if (species === 'fox') {
    const bush = add(tail, sphere, feet, [0.20, 0.18, 0], [0.25, 0.55, 0.22]); bush.rotation.z = -0.50;
    const tip = add(tail, sphere, pale, [0.40, 0.54, 0.015], [0.20, 0.24, 0.18]); tip.rotation.z = -0.55;
  } else if (species === 'tiger' || species === 'raccoon') {
    for (let i = 0; i < 7; i++) {
      const a = i * 0.21;
      add(tail, sphere, i % 2 ? detail : feet, [0.08 + Math.sin(a) * 0.31, i * 0.105, -0.03], [species === 'raccoon' ? 0.16 : 0.10, 0.12, species === 'raccoon' ? 0.14 : 0.085]);
    }
  } else if (species === 'rabbit') add(body, sphere, pale, [-0.45, -0.43, -0.23], [0.16, 0.16, 0.16]);
  else if (species === 'deer') add(tail, sphere, pale, [0.08, 0.05, 0], [0.12, 0.18, 0.11]);

  const shadow = add(animal, new THREE.CircleGeometry(0.72, 40), new THREE.MeshBasicMaterial({ color: '#544D60', transparent: true, opacity: 0.09 }), [0, -1.02, 0]);
  shadow.rotation.x = -Math.PI / 2; shadow.scale.y = 0.72;
  const scale = species === 'rabbit' ? 0.82 : species === 'deer' ? 0.88 : 0.95;
  animal.scale.setScalar(scale); animal.position.y = species === 'rabbit' ? -0.07 : 0;
  body.rotation.y = -0.10;
  if (peeking) { arms.forEach(arm => { arm.rotation.x = -1.35; arm.rotation.z *= 0.4; }); }
  if (cardPeek) {
    belly.visible = false; tail.visible = false; shadow.visible = false;
    legs.forEach(leg => { leg.visible = false; });
    arms.forEach((arm, index) => {
      const side = index ? 1 : -1;
      arm.position.set(side * 0.43, 0.10, 0.22);
      arm.rotation.x = -1.05;
      arm.children[1].visible = false;
      const paw = new THREE.Group(); paw.position.set(0, -0.40, 0.04); paw.rotation.x = 1.05; arm.add(paw);
      add(paw, new RoundedBoxGeometry(0.31, 0.25, 0.24, 4, 0.11), fur, [0, 0, 0]);
      for (const x of [-0.065, 0.065]) curve(paw, [[x, 0.025, 0.119], [x, -0.065, 0.119]], 0.007, lightFur);
      arm.userData.paw = paw;
    });
    animal.scale.setScalar(species === 'rabbit' ? 1.10 : 1.42);
    animal.position.y = species === 'rabbit' ? -0.30 : -0.20;
  }
  animal.userData = { species, body, rig: { arms, legs, ears, eyes, mouth, tail, belly, shadow }, baseScale: scale, peeking, cardPeek };
  return animal;
}

/** Original soft animal companions. Geometry and fabric grain work offline. */
export function createAnimalScene(kind = 'fox') {
  const cardPeek = kind.startsWith('peek-');
  const species = kind === 'notification-fox' ? 'fox' : cardPeek ? kind.slice(5) : kind;
  if (!PALETTES[species]) throw new Error(`Unknown animal companion: ${kind}`);
  const root = new THREE.Group(), grain = grainTexture(), animal = makeAnimal(species, grain, kind === 'notification-fox' || cardPeek, cardPeek);
  root.add(animal);
  root.userData = { isAnimalScene: true, kind, body: animal.userData.body, animals: [animal], disposableTextures: [grain], engagement: 0 };
  return root;
}

/** Species-specific idle accents and a shared hover/touch greeting. */
export function animateAnimalScene(model, time, delta, interaction = {}) {
  const state = model.userData;
  if (!state.isAnimalScene) return;
  const dt = clamp(Number.isFinite(delta) ? delta : 1 / 60, 0, 0.08);
  state.engagement = damp(state.engagement, interaction.engaged ? 1 : 0, 6, dt);
  const active = state.engagement, x = clamp(Number(interaction.x) || 0, -1, 1), y = clamp(Number(interaction.y) || 0, -1, 1);
  for (const animal of state.animals) {
    const { species, body, rig, peeking, cardPeek } = animal.userData;
    const motion = mascotMotion(time, active);
    const wave = Math.max(active, motion.idleWave * (1 - active));
    const hop = peeking ? motion.hop * 0.55 : motion.hop * (species === 'frog' ? 1.3 : 1);
    body.position.x = motion.travel * (cardPeek ? 0.12 : peeking ? 0.45 : 1);
    body.position.y = -0.05 + Math.sin(time * 1.7) * 0.012 + hop + motion.footLift;
    body.rotation.y = damp(body.rotation.y, -0.10 + Math.sin(time * 0.9) * 0.15 + motion.walk * Math.cos(time * 2.1) * 0.20 + x * active * 0.28, 7, dt);
    body.rotation.x = damp(body.rotation.x, -y * active * 0.12 + motion.nod, 7, dt);
    body.rotation.z = motion.sway * (peeking ? 0.65 : 1) + motion.step * motion.walk * 0.045;
    const breathing = 0.95 + Math.sin(time * 1.8) * 0.006 + active * 0.02;
    body.scale.set(breathing - motion.squash * 0.55, breathing + motion.squash, breathing - motion.squash * 0.3);
    if (cardPeek) {
      rig.arms[0].rotation.x = -1.05 + Math.sin(time * 2.5) * 0.04;
      rig.arms[1].rotation.x = -1.05 - wave * 0.28;
      rig.arms[0].rotation.z = -0.06;
      rig.arms[1].rotation.z = 0.06 + wave * (0.85 + Math.sin(time * 8) * 0.20);
    } else if (peeking) {
      rig.arms[0].rotation.x = -1.35 + Math.sin(time * 3.2) * 0.12;
      rig.arms[1].rotation.x = -1.35 + Math.sin(time * 3.2 + 0.4) * 0.12 - wave * 0.10;
      rig.arms[0].rotation.z = -0.06 - hop * 0.4;
      rig.arms[1].rotation.z = 0.06 + wave * (0.95 + Math.sin(time * 9) * 0.28);
    } else {
      rig.arms[0].rotation.z = -0.14 - Math.sin(time * 1.6) * 0.07 - active * 0.26 - hop * 1.4;
      rig.arms[1].rotation.z = 0.14 + wave * (2.45 + Math.sin(time * (6.6 + active * 3.4)) * 0.34);
      rig.arms[0].rotation.x = -motion.stride + (species === 'beaver' ? Math.sin(time * 3.2) * 0.16 : 0);
      rig.arms[1].rotation.x = motion.stride * (1 - wave) - wave * 0.15;
    }
    rig.legs[0].rotation.x = motion.stride - hop * 0.9;
    rig.legs[1].rotation.x = -motion.stride - hop * 0.9;
    rig.legs[0].rotation.z = Math.sin(time * 2.2) * 0.03 - hop * 0.35;
    rig.legs[1].rotation.z = -Math.sin(time * 2.2) * 0.03 + hop * 0.35;
    rig.ears.forEach((ear, i) => { ear.rotation.z = (i ? 1 : -1) * (species === 'rabbit' ? -0.07 : 0) + Math.sin(time * (species === 'rabbit' ? 3.7 : 2.4) + i) * (0.09 + active * 0.07); });
    rig.tail.rotation.y = Math.sin(time * (species === 'fox' ? 4.8 : 3.1)) * (0.28 + active * 0.26);
    rig.tail.rotation.z = Math.sin(time * 2.6) * (0.04 + active * 0.07);
    const blinkAt = time % 4.8;
    const blink = blinkAt > 4.42 && blinkAt < 4.62 ? Math.max(0.08, Math.abs((blinkAt - 4.52) / 0.1)) : 1;
    rig.eyes.forEach(eye => { eye.scale.y = blink * (1 - active * 0.08); });
    rig.mouth.scale.set(1 + active * 0.12, 1 + active * 0.20, 1);
    rig.shadow.position.x = body.position.x;
    rig.shadow.material.opacity = 0.09 - hop * 0.24;
    rig.shadow.scale.set(1 - hop * 0.55, 0.72 - hop * 0.35, 1);
  }
}
