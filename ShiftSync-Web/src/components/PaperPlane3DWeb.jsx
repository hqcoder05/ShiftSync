import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * PaperPlane3DWeb.jsx — Máy bay giấy 3D bay qua toàn màn hình
 * ─────────────────────────────────────────────────────────────────────────────
 * Bay chéo từ góc dưới-trái lên góc trên-phải, mesh chi tiết & to rõ ràng.
 * Props:
 *  - launched: boolean — kích hoạt bay qua màn hình
 *  - color: màu máy bay (hex)
 *  - width, height: kích thước canvas nhỏ (idle state)
 *  - className: css class
 */
export default function PaperPlane3DWeb({
  launched = false,
  color = '#4ade80',
  width = 120,
  height = 90,
  className = '',
}) {
  const mountRef = useRef(null);
  const launchedRef = useRef(launched);
  const overlayRef = useRef(null);
  const overlayRendererRef = useRef(null);
  const overlaySceneRef = useRef(null);
  const overlayCameraRef = useRef(null);
  const overlayPlaneRef = useRef(null);
  const overlayAnimRef = useRef(null);
  const overlayClockRef = useRef(null);
  const overlayTrailsRef = useRef([]);

  useEffect(() => {
    launchedRef.current = launched;
  }, [launched]);

  // ── Full-screen overlay animation on launch ──
  useEffect(() => {
    if (!launched) return;

    // Create overlay canvas that covers the full viewport
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 99999;
      pointer-events: none; overflow: hidden;
    `;
    document.body.appendChild(overlay);
    overlayRef.current = overlay;

    const w = window.innerWidth;
    const h = window.innerHeight;

    const scene = new THREE.Scene();
    overlaySceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 200);
    camera.position.set(0, 0, 18);
    overlayCameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.cssText = 'position:absolute;inset:0;';
    overlay.appendChild(renderer.domElement);
    overlayRendererRef.current = renderer;

    // ── Lighting ──
    scene.add(new THREE.AmbientLight(0xffffff, 1.3));
    const sun = new THREE.DirectionalLight(0xffffff, 1.8);
    sun.position.set(5, 8, 10);
    scene.add(sun);
    const rim = new THREE.DirectionalLight(color, 1.2);
    rim.position.set(-3, -2, 5);
    scene.add(rim);

    // ── Build detailed paper plane mesh (BIGGER & clearer) ──
    const planeGroup = new THREE.Group();
    scene.add(planeGroup);
    overlayPlaneRef.current = planeGroup;

    const mainMat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.2,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });
    const darkMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color).multiplyScalar(0.55),
      roughness: 0.25,
      metalness: 0.15,
      side: THREE.DoubleSide,
    });
    const whiteMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.3,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });

    // Nose (mũi máy bay)
    const noseGeo = new THREE.BufferGeometry();
    noseGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
       2.0,  0.0,  0.0,    // tip
       0.0,  0.15, 0.0,    // top-center
       0.0, -0.12, 0.0,    // bottom-center
    ]), 3));
    noseGeo.computeVertexNormals();
    planeGroup.add(new THREE.Mesh(noseGeo, darkMat));

    // Left wing (cánh trái) — larger
    const wingLGeo = new THREE.BufferGeometry();
    wingLGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
       2.0,  0.0,  0.0,    // nose tip
       0.0,  0.15, 0.0,    // center top
      -0.8,  0.3,  1.6,    // wing tip left
    ]), 3));
    wingLGeo.computeVertexNormals();
    planeGroup.add(new THREE.Mesh(wingLGeo, mainMat));

    // Right wing (cánh phải) — larger
    const wingRGeo = new THREE.BufferGeometry();
    wingRGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
       2.0,  0.0,  0.0,    // nose tip
       0.0,  0.15, 0.0,    // center top
      -0.8,  0.3, -1.6,    // wing tip right
    ]), 3));
    wingRGeo.computeVertexNormals();
    planeGroup.add(new THREE.Mesh(wingRGeo, mainMat));

    // Left wing underside
    const wingLUnder = new THREE.BufferGeometry();
    wingLUnder.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
       2.0,  0.0,  0.0,
       0.0, -0.12, 0.0,
      -0.8,  0.3,  1.6,
    ]), 3));
    wingLUnder.computeVertexNormals();
    planeGroup.add(new THREE.Mesh(wingLUnder, whiteMat));

    // Right wing underside
    const wingRUnder = new THREE.BufferGeometry();
    wingRUnder.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
       2.0,  0.0,  0.0,
       0.0, -0.12, 0.0,
      -0.8,  0.3, -1.6,
    ]), 3));
    wingRUnder.computeVertexNormals();
    planeGroup.add(new THREE.Mesh(wingRUnder, whiteMat));

    // Tail fin (đuôi)
    const tailGeo = new THREE.BufferGeometry();
    tailGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
      -0.8,  0.3,  0.0,
      -1.4,  1.0,  0.0,
      -1.4,  0.3,  0.0,
    ]), 3));
    tailGeo.computeVertexNormals();
    planeGroup.add(new THREE.Mesh(tailGeo, darkMat));

    // Body fold line (gờ gấp thân)
    const foldGeo = new THREE.BufferGeometry();
    foldGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
       2.0,  0.0,  0.0,
      -0.8,  0.3,  0.0,
       0.0, -0.12, 0.0,
    ]), 3));
    foldGeo.computeVertexNormals();
    planeGroup.add(new THREE.Mesh(foldGeo, darkMat));

    // Scale up the whole plane
    planeGroup.scale.set(2.2, 2.2, 2.2);

    // Rotate so it faces the flying direction (bottom-left → top-right)
    planeGroup.rotation.set(0.2, -0.3, 0.35);

    // Starting position (bottom-left, off-screen)
    planeGroup.position.set(-16, -10, 0);

    // ── Trail sparkle particles ──
    const trails = [];
    for (let i = 0; i < 30; i++) {
      const size = 0.12 - i * 0.003;
      const tGeo = new THREE.SphereGeometry(Math.max(size, 0.02), 6, 6);
      const tMat = new THREE.MeshBasicMaterial({
        color: i % 3 === 0 ? '#fbbf24' : (i % 3 === 1 ? color : '#38bdf8'),
        transparent: true,
        opacity: 0,
      });
      const t = new THREE.Mesh(tGeo, tMat);
      scene.add(t);
      trails.push({ mesh: t, mat: tMat });
    }
    overlayTrailsRef.current = trails;

    // ── Confetti burst on start ──
    const confettiColors = ['#f43f5e', '#fbbf24', '#34d399', '#38bdf8', '#a855f7', '#fb923c'];
    const confetti = [];
    for (let i = 0; i < 30; i++) {
      const cGeo = new THREE.PlaneGeometry(0.15, 0.1);
      const cMat = new THREE.MeshBasicMaterial({
        color: confettiColors[i % confettiColors.length],
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0,
      });
      const c = new THREE.Mesh(cGeo, cMat);
      scene.add(c);
      confetti.push({
        mesh: c, mat: cMat,
        vx: (Math.random() - 0.5) * 0.12,
        vy: 0.03 + Math.random() * 0.06,
        rotSpeed: (Math.random() - 0.5) * 0.3,
      });
    }

    // ── Animation ──
    const clock = new THREE.Clock();
    overlayClockRef.current = clock;
    const DURATION = 2.4; // seconds to fly across

    const animate = () => {
      const elapsed = clock.getElapsedTime();
      const progress = Math.min(elapsed / DURATION, 1.0);

      if (progress >= 1.0) {
        // Done — cleanup
        cancelAnimationFrame(overlayAnimRef.current);
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        renderer.dispose();
        return;
      }

      overlayAnimRef.current = requestAnimationFrame(animate);

      // Ease-in-out curve
      const eased = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      // Fly from bottom-left (-16, -10) to top-right (16, 10)
      const px = THREE.MathUtils.lerp(-16, 18, eased);
      const py = THREE.MathUtils.lerp(-10, 12, eased) + Math.sin(progress * Math.PI * 3) * 0.8;
      planeGroup.position.set(px, py, 0);

      // Wobble rotation during flight
      planeGroup.rotation.z = 0.35 + Math.sin(elapsed * 8) * 0.12;
      planeGroup.rotation.x = 0.2 + Math.sin(elapsed * 6) * 0.08;
      planeGroup.rotation.y = -0.3 + Math.sin(elapsed * 5) * 0.06;

      // Scale pulse
      const sc = 2.2 + Math.sin(elapsed * 4) * 0.15;
      planeGroup.scale.set(sc, sc, sc);

      // Trails following the plane
      trails.forEach((t, i) => {
        const delay = i * 0.035;
        const tProgress = Math.max(0, progress - delay * 0.3);
        if (tProgress > 0 && tProgress < 1.0) {
          const tEased = tProgress < 0.5
            ? 4 * tProgress * tProgress * tProgress
            : 1 - Math.pow(-2 * tProgress + 2, 3) / 2;
          t.mesh.position.set(
            THREE.MathUtils.lerp(-16, 18, tEased) - (i * 0.35),
            THREE.MathUtils.lerp(-10, 12, tEased) - (i * 0.15) + Math.sin((tProgress) * Math.PI * 3) * 0.6,
            Math.sin(elapsed * 3 + i) * 0.4
          );
          t.mat.opacity = Math.max(0, 0.8 - i * 0.025 - progress * 0.3);
          const tsc = 1.0 + Math.sin(elapsed * 5 + i) * 0.3;
          t.mesh.scale.set(tsc, tsc, tsc);
        } else {
          t.mat.opacity = 0;
        }
      });

      // Confetti burst (first 30% of animation)
      if (progress < 0.35) {
        confetti.forEach((c, idx) => {
          const cProgress = elapsed * 1.8;
          c.mat.opacity = Math.max(0, 0.9 - cProgress * 0.4);
          c.mesh.position.set(
            -14 + c.vx * cProgress * 30,
            -8 + c.vy * cProgress * 25,
            Math.sin(cProgress + idx) * 0.6
          );
          c.mesh.rotation.z += c.rotSpeed;
          c.mesh.rotation.x += c.rotSpeed * 0.5;
        });
      } else {
        confetti.forEach((c) => { c.mat.opacity = 0; });
      }

      renderer.render(scene, camera);
    };

    overlayAnimRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(overlayAnimRef.current);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      renderer.dispose();
    };
  }, [launched, color]);

  // ── Idle small canvas (bobbing plane icon) ──
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0, 4.5);

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
    container.appendChild(domElement);

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 1.1));
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
    keyLight.position.set(3, 5, 4);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(color, 0.7);
    rimLight.position.set(-2, 2, -1);
    scene.add(rimLight);

    // Small idle plane
    const planeGroup = new THREE.Group();
    scene.add(planeGroup);

    const planeMat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.25,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });
    const planeMatDark = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color).multiplyScalar(0.65),
      roughness: 0.3,
      metalness: 0.08,
      side: THREE.DoubleSide,
    });

    // Nose
    const noseGeo = new THREE.BufferGeometry();
    noseGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
       1.2, 0, 0,   0, 0.1, 0,   0, -0.08, 0,
    ]), 3));
    noseGeo.computeVertexNormals();
    planeGroup.add(new THREE.Mesh(noseGeo, planeMatDark));

    // Wings
    const wingLGeo = new THREE.BufferGeometry();
    wingLGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
       1.2, 0, 0,   0, 0.1, 0,   -0.4, 0.2, 0.9,
    ]), 3));
    wingLGeo.computeVertexNormals();
    planeGroup.add(new THREE.Mesh(wingLGeo, planeMat));

    const wingRGeo = new THREE.BufferGeometry();
    wingRGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
       1.2, 0, 0,   0, 0.1, 0,   -0.4, 0.2, -0.9,
    ]), 3));
    wingRGeo.computeVertexNormals();
    planeGroup.add(new THREE.Mesh(wingRGeo, planeMat));

    // Fold
    const foldGeo = new THREE.BufferGeometry();
    foldGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
       1.2, 0, 0,   -0.4, 0.2, 0,   0, -0.08, 0,
    ]), 3));
    foldGeo.computeVertexNormals();
    planeGroup.add(new THREE.Mesh(foldGeo, planeMatDark));

    planeGroup.scale.set(1.1, 1.1, 1.1);

    // Idle animation
    const clock = new THREE.Clock();
    let animId = null;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      planeGroup.position.y = Math.sin(elapsed * 2.2) * 0.08;
      planeGroup.position.x = Math.sin(elapsed * 1.1) * 0.04;
      planeGroup.rotation.z = Math.sin(elapsed * 1.8) * 0.06;
      planeGroup.rotation.x = Math.sin(elapsed * 2.5) * 0.04;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      if (container.contains(domElement)) container.removeChild(domElement);
      renderer.dispose();
    };
  }, [width, height, color]);

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
