/**
 * WorkstationAssetModel.jsx
 * Declarative 3D Employee Workstation GLB Asset Loader for ShiftSync Digital Twin.
 * 
 * Renders the standalone premium workstation:
 * - Modern wooden desk
 * - Slim monitor with ShiftSync dashboard UI
 * - Keyboard & Mouse
 * - Ergonomic office chair
 * - Small desk lamp with subtle point light
 * - Subtle cable management
 * - Glowing IoT status indicator
 */

import { useEffect, useState, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createWorkstationTagSprite } from '../../scene/FurnitureBuilder.js';
import { disposeHierarchy } from '../../scene/ResourceManager.js';

export default function WorkstationAssetModel({
  position = [-0.8, 0, 0.5],
  rotation = [0, -Math.PI / 4, 0],
  scale = [1, 1, 1],
  showWorkstations = true,
  onSelect = null,
}) {
  const [model, setModel] = useState(null);
  const tagRef = useRef(null);
  const groupRef = useRef(null);

  useEffect(() => {
    let isCurrent = true;
    const loader = new GLTFLoader();

    loader.load(
      '/models/ShiftSync_Workstation.glb',
      (gltf) => {
        if (!isCurrent) return;
        const scene = gltf.scene;

        scene.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
              child.material.needsUpdate = true;
            }
          }
        });

        // Add 3D floating tag sprite cleanly above workstation
        const wsTag = createWorkstationTagSprite(
          {
            id: 'WS_PREMIUM_01',
            name: 'Bàn Làm Việc Nhân Viên (3D)',
            code: 'WS-01',
            isActive: true,
          },
          {
            state: 'ASSIGNED',
            assignedStaff: [{ isPresent: true }],
          }
        );
        wsTag.position.set(0, 2.2, 0);
        tagRef.current = wsTag;
        scene.add(wsTag);

        setModel(scene);
      },
      undefined,
      (err) => {
        console.warn('[WorkstationAssetModel] Error loading Workstation GLB:', err);
      }
    );

    return () => {
      isCurrent = false;
      if (model) {
        disposeHierarchy(model);
      }
    };
  }, []);

  if (!showWorkstations || !model) return null;

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={rotation}
      scale={scale}
      name="ShiftSync_Workstation_Asset"
      onClick={(e) => {
        e.stopPropagation();
        if (typeof onSelect === 'function') {
          onSelect({
            id: 'WS_PREMIUM_01',
            name: 'Bàn Làm Việc Nhân Viên (3D)',
            code: 'WS-01',
            type: 'OFFICE_WORKSTATION',
          });
        }
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default';
      }}
    >
      <primitive object={model} dispose={null} />
    </group>
  );
}
