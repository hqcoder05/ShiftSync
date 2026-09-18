import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import * as THREE from 'three';

/**
 * PaperPlane3D.web.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Máy bay giấy 3D Origami cao cấp:
 *  - Ở trạng thái tĩnh (Idle): Nằm gọn trong thẻ Hero Banner, bồng bềnh 3D tự nhiên.
 *  - Khi phóng (Launched): Kích hoạt lớp phủ toàn màn hình (Fullscreen Overlay),
 *    máy bay lao vút từ góc trên bên phải bay xéo xuyên thẳng qua GẦN GIỮA MÀN HÌNH,
 *    lượn vòng cung uốn lượn ngoạn mục với vệt sao băng Stardust & pháo hoa giấy 3D Confetti.
 *  - Không bao giờ bị cắt (clip) bởi khung thẻ nhỏ!
 */

// ── Hàm tạo mô hình Máy bay giấy Origami chuẩn ──────────────────────────────
function createOrigamiDart(accentColor = '#428531') {
  const planeGroup = new THREE.Group();

  const topWingMat = new THREE.MeshStandardMaterial({
    color: 0xfafafa,
    roughness: 0.35,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });

  const bottomKeelMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.45,
    metalness: 0.08,
    side: THREE.DoubleSide,
  });

  const wingAccentMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    roughness: 0.3,
    metalness: 0.1,
    side: THREE.DoubleSide,
  });

  const NOSE = [0, 0.06, 1.35];
  const TAIL_CENTER = [0, 0.05, -0.9];
  const KEEL_BOTTOM = [0, -0.38, -0.35];
  const WING_L_TIP = [-1.35, 0.28, -0.75];
  const WING_R_TIP = [1.35, 0.28, -0.75];
  const WINGLET_L = [-1.35, 0.52, -0.7];
  const WINGLET_R = [1.35, 0.52, -0.7];

  const createTriangle = (p1, p2, p3, mat) => {
    const geo = new THREE.BufferGeometry();
    const vertices = new Float32Array([...p1, ...p2, ...p3]);
    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geo.computeVertexNormals();
    return new THREE.Mesh(geo, mat);
  };

  // Cánh chính
  planeGroup.add(createTriangle(NOSE, TAIL_CENTER, WING_L_TIP, topWingMat));
  planeGroup.add(createTriangle(NOSE, WING_R_TIP, TAIL_CENTER, topWingMat));

  // Sống lưng & Keel dưới
  planeGroup.add(createTriangle(NOSE, KEEL_BOTTOM, TAIL_CENTER, bottomKeelMat));
  planeGroup.add(createTriangle(NOSE, TAIL_CENTER, KEEL_BOTTOM, bottomKeelMat));

  // Winglets vát cong khí động học
  planeGroup.add(createTriangle(WING_L_TIP, [-1.0, 0.22, 0.0], WINGLET_L, wingAccentMat));
  planeGroup.add(createTriangle(WING_R_TIP, WINGLET_R, [1.0, 0.22, 0.0], wingAccentMat));

  // Sọc xanh thể thao ở giữa
  const stripeGeo = new THREE.BufferGeometry();
  stripeGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
    0, 0.07, 1.1,
    -0.12, 0.065, -0.7,
    0.12, 0.065, -0.7,
  ]), 3));
  stripeGeo.computeVertexNormals();
  planeGroup.add(new THREE.Mesh(stripeGeo, wingAccentMat));

  // Viền nếp gấp sắc sảo
  const lineMat = new THREE.LineBasicMaterial({
    color: 0x475569,
    linewidth: 1.5,
    transparent: true,
    opacity: 0.35,
  });
  const foldPoints = [
    new THREE.Vector3(...NOSE), new THREE.Vector3(...TAIL_CENTER),
    new THREE.Vector3(...NOSE), new THREE.Vector3(...WING_L_TIP),
    new THREE.Vector3(...NOSE), new THREE.Vector3(...WING_R_TIP),
    new THREE.Vector3(...TAIL_CENTER), new THREE.Vector3(...KEEL_BOTTOM),
    new THREE.Vector3(...NOSE), new THREE.Vector3(...KEEL_BOTTOM),
  ];
  const foldLineGeo = new THREE.BufferGeometry().setFromPoints(foldPoints);
  planeGroup.add(new THREE.LineSegments(foldLineGeo, lineMat));

  return planeGroup;
}

