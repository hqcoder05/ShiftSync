import * as THREE from '../node_modules/three/build/three.module.js';
import { AVATAR_OPTIONS } from '../components/avatarConfigs.js';
import { createLowPolyAvatar, getAvatarCamera } from '../components/lowPolyAvatarScene.js';

export function renderAvatarPortraits() {
  const canvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(288, 288);
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 20);
  scene.add(new THREE.HemisphereLight('#FFF7EE', '#8594B2', 2.2));
  const key = new THREE.DirectionalLight('#FFF6ED', 3.2);
  key.position.set(-3, 4, 5);
  scene.add(key);
  const fill = new THREE.DirectionalLight('#E5ECFF', 1.1);
  fill.position.set(3, 1, 2);
  scene.add(fill);
  const rim = new THREE.DirectionalLight('#FFFFFF', 2.2);
  rim.position.set(1, 3, -3);
  scene.add(rim);
  const images = { head: {}, full: {} };
  for (const framing of ['head', 'full']) {
  AVATAR_OPTIONS.forEach((option) => {
    const cameraPreset = getAvatarCamera(framing, option.id);
    camera.position.set(...cameraPreset.position);
    camera.lookAt(...cameraPreset.target);
    const portrait = createLowPolyAvatar(option.id);
    scene.add(portrait);
    renderer.render(scene, camera);
    images[framing][option.id] = canvas.toDataURL('image/png');
    scene.remove(portrait);
    const geometries = new Set(), materials = new Set();
    portrait.traverse((part) => {
      if (part.geometry) geometries.add(part.geometry);
      if (part.material) materials.add(part.material);
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((mat) => mat.dispose());
  });
  }
  renderer.dispose();
  renderer.forceContextLoss();
  return images;
}
