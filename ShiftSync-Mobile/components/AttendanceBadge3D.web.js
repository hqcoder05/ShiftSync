import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import * as THREE from 'three';

/**
 * AttendanceBadge3D.web.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Thẻ nhân viên 3D lơ lửng với hiệu ứng:
 *  - Idle: Thẻ lơ lửng nhẹ, phản chiếu ánh sáng bề mặt nhựa vinyl bóng bẩy.
 *  - checkedIn / checkedOut: Thẻ lật xoay 360° rồi đóng con dấu "CHECKED IN" / "COMPLETED".
 *  - Pulse Ripple: Vòng sóng Neon xanh lục tỏa ra sau khi chạm.
 *
 * Props:
 *  - status: 'idle' | 'checking' | 'checkedIn' | 'checkedOut'
 *  - userName: string (tên hiển thị trên thẻ)
 *  - width, height: kích thước canvas
 */
export default function AttendanceBadge3D({
  status = 'idle',
  userName = 'Nhân viên',
  width = 200,
  height = 220,
  style,
}) {
  const mountRef = useRef(null);
  const statusRef = useRef(status);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // ── Scene & Camera ──
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 0, 5.2);

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

    // ── Lighting ──
    scene.add(new THREE.AmbientLight(0xffffff, 1.0));

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
    keyLight.position.set(3, 5, 4);
    scene.add(keyLight);

    const greenRim = new THREE.DirectionalLight(0x34d399, 0.8);
    greenRim.position.set(-3, 2, -2);
    scene.add(greenRim);

    const neonPoint = new THREE.PointLight(0x4ade80, 0, 4.5);
    neonPoint.position.set(0, 0, 2);
    scene.add(neonPoint);

    // ── Materials ──
    const cardMat = new THREE.MeshStandardMaterial({
      color: '#1a2e1a',
      roughness: 0.18,
      metalness: 0.55,
    });

    const cardFaceMat = new THREE.MeshStandardMaterial({
      color: '#22543d',
      roughness: 0.22,
      metalness: 0.35,
    });

    const greenAccentMat = new THREE.MeshStandardMaterial({
      color: '#4ade80',
      roughness: 0.1,
      metalness: 0.6,
      emissive: new THREE.Color('#1a7a40'),
      emissiveIntensity: 0.4,
    });

    const whiteMat = new THREE.MeshStandardMaterial({
      color: '#f0fdf4',
      roughness: 0.35,
      metalness: 0.02,
    });

    const stampMat = new THREE.MeshStandardMaterial({
      color: '#4ade80',
      roughness: 0.12,
      metalness: 0.5,
      emissive: new THREE.Color('#166534'),
      emissiveIntensity: 0.6,
    });

    // ── Badge Group ──
    const badgeGroup = new THREE.Group();
    scene.add(badgeGroup);

    // Thẻ chính (card body)
    const cardGeo = new THREE.BoxGeometry(1.9, 2.6, 0.09);
    const cardMesh = new THREE.Mesh(cardGeo, [cardMat, cardMat, cardMat, cardMat, cardFaceMat, cardMat]);
    badgeGroup.add(cardMesh);

    // Viền xanh lá bo góc (4 thanh cạnh)
    const borderMat = greenAccentMat;
    const bEdge = 0.045;
    const bW = 1.9 + bEdge;
    const bH = 2.6 + bEdge;
    const edgePositions = [
      [0, bH / 2, 0.02], [0, -bH / 2, 0.02],
      [-bW / 2, 0, 0.02], [bW / 2, 0, 0.02],
    ];
    edgePositions.forEach(([x, y, z], i) => {
      const isHoriz = i < 2;
      const edgeGeo = new THREE.BoxGeometry(
        isHoriz ? bW : bEdge,
        isHoriz ? bEdge : bH,
        0.04
      );
      const edge = new THREE.Mesh(edgeGeo, borderMat);
      edge.position.set(x, y, z);
      badgeGroup.add(edge);
    });

    // Vòng móc thẻ trên cùng
    const hookGeo = new THREE.TorusGeometry(0.12, 0.035, 8, 16);
    const hook = new THREE.Mesh(hookGeo, greenAccentMat);
    hook.position.set(0, 1.42, 0.05);
    badgeGroup.add(hook);

    // Logo icon 3D (3 thanh nằm ngang đặc trưng ShiftSync)
    const logoGroup = new THREE.Group();
    logoGroup.position.set(-0.38, 0.78, 0.055);
    const logoBars = [
      [0, 0.14, 0.55, 0.07], [0.18, 0, 0.35, 0.07],
      [-0.08, -0.14, 0.48, 0.07],
    ];
    logoBars.forEach(([ox, oy, w, h]) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.03), greenAccentMat);
      b.position.set(ox, oy, 0);
      logoGroup.add(b);
    });
    badgeGroup.add(logoGroup);

    // Ảnh avatar (hình tròn trắng giả lập)
    const avatarGeo = new THREE.CircleGeometry(0.45, 24);
    const avatar = new THREE.Mesh(avatarGeo, whiteMat);
    avatar.position.set(0, 0.08, 0.048);
    badgeGroup.add(avatar);

    // Đường gạch tên (3 thanh trắng mờ)
    [0.26, 0.04, -0.18].forEach((y, i) => {
      const barW = [1.1, 0.8, 0.95][i];
      const barGeo = new THREE.BoxGeometry(barW, 0.065, 0.025);
      const barMat2 = new THREE.MeshStandardMaterial({
        color: '#bbf7d0',
        roughness: 0.5,
        metalness: 0.05,
        transparent: true,
        opacity: i === 0 ? 0.95 : 0.55,
      });
      const bar = new THREE.Mesh(barGeo, barMat2);
      bar.position.set(0, -0.68 + y * 0.8, 0.048);
      badgeGroup.add(bar);
    });

    // Con dấu "✔" (stamp) — ẩn lúc đầu
    const stampGroup = new THREE.Group();
    stampGroup.position.set(0.38, -0.78, 0.06);
    stampGroup.scale.set(0, 0, 0);
    badgeGroup.add(stampGroup);

    const stampCircle = new THREE.Mesh(
      new THREE.CircleGeometry(0.44, 20),
      stampMat
    );
    stampGroup.add(stampCircle);

    // Dấu tích ✔ từ 2 thanh
    const tick1 = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.42, 0.04), whiteMat);
    tick1.position.set(-0.08, -0.02, 0.025);
    tick1.rotation.z = 0.55;
    const tick2 = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.66, 0.04), whiteMat);
    tick2.position.set(0.1, 0.05, 0.025);
    tick2.rotation.z = -0.42;
    stampGroup.add(tick1, tick2);

    // ── Ripple Rings (sóng xung kích neon) ──
    const ripples = [];
    for (let i = 0; i < 3; i++) {
      const rGeo = new THREE.RingGeometry(0.55, 0.62, 28);
      const rMat = new THREE.MeshBasicMaterial({
        color: '#4ade80',
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
      });
      const r = new THREE.Mesh(rGeo, rMat);
      r.position.z = 0.12;
      scene.add(r);
      ripples.push({ mesh: r, mat: rMat, phase: i * 0.6 });
    }

    // ── Animation Loop ──
    const clock = new THREE.Clock();
    let animId = null;
    let flipProgress = 0; // 0→1 khi đang lật
    let flipDir = 0; // 0=idle, 1=lật
    let stampScale = 0;
    let lastStatus = 'idle';

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      const delta = clock.getDelta ? 0.016 : 0.016;
      const currentStatus = statusRef.current;

      // Phát hiện trạng thái mới → kích hoạt flip
      if (currentStatus !== lastStatus) {
        if (currentStatus === 'checking') {
          flipDir = 1;
          flipProgress = 0;
          stampScale = 0;
          stampGroup.scale.set(0, 0, 0);
        }
        if (currentStatus === 'idle') {
          flipDir = 0;
          stampScale = 0;
          stampGroup.scale.set(0, 0, 0);
        }
        lastStatus = currentStatus;
      }

      // Xử lý flip animation
      if (flipDir === 1) {
        flipProgress = Math.min(flipProgress + 0.022, 1.0);
        badgeGroup.rotation.y = flipProgress * Math.PI * 2;
        if (flipProgress >= 1.0) {
          flipDir = 0;
          badgeGroup.rotation.y = 0;
          // Hiện stamp
          stampScale = 0;
        }
      }

      // Stamp pop-in sau flip
      if ((currentStatus === 'checkedIn' || currentStatus === 'checkedOut') && stampScale < 1) {
        stampScale = Math.min(stampScale + 0.04, 1.0);
        const eased = 1 - Math.pow(1 - stampScale, 3);
        stampGroup.scale.set(eased, eased, eased);
        // stampMat màu xanh lá khi checkedIn, xanh dương khi checkedOut
        stampMat.color.set(currentStatus === 'checkedIn' ? '#4ade80' : '#38bdf8');
        stampMat.emissive.set(currentStatus === 'checkedIn' ? '#166534' : '#0369a1');
      }

      // Neon point light pulse
      neonPoint.intensity = (currentStatus === 'checkedIn' || currentStatus === 'checkedOut')
        ? 0.8 + Math.sin(elapsed * 6) * 0.4
        : 0;

      // Ripple animation
      ripples.forEach((r, i) => {
        const active = currentStatus === 'checkedIn' || currentStatus === 'checkedOut';
        const t = (elapsed * 1.8 + r.phase) % 1.8;
        r.mat.opacity = active ? Math.max(0, 0.7 - t * 0.5) : 0;
        const s = 1 + t * 1.8;
        r.mesh.scale.set(s, s, 1);
        r.mesh.position.set(0.38, -0.78, 0.12);
      });

      // Idle levitation + gentle tilt
      if (flipDir === 0) {
        badgeGroup.position.y = Math.sin(elapsed * 2.0) * 0.06;
        badgeGroup.rotation.x = Math.sin(elapsed * 1.4) * 0.04;
        if (currentStatus === 'idle') {
          badgeGroup.rotation.y = Math.sin(elapsed * 1.1) * 0.06;
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      if (container.contains(domElement)) container.removeChild(domElement);
      renderer.dispose();
    };
  }, [width, height]);

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
