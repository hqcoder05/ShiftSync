import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export default function Avatar3DPreview({
  avatar,
  width = 280,
  height = 280,
  autoRotate = true,
  showControls = true,
}) {
  const mountRef = useRef(null);
  const [isAutoSpin, setIsAutoSpin] = useState(autoRotate);
  const [rotDegrees, setRotDegrees] = useState(20);

  const isDraggingRef = useRef(false);
  const prevPointerRef = useRef({ x: 0, y: 0 });
  const charGroupRef = useRef(null);
  const isAutoSpinRef = useRef(isAutoSpin);
  isAutoSpinRef.current = isAutoSpin;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0.95, 3.2);

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 3. Lights
    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.75);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xFFFFFF, 1.1);
    dirLight.position.set(2, 4, 3);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0x38BDF8, 0.4);
    rimLight.position.set(-2, 1, -2);
    scene.add(rimLight);

    // 4. Character Root Group
    const charGroup = new THREE.Group();
    charGroup.position.set(0, -0.2, 0);
    charGroup.rotation.y = 0.35; // Default pleasing 3/4 angle
    scene.add(charGroup);
    charGroupRef.current = charGroup;

    // 5. Materials Palette
    const p = avatar?.palette || {};
    const skinMat = new THREE.MeshStandardMaterial({ color: p.skin || '#FDE68A', roughness: 0.55 });
    const hairMat = new THREE.MeshStandardMaterial({ color: p.hair || '#27272A', roughness: 0.9 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: p.shirt || '#F8FAFC', roughness: 0.6 });
    const outfitMat = new THREE.MeshStandardMaterial({ color: p.outfit || '#78350F', roughness: 0.55 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: p.pants || '#334155', roughness: 0.7 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: p.shoes || '#FFFFFF', roughness: 0.4 });
    const eyesMat = new THREE.MeshBasicMaterial({ color: 0x0F172A });
    const blushMat = new THREE.MeshBasicMaterial({ color: 0xFB7185, transparent: true, opacity: 0.5 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0xE2E8F0, metalness: 0.85, roughness: 0.2 });
    const deviceMat = new THREE.MeshStandardMaterial({ color: 0x1E293B, roughness: 0.35 });
    const screenMat = new THREE.MeshBasicMaterial({ color: 0x38BDF8 });
    const accentMat = new THREE.MeshStandardMaterial({ color: p.accent || '#B45309', roughness: 0.6 });

    // 6. Character Body Hierarchy
    const bodyRoot = new THREE.Group();
    charGroup.add(bodyRoot);

    // 6.1 Legs & Shoes
    const legGeo = new THREE.BoxGeometry(0.12, 0.42, 0.14);
    const shoeGeo = new THREE.BoxGeometry(0.13, 0.09, 0.18);

    const leftLeg = new THREE.Mesh(legGeo, pantsMat);
    leftLeg.position.set(-0.1, 0.22, 0);
    leftLeg.castShadow = true;
    bodyRoot.add(leftLeg);

    const leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
    leftShoe.position.set(-0.1, 0.045, 0.02);
    leftShoe.castShadow = true;
    bodyRoot.add(leftShoe);

    const rightLeg = new THREE.Mesh(legGeo, pantsMat);
    rightLeg.position.set(0.1, 0.22, 0);
    rightLeg.castShadow = true;
    bodyRoot.add(rightLeg);

    const rightShoe = new THREE.Mesh(shoeGeo, shoeMat);
    rightShoe.position.set(0.1, 0.045, 0.02);
    rightShoe.castShadow = true;
    bodyRoot.add(rightShoe);

    // 6.2 Torso
    const torsoGeo = new THREE.BoxGeometry(0.42, 0.48, 0.26);
    const torsoMesh = new THREE.Mesh(torsoGeo, shirtMat);
    torsoMesh.position.set(0, 0.64, 0);
    torsoMesh.castShadow = true;
    bodyRoot.add(torsoMesh);

    // Uniform / Apron / Blazer overlay
    const outfitGeo = new THREE.BoxGeometry(0.44, 0.44, 0.28);
    const outfitMesh = new THREE.Mesh(outfitGeo, outfitMat);
    outfitMesh.position.set(0, 0.62, 0.01);
    outfitMesh.castShadow = true;
    bodyRoot.add(outfitMesh);

    // 6.3 Limbs: Arms
    const armGeo = new THREE.BoxGeometry(0.11, 0.36, 0.12);
    const handGeo = new THREE.BoxGeometry(0.09, 0.10, 0.10);

    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-0.27, 0.74, 0);

    const leftArm = new THREE.Mesh(armGeo, outfitMat);
    leftArm.position.y = -0.16;
    leftArm.castShadow = true;
    leftArmGroup.add(leftArm);

    const leftHand = new THREE.Mesh(handGeo, skinMat);
    leftHand.position.y = -0.36;
    leftArmGroup.add(leftHand);
    bodyRoot.add(leftArmGroup);

    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(0.27, 0.74, 0);

    const rightArm = new THREE.Mesh(armGeo, outfitMat);
    rightArm.position.y = -0.16;
    rightArm.castShadow = true;
    rightArmGroup.add(rightArm);

    const rightHand = new THREE.Mesh(handGeo, skinMat);
    rightHand.position.y = -0.36;
    rightArmGroup.add(rightHand);
    bodyRoot.add(rightArmGroup);

    // 6.4 Head & Facial Details
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.08, 0);
    bodyRoot.add(headGroup);

    const headGeo = new THREE.BoxGeometry(0.38, 0.38, 0.34);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headMesh.castShadow = true;
    headGroup.add(headMesh);

    // Hair cap & bangs
    const hairGeo = new THREE.BoxGeometry(0.40, 0.16, 0.36);
    const hairMesh = new THREE.Mesh(hairGeo, hairMat);
    hairMesh.position.set(0, 0.13, -0.01);
    hairMesh.castShadow = true;
    headGroup.add(hairMesh);

    const bangsGeo = new THREE.BoxGeometry(0.36, 0.08, 0.06);
    const bangsMesh = new THREE.Mesh(bangsGeo, hairMat);
    bangsMesh.position.set(0, 0.09, 0.18);
    headGroup.add(bangsMesh);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.024, 8, 8);
    [-0.09, 0.09].forEach(x => {
      const eye = new THREE.Mesh(eyeGeo, eyesMat);
      eye.position.set(x, 0.01, 0.175);
      headGroup.add(eye);
    });

    // Blush
    const blushGeo = new THREE.PlaneGeometry(0.06, 0.03);
    [-0.12, 0.12].forEach(x => {
      const blush = new THREE.Mesh(blushGeo, blushMat);
      blush.position.set(x, -0.045, 0.176);
      headGroup.add(blush);
    });

    // 6.5 Props & Headwear
    const props = avatar?.props || {};
    if (props.headwear === 'beret') {
      const beretGeo = new THREE.CylinderGeometry(0.24, 0.22, 0.08, 16);
      const beret = new THREE.Mesh(beretGeo, accentMat);
      beret.position.set(0, 0.22, -0.01);
      beret.rotation.z = 0.12;
      headGroup.add(beret);
    } else if (props.headwear === 'toque') {
      const toqueGeo = new THREE.CylinderGeometry(0.18, 0.20, 0.24, 16);
      const toque = new THREE.Mesh(toqueGeo, shirtMat);
      toque.position.set(0, 0.30, 0);
      headGroup.add(toque);
    } else if (props.headwear === 'peakedCap' || props.headwear === 'securityCap' || props.headwear === 'cap') {
      const capGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.09, 16);
      const cap = new THREE.Mesh(capGeo, outfitMat);
      cap.position.set(0, 0.22, 0.02);
      headGroup.add(cap);

      const visorGeo = new THREE.BoxGeometry(0.18, 0.02, 0.12);
      const visor = new THREE.Mesh(visorGeo, pantsMat);
      visor.position.set(0, 0.18, 0.18);
      visor.rotation.x = 0.2;
      headGroup.add(visor);
    } else if (props.headwear === 'headset') {
      const bandGeo = new THREE.TorusGeometry(0.21, 0.015, 8, 16, Math.PI);
      const band = new THREE.Mesh(bandGeo, screenMat);
      band.position.set(0, 0.12, 0);
      band.rotation.x = -Math.PI / 2;
      headGroup.add(band);

      const padGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.03, 12);
      const pad = new THREE.Mesh(padGeo, outfitMat);
      pad.position.set(0.21, 0.02, 0);
      pad.rotation.z = Math.PI / 2;
      headGroup.add(pad);
    }

    if (props.tool === 'pitcher') {
      const pitcherGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.12, 12);
      const pitcher = new THREE.Mesh(pitcherGeo, metalMat);
      pitcher.position.set(0, -0.38, 0.08);
      pitcher.rotation.x = -0.25;
      rightArmGroup.add(pitcher);
    } else if (props.tool === 'tablet') {
      const tabletGeo = new THREE.BoxGeometry(0.12, 0.16, 0.015);
      const tablet = new THREE.Mesh(tabletGeo, deviceMat);
      const screenGeo = new THREE.PlaneGeometry(0.10, 0.13);
      const screen = new THREE.Mesh(screenGeo, screenMat);
      screen.position.z = 0.009;
      tablet.add(screen);
      tablet.position.set(0, -0.36, 0.09);
      tablet.rotation.x = -0.35;
      leftArmGroup.add(tablet);
    } else if (props.tool === 'clipboard') {
      const clipGeo = new THREE.BoxGeometry(0.12, 0.18, 0.015);
      const clip = new THREE.Mesh(clipGeo, outfitMat);
      const paperGeo = new THREE.PlaneGeometry(0.10, 0.15);
      const paper = new THREE.Mesh(paperGeo, shirtMat);
      paper.position.z = 0.009;
      clip.add(paper);
      clip.position.set(0, -0.36, 0.08);
      clip.rotation.x = -0.3;
      leftArmGroup.add(clip);
    } else if (props.tool === 'tray') {
      const trayGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.015, 16);
      const tray = new THREE.Mesh(trayGeo, metalMat);
      tray.position.set(0, -0.34, 0.12);
      leftArmGroup.add(tray);
    }

    // 7. Circular Floor Contact Shadow
    const shadowGeo = new THREE.PlaneGeometry(0.9, 0.9);
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const ctx = shadowCanvas.getContext('2d');
    const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 60);
    grad.addColorStop(0, 'rgba(15, 23, 42, 0.45)');
    grad.addColorStop(0.7, 'rgba(15, 23, 42, 0.12)');
    grad.addColorStop(1, 'rgba(15, 23, 42, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    const shadowTexture = new THREE.CanvasTexture(shadowCanvas);

    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      depthWrite: false,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = 0.005;
    charGroup.add(shadowMesh);

    // 8. Animation Loop
    let animId;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Auto rotation
      if (isAutoSpinRef.current) {
        charGroup.rotation.y = (charGroup.rotation.y + delta * 0.8) % (Math.PI * 2);
      }

      // Idle breathing and kinematics
      const bob = Math.sin(elapsed * 2.2) * 0.015;
      bodyRoot.position.y = bob;
      headGroup.rotation.z = Math.sin(elapsed * 1.1) * 0.02;
      headGroup.rotation.y = Math.cos(elapsed * 0.8) * 0.015;

      leftArmGroup.rotation.x = Math.sin(elapsed * 2.2) * 0.04 - 0.05;
      rightArmGroup.rotation.x = -Math.sin(elapsed * 2.2) * 0.04;

      renderer.render(scene, camera);

      // Update degrees display
      const deg = Math.round((((charGroup.rotation.y % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) * (180 / Math.PI));
      setRotDegrees(deg);
    };

    animate();

    // 9. Mouse / Touch Drag Handlers
    const handlePointerDown = (e) => {
      isDraggingRef.current = true;
      setIsAutoSpin(false);
      prevPointerRef.current = { x: e.clientX, y: e.clientY };
    };

    const handlePointerMove = (e) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - prevPointerRef.current.x;
      const dy = e.clientY - prevPointerRef.current.y;
      prevPointerRef.current = { x: e.clientX, y: e.clientY };

      if (charGroupRef.current) {
        charGroupRef.current.rotation.y = (charGroupRef.current.rotation.y + dx * 0.012) % (Math.PI * 2);
        charGroupRef.current.rotation.x = Math.max(-0.35, Math.min(0.35, charGroupRef.current.rotation.x + dy * 0.008));
      }
    };

    const handlePointerUp = () => {
      isDraggingRef.current = false;
    };

    const dom = renderer.domElement;
    dom.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    // Cleanup
    return () => {
      cancelAnimationFrame(animId);
      dom.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      renderer.dispose();
      scene.clear();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [avatar, width, height]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div
        ref={mountRef}
        style={{
          width,
          height,
          borderRadius: '20px',
          overflow: 'hidden',
          background: 'radial-gradient(circle at 50% 30%, #F8FAFC 0%, #E2E8F0 100%)',
          cursor: 'grab',
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
          touchAction: 'none',
        }}
        title="Kéo chuột để xoay 360 độ"
      />

      {showControls && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          marginTop: '10px',
          padding: '0 4px',
        }}>
          <button
            type="button"
            onClick={() => setIsAutoSpin(prev => !prev)}
            style={{
              padding: '5px 12px',
              borderRadius: '16px',
              fontSize: '11px',
              fontWeight: 600,
              background: isAutoSpin ? '#51A33D' : '#EEF2F6',
              color: isAutoSpin ? '#FFFFFF' : '#475569',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {isAutoSpin ? '❚❚ Tạm dừng xoay' : '↻ Tự động xoay 360°'}
          </button>

          <span style={{
            fontSize: '11px',
            fontWeight: 700,
            color: '#64748B',
            background: '#F1F5F9',
            padding: '4px 8px',
            borderRadius: '10px',
          }}>
            {rotDegrees}°
          </span>
        </div>
      )}
    </div>
  );
}