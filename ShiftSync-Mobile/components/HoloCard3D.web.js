import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import * as THREE from 'three';

/**
 * HoloCard3D.web.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Thẻ nhân viên Hologram 3D lấp lánh dải quang phổ cầu vồng:
 *  - Thẻ 3D lơ lửng, nghiêng theo chuột/cảm ứng.
 *  - Dải hologram cầu vồng (iridescent sheen) chạy theo góc nghiêng.
 *  - Khi hover: phóng to, hiệu ứng sparkle lấp lánh cực mạnh.
 *
 * Props:
 *  - userName, role, staffCode: thông tin hiển thị
 *  - avatarColor: màu avatar (hex)
 *  - width, height: kích thước canvas
 */
export default function HoloCard3D({
  userName = 'Nhân viên',
  role = 'Nhân viên bán hàng',
  staffCode = 'SS-001',
  avatarColor = '#4ade80',
  width = 240,
  height = 150,
  style,
}) {
  const mountRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const isHoveredRef = useRef(false);

  useEffect(() => {
    isHoveredRef.current = isHovered;
  }, [isHovered]);

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

    // ── Card Group ──
    const cardGroup = new THREE.Group();
    scene.add(cardGroup);

    // Thẻ chính — nền tối sang trọng
    const cardGeo = new THREE.BoxGeometry(3.4, 2.1, 0.07);
    const cardMat = new THREE.MeshStandardMaterial({
      color: '#0d1117',
      roughness: 0.08,
      metalness: 0.85,
    });
    const cardMesh = new THREE.Mesh(cardGeo, cardMat);
    cardGroup.add(cardMesh);

    // ── Holographic Layer (Rainbow Sheen Mesh) ──
    // Dùng 4 lớp PlaneGeometry mỏng với màu hologram cầu vồng
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
      cardGroup.add(mesh);
      holoLayers.push({ mesh, mat, baseOpacity: 0.08 + i * 0.015 });
    });

    // ── Stripe Lines (dải sọc hologram) ──
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
      cardGroup.add(stripe);
    }

    // ── Viền card phát sáng ──
    const borderGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(3.42, 2.12, 0.08));
    const borderMat = new THREE.LineBasicMaterial({
      color: '#4ade80',
      transparent: true,
      opacity: 0.55,
    });
    const border = new THREE.LineSegments(borderGeo, borderMat);
    cardGroup.add(border);

    // ── Avatar Circle ──
    const avatarGeo = new THREE.CircleGeometry(0.42, 28);
    const avatarMat = new THREE.MeshStandardMaterial({
      color: avatarColor,
      roughness: 0.25,
      metalness: 0.4,
    });
    const avatarMesh = new THREE.Mesh(avatarGeo, avatarMat);
    avatarMesh.position.set(-1.22, 0.28, 0.048);
    cardGroup.add(avatarMesh);

    // ── Logo bars ──
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
      cardGroup.add(b);
    });

    // ── Text bars (lines placeholders) ──
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
      cardGroup.add(b);
    });

    // ID barcode strip
    const barcodeGeo = new THREE.BoxGeometry(1.5, 0.19, 0.02);
    const barcodeMat = new THREE.MeshBasicMaterial({
      color: '#bbf7d0',
      transparent: true,
      opacity: 0.35,
    });
    const barcode = new THREE.Mesh(barcodeGeo, barcodeMat);
    barcode.position.set(0.45, -0.58, 0.048);
    cardGroup.add(barcode);
    for (let i = 0; i < 14; i++) {
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.19, 0.022),
        new THREE.MeshBasicMaterial({ color: '#166534', transparent: true, opacity: 0.6 + (i % 3) * 0.1 })
      );
      bar.position.set(-0.6 + i * 0.09 + 0.45, -0.58, 0.052);
      cardGroup.add(bar);
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
    const onTouch = (e) => {
      const rect = container.getBoundingClientRect();
      const t = e.touches[0];
      if (t) mouseRef.current = {
        x: ((t.clientX - rect.left) / rect.width) * 2 - 1,
        y: -(((t.clientY - rect.top) / rect.height) * 2 - 1),
      };
      setIsHovered(true);
    };
    const onTouchEnd = () => setTimeout(() => setIsHovered(false), 1000);

    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('mouseenter', onEnter);
    container.addEventListener('mouseleave', onLeave);
    container.addEventListener('touchmove', onTouch, { passive: true });
    container.addEventListener('touchend', onTouchEnd, { passive: true });

    // ── Animation Loop ──
    const clock = new THREE.Clock();
    let animId = null;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      const hovered = isHoveredRef.current;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      // Tilt card theo chuột
      const targetRotY = mx * 0.35;
      const targetRotX = my * 0.22;
      cardGroup.rotation.y = THREE.MathUtils.lerp(cardGroup.rotation.y, targetRotY, 0.1);
      cardGroup.rotation.x = THREE.MathUtils.lerp(cardGroup.rotation.x, targetRotX, 0.1);

      // Idle floating
      cardGroup.position.y = Math.sin(elapsed * 1.8) * 0.05;

      // Scale on hover
      const targetScale = hovered ? 1.06 : 1.0;
      cardGroup.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.12);

      // Holographic sheen — shift màu theo góc nghiêng
      const sheen = Math.sin(elapsed * 2.5 + mx * 4) * 0.5 + 0.5;
      holoLayers.forEach((l, i) => {
        const wave = Math.sin(elapsed * 3 + i * 1.1 + mx * 5 + my * 3) * 0.5 + 0.5;
        l.mat.opacity = l.baseOpacity + wave * (hovered ? 0.22 : 0.12);
      });

      // Border glow
      borderMat.opacity = 0.4 + Math.sin(elapsed * 3) * 0.2 + (hovered ? 0.3 : 0);

      // Holo point light dance
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
      container.removeEventListener('touchmove', onTouch);
      container.removeEventListener('touchend', onTouchEnd);
      if (container.contains(domElement)) container.removeChild(domElement);
      renderer.dispose();
    };
  }, [width, height, avatarColor]);

  return (
    <View style={[styles.container, { width, height }, style]}>
      <View ref={mountRef} style={{ width, height }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
});
