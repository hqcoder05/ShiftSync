import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * LoginMascot3DWeb.jsx — Mascot 3D tương tác theo form Đăng nhập cho Web
 * ─────────────────────────────────────────────────────────────────────────────
 * Props:
 *  - status: 'idle' | 'email' | 'password' | 'showPassword' | 'error' | 'success'
 *  - emailLength: number (số ký tự đang nhập trong ô email để liếc mắt theo)
 *  - width, height: kích thước canvas hiển thị
 *  - className: class CSS tuỳ chỉnh
 */
export default function LoginMascot3DWeb({
  status = 'idle',
  emailLength = 0,
  width = 240,
  height = 170,
  className = '',
}) {
  const mountRef = useRef(null);
  const statusRef = useRef(status);
  const emailLenRef = useRef(emailLength);

  useEffect(() => {
    statusRef.current = status;
    emailLenRef.current = emailLength;
  }, [status, emailLength]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene & Camera (Auto-framing chống méo/cắt góc)
    const scene = new THREE.Scene();
    const aspect = width / height;
    const fov = 35;
    const fovRad = (fov * Math.PI) / 180;
    const minHorizSpan = 4.2;
    const minVertSpan = 3.4;
    const zForW = minHorizSpan / (2 * Math.tan(fovRad / 2) * aspect);
    const zForH = minVertSpan / (2 * Math.tan(fovRad / 2));
    const camZ = Math.max(4.8, zForW, zForH);

    const camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 100);
    camera.position.set(0, 0.08, camZ);

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

    // 2. Lighting
    const ambientLight = new THREE.AmbientLight(0xfffdf5, 1.45);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
    keyLight.position.set(3, 5, 4);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xfef08a, 0.85);
    fillLight.position.set(-3, 3, 2);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xf43f5e, 0.45);
    rimLight.position.set(2, 4, -3);
    scene.add(rimLight);

    // 3. Materials
    const yellowMat = new THREE.MeshStandardMaterial({
      color: '#FFD426',
      roughness: 0.28,
      metalness: 0.05,
    });

    const creamFaceMat = new THREE.MeshStandardMaterial({
      color: '#FFFBEB',
      roughness: 0.35,
      metalness: 0.02,
    });

    const whitePorcelainMat = new THREE.MeshStandardMaterial({
      color: '#FFFFFF',
      roughness: 0.25,
      metalness: 0.02,
    });

    const orangeBeakMat = new THREE.MeshStandardMaterial({
      color: '#FB923C',
      roughness: 0.2,
      metalness: 0.08,
    });

    const orangeFeetMat = new THREE.MeshStandardMaterial({
      color: '#F97316',
      roughness: 0.3,
      metalness: 0.05,
    });

    const redNoseMat = new THREE.MeshStandardMaterial({
      color: '#EF4444',
      roughness: 0.2,
      metalness: 0.1,
    });

    const eyeBlackMat = new THREE.MeshStandardMaterial({
      color: '#18181B',
      roughness: 0.15,
      metalness: 0.1,
    });

    const eyeGlossMat = new THREE.MeshBasicMaterial({ color: '#FFFFFF' });

    const blushPinkMat = new THREE.MeshStandardMaterial({
      color: '#FB7185',
      roughness: 0.45,
      metalness: 0.0,
    });

    const blushLavenderMat = new THREE.MeshStandardMaterial({
      color: '#F472B6',
      roughness: 0.45,
      metalness: 0.0,
    });

    const octopusMat = new THREE.MeshStandardMaterial({
      color: '#FB7185',
      roughness: 0.28,
      metalness: 0.06,
    });

    const darkMouthMat = new THREE.MeshStandardMaterial({
      color: '#991B1B',
      roughness: 0.3,
      metalness: 0.05,
    });

    // 4. Roots
    const duoRoot = new THREE.Group();
    scene.add(duoRoot);

    // ═════════════════════════════════════════════════════════════════════
    // NHÂN VẬT 1: BÉ TRÒN VÀNG ĐỘI BẠCH TUỘC HỒNG (Bên Trái)
    // ═════════════════════════════════════════════════════════════════════
    const octoMascot = new THREE.Group();
    octoMascot.position.set(-0.52, -0.05, 0);
    duoRoot.add(octoMascot);

    // Thân
    const octoBodyGeo = new THREE.SphereGeometry(0.72, 22, 18);
    const octoBody = new THREE.Mesh(octoBodyGeo, yellowMat);
    octoBody.scale.set(1.08, 0.98, 0.96);
    octoMascot.add(octoBody);

    // Mặt
    const octoFaceGeo = new THREE.SphereGeometry(0.54, 20, 18);
    const octoFace = new THREE.Mesh(octoFaceGeo, creamFaceMat);
    octoFace.position.set(0, 0.02, 0.28);
    octoFace.scale.set(0.96, 0.92, 0.88);
    octoMascot.add(octoFace);

    // Mũi
    const octoNoseGeo = new THREE.SphereGeometry(0.052, 12, 12);
    const octoNose = new THREE.Mesh(octoNoseGeo, redNoseMat);
    octoNose.position.set(0, 0.02, 0.78);
    octoMascot.add(octoNose);

    // Tròng mắt
    const octoEyeGeo = new THREE.SphereGeometry(0.065, 12, 12);
    const octoGlossGeo = new THREE.SphereGeometry(0.022, 6, 6);

    const octoEyeL = new THREE.Group();
    octoEyeL.position.set(-0.19, 0.12, 0.74);
    const octoEyeLMesh = new THREE.Mesh(octoEyeGeo, eyeBlackMat);
    octoEyeLMesh.scale.set(0.85, 1.25, 0.85);
    octoEyeL.add(octoEyeLMesh);
    const octoGlossL = new THREE.Mesh(octoGlossGeo, eyeGlossMat);
    octoGlossL.position.set(-0.02, 0.035, 0.05);
    octoEyeL.add(octoGlossL);
    octoMascot.add(octoEyeL);

    const octoEyeR = new THREE.Group();
    octoEyeR.position.set(0.19, 0.12, 0.74);
    const octoEyeRMesh = new THREE.Mesh(octoEyeGeo, eyeBlackMat);
    octoEyeRMesh.scale.set(0.85, 1.25, 0.85);
    octoEyeR.add(octoEyeRMesh);
    const octoGlossR = new THREE.Mesh(octoGlossGeo, eyeGlossMat);
    octoGlossR.position.set(-0.02, 0.035, 0.05);
    octoEyeR.add(octoGlossR);
    octoMascot.add(octoEyeR);

    // Mắt nháy
    const octoWinkGeo = new THREE.TorusGeometry(0.065, 0.018, 6, 10, Math.PI);
    const octoWinkL = new THREE.Mesh(octoWinkGeo, eyeBlackMat);
    octoWinkL.position.set(-0.19, 0.11, 0.75);
    octoWinkL.rotation.z = Math.PI;
    octoWinkL.visible = false;
    octoMascot.add(octoWinkL);

    const octoWinkR = new THREE.Mesh(octoWinkGeo, eyeBlackMat);
    octoWinkR.position.set(0.19, 0.11, 0.75);
    octoWinkR.rotation.z = Math.PI;
    octoWinkR.visible = false;
    octoMascot.add(octoWinkR);

    // Má hồng
    const octoBlushGeo = new THREE.SphereGeometry(0.11, 10, 10);
    const octoBlushL = new THREE.Mesh(octoBlushGeo, blushPinkMat);
    octoBlushL.position.set(-0.29, -0.05, 0.70);
    octoBlushL.scale.set(1.2, 0.8, 0.3);
    octoMascot.add(octoBlushL);

    const octoBlushR = new THREE.Mesh(octoBlushGeo, blushPinkMat);
    octoBlushR.position.set(0.29, -0.05, 0.70);
    octoBlushR.scale.set(1.2, 0.8, 0.3);
    octoMascot.add(octoBlushR);

    // Miệng
    const octoMouthGeo = new THREE.TorusGeometry(0.04, 0.015, 6, 10, Math.PI * 0.9);
    const octoMouth = new THREE.Mesh(octoMouthGeo, darkMouthMat);
    octoMouth.position.set(0.03, -0.09, 0.76);
    octoMouth.rotation.z = -0.2;
    octoMascot.add(octoMouth);

    // Chân
    const octoLegGeo = new THREE.CylinderGeometry(0.15, 0.14, 0.28, 12);
    const octoLegL = new THREE.Mesh(octoLegGeo, yellowMat);
    octoLegL.position.set(-0.26, -0.74, 0);
    octoMascot.add(octoLegL);

    const octoLegR = new THREE.Mesh(octoLegGeo, yellowMat);
    octoLegR.position.set(0.26, -0.74, 0);
    octoMascot.add(octoLegR);

    // Cánh tay linh hoạt che mắt
    const octoArmGeo = new THREE.SphereGeometry(0.15, 12, 12);

    const octoArmLGroup = new THREE.Group();
    octoArmLGroup.position.set(-0.65, 0.02, 0.05);
    const octoArmL = new THREE.Mesh(octoArmGeo, yellowMat);
    octoArmL.position.set(-0.12, 0.12, 0);
    octoArmL.scale.set(0.9, 1.45, 0.9);
    octoArmLGroup.add(octoArmL);
    octoMascot.add(octoArmLGroup);

    const octoArmRGroup = new THREE.Group();
    octoArmRGroup.position.set(0.65, 0.02, 0.05);
    const octoArmR = new THREE.Mesh(octoArmGeo, yellowMat);
    octoArmR.position.set(0.12, -0.08, 0);
    octoArmR.scale.set(0.9, 1.45, 0.9);
    octoArmRGroup.add(octoArmR);
    octoMascot.add(octoArmRGroup);

    // Mũ bạch tuộc hồng
    const octoHat = new THREE.Group();
    octoHat.position.set(0.28, 0.66, 0.08);
    octoHat.rotation.z = -0.22;
    octoMascot.add(octoHat);

    const octHatHeadGeo = new THREE.SphereGeometry(0.28, 14, 14);
    const octHatHead = new THREE.Mesh(octHatHeadGeo, octopusMat);
    octHatHead.scale.set(1.1, 0.95, 1.0);
    octoHat.add(octHatHead);

    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const tGeo = new THREE.SphereGeometry(0.085, 8, 8);
      const t = new THREE.Mesh(tGeo, octopusMat);
      t.position.set(Math.sin(a) * 0.25, -0.18, Math.cos(a) * 0.25);
      octoHat.add(t);
    }

    const octEyeHatGeo = new THREE.SphereGeometry(0.035, 8, 8);
    const octHL = new THREE.Mesh(octEyeHatGeo, eyeBlackMat);
    octHL.position.set(-0.08, 0.05, 0.26);
    octoHat.add(octHL);
    const octHR = new THREE.Mesh(octEyeHatGeo, eyeBlackMat);
    octHR.position.set(0.08, 0.05, 0.26);
    octoHat.add(octHR);

    // ═════════════════════════════════════════════════════════════════════
    // NHÂN VẬT 2: BÉ VỊT VÀNG MỎ CAM LỌN TÓC XOĂN (Bên Phải)
    // ═════════════════════════════════════════════════════════════════════
    const duckMascot = new THREE.Group();
    duckMascot.position.set(0.52, -0.05, 0);
    duoRoot.add(duckMascot);

    const duckHeadGeo = new THREE.SphereGeometry(0.78, 24, 20);
    const duckHead = new THREE.Mesh(duckHeadGeo, yellowMat);
    duckHead.position.set(0, 0.18, 0);
    duckHead.scale.set(1.04, 1.02, 1.0);
    duckMascot.add(duckHead);

    const duckFaceGeo = new THREE.SphereGeometry(0.60, 22, 20);
    const duckFace = new THREE.Mesh(duckFaceGeo, whitePorcelainMat);
    duckFace.position.set(0, 0.18, 0.26);
    duckFace.scale.set(1.0, 0.98, 0.92);
    duckMascot.add(duckFace);

    // Lọn tóc xoăn
    const curlGroup = new THREE.Group();
    curlGroup.position.set(0, 0.38, 0.74);
    const curlTorusGeo = new THREE.TorusGeometry(0.065, 0.022, 8, 16, Math.PI * 1.8);
    const curlTorus = new THREE.Mesh(curlTorusGeo, yellowMat);
    curlGroup.add(curlTorus);
    const curlWingGeo = new THREE.TorusGeometry(0.12, 0.022, 6, 12, Math.PI * 0.65);
    const curlWingL = new THREE.Mesh(curlWingGeo, yellowMat);
    curlWingL.position.set(-0.11, -0.03, 0);
    curlWingL.rotation.z = -0.6;
    curlGroup.add(curlWingL);
    const curlWingR = new THREE.Mesh(curlWingGeo, yellowMat);
    curlWingR.position.set(0.11, -0.03, 0);
    curlWingR.rotation.z = 0.6;
    curlWingR.scale.x = -1;
    curlGroup.add(curlWingR);
    duckMascot.add(curlGroup);

    // Mắt bé vịt
    const duckEyeGeo = new THREE.CylinderGeometry(0.038, 0.038, 0.11, 10);
    duckEyeGeo.rotateZ(Math.PI / 2);

    const duckEyeL = new THREE.Mesh(duckEyeGeo, eyeBlackMat);
    duckEyeL.position.set(-0.18, 0.22, 0.74);
    duckMascot.add(duckEyeL);

    const duckEyeR = new THREE.Mesh(duckEyeGeo, eyeBlackMat);
    duckEyeR.position.set(0.18, 0.22, 0.74);
    duckMascot.add(duckEyeR);

    const duckWinkGeo = new THREE.TorusGeometry(0.065, 0.018, 6, 10, Math.PI);
    const duckWinkL = new THREE.Mesh(duckWinkGeo, eyeBlackMat);
    duckWinkL.position.set(-0.18, 0.22, 0.75);
    duckWinkL.rotation.z = Math.PI;
    duckWinkL.visible = false;
    duckMascot.add(duckWinkL);

    const duckWinkR = new THREE.Mesh(duckWinkGeo, eyeBlackMat);
    duckWinkR.position.set(0.18, 0.22, 0.75);
    duckWinkR.rotation.z = Math.PI;
    duckWinkR.visible = false;
    duckMascot.add(duckWinkR);

    // Mỏ cam
    const beakGroup = new THREE.Group();
    beakGroup.position.set(0, 0.11, 0.76);
    const beakOuterGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.08, 16);
    beakOuterGeo.rotateX(Math.PI / 2);
    const beakOuter = new THREE.Mesh(beakOuterGeo, orangeBeakMat);
    beakOuter.scale.set(1.4, 0.85, 1.2);
    beakGroup.add(beakOuter);
    const beakInnerGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.082, 12);
    beakInnerGeo.rotateX(Math.PI / 2);
    const beakInner = new THREE.Mesh(beakInnerGeo, redNoseMat);
    beakInner.scale.set(1.4, 0.45, 1.25);
    beakGroup.add(beakInner);
    duckMascot.add(beakGroup);

    // Má hồng
    const duckBlushGeo = new THREE.SphereGeometry(0.09, 10, 10);
    const duckBlushL = new THREE.Mesh(duckBlushGeo, blushLavenderMat);
    duckBlushL.position.set(-0.28, 0.10, 0.68);
    duckBlushL.scale.set(1.3, 0.65, 0.3);
    duckMascot.add(duckBlushL);

    const duckBlushR = new THREE.Mesh(duckBlushGeo, blushLavenderMat);
    duckBlushR.position.set(0.28, 0.10, 0.68);
    duckBlushR.scale.set(1.3, 0.65, 0.3);
    duckMascot.add(duckBlushR);

    const duckBodyGeo = new THREE.CylinderGeometry(0.55, 0.76, 0.52, 18);
    const duckBody = new THREE.Mesh(duckBodyGeo, yellowMat);
    duckBody.position.set(0, -0.32, 0);
    duckMascot.add(duckBody);

    // Cánh bé vịt
    const duckWingGeo = new THREE.SphereGeometry(0.15, 10, 10);

    const duckWingLGroup = new THREE.Group();
    duckWingLGroup.position.set(-0.55, -0.20, 0.05);
    const duckWingL = new THREE.Mesh(duckWingGeo, yellowMat);
    duckWingL.position.set(-0.08, -0.08, 0);
    duckWingL.scale.set(0.8, 1.4, 0.8);
    duckWingLGroup.add(duckWingL);
    duckMascot.add(duckWingLGroup);

    const duckWingRGroup = new THREE.Group();
    duckWingRGroup.position.set(0.55, -0.20, 0.05);
    const duckWingR = new THREE.Mesh(duckWingGeo, yellowMat);
    duckWingR.position.set(0.10, 0.12, 0);
    duckWingR.scale.set(0.8, 1.4, 0.8);
    duckWingRGroup.add(duckWingR);
    duckMascot.add(duckWingRGroup);

    // Chân
    const duckFootGeo = new THREE.SphereGeometry(0.11, 10, 10);
    const duckFootL = new THREE.Mesh(duckFootGeo, orangeFeetMat);
    duckFootL.position.set(-0.16, -0.66, 0.08);
    duckFootL.scale.set(1.0, 0.8, 1.35);
    duckMascot.add(duckFootL);

    const duckFootR = new THREE.Mesh(duckFootGeo, orangeFeetMat);
    duckFootR.position.set(0.16, -0.66, 0.08);
    duckFootR.scale.set(1.0, 0.8, 1.35);
    duckMascot.add(duckFootR);

    // ═════════════════════════════════════════════════════════════════════
    // 5. HIỆU ỨNG PHÁO GIẤY CONFETTI (Dành riêng cho khi Success)
    // ═════════════════════════════════════════════════════════════════════
    const fxGroup = new THREE.Group();
    duoRoot.add(fxGroup);

    const confettiColors = ['#F43F5E', '#FBBF24', '#34D399', '#38BDF8', '#A855F7', '#FB923C'];
    const confettiList = [];

    for (let i = 0; i < 28; i++) {
      const cGeo = new THREE.PlaneGeometry(0.09, 0.055);
      const cMat = new THREE.MeshBasicMaterial({
        color: confettiColors[i % confettiColors.length],
        side: THREE.DoubleSide,
      });
      const cMesh = new THREE.Mesh(cGeo, cMat);
      cMesh.visible = false;
      fxGroup.add(cMesh);

      confettiList.push({
        mesh: cMesh,
        startX: (Math.random() - 0.5) * 2.2,
        baseY: 0.8 + Math.random() * 0.8,
        speedX: (Math.random() - 0.5) * 0.02,
        speedY: 0.015 + Math.random() * 0.02,
        rotSpeed: 0.05 + Math.random() * 0.08,
        seed: Math.random() * 5,
      });
    }

    // ═════════════════════════════════════════════════════════════════════
    // 6. ANIMATION LOOP ĐIỀU KHIỂN THEO TRẠNG THÁI FORM (STATUS)
    // ═════════════════════════════════════════════════════════════════════
    let animId = null;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      const currentStatus = statusRef.current;
      const currentEmailLen = emailLenRef.current;

      // Tính toán vị trí mắt nhìn theo email
      const gazeX = THREE.MathUtils.clamp((currentEmailLen - 10) * 0.005, -0.06, 0.06);

      let octoWink = false;
      let duckWink = false;

      // ── XỬ LÝ TỪNG TRẠNG THÁI ──
      if (currentStatus === 'password') {
        // 🙈 PASSWORD: CẢ 2 BÉ CHE MẮT LẠI!
        octoArmLGroup.position.lerp(new THREE.Vector3(-0.24, 0.12, 0.72), 0.18);
        octoArmLGroup.rotation.set(0.1, 0.2, 1.4);
        octoArmRGroup.position.lerp(new THREE.Vector3(0.24, 0.12, 0.72), 0.18);
        octoArmRGroup.rotation.set(0.1, -0.2, -1.4);

        duckWingLGroup.position.lerp(new THREE.Vector3(-0.20, 0.20, 0.72), 0.18);
        duckWingLGroup.rotation.set(0.1, 0.15, 1.35);
        duckWingRGroup.position.lerp(new THREE.Vector3(0.20, 0.20, 0.72), 0.18);
        duckWingRGroup.rotation.set(0.1, -0.15, -1.35);

        octoMascot.rotation.x = THREE.MathUtils.lerp(octoMascot.rotation.x, 0.18, 0.15);
        duckMascot.rotation.x = THREE.MathUtils.lerp(duckMascot.rotation.x, 0.18, 0.15);
        octoMascot.position.y = THREE.MathUtils.lerp(octoMascot.position.y, -0.08, 0.1);
        duckMascot.position.y = THREE.MathUtils.lerp(duckMascot.position.y, -0.08, 0.1);

        octoMascot.position.x = THREE.MathUtils.lerp(octoMascot.position.x, -0.46, 0.1);
        duckMascot.position.x = THREE.MathUtils.lerp(duckMascot.position.x, 0.46, 0.1);

      } else if (currentStatus === 'showPassword') {
        // 🫣 SHOW PASSWORD: BÉ VỊT HÉ MẮT NHÌN TRỘM!
        octoArmLGroup.position.lerp(new THREE.Vector3(-0.24, 0.12, 0.72), 0.18);
        octoArmLGroup.rotation.set(0.1, 0.2, 1.4);
        octoArmRGroup.position.lerp(new THREE.Vector3(0.24, 0.12, 0.72), 0.18);
        octoArmRGroup.rotation.set(0.1, -0.2, -1.4);

        duckWingLGroup.position.lerp(new THREE.Vector3(-0.20, 0.20, 0.72), 0.18);
        duckWingLGroup.rotation.set(0.1, 0.15, 1.35);
        duckWingRGroup.position.lerp(new THREE.Vector3(0.48, -0.05, 0.25), 0.18);
        duckWingRGroup.rotation.set(0, 0, -0.3);

        duckMascot.rotation.z = THREE.MathUtils.lerp(duckMascot.rotation.z, -0.18, 0.12);
        duckMascot.rotation.x = THREE.MathUtils.lerp(duckMascot.rotation.x, 0.05, 0.12);

      } else if (currentStatus === 'email') {
        // 👀 EMAIL: NHÌN THEO TRỎ CHUỘT / KÝ TỰ EMAIL
        octoArmLGroup.position.lerp(new THREE.Vector3(-0.65, 0.02, 0.05), 0.15);
        octoArmLGroup.rotation.set(0, 0, -0.25);
        octoArmRGroup.position.lerp(new THREE.Vector3(0.65, 0.02, 0.05), 0.15);
        octoArmRGroup.rotation.set(0, 0, -0.35);

        duckWingLGroup.position.lerp(new THREE.Vector3(-0.55, -0.20, 0.05), 0.15);
        duckWingLGroup.rotation.set(0, 0, 0.25);
        duckWingRGroup.position.lerp(new THREE.Vector3(0.55, -0.20, 0.05), 0.15);
        duckWingRGroup.rotation.set(0, 0, -0.25);

        const headDown = 0.16 + Math.sin(elapsed * 6) * 0.03;
        octoMascot.rotation.x = THREE.MathUtils.lerp(octoMascot.rotation.x, headDown, 0.15);
        duckMascot.rotation.x = THREE.MathUtils.lerp(duckMascot.rotation.x, headDown, 0.15);

        octoMascot.rotation.y = THREE.MathUtils.lerp(octoMascot.rotation.y, gazeX * 3.5, 0.15);
        duckMascot.rotation.y = THREE.MathUtils.lerp(duckMascot.rotation.y, gazeX * 3.5, 0.15);

        octoEyeL.position.x = -0.19 + gazeX;
        octoEyeR.position.x = 0.19 + gazeX;
        duckEyeL.position.x = -0.18 + gazeX;
        duckEyeR.position.x = 0.18 + gazeX;

      } else if (currentStatus === 'error') {
        // ❌ ERROR: LẮC ĐẦU NGUẦY NGUẬY BUỒN BÃ
        const shake = Math.sin(elapsed * 16) * 0.22;
        octoMascot.rotation.y = shake;
        duckMascot.rotation.y = shake;
        octoMascot.rotation.z = -shake * 0.3;
        duckMascot.rotation.z = shake * 0.3;

        octoHat.rotation.z = -0.38 + Math.sin(elapsed * 8) * 0.08;

        octoArmLGroup.position.lerp(new THREE.Vector3(-0.62, -0.15, 0), 0.15);
        octoArmLGroup.rotation.set(0, 0, 0.1);
        octoArmRGroup.position.lerp(new THREE.Vector3(0.62, -0.15, 0), 0.15);
        octoArmRGroup.rotation.set(0, 0, -0.1);

        duckWingLGroup.position.lerp(new THREE.Vector3(-0.52, -0.30, 0), 0.15);
        duckWingRGroup.position.lerp(new THREE.Vector3(0.52, -0.30, 0), 0.15);

      } else if (currentStatus === 'success') {
        // 🎉 SUCCESS: NHẢY CẪNG LÊN ĂN MỪNG RỰC RỠ!
        const jumpAmp = 0.38;
        const jumpY = -0.05 + Math.abs(Math.sin(elapsed * 9)) * jumpAmp;
        octoMascot.position.y = jumpY;
        duckMascot.position.y = jumpY;

        octoArmLGroup.position.lerp(new THREE.Vector3(-0.62, 0.15, 0), 0.2);
        octoArmLGroup.rotation.set(0, 0, 1.8 + Math.sin(elapsed * 12) * 0.3);
        octoArmRGroup.position.lerp(new THREE.Vector3(0.62, 0.15, 0), 0.2);
        octoArmRGroup.rotation.set(0, 0, -1.8 - Math.sin(elapsed * 12) * 0.3);

        duckWingLGroup.position.lerp(new THREE.Vector3(-0.52, 0.05, 0), 0.2);
        duckWingLGroup.rotation.set(0, 0, 1.6 + Math.sin(elapsed * 12) * 0.3);
        duckWingRGroup.position.lerp(new THREE.Vector3(0.52, 0.05, 0), 0.2);
        duckWingRGroup.rotation.set(0, 0, -1.6 - Math.sin(elapsed * 12) * 0.3);

        octoWink = true;
        duckWink = true;

        confettiList.forEach((c) => {
          c.mesh.visible = true;
          const prog = (elapsed * 2.2 + c.seed) % 1.8;
          c.mesh.position.set(
            c.startX + c.speedX * prog * 45,
            c.baseY + c.speedY * prog * 30 - 0.5 * 9.8 * Math.pow(prog * 0.32, 2),
            Math.sin(elapsed * 2.5 + c.seed) * 0.5
          );
          c.mesh.rotation.x += c.rotSpeed;
          c.mesh.rotation.y += c.rotSpeed * 1.6;
        });

      } else {
        // 🌟 IDLE: NHÚN NHẢY THƯ GIÃN ĐÁNG YÊU
        const bounce = Math.abs(Math.sin(elapsed * 3.6)) * 0.05;
        octoMascot.position.y = -0.05 + bounce;
        duckMascot.position.y = -0.05 + Math.abs(Math.cos(elapsed * 3.6)) * 0.05;

        octoMascot.position.x = THREE.MathUtils.lerp(octoMascot.position.x, -0.52, 0.1);
        duckMascot.position.x = THREE.MathUtils.lerp(duckMascot.position.x, 0.52, 0.1);

        octoMascot.rotation.x = THREE.MathUtils.lerp(octoMascot.rotation.x, 0, 0.1);
        duckMascot.rotation.x = THREE.MathUtils.lerp(duckMascot.rotation.x, 0, 0.1);

        octoArmLGroup.position.lerp(new THREE.Vector3(-0.65, 0.02, 0.05), 0.15);
        octoArmLGroup.rotation.set(0, 0, 0.65 + Math.sin(elapsed * 6) * 0.35);

        octoArmRGroup.position.lerp(new THREE.Vector3(0.65, 0.02, 0.05), 0.15);
        octoArmRGroup.rotation.set(0, 0, -0.35);

        duckWingLGroup.position.lerp(new THREE.Vector3(-0.55, -0.20, 0.05), 0.15);
        duckWingLGroup.rotation.set(0, 0, 0.25);

        duckWingRGroup.position.lerp(new THREE.Vector3(0.55, -0.20, 0.05), 0.15);
        duckWingRGroup.rotation.set(0, 0, -0.55 - Math.sin(elapsed * 6 + 1.2) * 0.3);

        octoHat.position.y = 0.66 + Math.sin(elapsed * 7) * 0.03;
        curlGroup.rotation.z = Math.sin(elapsed * 4.5) * 0.12;

        confettiList.forEach((c) => { c.mesh.visible = false; });
      }

      octoEyeL.visible = !octoWink;
      octoEyeR.visible = !octoWink;
      octoWinkL.visible = octoWink;
      octoWinkR.visible = octoWink;

      duckEyeL.visible = !duckWink;
      duckEyeR.visible = !duckWink;
      duckWinkL.visible = duckWink;
      duckWinkR.visible = duckWink;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      if (container.contains(domElement)) {
        container.removeChild(domElement);
      }
      renderer.dispose();
    };
  }, [width, height]);

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
