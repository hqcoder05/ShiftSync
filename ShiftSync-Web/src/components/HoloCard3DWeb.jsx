import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';

/**
 * HoloCard3DWeb.jsx — Thẻ nhân viên Hologram 3D flip xoay 2 mặt
 * ─────────────────────────────────────────────────────────────────────────────
 * Click để lật xoay 360° — mặt trước: info thẻ, mặt sau: QR code + barcode
 * Rê chuột: nghiêng thẻ hologram cầu vồng
 */
export default function HoloCard3DWeb({
  userName = 'Nhân viên',
  role = 'Nhân viên bán hàng',
  staffCode = 'SS-001',
  avatarColor = '#4ade80',
  width = 280,
  height = 175,
  className = '',
}) {
  const mountRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const isHoveredRef = useRef(false);
  const flipRef = useRef({ flipping: false, targetAngle: 0, currentAngle: 0, side: 'front' });

  useEffect(() => {
    isHoveredRef.current = isHovered;
  }, [isHovered]);

  const handleClick = useCallback(() => {
    const f = flipRef.current;
    if (f.flipping) return;
    f.flipping = true;
    f.targetAngle = f.currentAngle + Math.PI; // flip 180°
    f.side = f.side === 'front' ? 'back' : 'front';
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // ── Scene & Camera ──
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
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
    domElement.style.cursor = 'pointer';
    container.appendChild(domElement);

    // ── Lighting ──
    scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
    keyLight.position.set(4, 6, 5);
    scene.add(keyLight);
    const holoLight = new THREE.PointLight(0xa78bfa, 1.2, 8);
    holoLight.position.set(-2, 1, 2);
    scene.add(holoLight);
    const greenLight = new THREE.PointLight(0x4ade80, 0.8, 6);
    greenLight.position.set(2, -1, 2);
    scene.add(greenLight);
    // Back side lighting
    const backLight = new THREE.DirectionalLight(0xffffff, 1.2);
    backLight.position.set(-4, -6, -5);
    scene.add(backLight);

    // ── Card Group ──
    const cardGroup = new THREE.Group();
    scene.add(cardGroup);

    // ═══ FRONT SIDE ═══
    const frontGroup = new THREE.Group();
    cardGroup.add(frontGroup);

    // Card body — dark premium
    const cardGeo = new THREE.BoxGeometry(3.4, 2.1, 0.07);
    const cardMat = new THREE.MeshStandardMaterial({
      color: '#0d1117',
      roughness: 0.08,
      metalness: 0.85,
    });
    frontGroup.add(new THREE.Mesh(cardGeo, cardMat));

    // Holographic layers (rainbow sheen)
    const holoColors = ['#f43f5e', '#fb923c', '#fde047', '#4ade80', '#38bdf8', '#a78bfa'];
    const holoLayers = [];
    holoColors.forEach((color, i) => {
      const geo = new THREE.PlaneGeometry(3.35, 2.06);
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0,
        side: THREE.FrontSide,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.z = 0.042 + i * 0.001;
      frontGroup.add(mesh);
      holoLayers.push({ mesh, mat, baseOpacity: 0.08 + i * 0.015 });
    });

    // Stripe lines
    for (let i = 0; i < 8; i++) {
      const y = -0.9 + i * 0.26;
      const stripeGeo = new THREE.PlaneGeometry(3.35, 0.07);
      const stripeMat = new THREE.MeshBasicMaterial({
        color: '#ffffff',
        transparent: true,
        opacity: 0.04 + (i % 2) * 0.03,
        depthWrite: false,
      });
      const stripe = new THREE.Mesh(stripeGeo, stripeMat);
      stripe.position.set(0, y, 0.045);
      frontGroup.add(stripe);
    }

    // Border glow
    const borderGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(3.42, 2.12, 0.08));
    const borderMat = new THREE.LineBasicMaterial({
      color: '#4ade80',
      transparent: true,
      opacity: 0.55,
    });
    const border = new THREE.LineSegments(borderGeo, borderMat);
    frontGroup.add(border);

    // Avatar circle
    const avatarGeo = new THREE.CircleGeometry(0.42, 28);
    const avatarMat = new THREE.MeshStandardMaterial({
      color: avatarColor,
      roughness: 0.25,
      metalness: 0.4,
    });
    const avatarMesh = new THREE.Mesh(avatarGeo, avatarMat);
    avatarMesh.position.set(-1.22, 0.28, 0.048);
    frontGroup.add(avatarMesh);

    // Logo bars
    const logoBars = [
      [0.0, 0.5, 0.55, 0.06],
      [0.1, 0.36, 0.4, 0.06],
      [-0.04, 0.22, 0.5, 0.06],
    ];
    logoBars.forEach(([ox, oy, w]) => {
      const b = new THREE.Mesh(
        new THREE.BoxGeometry(w, 0.052, 0.025),
        new THREE.MeshStandardMaterial({ color: '#4ade80', roughness: 0.15, metalness: 0.5 })
      );
      b.position.set(-1.22 + ox, oy - 0.48, 0.052);
      frontGroup.add(b);
    });

    // Text bars (name, role, code)
    const textBars = [
      { y: 0.5, w: 1.2, opacity: 0.95 },
      { y: 0.28, w: 0.9, opacity: 0.7 },
      { y: 0.06, w: 0.75, opacity: 0.55 },
    ];
    textBars.forEach((t) => {
      const b = new THREE.Mesh(
        new THREE.BoxGeometry(t.w, 0.07, 0.02),
        new THREE.MeshBasicMaterial({
          color: '#f0fdf4',
          transparent: true,
          opacity: t.opacity,
        })
      );
      b.position.set(0.45, t.y, 0.048);
      frontGroup.add(b);
    });

    // ID barcode strip
    const barcodeGeo = new THREE.BoxGeometry(1.5, 0.19, 0.02);
    const barcodeMat = new THREE.MeshBasicMaterial({
      color: '#bbf7d0',
      transparent: true,
      opacity: 0.35,
    });
    const barcodeMesh = new THREE.Mesh(barcodeGeo, barcodeMat);
    barcodeMesh.position.set(0.45, -0.58, 0.048);
    frontGroup.add(barcodeMesh);
    for (let i = 0; i < 14; i++) {
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.19, 0.022),
        new THREE.MeshBasicMaterial({ color: '#166534', transparent: true, opacity: 0.6 + (i % 3) * 0.1 })
      );
      bar.position.set(-0.6 + i * 0.09 + 0.45, -0.58, 0.052);
      frontGroup.add(bar);
    }

    // "CLICK TO FLIP" hint
    const hintGeo = new THREE.PlaneGeometry(1.0, 0.14);
    const hintMat = new THREE.MeshBasicMaterial({
      color: '#4ade80',
      transparent: true,
      opacity: 0.0,
      side: THREE.FrontSide,
      depthWrite: false,
    });
    const hintMesh = new THREE.Mesh(hintGeo, hintMat);
    hintMesh.position.set(0, -0.88, 0.06);
    frontGroup.add(hintMesh);

    // ═══ BACK SIDE ═══ (rotated 180° on Y)
    const backGroup = new THREE.Group();
    backGroup.rotation.y = Math.PI; // face backwards
    cardGroup.add(backGroup);

    // Back card body — slightly different look
    const backCardMat = new THREE.MeshStandardMaterial({
      color: '#111827',
      roughness: 0.06,
      metalness: 0.9,
    });
    backGroup.add(new THREE.Mesh(cardGeo.clone(), backCardMat));

    // Back holographic layers
    const backHoloLayers = [];
    holoColors.forEach((color, i) => {
      const geo = new THREE.PlaneGeometry(3.35, 2.06);
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0,
        side: THREE.FrontSide,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.z = 0.042 + i * 0.001;
      backGroup.add(mesh);
      backHoloLayers.push({ mesh, mat, baseOpacity: 0.06 + i * 0.012 });
    });

    // Back border glow
    const backBorderMat = new THREE.LineBasicMaterial({
      color: '#a78bfa',
      transparent: true,
      opacity: 0.5,
    });
    backGroup.add(new THREE.LineSegments(borderGeo.clone(), backBorderMat));

    // QR code block (simulated as grid)
    const qrGroup = new THREE.Group();
    qrGroup.position.set(-0.8, 0.15, 0.048);
    backGroup.add(qrGroup);

    // QR border
    const qrBorder = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 1.3, 0.015),
      new THREE.MeshBasicMaterial({ color: '#f0fdf4', transparent: true, opacity: 0.15 })
    );
    qrGroup.add(qrBorder);

    // QR dot grid
    const qrSize = 8;
    const dotSize = 0.1;
    const qrStartX = -0.4;
    const qrStartY = 0.4;
    // Pseudo QR pattern
    for (let row = 0; row < qrSize; row++) {
      for (let col = 0; col < qrSize; col++) {
        // Corner markers
        const isCorner = (row < 3 && col < 3) || (row < 3 && col >= qrSize - 3) || (row >= qrSize - 3 && col < 3);
        const isFilled = isCorner || Math.random() > 0.45;
        if (isFilled) {
          const dot = new THREE.Mesh(
            new THREE.BoxGeometry(dotSize, dotSize, 0.02),
            new THREE.MeshBasicMaterial({
              color: isCorner ? '#4ade80' : '#e2e8f0',
              transparent: true,
              opacity: isCorner ? 0.95 : 0.75,
            })
          );
          dot.position.set(
            qrStartX + col * (dotSize + 0.02),
            qrStartY - row * (dotSize + 0.02),
            0.01
          );
          qrGroup.add(dot);
        }
      }
    }

    // Back text bars
    const backTexts = [
      { y: 0.55, w: 1.0, x: 0.65, opacity: 0.85 },
      { y: 0.35, w: 0.7, x: 0.65, opacity: 0.6 },
      { y: 0.15, w: 0.85, x: 0.65, opacity: 0.5 },
      { y: -0.05, w: 0.6, x: 0.65, opacity: 0.4 },
    ];
    backTexts.forEach((t) => {
      const b = new THREE.Mesh(
        new THREE.BoxGeometry(t.w, 0.065, 0.02),
        new THREE.MeshBasicMaterial({
          color: '#e2e8f0',
          transparent: true,
          opacity: t.opacity,
        })
      );
      b.position.set(t.x, t.y, 0.048);
      backGroup.add(b);
    });

    // Back barcode at bottom
    const backBarcodeContainer = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 0.28, 0.02),
      new THREE.MeshBasicMaterial({ color: '#f8fafc', transparent: true, opacity: 0.12 })
    );
    backBarcodeContainer.position.set(0, -0.65, 0.048);
    backGroup.add(backBarcodeContainer);
    for (let i = 0; i < 28; i++) {
      const bw = 0.025 + (i % 3 === 0 ? 0.015 : 0);
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(bw, 0.22, 0.022),
        new THREE.MeshBasicMaterial({
          color: i % 4 === 0 ? '#4ade80' : '#334155',
          transparent: true,
          opacity: 0.7 + (i % 2) * 0.15,
        })
      );
      bar.position.set(-1.2 + i * 0.09, -0.65, 0.055);
      backGroup.add(bar);
    }

    // ── Sparkle particles ──
    const sparkles = [];
    for (let i = 0; i < 12; i++) {
      const sp = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.035 + Math.random() * 0.025, 0),
        new THREE.MeshBasicMaterial({
          color: holoColors[i % holoColors.length],
          transparent: true,
          opacity: 0,
        })
      );
      sp.position.set(
        (Math.random() - 0.5) * 3.2,
        (Math.random() - 0.5) * 1.8,
        0.08 + Math.random() * 0.3
      );
      scene.add(sp);
      sparkles.push({
        mesh: sp,
        mat: sp.material,
        seed: Math.random() * Math.PI * 2,
        speed: 1.5 + Math.random() * 2,
      });
    }

    // ── Interaction ──
    const onMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      mouseRef.current = {
        x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
        y: -(((e.clientY - rect.top) / rect.height) * 2 - 1),
      };
    };
    const onEnter = () => setIsHovered(true);
    const onLeave = () => { setIsHovered(false); mouseRef.current = { x: 0, y: 0 }; };

    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('mouseenter', onEnter);
    container.addEventListener('mouseleave', onLeave);

    // ── Animation Loop ──
    const clock = new THREE.Clock();
    let animId = null;
    const f = flipRef.current;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      const hovered = isHoveredRef.current;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      // ── Flip animation (smooth spring) ──
      if (f.flipping) {
        const diff = f.targetAngle - f.currentAngle;
        if (Math.abs(diff) < 0.01) {
          f.currentAngle = f.targetAngle;
          f.flipping = false;
        } else {
          f.currentAngle += diff * 0.08; // spring-like ease
        }
      }

      // Mouse tilt + flip rotation
      const tiltY = mx * 0.25;
      const tiltX = my * 0.15;
      cardGroup.rotation.y = f.currentAngle + (f.flipping ? 0 : tiltY);
      cardGroup.rotation.x = f.flipping ? 0 : tiltX;

      // Floating
      cardGroup.position.y = Math.sin(elapsed * 1.8) * 0.05;

      // Scale hover
      const targetScale = hovered ? 1.06 : 1.0;
      cardGroup.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.12);

      // Front holo layers
      holoLayers.forEach((l, i) => {
        const wave = Math.sin(elapsed * 3 + i * 1.1 + mx * 5 + my * 3) * 0.5 + 0.5;
        l.mat.opacity = l.baseOpacity + wave * (hovered ? 0.22 : 0.12);
      });

      // Back holo layers
      backHoloLayers.forEach((l, i) => {
        const wave = Math.sin(elapsed * 2.5 + i * 1.3 + mx * 4) * 0.5 + 0.5;
        l.mat.opacity = l.baseOpacity + wave * (hovered ? 0.18 : 0.1);
      });

      // Border pulse
      borderMat.opacity = 0.4 + Math.sin(elapsed * 3) * 0.2 + (hovered ? 0.3 : 0);
      backBorderMat.opacity = 0.35 + Math.sin(elapsed * 2.8) * 0.18 + (hovered ? 0.25 : 0);

      // Hint pulse when hovered
      hintMat.opacity = hovered ? (0.3 + Math.sin(elapsed * 4) * 0.2) : 0;

      // Moving holo light
      holoLight.position.set(
        Math.sin(elapsed * 2.2) * 2.5 + mx * 1.5,
        Math.cos(elapsed * 1.8) * 1.5 + my * 1.2,
        2
      );

      // Sparkles
      sparkles.forEach((s) => {
        const pulse = Math.sin(elapsed * s.speed + s.seed);
        s.mat.opacity = hovered
          ? Math.max(0, pulse * 0.85)
          : Math.max(0, (pulse - 0.4) * 0.3);
        const sc = hovered ? 1.4 + pulse * 0.4 : 0.8 + pulse * 0.2;
        s.mesh.scale.set(sc, sc, sc);
        s.mesh.rotation.y += 0.04;
      });

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      container.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('mouseenter', onEnter);
      container.removeEventListener('mouseleave', onLeave);
      if (container.contains(domElement)) container.removeChild(domElement);
      renderer.dispose();
    };
  }, [width, height, avatarColor]);

  return (
    <div
      ref={mountRef}
      className={className}
      onClick={handleClick}
      style={{
        width,
        height,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'visible',
        cursor: 'pointer',
      }}
    />
  );
}
