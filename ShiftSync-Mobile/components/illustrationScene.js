import * as THREE from 'three';
import { createIncomeMascot } from './incomeMascotScene.js';
import { createCompanionScene } from './companionMascotScenes.js';
import { createAnimalScene } from './animalMascotScenes.js';

const mat = (color, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness: metalness ? 0.32 : 0.52, metalness });
function mesh(parent, geometry, material, position = [0, 0, 0], rotation = [0, 0, 0]) {
  const item = new THREE.Mesh(geometry, material);
  item.position.set(...position); item.rotation.set(...rotation);
  parent.add(item); return item;
}
function slab(parent, w, h, d, material, position, radius = 0.12) {
  const r = Math.min(radius, w / 3, h / 3);
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2 + r, -h / 2);
  shape.lineTo(w / 2 - r, -h / 2); shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  shape.lineTo(w / 2, h / 2 - r); shape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  shape.lineTo(-w / 2 + r, h / 2); shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  shape.lineTo(-w / 2, -h / 2 + r); shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  return mesh(parent, new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.035, bevelThickness: 0.035, curveSegments: 8 }), material, position);
}
function stroke(parent, points, material, radius = 0.035) {
  return mesh(parent, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), 18, radius, 6, false), material);
}
export function createIllustration(kind = 'income') {
  if (kind === 'income') return createIncomeMascot();
  if (['kiro', 'sora', 'hako', 'shift-buddies'].includes(kind)) return createCompanionScene(kind);
  if (['rabbit', 'deer', 'frog', 'tiger', 'beaver', 'raccoon', 'fox', 'notification-fox', 'peek-rabbit', 'peek-raccoon', 'peek-fox'].includes(kind)) return createAnimalScene(kind);
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const white = mat('#FFFCF5'), orange = mat('#F47750');
  const mint = mat('#67BCAB'), purple = mat('#929DDE'), ink = mat('#555D84');
  const shadow = mesh(root, new THREE.CircleGeometry(1.1, 40), new THREE.MeshBasicMaterial({ color: '#586077', transparent: true, opacity: 0.09 }), [0, -1.07, 0]);
  shadow.rotation.x = -Math.PI / 2;
  mesh(body, new THREE.CylinderGeometry(1, 1.08, 0.16, 48), mat('#E3E7F6'), [0, -0.93, 0]);
  if (kind === 'clock') {
    mesh(body, new THREE.CylinderGeometry(0.75, 0.75, 0.3, 48), mint, [0, 0.04, 0], [Math.PI / 2, 0, 0]);
    mesh(body, new THREE.CylinderGeometry(0.62, 0.62, 0.045, 48), white, [0, 0.04, 0.19], [Math.PI / 2, 0, 0]);
    stroke(body, [[0, 0.47, 0.23], [0, 0.04, 0.23], [0.33, -0.1, 0.23]], ink, 0.035);
    mesh(body, new THREE.SphereGeometry(0.07, 12, 8), orange, [0, 0.04, 0.27]);
    slab(body, 0.22, 0.12, 0.15, orange, [0, 0.89, -0.04]);
  } else if (kind === 'messages') {
    slab(body, 1.45, 1.05, 0.24, purple, [0, 0.2, 0]);
    mesh(body, new THREE.ConeGeometry(0.25, 0.42, 3), purple, [-0.4, -0.43, 0.13], [0, 0, Math.PI]);
    for (const x of [-0.4, 0, 0.4]) mesh(body, new THREE.SphereGeometry(0.085, 12, 8), white, [x, 0.2, 0.3]);
  } else if (kind === 'swap') {
    for (const side of [-1, 1]) {
      const arrow = new THREE.Group(); body.add(arrow); arrow.position.y = side * 0.29; arrow.rotation.z = side === 1 ? 0 : Math.PI;
      slab(arrow, 1.1, 0.17, 0.18, side === 1 ? orange : mint, [-0.13, 0, 0]);
      mesh(arrow, new THREE.ConeGeometry(0.29, 0.45, 3), side === 1 ? orange : mint, [0.56, 0, 0.09], [0, 0, -Math.PI / 2]);
    }
  } else if (kind === 'help') {
    mesh(body, new THREE.TorusGeometry(0.58, 0.19, 12, 32), orange, [0, 0.08, 0]);
    mesh(body, new THREE.TorusGeometry(0.58, 0.195, 12, 8, Math.PI / 4), white, [0, 0.08, 0.01]);
    mesh(body, new THREE.TorusGeometry(0.58, 0.195, 12, 8, Math.PI / 4), white, [0, 0.08, 0.01], [0, 0, Math.PI]);
  } else {
    const calendar = kind === 'calendar';
    slab(body, 1.37, 1.4, 0.18, white, [0, 0.06, 0]);
    slab(body, 1.37, 0.32, 0.08, calendar ? orange : purple, [0, 0.61, 0.18]);
    if (calendar) {
      for (const x of [-0.39, 0.39]) slab(body, 0.09, 0.35, 0.12, ink, [x, 0.82, 0.11], 0.04);
      for (let row = 0; row < 2; row++) for (let col = 0; col < 3; col++) slab(body, 0.19, 0.17, 0.025, row === 1 && col === 1 ? mint : mat('#DFE4F1'), [-0.38 + col * 0.38, 0.16 - row * 0.38, 0.22], 0.04);
    } else {
      for (let row = 0; row < 3; row++) {
        mesh(body, new THREE.SphereGeometry(0.06, 10, 8), mint, [-0.4, 0.18 - row * 0.28, 0.24]);
        slab(body, 0.56, 0.065, 0.025, mat('#CED4E4'), [0.1, 0.18 - row * 0.28, 0.23], 0.025);
      }
    }
  }
  body.rotation.set(0.1, -0.32, 0.03);
  root.userData.body = body;
  return root;
}
