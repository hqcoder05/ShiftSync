/**
 * CoffeeShopModel.jsx
 * Declarative Store Environment Model Loader for ShiftSync R3F Digital Twin.
 * 
 * - Loads the versioned Oak & Moss cafe GLB.
 * - Applies 6-layer semantic visibility (floor, walls, ceiling, furniture, workstations, zones).
 * - Implements non-destructive X-Ray mode on walls with clean material restoration.
 * - Graceful fallback to procedural store environment if GLB fails or is unavailable.
 * - Strictly avoids double-rendering (zero store stacking).
 */

import { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import {
  loadDigitalTwinModel,
  DEFAULT_DIGITAL_TWIN_GLB_URL,
} from '../../scene/DigitalTwinModelLoader.js';
import {
  buildStoreEnvironment,
  setEnvironmentLayersVisibility,
  setEnvironmentXRayMode,
} from '../../scene/StoreEnvironment.js';
import { buildDesignModel, disposeDesignModel } from '../../../store-designer/designScene.js';
import { disposeHierarchy } from '../../scene/ResourceManager.js';

export default function CoffeeShopModel({
  layout = { length: 24, width: 16, height: 6 },
  layers = {
    showWalls: true,
    showFloor: true,
    showCeiling: false,
    showFurniture: true,
  },
  isXRayMode = false,
  onModelLoaded = null,
  onLoadStateChange = null,
  retryKey = 0,
  modelUrl = DEFAULT_DIGITAL_TWIN_GLB_URL,
  useGLB = true,
  designDocument = null,
}) {
  const [sourceData, setModelData] = useState(null);
  useEffect(() => () => { if (sourceData?.modelRoot) disposeHierarchy(sourceData.modelRoot); }, [sourceData]);
  const modelData = useMemo(() => sourceData && designDocument ? buildDesignModel(designDocument, sourceData.modelRoot) : sourceData, [sourceData, designDocument]);
  useEffect(() => { onModelLoaded?.(modelData); return () => { if (modelData?.customDesign) disposeDesignModel(modelData); }; }, [modelData, onModelLoaded]);
  const [loadError, setLoadError] = useState(null);
  const proceduralGroupRef = useRef(null);
  const glbGroupRef = useRef(null);

  // 1. Asynchronously load the GLB Digital Twin Model
  useEffect(() => {
    let isCurrent = true;
    setLoadError(null);
    setModelData(null);
    onModelLoaded?.(null);

    if (!useGLB) {
      onLoadStateChange?.({status:'idle'});
      setModelData(null);
      if (typeof onModelLoaded === 'function') onModelLoaded(null);
      return () => { isCurrent = false; };
    }
    onLoadStateChange?.({status:'loading'});

    loadDigitalTwinModel({
      url: modelUrl,
      layout,
    })
      .then((data) => {
        if (!isCurrent) return;
        if (data?.modelRoot) {
          setModelData(data);
          onLoadStateChange?.({status:'ready'});

        } else {
          throw new Error('GLB model loaded but modelRoot is missing');
        }
      })
      .catch((err) => {
        if (!isCurrent) return;
        console.warn('[CoffeeShopModel] GLB load error, using procedural store fallback:', err?.message || err);
        setLoadError(err);
        setModelData(null);
        onModelLoaded?.(null);
        onLoadStateChange?.({status:'error'});
      });

    return () => {
      isCurrent = false;
    };
  }, [modelUrl, layout?.length, layout?.width, layout?.height, useGLB,retryKey]);

  // 2. Procedural Fallback Environment
  const proceduralEnv = useMemo(() => {
    if (modelData && useGLB) return null; // Zero double-rendering
    const showWalls = layers?.showWalls !== false;
    const env = buildStoreEnvironment(layout, showWalls);
    if (layers) {
      setEnvironmentLayersVisibility(env, layers);
    }
    setEnvironmentXRayMode(env, isXRayMode);
    return env;
  }, [modelData, useGLB, layout?.length, layout?.width, layout?.height]);

  // 3. Layer Visibility Synchronization on GLB Model
  useEffect(() => {
    if (!modelData?.layers) return;

    const layerMap = modelData.layers;
    layerMap.workstations?.forEach(m => { m.visible = layers?.showWorkstations !== false; });
    if (layerMap.floor) {
      layerMap.floor.forEach((m) => {
        m.visible = layers?.showFloor !== false;
      });
    }
    if (layerMap.walls) {
      layerMap.walls.forEach((m) => {
        m.visible = layers?.showWalls !== false;
      });
    }
    if (layerMap.ceiling) {
      layerMap.ceiling.forEach((m) => {
        m.visible = Boolean(layers?.showCeiling);
      });
    }
    if (layerMap.furniture) {
      layerMap.furniture.forEach((m) => {
        m.visible = layers?.showFurniture !== false;
      });
    }
  }, [modelData, layers]);

  // 4. X-Ray Mode Synchronization on GLB Model
  useEffect(() => {
    if (!modelData?.layers?.walls) return;

    const walls = modelData.layers.walls;
    walls.forEach((mesh) => {
      if (!mesh || !mesh.material) return;

      if (isXRayMode) {
        if (!mesh.userData._originalMaterial) {
          mesh.userData._originalMaterial = mesh.material;
        }
        mesh.material = new THREE.MeshStandardMaterial({
          color: 0x94A3B8,
          transparent: true,
          opacity: 0.22,
          roughness: 0.2,
          metalness: 0.1,
          depthWrite: false,
        });
      } else if (mesh.userData._originalMaterial) {
        mesh.material = mesh.userData._originalMaterial;
        delete mesh.userData._originalMaterial;
      }
    });
  }, [modelData, isXRayMode]);

  // Procedural layer visibility & X-ray updates
  useEffect(() => {
    if (proceduralEnv) {
      setEnvironmentLayersVisibility(proceduralEnv, layers);
      setEnvironmentXRayMode(proceduralEnv, isXRayMode);
    }
  }, [proceduralEnv, layers, isXRayMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (proceduralGroupRef.current) {
        disposeHierarchy(proceduralGroupRef.current);
      }
    };
  }, []);

  if (useGLB && modelData?.modelRoot) {
    return (
      <primitive
        ref={glbGroupRef}
        object={modelData.modelRoot}
        dispose={null}
      />
    );
  }

  if (proceduralEnv) {
    return (
      <primitive
        ref={proceduralGroupRef}
        object={proceduralEnv}
        dispose={null}
      />
    );
  }

  return null;
}
