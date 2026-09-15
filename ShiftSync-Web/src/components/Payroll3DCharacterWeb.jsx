import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

/**
 * Payroll3DCharacterWeb
 * ─────────────────────────────────────────────────────────────────────────────
 * Nhân vật 3D Low-Poly toàn thân đại diện tiền lương (Payroll Character):
 * - Đầy đủ đầu, tóc tạo kiểu, mắt, mũi, miệng cười, tai, 2 má ửng hồng.
 * - Trang phục đàng hoàng: áo sơ mi xanh ShiftSync lịch sự kèm cổ áo, cúc áo,
 *   thắt lưng khoá vàng, quần âu và giày thể thao trắng.
 * - Đồng xu vàng 3D cỡ lớn in ký hiệu '$' xoay lơ lửng trên tay, kèm 3 đồng xu mini
 *   vệ tinh và các ngôi sao lấp lánh (sparkles) xung quanh.
 * - Chuyển động:
 *   + Nhún nhảy lên xuống (floating/bobbing) nhịp nhàng.
 *   + Cánh tay định kỳ nâng lên vẫy chào (waving) thân thiện.
 *   + Biểu cảm đa dạng: chớp mắt tự nhiên, nháy mắt tinh nghịch, cười rạng ngời.
 * - Khi rê chuột (Hover):
 *   + Phóng to (Zoom in / Scale up) mượt mà.
 *   + Mắt cười híp mắt vui sướng, miệng cười toe toét hào hứng.
 *   + Đồng xu xoay tít và các hiệu ứng phát sáng lấp lánh nở rộ.
 *   + Đầu nghiêng dõi theo con trỏ chuột tương tác.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default function Payroll3DCharacterWeb({
  width = 280,
  height = 320,
  className = '',
  interactive = true,
}) {
  const mountRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const mousePos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0.4, 5.2);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'low-power',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 2. Lighting (Ấm áp, tôn lên ánh vàng kim của đồng xu)
    const ambientLight = new THREE.AmbientLight(0xfff6ea, 0.9);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.3);
    mainLight.position.set(3, 5, 4);
    scene.add(mainLight);

    const rimLight = new THREE.DirectionalLight(0x51A33D, 0.6); // Ánh xanh thương hiệu ShiftSync
    rimLight.position.set(-3, 3, -2);
    scene.add(rimLight);

    const coinGoldLight = new THREE.PointLight(0xffd700, 1.2, 5);
    coinGoldLight.position.set(1.1, 0.8, 0.8);
    scene.add(coinGoldLight);

    // 3. Materials
    const skinMat = new THREE.MeshStandardMaterial({
      color: '#F5CBB0',
      roughness: 0.6,
      metalness: 0.05,
      flatShading: true,
    });
    const hairMat = new THREE.MeshStandardMaterial({
      color: '#2B231D',
      roughness: 0.7,
      flatShading: true,
    });
    const shirtMat = new THREE.MeshStandardMaterial({
      color: '#469833', // Xanh lá ShiftSync
      roughness: 0.55,
      flatShading: true,
    });
    const shirtTrimMat = new THREE.MeshStandardMaterial({
      color: '#FFFFFF',
      roughness: 0.5,
      flatShading: true,
    });
    const pantsMat = new THREE.MeshStandardMaterial({
      color: '#2D3748', // Xám than lịch lãm
      roughness: 0.7,
      flatShading: true,
    });
    const shoesMat = new THREE.MeshStandardMaterial({
      color: '#FFFFFF',
      roughness: 0.4,
      flatShading: true,
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: '#FFD214',
      metalness: 0.75,
      roughness: 0.22,
      flatShading: true,
    });
    const darkGoldMat = new THREE.MeshStandardMaterial({
      color: '#D49B00',
      metalness: 0.85,
      roughness: 0.25,
      flatShading: true,
    });
    const eyeMat = new THREE.MeshBasicMaterial({ color: '#1A202C' });
    const blushMat = new THREE.MeshBasicMaterial({ color: '#FFAAA6' });
    const mouthMat = new THREE.MeshBasicMaterial({ color: '#9B2C2C' });
    const sparkleMat = new THREE.MeshBasicMaterial({ color: '#FFF875' });

    // 4. Character Root & Pivot Groups
    const characterGroup = new THREE.Group();
    scene.add(characterGroup);

    // BẬC THẦM / BÓNG DƯỚI ĐẤT (Soft Ground Shadow)
    const shadowGeo = new THREE.CircleGeometry(1.1, 24);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: '#1E3A18',
      transparent: true,
      opacity: 0.16,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.set(0, -1.5, 0);
    scene.add(shadowMesh);

    // ── BODY & CLOTHING ──
    const bodyGroup = new THREE.Group();
    characterGroup.add(bodyGroup);

    // Thân áo sơ mi (Torso)
    const torsoGeo = new THREE.CylinderGeometry(0.55, 0.48, 1.05, 8);
    const torsoMesh = new THREE.Mesh(torsoGeo, shirtMat);
    torsoMesh.position.set(0, -0.2, 0);
    bodyGroup.add(torsoMesh);

    // Cổ áo trắng (White Collar)
    const collarLeft = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.08), shirtTrimMat);
    collarLeft.position.set(-0.16, 0.33, 0.48);
    collarLeft.rotation.z = -0.25;
    collarLeft.rotation.y = 0.2;
    const collarRight = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.08), shirtTrimMat);
    collarRight.position.set(0.16, 0.33, 0.48);
    collarRight.rotation.z = 0.25;
    collarRight.rotation.y = -0.2;
    bodyGroup.add(collarLeft, collarRight);

    // Hàng cúc áo xinh xắn
    for (let i = 0; i < 3; i++) {
      const button = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), shirtTrimMat);
      button.position.set(0, 0.15 - i * 0.22, 0.52);
      bodyGroup.add(button);
    }

    // Thắt lưng (Belt) & khoá thắt lưng vàng
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.1, 8), pantsMat);
    belt.position.set(0, -0.68, 0);
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.11, 0.08), goldMat);
    buckle.position.set(0, -0.68, 0.48);
    bodyGroup.add(belt, buckle);

    // ── LEGS & SHOES ──
    const leftLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.15, 0.7, 7), pantsMat);
    leftLeg.position.set(-0.25, -1.05, 0);
    const rightLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.15, 0.7, 7), pantsMat);
    rightLeg.position.set(0.25, -1.05, 0);
    bodyGroup.add(leftLeg, rightLeg);

    // Giày sneakers trắng
    const leftShoe = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.48), shoesMat);
    leftShoe.position.set(-0.25, -1.4, 0.08);
    const rightShoe = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.48), shoesMat);
    rightShoe.position.set(0.25, -1.4, 0.08);
    bodyGroup.add(leftShoe, rightShoe);

    // ── HEAD & FACE ──
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.7, 0);
    characterGroup.add(headGroup);

    // Cổ (Neck)
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.25, 7), skinMat);
    neck.position.set(0, -0.32, 0);
    headGroup.add(neck);

    // Đầu (Head sphere low-poly)
    const headGeo = new THREE.SphereGeometry(0.72, 9, 8);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headGroup.add(headMesh);

    // Tai (Ears)
    const leftEar = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, 0.12), skinMat);
    leftEar.position.set(-0.72, 0, 0);
    const rightEar = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, 0.12), skinMat);
    rightEar.position.set(0.72, 0, 0);
    headGroup.add(leftEar, rightEar);

    // Tóc Low-Poly tạo kiểu thời trang (Stylish Hair with layered bangs)
    const hairCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.75, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.58),
      hairMat
    );
    hairCap.position.set(0, 0.15, -0.04);
    hairCap.scale.set(1.03, 0.85, 1.05);
    headGroup.add(hairCap);

    // Mái tóc bồng bềnh phía trước
    const bang1 = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.45, 5), hairMat);
    bang1.position.set(-0.25, 0.55, 0.52);
    bang1.rotation.set(0.5, -0.2, -0.3);
    const bang2 = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.42, 5), hairMat);
    bang2.position.set(0.15, 0.58, 0.54);
    bang2.rotation.set(0.4, 0.15, 0.2);
    headGroup.add(bang1, bang2);

    // Mắt (Eyes & Pupils)
    const leftEye = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.13, 0.05), eyeMat);
    leftEye.position.set(-0.24, 0.08, 0.68);
    const rightEye = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.13, 0.05), eyeMat);
    rightEye.position.set(0.24, 0.08, 0.68);
    headGroup.add(leftEye, rightEye);

    // Mí mắt nháy/chớp (Eyelids for blinking and winking)
    const leftLid = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.06), skinMat);
    leftLid.position.set(-0.24, 0.08, 0.7);
    leftLid.scale.set(1, 0.01, 1); // mặc định mở mắt
    const rightLid = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.06), skinMat);
    rightLid.position.set(0.24, 0.08, 0.7);
    rightLid.scale.set(1, 0.01, 1);
    headGroup.add(leftLid, rightLid);

    // Mắt cười híp (Smiling eye arcs when hovered)
    const smileEyeGeo = new THREE.TorusGeometry(0.08, 0.025, 4, 8, Math.PI);
    const leftSmileEye = new THREE.Mesh(smileEyeGeo, eyeMat);
    leftSmileEye.position.set(-0.24, 0.08, 0.7);
    leftSmileEye.rotation.z = Math.PI;
    leftSmileEye.visible = false;
    const rightSmileEye = new THREE.Mesh(smileEyeGeo, eyeMat);
    rightSmileEye.position.set(0.24, 0.08, 0.7);
    rightSmileEye.rotation.z = Math.PI;
    rightSmileEye.visible = false;
    headGroup.add(leftSmileEye, rightSmileEye);

    // Lông mày (Eyebrows)
    const leftBrow = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.05), hairMat);
    leftBrow.position.set(-0.24, 0.22, 0.67);
    leftBrow.rotation.z = 0.08;
    const rightBrow = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.05), hairMat);
    rightBrow.position.set(0.24, 0.22, 0.67);
    rightBrow.rotation.z = -0.08;
    headGroup.add(leftBrow, rightBrow);

    // Mũi nút xinh (Button Nose)
    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.08, 0.1), skinMat);
    nose.position.set(0, -0.04, 0.73);
    headGroup.add(nose);

    // Má hồng baby (Blush)
    const leftBlush = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6), blushMat);
    leftBlush.position.set(-0.38, -0.08, 0.6);
    leftBlush.scale.set(1.2, 0.7, 0.4);
    const rightBlush = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6), blushMat);
    rightBlush.position.set(0.38, -0.08, 0.6);
    rightBlush.scale.set(1.2, 0.7, 0.4);
    headGroup.add(leftBlush, rightBlush);

    // Miệng (Smile & Joyful Open Mouth)
    const mouthSmile = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.03, 4, 8, Math.PI), mouthMat);
    mouthSmile.position.set(0, -0.22, 0.68);
    mouthSmile.rotation.z = Math.PI;
    const mouthOpen = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), mouthMat);
    mouthOpen.position.set(0, -0.24, 0.68);
    mouthOpen.scale.set(1.3, 0.9, 0.3);
    mouthOpen.visible = false;
    headGroup.add(mouthSmile, mouthOpen);

    // ── ARMS & HANDS ──
    // Tay trái (Left Arm: buông thư giãn)
    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-0.62, 0.25, 0);
    const leftArmMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.75, 7), shirtMat);
    leftArmMesh.position.set(0, -0.32, 0);
    leftArmMesh.rotation.z = 0.15;
    const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 6), skinMat);
    leftHand.position.set(-0.06, -0.72, 0);
    leftArmGroup.add(leftArmMesh, leftHand);
    characterGroup.add(leftArmGroup);

    // Tay phải (Right Arm: nâng đồng xu & vẫy chào)
    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(0.62, 0.25, 0);
    characterGroup.add(rightArmGroup);

    const rightUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.13, 0.45, 7), shirtMat);
    rightUpperArm.position.set(0.12, -0.16, 0.15);
    rightUpperArm.rotation.set(-0.4, 0, -0.3);
    rightArmGroup.add(rightUpperArm);

    const rightForearmGroup = new THREE.Group();
    rightForearmGroup.position.set(0.24, -0.34, 0.3);
    rightArmGroup.add(rightForearmGroup);

    const rightForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.45, 7), shirtMat);
    rightForearm.position.set(0.15, 0.16, 0.22);
    rightForearm.rotation.set(-0.85, 0.2, -0.25);
    const rightHand = new THREE.Mesh(new THREE.SphereGeometry(0.15, 7, 7), skinMat);
    rightHand.position.set(0.28, 0.35, 0.42);
    rightForearmGroup.add(rightForearm, rightHand);

    // ── GIANT GOLD COIN (ĐỒNG XU VÀNG CHÍNH ĐẠI DIỆN TIỀN LƯƠNG) ──
    const mainCoinGroup = new THREE.Group();
    mainCoinGroup.position.set(0.92, 0.48, 0.58);
    scene.add(mainCoinGroup);

    // Đĩa xu vàng dày dặn vát cạnh (Cylinder gold coin)
    const coinCylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.14, 20), goldMat);
    coinCylinder.rotation.x = Math.PI / 2;
    mainCoinGroup.add(coinCylinder);

    // Viền nổi kim loại vàng đậm (Raised Rim)
    const coinRim = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.05, 6, 24), darkGoldMat);
    coinRim.position.set(0, 0, 0.08);
    const coinRimBack = coinRim.clone();
    coinRimBack.position.set(0, 0, -0.08);
    mainCoinGroup.add(coinRim, coinRimBack);

    // Ký hiệu '$' nổi 3D tinh xảo ở tâm đồng xu
    const dollarSignGroup = new THREE.Group();
    dollarSignGroup.position.set(0, 0, 0.08);
    mainCoinGroup.add(dollarSignGroup);

    // Vạch đứng xuyên tâm '$'
    const dollarBar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.68, 0.06), darkGoldMat);
    dollarSignGroup.add(dollarBar);
    // Vòng cong trên và dưới của ký hiệu '$'
    const dollarArcTop = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.045, 4, 12, Math.PI * 1.3), darkGoldMat);
    dollarArcTop.position.set(-0.02, 0.15, 0.01);
    dollarArcTop.rotation.z = -Math.PI * 0.4;
    const dollarArcBot = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.045, 4, 12, Math.PI * 1.3), darkGoldMat);
    dollarArcBot.position.set(0.02, -0.15, 0.01);
    dollarArcBot.rotation.z = Math.PI * 0.6;
    dollarSignGroup.add(dollarArcTop, dollarArcBot);

    // Mặt sau cũng có ký hiệu '$'
    const dollarSignBack = dollarSignGroup.clone();
    dollarSignBack.position.set(0, 0, -0.08);
    dollarSignBack.rotation.y = Math.PI;
    mainCoinGroup.add(dollarSignBack);

    // ── 3 ĐỒNG XU MINI VỆ TINH XOAY QUANH (ORBITING COINS) ──
    const miniCoins = [];
    const miniCoinOffsets = [
      { radius: 1.45, speed: 1.2, yOffset: 0.1, rotSpeed: 2.0 },
      { radius: 1.3, speed: -0.9, yOffset: 0.85, rotSpeed: -1.6 },
      { radius: 1.15, speed: 1.6, yOffset: -0.45, rotSpeed: 2.4 },
    ];
    miniCoinOffsets.forEach((cfg) => {
      const miniCoin = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.05, 12), goldMat);
      miniCoin.rotation.x = Math.PI / 3;
      scene.add(miniCoin);
      miniCoins.push({ mesh: miniCoin, ...cfg });
    });

    // ── HỌA TIẾT NGÔI SAO LẤP LÁNH (3D SPARKLES / DIAMONDS) ──
    const sparkles = [];
    for (let i = 0; i < 5; i++) {
      const sparkleGeo = new THREE.OctahedronGeometry(0.08, 0);
      const sparkle = new THREE.Mesh(sparkleGeo, sparkleMat);
      sparkle.position.set(
        (Math.random() - 0.3) * 2.4,
        (Math.random() - 0.2) * 2.2,
        0.5 + Math.random() * 0.6
      );
      sparkle.scale.set(1, 1.8, 1); // Kéo nhọn hình kim cương lấp lánh
      scene.add(sparkle);
      sparkles.push({
        mesh: sparkle,
        basePos: sparkle.position.clone(),
        phase: Math.random() * Math.PI * 2,
        speed: 2 + Math.random() * 2,
      });
    }

    // 5. Animation Loop
    let clock = new THREE.Clock();
    let animId;
    let waveTimer = 0;
    let blinkTimer = 0;
    let isWinking = false;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // ── A. NHÚN NHẢY & HƠI THỞ (Gentle Floating Bobbing) ──
      const bobFreq = isHovered ? 4.5 : 2.5;
      const bobAmp = isHovered ? 0.08 : 0.045;
      const bob = Math.sin(time * bobFreq) * bobAmp;
      characterGroup.position.y = bob;
      shadowMesh.scale.setScalar(1 - bob * 1.5);

      // ── B. VẪY TAY CHÀO THÂN THIỆN ĐỊNH KỲ (Waving Animation) ──
      waveTimer += delta;
      const isWaving = (waveTimer % 7) > 4.5 || isHovered; // Vẫy mỗi 7s hoặc khi hover
      if (isWaving) {
        const waveAngle = Math.sin(time * 12) * 0.35;
        rightArmGroup.rotation.z = THREE.MathUtils.lerp(rightArmGroup.rotation.z, 0.45 + waveAngle * 0.3, 0.15);
        rightArmGroup.rotation.x = THREE.MathUtils.lerp(rightArmGroup.rotation.x, -0.65, 0.15);
        rightForearmGroup.rotation.z = THREE.MathUtils.lerp(rightForearmGroup.rotation.z, 0.8 + waveAngle, 0.2);
      } else {
        rightArmGroup.rotation.z = THREE.MathUtils.lerp(rightArmGroup.rotation.z, 0, 0.1);
        rightArmGroup.rotation.x = THREE.MathUtils.lerp(rightArmGroup.rotation.x, 0, 0.1);
        rightForearmGroup.rotation.z = THREE.MathUtils.lerp(rightForearmGroup.rotation.z, 0, 0.1);
      }

      // ── C. ĐỒNG XU CHÍNH XOAY & LEVITATION ──
      const coinSpinSpeed = isHovered ? 3.5 : 1.4;
      mainCoinGroup.rotation.y += delta * coinSpinSpeed;
      mainCoinGroup.position.y = 0.52 + Math.sin(time * 3) * 0.07 + (isHovered ? 0.15 : 0);
      mainCoinGroup.position.x = 0.95 + Math.cos(time * 2) * 0.04;
      mainCoinGroup.scale.setScalar(isHovered ? 1.15 : 1.0);

      // Đốm sáng kim loại phản chiếu
      coinGoldLight.intensity = 1.2 + Math.sin(time * 6) * 0.4;

      // ── D. ĐỒNG XU MINI QUỸ ĐẠO & SPARKLES ──
      miniCoins.forEach((c) => {
        const angle = time * c.speed;
        c.mesh.position.x = 0.92 + Math.cos(angle) * c.radius * 0.55;
        c.mesh.position.z = 0.58 + Math.sin(angle) * c.radius * 0.45;
        c.mesh.position.y = c.yOffset + Math.sin(time * 3 + c.radius) * 0.08;
        c.mesh.rotation.y += delta * c.rotSpeed;
      });

      sparkles.forEach((s) => {
        const pulse = Math.sin(time * s.speed + s.phase);
        s.mesh.scale.set(
          (0.8 + pulse * 0.4) * (isHovered ? 1.4 : 1),
          (1.4 + pulse * 0.7) * (isHovered ? 1.4 : 1),
          (0.8 + pulse * 0.4) * (isHovered ? 1.4 : 1)
        );
        s.mesh.rotation.z += delta * 1.5;
      });

      // ── E. BIỂU CẢM KHUÔN MẶT ĐA DẠNG ──
      blinkTimer += delta;
      // Chớp mắt tự nhiên mỗi 3.8s
      const isBlinking = (blinkTimer % 3.8) < 0.15;
      // Nháy mắt tinh nghịch mỗi 8s
      if (blinkTimer > 8) {
        blinkTimer = 0;
        isWinking = Math.random() > 0.4;
      }

      if (isHovered) {
        // Khi rê chuột: Mắt cười híp tít mắt, miệng cười mở rạng ngời
        leftEye.visible = false;
        rightEye.visible = false;
        leftSmileEye.visible = true;
        rightSmileEye.visible = true;
        leftLid.scale.y = 0.01;
        rightLid.scale.y = 0.01;
        mouthSmile.visible = false;
        mouthOpen.visible = true;
        leftBrow.position.y = 0.26;
        rightBrow.position.y = 0.26;
      } else {
        // Bình thường: mắt tròn, chớp mắt & nháy mắt
        leftSmileEye.visible = false;
        rightSmileEye.visible = false;
        leftEye.visible = true;
        rightEye.visible = true;
        mouthSmile.visible = true;
        mouthOpen.visible = false;
        leftBrow.position.y = 0.22;
        rightBrow.position.y = 0.22;

        if (isBlinking) {
          leftLid.scale.y = 1;
          rightLid.scale.y = isWinking ? 0.01 : 1;
        } else {
          leftLid.scale.y = 0.01;
          rightLid.scale.y = 0.01;
        }
      }

      // ── F. ĐẦU VÀ MẮT HƯỚNG THEO CON TRỎ CHUỘT (Interactive Look-At) ──
      const targetRotY = isHovered ? mousePos.current.x * 0.5 : Math.sin(time * 0.8) * 0.08;
      const targetRotX = isHovered ? -mousePos.current.y * 0.35 : Math.cos(time * 0.7) * 0.04;
      headGroup.rotation.y = THREE.MathUtils.lerp(headGroup.rotation.y, targetRotY, 0.08);
      headGroup.rotation.x = THREE.MathUtils.lerp(headGroup.rotation.x, targetRotX, 0.08);

      renderer.render(scene, camera);
    };

    animate();

    // 6. Mouse Event Handlers
    const handleMouseMove = (e) => {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mousePos.current = { x, y };
    };

    const handleMouseEnter = () => setIsHovered(true);
    const handleMouseLeave = () => {
      setIsHovered(false);
      mousePos.current = { x: 0, y: 0 };
    };

    if (interactive) {
      container.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('mouseenter', handleMouseEnter);
      container.addEventListener('mouseleave', handleMouseLeave);
    }

    // 7. Cleanup
    return () => {
      cancelAnimationFrame(animId);
      if (interactive) {
        container.removeEventListener('mousemove', handleMouseMove);
        container.removeEventListener('mouseenter', handleMouseEnter);
        container.removeEventListener('mouseleave', handleMouseLeave);
      }
      scene.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
          else child.material.dispose();
        }
      });
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [width, height, interactive, isHovered]);

  return (
    <div
      ref={mountRef}
      className={`payroll-3d-character-wrap ${className}`}
      style={{
        width,
        height,
        position: 'relative',
        cursor: interactive ? 'pointer' : 'default',
        transform: isHovered ? 'scale(1.08)' : 'scale(1)',
        transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'visible',
      }}
      title="Nhân vật biểu trưng Tiền lương 3D (Rê chuột để phóng to và xem biểu cảm vui nhộn)"
    />
  );
}
