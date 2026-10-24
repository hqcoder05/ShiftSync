import React, { Suspense, useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, Html } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Model component loading Ready Player Me / glTF humanoid avatar
 * Based on DEV.to tutorial: "How to Use Three.js And React to Render a 3D Model of Your Self"
 */
function RPMModel({ url, isBreathing = true }) {
  const group = useRef();
  const gltf = useGLTF(url);

  // Deep clone scene so multiple instances don't fight over bones/materials
  const clonedScene = useMemo(() => {
    if (!gltf?.scene) return null;
    const clone = gltf.scene.clone(true);
    
    // Auto-calculate bounding box and center model
    const box = new THREE.Box3().setFromObject(clone);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    
    // If model is human height (~1.7m), place feet at y = -1.0
    const scaleFactor = 1.8 / Math.max(size.y, 0.1);
    clone.scale.setScalar(scaleFactor);
    clone.position.set(-center.x * scaleFactor, -box.min.y * scaleFactor - 0.95, -center.z * scaleFactor);

    clone.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          child.material.side = THREE.FrontSide;
        }
      }
    });

    return clone;
  }, [gltf]);

  // Subtle breathing animation
  useFrame(({ clock }) => {
    if (isBreathing && group.current) {
      const t = clock.getElapsedTime();
      group.current.position.y = Math.sin(t * 1.5) * 0.012;
    }
  });

  if (!clonedScene) return null;

  return (
    <group ref={group} dispose={null}>
      <primitive object={clonedScene} />
    </group>
  );
}

function LoadingSpinner() {
  return (
    <Html center>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        color: '#FFFFFF',
        fontFamily: 'system-ui, sans-serif',
        fontSize: 13,
        fontWeight: 600,
        textShadow: '0 2px 8px rgba(0,0,0,0.6)',
      }}>
        <div style={{
          width: 36,
          height: 36,
          border: '3px solid rgba(255,255,255,0.2)',
          borderTopColor: '#10B981',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <span>Đang nạp Model 3D Avatar...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </Html>
  );
}

/**
 * ReadyPlayerMeViewer Component
 * @param {string} avatarUrl - URL to .glb model (Ready Player Me or local GLB)
 * @param {string} cameraTarget - 'full' | 'upper' | 'face'
 * @param {boolean} autoRotate - Auto-rotate turntable
 * @param {string} theme - 'dark' (#111a21) | 'light' (#F8FAFC)
 */
export default function ReadyPlayerMeViewer({
  avatarUrl = '/models/ShiftSync_Employee.glb',
  cameraTarget = 'full',
  autoRotate = false,
  theme = 'dark',
  style = {},
}) {
  const [loadError, setLoadError] = useState(null);
  const controlsRef = useRef();

  const cameraSettings = useMemo(() => {
    if (cameraTarget === 'face') {
      return { position: [0, 0.45, 1.1], fov: 24, target: [0, 0.45, 0] };
    }
    if (cameraTarget === 'upper') {
      return { position: [0, 0.15, 2.0], fov: 28, target: [0, 0.15, 0] };
    }
    // Full body default (matches article camera parameters)
    return { position: [0, 0.05, 3.4], fov: 32, target: [0, -0.05, 0] };
  }, [cameraTarget]);

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.target.set(...cameraSettings.target);
      controlsRef.current.update();
    }
  }, [cameraSettings]);

  const bgColor = theme === 'dark' ? '#111a21' : '#F1F5F9';

  return (
    <div style={{
      width: '100%',
      height: '100%',
      position: 'relative',
      borderRadius: 16,
      overflow: 'hidden',
      backgroundColor: bgColor,
      ...style,
    }}>
      {loadError ? (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#EF4444',
          padding: 20,
          textAlign: 'center',
          gap: 12,
        }}>
          
          <span style={{ fontSize: 13, fontWeight: 600 }}>Không thể tải mô hình 3D: {loadError}</span>
          <button
            onClick={() => setLoadError(null)}
            style={{
              padding: '6px 14px',
              backgroundColor: '#1E293B',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 8,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Thử lại
          </button>
        </div>
      ) : (
        <Canvas
          shadows
          camera={{
            position: cameraSettings.position,
            fov: cameraSettings.fov,
            near: 0.1,
            far: 50,
          }}
          style={{ width: '100%', height: '100%' }}
        >
          {/* Lighting matching DEV.to tutorial specification */}
          <ambientLight intensity={1.2} />
          <ambientLight intensity={0.2} />
          <directionalLight
            position={[5, 8, 5]}
            intensity={1.4}
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
          />
          <directionalLight position={[-5, 4, -4]} intensity={0.5} />
          <pointLight position={[0, -0.5, 2]} intensity={0.3} color="#38BDF8" />

          {/* Floor grid / soft ground contact */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.96, 0]} receiveShadow>
            <circleGeometry args={[2.5, 64]} />
            <meshStandardMaterial
              color={theme === 'dark' ? '#0b1116' : '#E2E8F0'}
              roughness={0.8}
            />
          </mesh>

          <Suspense fallback={<LoadingSpinner />}>
            <RPMModel url={avatarUrl} />
          </Suspense>

          <OrbitControls
            ref={controlsRef}
            enablePan={false}
            enableZoom={true}
            minDistance={0.8}
            maxDistance={6.0}
            autoRotate={autoRotate}
            autoRotateSpeed={1.8}
            maxPolarAngle={Math.PI / 2 + 0.05}
          />
        </Canvas>
      )}
    </div>
  );
}

// Preload default local employee asset
useGLTF.preload('/models/ShiftSync_Employee.glb');