export default function PaperPlane3D({
  launched = false,
  color = '#38bdf8',
  accentColor = '#428531',
  width = 145,
  height = 120,
  style,
  onPress,
}) {
  const mountRef = useRef(null);
  const localPlanePivotRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  // ── 1. CÀI ĐẶT MÁY BAY TĨNH TRONG THẺ (CARD IDLE STATE) ──
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const aspect = width / height;
    const camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 100);
    camera.position.set(2.0, 1.5, 3.4);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window?.devicePixelRatio || 1, 2));
    const dom = renderer.domElement;
    dom.style.outline = 'none';
    dom.style.userSelect = 'none';
    dom.style.cursor = 'pointer';
    container.appendChild(dom);

    // Ánh sáng Studio
    scene.add(new THREE.AmbientLight(0xffffff, 1.25));
    const sun = new THREE.DirectionalLight(0xffffff, 1.5);
    sun.position.set(4, 5, 3);
    scene.add(sun);
    const rim = new THREE.DirectionalLight(0x86efac, 1.0);
    rim.position.set(-3, 2, -2);
    scene.add(rim);

    // Pivot & Plane
    const pivot = new THREE.Group();
    scene.add(pivot);
    localPlanePivotRef.current = pivot;

    const plane = createOrigamiDart(accentColor);
    plane.scale.set(0.95, 0.95, 0.95);
    plane.rotation.y = -0.45;
    pivot.add(plane);

    const handleMouseMove = (e) => {
      const rect = dom.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouseRef.current = { x, y };
    };
    const handleMouseLeave = () => { mouseRef.current = { x: 0, y: 0 }; };
    const handleClick = () => { if (typeof onPress === 'function') onPress(); };

    dom.addEventListener('mousemove', handleMouseMove);
    dom.addEventListener('mouseleave', handleMouseLeave);
    dom.addEventListener('click', handleClick);

    const clock = new THREE.Clock();
    let animId = null;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Đung đưa bồng bềnh 3D êm ái
      const targetRotY = mouseRef.current.x * 0.4;
      const targetRotX = -mouseRef.current.y * 0.3;
      const bobbingY = Math.sin(elapsed * 2.2) * 0.08;
      const bankingZ = Math.sin(elapsed * 1.5) * 0.06;

      pivot.position.y = bobbingY;
      pivot.rotation.z = bankingZ;
      pivot.rotation.x = THREE.MathUtils.lerp(pivot.rotation.x, targetRotX, 0.08);
      pivot.rotation.y = THREE.MathUtils.lerp(pivot.rotation.y, targetRotY, 0.08);

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      dom.removeEventListener('mousemove', handleMouseMove);
      dom.removeEventListener('mouseleave', handleMouseLeave);
      dom.removeEventListener('click', handleClick);
      if (container.contains(dom)) container.removeChild(dom);
      renderer.dispose();
    };
  }, [width, height, accentColor, onPress]);

  // ── 2. HIỆU ỨNG PHÓNG TOÀN MÀN HÌNH (BAY TỚI GẦN GIỮA MÀN HÌNH) ──
  useEffect(() => {
    if (!launched || typeof document === 'undefined') return;

    // Tạm ẩn máy bay trong thẻ để máy bay lớn cất cánh
    if (localPlanePivotRef.current) {
      localPlanePivotRef.current.visible = false;
    }

    // Tạo màn chiếu toàn màn hình không bị giới hạn bởi thẻ
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 999999;
      pointer-events: none;
      overflow: hidden;
    `;
    document.body.appendChild(overlay);

    const screenW = window.innerWidth;
    const screenH = window.innerHeight;

    const overlayScene = new THREE.Scene();
    const overlayCamera = new THREE.PerspectiveCamera(45, screenW / screenH, 0.1, 100);
    overlayCamera.position.set(0, 0, 14);
    overlayCamera.lookAt(0, 0, 0);

    const overlayRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    overlayRenderer.setSize(screenW, screenH);
    overlayRenderer.setPixelRatio(Math.min(window?.devicePixelRatio || 1, 2));
    overlay.appendChild(overlayRenderer.domElement);

    // Ánh sáng cho Overlay
    overlayScene.add(new THREE.AmbientLight(0xffffff, 1.3));
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.6);
    sunLight.position.set(5, 8, 5);
    overlayScene.add(sunLight);
    const rim = new THREE.DirectionalLight(0x86efac, 1.2);
    rim.position.set(-4, 3, -2);
    overlayScene.add(rim);

    // Khối máy bay phóng to
    const flyPivot = new THREE.Group();
    overlayScene.add(flyPivot);

    const plane = createOrigamiDart(accentColor);
    // Máy bay lớn, sắc nét rõ ràng
    plane.scale.set(1.4, 1.4, 1.4);
    flyPivot.add(plane);

    // Vệt sao băng Stardust bám đuôi
    const TRAIL_COUNT = 32;
    const trails = [];
    const trailGroup = new THREE.Group();
    overlayScene.add(trailGroup);

    for (let i = 0; i < TRAIL_COUNT; i++) {
      const radius = 0.07 - i * 0.0018;
      const tGeo = new THREE.SphereGeometry(Math.max(0.015, radius), 6, 6);
      const tMat = new THREE.MeshBasicMaterial({
        color: i % 3 === 0 ? 0x22c55e : (i % 3 === 1 ? 0x86efac : 0xfacc15),
        transparent: true,
        opacity: 0,
      });
      const mesh = new THREE.Mesh(tGeo, tMat);
      trailGroup.add(mesh);
      trails.push({ mesh, mat: tMat });
    }

    // Pháo hoa giấy 3D Confetti
    const CONFETTI_COUNT = 35;
    const confettiList = [];
    const confettiColors = [0x22c55e, 0x3b82f6, 0xf59e0b, 0xec4899, 0x10b981];
    for (let i = 0; i < CONFETTI_COUNT; i++) {
      const cGeo = new THREE.PlaneGeometry(0.12, 0.08);
      const cMat = new THREE.MeshBasicMaterial({
        color: confettiColors[i % confettiColors.length],
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0,
      });
      const cMesh = new THREE.Mesh(cGeo, cMat);
      overlayScene.add(cMesh);
      confettiList.push({
        mesh: cMesh,
        mat: cMat,
        vx: (Math.random() - 0.5) * 0.14,
        vy: 0.04 + Math.random() * 0.09,
        vz: (Math.random() - 0.5) * 0.12,
        rx: Math.random() * 0.25,
        ry: Math.random() * 0.25,
      });
    }

    // Tính toán tầm nhìn camera theo kích thước màn hình
    const halfH = 14 * Math.tan((45 * Math.PI) / 360);
    const halfW = halfH * (screenW / screenH);

    // Điểm bắt đầu: Phía trên bên phải màn hình
    const startX = halfW * 0.75;
    const startY = halfH * 0.65;

    // Điểm đến: GẦN GIỮA MÀN HÌNH (User request: bay tới gần giữa màn hình luôn)
    const midX = -halfW * 0.08;
    const midY = 0.1;

    // Điểm thoát nhẹ về phía góc dưới trái
    const endX = -halfW * 0.55;
    const endY = -halfH * 0.45;

    const clock = new THREE.Clock();
    let animId = null;
    const DURATION = 2.4; // 2.4 giây bay ngoạn mục

    const animateFlight = () => {
      const elapsed = clock.getElapsedTime();
      const progress = Math.min(elapsed / DURATION, 1.0);

      if (progress >= 1.0) {
        // Hoàn tất chuyến bay, gỡ bỏ Overlay & hiển thị lại máy bay trong thẻ
        cancelAnimationFrame(animId);
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        overlayRenderer.dispose();
        if (localPlanePivotRef.current) {
          localPlanePivotRef.current.visible = true;
        }
        return;
      }

      animId = requestAnimationFrame(animateFlight);

      // Quỹ đạo bay mượt mà:
      // Giai đoạn 1 (0 -> 0.65): Lao dốc từ góc trên bên phải tới GẦN CHÍNH GIỮA MÀN HÌNH
      // Giai đoạn 2 (0.65 -> 1.0): Lượn vòng cung uốn lượn tại giữa rồi lướt nhẹ sang góc trái
      if (progress <= 0.65) {
        const subP = progress / 0.65;
        // Cubic ease-out cho cú phóng xé gió
        const ease = 1 - Math.pow(1 - subP, 2.8);

        flyPivot.position.x = THREE.MathUtils.lerp(startX, midX, ease);
        flyPivot.position.y = THREE.MathUtils.lerp(startY, midY, ease) + Math.sin(subP * Math.PI) * 0.4;
        flyPivot.position.z = Math.sin(subP * Math.PI) * 1.2;

        // Góc xoay chúc mũi chéo xuống góc trái
        flyPivot.rotation.z = 0.45 - ease * 0.15;
        flyPivot.rotation.x = 0.35 + Math.sin(subP * Math.PI) * 0.1;
        flyPivot.rotation.y = -1.8 + ease * 0.25;

        // Pháo hoa giấy bùng nổ
        if (subP < 0.5) {
          const burstAlpha = 1.0 - (subP / 0.5);
          confettiList.forEach((c) => {
            c.mat.opacity = burstAlpha;
            c.mesh.position.x += c.vx;
            c.mesh.position.y += c.vy;
            c.mesh.position.z += c.vz;
            c.mesh.rotation.x += c.rx;
            c.mesh.rotation.y += c.ry;
          });
        }
      } else {
        const subP = (progress - 0.65) / 0.35;
        const ease = subP * subP;

        flyPivot.position.x = THREE.MathUtils.lerp(midX, endX, ease);
        flyPivot.position.y = THREE.MathUtils.lerp(midY, endY, ease);
        flyPivot.position.z = THREE.MathUtils.lerp(1.2, 0.2, ease);

        // Nghiêng cánh lượn thoát
        flyPivot.rotation.z = THREE.MathUtils.lerp(0.3, 0.6, ease);
        flyPivot.rotation.x = THREE.MathUtils.lerp(0.4, 0.1, ease);
        flyPivot.rotation.y = THREE.MathUtils.lerp(-1.55, -2.1, ease);
      }

      // Vệt Stardust bám theo sau đuôi máy bay
      trails.forEach((t, i) => {
        const trailAlpha = Math.max(0, (1.0 - progress * 0.85) * (1 - i / TRAIL_COUNT));
        t.mat.opacity = trailAlpha;
        t.mesh.position.set(
          flyPivot.position.x + i * 0.16 + 0.12,
          flyPivot.position.y + i * 0.10 + 0.08,
          flyPivot.position.z - i * 0.03
        );
      });

      overlayRenderer.render(overlayScene, overlayCamera);
    };

    animateFlight();

    return () => {
      cancelAnimationFrame(animId);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      overlayRenderer.dispose();
      if (localPlanePivotRef.current) {
        localPlanePivotRef.current.visible = true;
      }
    };
  }, [launched, accentColor]);

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
