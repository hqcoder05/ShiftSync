import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Engine,
  Scene,
  ArcRotateCamera,
  Vector3,
  Color3,
  Color4,
  HemisphericLight,
  DirectionalLight,
  ShadowGenerator,
  MeshBuilder,
  StandardMaterial,
  DynamicTexture,
  Mesh,
  TransformNode,
} from '@babylonjs/core';
import SpatialControlsOverlay from './SpatialControlsOverlay';
import TwoDSpatialSchematic from './TwoDSpatialSchematic';
import {
  toThreeCoords,
  getOccupancyColor,
  getRoleColor,
  getDeterministicPersonOffset,
  getZoneIcon,
  getShortZoneName,
} from './spatial.constants';

/**
 * Creates a billboard 2D sprite plane for a zone in Babylon.js
 */
function createBabylonZoneLabel(zone, assignedCount, capacity, scene) {
  const plane = MeshBuilder.CreatePlane(
    'label_' + zone.id,
    { width: 3.2, height: 1.0 },
    scene
  );
  plane.billboardMode = Mesh.BILLBOARDMODE_ALL;

  const dt = new DynamicTexture('dt_' + zone.id, { width: 512, height: 160 }, scene, false);
  const ctx = dt.getContext();

  // Draw background rounded rect
  const r = 32;
  const w = 512;
  const h = 160;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.90)';
  ctx.beginPath();
  ctx.roundRect(8, 8, w - 16, h - 16, r);
  ctx.fill();

  // Border colored by occupancy ratio
  const occColor = getOccupancyColor(assignedCount, capacity);
  ctx.lineWidth = 6;
  ctx.strokeStyle = occColor;
  ctx.stroke();

  // Zone icon and short name
  const icon = getZoneIcon(zone.name);
  const shortName = getShortZoneName(zone.name);
  ctx.font = 'bold 44px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${icon}  ${shortName}`, 32, h / 2);

  // Badge count on the right
  ctx.fillStyle = occColor;
  ctx.beginPath();
  ctx.roundRect(w - 142, 34, 110, h - 68, 18);
  ctx.fill();

  ctx.font = 'bold 36px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.fillText(`${assignedCount}/${capacity}`, w - 87, h / 2);

  dt.update();

  const mat = new StandardMaterial('labelMat_' + zone.id, scene);
  mat.diffuseTexture = dt;
  mat.diffuseTexture.hasAlpha = true;
  mat.useAlphaFromDiffuseTexture = true;
  mat.specularColor = new Color3(0, 0, 0);
  mat.emissiveColor = new Color3(1, 1, 1);
  mat.disableLighting = true;

  plane.material = mat;
  return plane;
}

/**
 * makeBabylonPerson(x, z, shirtColor, y, employee, zone, scene, shadowGen)
 * Creates a composite 3D human figure in Babylon.js:
 * - Head: Sphere
 * - Torso: Capsule with shirtColor
 * - Legs: 2 Capsules with dark pants
 * - Arms: 2 Capsules with shirtColor
 * - Ground ring: Disc on floor
 * All meshes cast & receive shadows.
 */
function makeBabylonPerson(x, z, shirtColor, y = 0, employee = null, zone = null, scene = null, shadowGen = null) {
  const root = new TransformNode('person_' + (employee?.id || Math.random()), scene);
  root.position = new Vector3(x, y, z);
  root.metadata = { isPerson: true, employee, zone };

  // Materials
  const skinMat = new StandardMaterial('skinMat', scene);
  skinMat.diffuseColor = Color3.FromHexString('#FCD34D');
  skinMat.specularColor = new Color3(0.05, 0.05, 0.05);

  const shirtMat = new StandardMaterial('shirtMat_' + shirtColor, scene);
  shirtMat.diffuseColor = Color3.FromHexString(shirtColor);
  shirtMat.specularColor = new Color3(0.1, 0.1, 0.1);

  const pantsMat = new StandardMaterial('pantsMat', scene);
  pantsMat.diffuseColor = Color3.FromHexString('#1E293B');
  pantsMat.specularColor = new Color3(0.05, 0.05, 0.05);

  // 1. Head
  const head = MeshBuilder.CreateSphere('head', { diameter: 0.26, segments: 16 }, scene);
  head.position = new Vector3(0, 1.48, 0);
  head.material = skinMat;
  head.parent = root;
  head.metadata = { isPerson: true, employee, zone };
  if (shadowGen) {
    shadowGen.addShadowCaster(head);
    head.receiveShadows = true;
  }

  // 2. Torso
  const torso = MeshBuilder.CreateCapsule('torso', { radius: 0.18, height: 0.80, tessellation: 16 }, scene);
  torso.position = new Vector3(0, 1.05, 0);
  torso.material = shirtMat;
  torso.parent = root;
  torso.metadata = { isPerson: true, employee, zone };
  if (shadowGen) {
    shadowGen.addShadowCaster(torso);
    torso.receiveShadows = true;
  }

  // 3. Legs
  const leftLeg = MeshBuilder.CreateCapsule('leftLeg', { radius: 0.07, height: 0.69, tessellation: 16 }, scene);
  leftLeg.position = new Vector3(-0.11, 0.42, 0);
  leftLeg.material = pantsMat;
  leftLeg.parent = root;
  leftLeg.metadata = { isPerson: true, employee, zone };
  if (shadowGen) {
    shadowGen.addShadowCaster(leftLeg);
    leftLeg.receiveShadows = true;
  }

  const rightLeg = MeshBuilder.CreateCapsule('rightLeg', { radius: 0.07, height: 0.69, tessellation: 16 }, scene);
  rightLeg.position = new Vector3(0.11, 0.42, 0);
  rightLeg.material = pantsMat;
  rightLeg.parent = root;
  rightLeg.metadata = { isPerson: true, employee, zone };
  if (shadowGen) {
    shadowGen.addShadowCaster(rightLeg);
    rightLeg.receiveShadows = true;
  }

  // 4. Arms
  const leftArm = MeshBuilder.CreateCapsule('leftArm', { radius: 0.055, height: 0.49, tessellation: 16 }, scene);
  leftArm.position = new Vector3(-0.26, 1.0, 0);
  leftArm.material = shirtMat;
  leftArm.parent = root;
  leftArm.metadata = { isPerson: true, employee, zone };
  if (shadowGen) {
    shadowGen.addShadowCaster(leftArm);
    leftArm.receiveShadows = true;
  }

  const rightArm = MeshBuilder.CreateCapsule('rightArm', { radius: 0.055, height: 0.49, tessellation: 16 }, scene);
  rightArm.position = new Vector3(0.26, 1.0, 0);
  rightArm.material = shirtMat;
  rightArm.parent = root;
  rightArm.metadata = { isPerson: true, employee, zone };
  if (shadowGen) {
    shadowGen.addShadowCaster(rightArm);
    rightArm.receiveShadows = true;
  }

  // 5. Contact Indicator Ring on floor
  const ring = MeshBuilder.CreateDisc('ring', { radius: 0.25, tessellation: 24 }, scene);
  ring.rotation.x = Math.PI / 2;
  ring.position = new Vector3(0, 0.015, 0);
  const ringMat = new StandardMaterial('ringMat', scene);
  ringMat.diffuseColor = Color3.FromHexString(shirtColor);
  ringMat.alpha = 0.75;
  ring.material = ringMat;
  ring.parent = root;

  return root;
}

/**
 * StoreBabylonCanvas
 * Babylon.js implementation of the 3D spatial store:
 * - Engine, Scene with ArcRotateCamera (smooth orbit, damping & limits)
 * - HemisphericLight & DirectionalLight with PCF soft shadows
 * - Store floor, perimeter walls, zone floor pads with occupancy colors
 * - Workstations & support pillars
 * - 3D Composite Human figures with role-based colors and real contact shadows
 * - Native picking & scene interaction
 */
export default function StoreBabylonCanvas({
  layout = { length: 24, width: 16, height: 6 },
  zones = [],
  staff = [],
  storeName = 'Chi nhánh cửa hàng',
  onRunAlgorithm,
  isAllocating = false,
  allocatedSequence = [],
  onSwitchEngine,
}) {
  const canvasRef = useRef(null);
  const [use2DFallback, setUse2DFallback] = useState(false);

  // Layer Toggles
  const [showZones, setShowZones] = useState(true);
  const [showStaff, setShowStaff] = useState(true);
  const [showWorkstations, setShowWorkstations] = useState(true);
  const [showDistances, setShowDistances] = useState(false);
  const [showAlgorithm, setShowAlgorithm] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showWalls, setShowWalls] = useState(true);
  const [showLabels, setShowLabels] = useState(true);

  // Selection states
  const [selectedZone, setSelectedZone] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState(null);

  // Babylon refs
  const engineRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const shadowGenRef = useRef(null);
  const dynamicNodesRef = useRef([]);

  // Camera presets
  const handleResetCamera = useCallback(() => {
    if (cameraRef.current) {
      cameraRef.current.alpha = Math.PI / 4;
      cameraRef.current.beta = Math.PI / 3.2;
      cameraRef.current.radius = 40;
      cameraRef.current.setTarget(new Vector3(0, 0, 0));
    }
  }, []);

  const handleIsometricCamera = useCallback(() => {
    if (cameraRef.current) {
      cameraRef.current.alpha = Math.PI / 4;
      cameraRef.current.beta = Math.PI / 3.2;
      cameraRef.current.radius = 40;
      cameraRef.current.setTarget(new Vector3(0, 0, 0));
    }
  }, []);

  const handleTopDownCamera = useCallback(() => {
    if (cameraRef.current) {
      cameraRef.current.alpha = 0;
      cameraRef.current.beta = 0.05;
      cameraRef.current.radius = 42;
      cameraRef.current.setTarget(new Vector3(0, 0, 0));
    }
  }, []);

  /* ── Master Babylon.js Lifecycle ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || use2DFallback) return;

    // 1. Engine
    const engine = new Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
      powerPreference: 'high-performance',
    });
    engineRef.current = engine;

    // 2. Scene
    const scene = new Scene(engine);
    scene.clearColor = new Color4(248 / 255, 250 / 255, 252 / 255, 1);
    sceneRef.current = scene;

    // 3. ArcRotateCamera
    const camera = new ArcRotateCamera(
      'ArcCamera',
      Math.PI / 4,
      Math.PI / 3.2,
      40,
      new Vector3(0, 0, 0),
      scene
    );
    camera.attachControl(canvas, true);
    camera.lowerRadiusLimit = 8;
    camera.upperRadiusLimit = 65;
    camera.lowerBetaLimit = 0.15;
    camera.upperBetaLimit = Math.PI / 2 - 0.05; // Prevent flipping below ground
    camera.wheelPrecision = 15;
    camera.inertia = 0.7;
    cameraRef.current = camera;

    // 4. Lighting
    const hemiLight = new HemisphericLight('hemiLight', new Vector3(0, 1, 0), scene);
    hemiLight.intensity = 0.55;
    hemiLight.diffuse = new Color3(1, 1, 1);
    hemiLight.groundColor = new Color3(0.85, 0.9, 0.95);

    const storeLen = Number(layout?.length) || 24.0;
    const storeWid = Number(layout?.width) || 16.0;
    const storeH = Number(layout?.height) || 6.0;

    const dirLight = new DirectionalLight(
      'dirLight',
      new Vector3(-0.5, -1.2, -0.6).normalize(),
      scene
    );
    dirLight.position = new Vector3(storeLen * 0.75, storeH * 2.8, storeWid * 0.85);
    dirLight.intensity = 1.15;
    dirLight.diffuse = new Color3(1, 0.98, 0.92);

    // 5. Soft PCF Shadows
    const shadowGenerator = new ShadowGenerator(2048, dirLight);
    shadowGenerator.usePercentageCloserFiltering = true;
    shadowGenerator.filteringQuality = ShadowGenerator.QUALITY_HIGH;
    shadowGenerator.bias = 0.001;
    shadowGenerator.darkness = 0.45;
    shadowGenRef.current = shadowGenerator;

    // 6. Ground Floor
    const ground = MeshBuilder.CreateGround(
      'storeGround',
      { width: storeLen, height: storeWid },
      scene
    );
    const groundMat = new StandardMaterial('groundMat', scene);
    groundMat.diffuseColor = new Color3(241 / 255, 245 / 255, 249 / 255);
    groundMat.specularColor = new Color3(0.05, 0.05, 0.05);
    ground.material = groundMat;
    ground.receiveShadows = true;

    // 7. Perimeter Walls
    const wallMat = new StandardMaterial('wallMat', scene);
    wallMat.diffuseColor = new Color3(203 / 255, 213 / 255, 225 / 255);
    wallMat.alpha = 0.45;
    wallMat.specularColor = new Color3(0.05, 0.05, 0.05);
    const wallThick = 0.15;

    // North
    const northWall = MeshBuilder.CreateBox(
      'northWall',
      { width: storeLen, height: storeH, depth: wallThick },
      scene
    );
    northWall.position = new Vector3(0, storeH / 2, -storeWid / 2);
    northWall.material = wallMat;

    // South
    const southWall = MeshBuilder.CreateBox(
      'southWall',
      { width: storeLen, height: storeH, depth: wallThick },
      scene
    );
    southWall.position = new Vector3(0, storeH / 2, storeWid / 2);
    southWall.material = wallMat;

    // West
    const westWall = MeshBuilder.CreateBox(
      'westWall',
      { width: wallThick, height: storeH, depth: storeWid },
      scene
    );
    westWall.position = new Vector3(-storeLen / 2, storeH / 2, 0);
    westWall.material = wallMat;

    // East
    const eastWall = MeshBuilder.CreateBox(
      'eastWall',
      { width: wallThick, height: storeH, depth: storeWid },
      scene
    );
    eastWall.position = new Vector3(storeLen / 2, storeH / 2, 0);
    eastWall.material = wallMat;

    // 8. Native Picking
    scene.onPointerDown = (evt, pickResult) => {
      if (pickResult?.hit && pickResult.pickedMesh) {
        const mesh = pickResult.pickedMesh;
        let meta = mesh.metadata;
        if (!meta && mesh.parent) meta = mesh.parent.metadata;

        if (meta?.isZone) {
          setSelectedZone(meta.zone);
          setSelectedStaff(null);
        } else if (meta?.isPerson) {
          setSelectedStaff(meta.employee);
          if (meta.zone) setSelectedZone(meta.zone);
        }
      } else {
        setSelectedZone(null);
        setSelectedStaff(null);
      }
    };

    // 9. Render loop
    engine.runRenderLoop(() => {
      scene.render();
    });

    const onResize = () => {
      engine.resize();
    };
    window.addEventListener('resize', onResize);

    // Expose for inspection
    window.__babylon = { engine, scene, camera, shadowGenerator };

    // Cleanup
    return () => {
      window.removeEventListener('resize', onResize);
      delete window.__babylon;
      scene.dispose();
      engine.dispose();
    };
  }, [use2DFallback, layout?.length, layout?.width, layout?.height]);

  /* ── Dynamic Entity Sync (Zones, People, Labels) ── */
  useEffect(() => {
    const scene = sceneRef.current;
    const shadowGen = shadowGenRef.current;
    if (!scene) return;

    // Dispose old dynamic nodes
    dynamicNodesRef.current.forEach((n) => {
      if (n.dispose) n.dispose();
    });
    dynamicNodesRef.current = [];

    const storeLen = Number(layout?.length) || 24.0;
    const storeWid = Number(layout?.width) || 16.0;
    const zoneSizeX = Math.min(4.5, storeLen * 0.22);
    const zoneSizeZ = Math.min(3.8, storeWid * 0.22);

    // Group staff by zone
    const staffByZone = {};
    staff.forEach((s) => {
      const zid = s.zoneId || s.zone?.id;
      if (zid) {
        if (!staffByZone[zid]) staffByZone[zid] = [];
        staffByZone[zid].push(s);
      }
    });

    // 1. Zones
    if (showZones) {
      zones.forEach((zone) => {
        const [tx, ty, tz] = toThreeCoords(zone.x, zone.y, zone.z, layout);
        const zoneStaff = staffByZone[zone.id] || [];
        const capacity = zone.capacity || 4;
        const occColor = getOccupancyColor(zoneStaff.length, capacity);
        const isSelected = selectedZone?.id === zone.id;

        // Pad
        const pad = MeshBuilder.CreateBox(
          'zonePad_' + zone.id,
          { width: zoneSizeX, height: 0.06, depth: zoneSizeZ },
          scene
        );
        pad.position = new Vector3(tx, ty + 0.03, tz);
        pad.metadata = { isZone: true, zone, assignedCount: zoneStaff.length };
        pad.receiveShadows = true;
        if (ty > 0.5 && shadowGen) {
          shadowGen.addShadowCaster(pad);
        }

        const padMat = new StandardMaterial('zoneMat_' + zone.id, scene);
        padMat.diffuseColor = Color3.FromHexString(occColor);
        padMat.alpha = isSelected ? 0.55 : 0.35;
        padMat.specularColor = new Color3(0.1, 0.1, 0.1);
        pad.material = padMat;
        dynamicNodesRef.current.push(pad);

        // Support pillars if elevated
        if (ty > 0.5) {
          const halfX = zoneSizeX / 2 - 0.15;
          const halfZ = zoneSizeZ / 2 - 0.15;
          const pillarMat = new StandardMaterial('pillarMat', scene);
          pillarMat.diffuseColor = Color3.FromHexString('#64748B');

          [[-halfX, -halfZ], [halfX, -halfZ], [-halfX, halfZ], [halfX, halfZ]].forEach(([px, pz], pIdx) => {
            const pillar = MeshBuilder.CreateBox(
              `pillar_${zone.id}_${pIdx}`,
              { width: 0.18, height: ty, depth: 0.18 },
              scene
            );
            pillar.position = new Vector3(tx + px, ty / 2, tz + pz);
            pillar.material = pillarMat;
            pillar.receiveShadows = true;
            if (shadowGen) shadowGen.addShadowCaster(pillar);
            dynamicNodesRef.current.push(pillar);
          });
        }

        // Workstation Counter
        if (showWorkstations) {
          const counterMat = new StandardMaterial('counterMat', scene);
          counterMat.diffuseColor = Color3.FromHexString('#334155');
          const counter = MeshBuilder.CreateBox(
            'counter_' + zone.id,
            { width: zoneSizeX * 0.7, height: 0.88, depth: 0.75 },
            scene
          );
          counter.position = new Vector3(tx, ty + 0.44, tz - 0.25);
          counter.material = counterMat;
          counter.receiveShadows = true;
          counter.metadata = { isZone: true, zone, assignedCount: zoneStaff.length };
          if (shadowGen) shadowGen.addShadowCaster(counter);
          dynamicNodesRef.current.push(counter);

          const slabMat = new StandardMaterial('slabMat', scene);
          slabMat.diffuseColor = Color3.FromHexString('#F8FAFC');
          const slab = MeshBuilder.CreateBox(
            'slab_' + zone.id,
            { width: zoneSizeX * 0.74, height: 0.05, depth: 0.82 },
            scene
          );
          slab.position = new Vector3(tx, ty + 0.905, tz - 0.25);
          slab.material = slabMat;
          slab.receiveShadows = true;
          slab.metadata = { isZone: true, zone, assignedCount: zoneStaff.length };
          if (shadowGen) shadowGen.addShadowCaster(slab);
          dynamicNodesRef.current.push(slab);
        }

        // 3D Billboard Label
        if (showLabels) {
          const label = createBabylonZoneLabel(zone, zoneStaff.length, capacity, scene);
          label.position = new Vector3(tx, ty + 2.1, tz);
          dynamicNodesRef.current.push(label);
        }
      });
    }

    // 2. Human Figures (makeBabylonPerson)
    if (showStaff) {
      zones.forEach((zone) => {
        const [tx, ty, tz] = toThreeCoords(zone.x, zone.y, zone.z, layout);
        const zoneStaff = staffByZone[zone.id] || [];

        zoneStaff.forEach((emp, sIdx) => {
          const [ox, oz] = getDeterministicPersonOffset(
            zone.id,
            sIdx,
            zoneStaff.length,
            zoneSizeX,
            zoneSizeZ
          );
          const shirtColor = getRoleColor(emp.skillName || emp.role || 'Nhân viên');
          const person = makeBabylonPerson(
            tx + ox,
            tz + oz,
            shirtColor,
            ty,
            emp,
            zone,
            scene,
            shadowGen
          );
          dynamicNodesRef.current.push(person);
        });
      });
    }
  }, [
    zones,
    staff,
    layout,
    showZones,
    showStaff,
    showWorkstations,
    showLabels,
    selectedZone,
  ]);

  if (use2DFallback) {
    return (
      <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 540 }}>
        <TwoDSpatialSchematic
          layout={layout}
          zones={zones}
          staff={staff}
          selectedZone={selectedZone}
          onSelectZone={setSelectedZone}
          showDistances={showDistances}
          showWorkstations={showWorkstations}
        />
        <button
          type="button"
          onClick={() => setUse2DFallback(false)}
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            padding: '7px 14px',
            borderRadius: 8,
            border: 'none',
            backgroundColor: '#10B981',
            color: '#FFFFFF',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            zIndex: 20,
          }}
        >
          🌐 Trở lại 3D
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: 540,
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        overflow: 'hidden',
        border: '1px solid #E2E8F0',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
      }}
    >
      {/* Babylon WebGL Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
          outline: 'none',
          display: 'block',
        }}
      />

      {/* Engine Switcher Badge (Top Left Corner) */}
      <div
        style={{
          position: 'absolute',
          top: 14,
          left: 14,
          zIndex: 30,
          display: 'flex',
          alignItems: 'center',
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(8px)',
          borderRadius: 10,
          padding: '4px 6px',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          gap: 4,
        }}
      >
        <button
          type="button"
          onClick={() => onSwitchEngine && onSwitchEngine('three')}
          style={{
            padding: '4px 10px',
            borderRadius: 7,
            border: 'none',
            backgroundColor: 'transparent',
            color: '#94A3B8',
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          Three.js
        </button>
        <button
          type="button"
          style={{
            padding: '4px 10px',
            borderRadius: 7,
            border: 'none',
            backgroundColor: '#10B981',
            color: '#FFFFFF',
            fontSize: 11,
            fontWeight: 700,
            cursor: 'default',
          }}
        >
          Babylon.js ★
        </button>
      </div>

      {/* 2.5D HUD Control Overlay & Right-side Drawer */}
      <SpatialControlsOverlay
        showZones={showZones}
        setShowZones={setShowZones}
        showStaff={showStaff}
        setShowStaff={setShowStaff}
        showWorkstations={showWorkstations}
        setShowWorkstations={setShowWorkstations}
        showDistances={showDistances}
        setShowDistances={setShowDistances}
        showAlgorithm={showAlgorithm}
        setShowAlgorithm={setShowAlgorithm}
        showGrid={showGrid}
        setShowGrid={setShowGrid}
        showWalls={showWalls}
        setShowWalls={setShowWalls}
        showLabels={showLabels}
        setShowLabels={setShowLabels}
        onResetCamera={handleResetCamera}
        onIsometricCamera={handleIsometricCamera}
        onTopDownCamera={handleTopDownCamera}
        onToggle2D={() => setUse2DFallback(true)}
        selectedZone={selectedZone}
        onSelectZone={(z) => {
          setSelectedZone(z);
          setSelectedStaff(null);
        }}
        onClearSelectedZone={() => setSelectedZone(null)}
        selectedStaff={selectedStaff}
        onSelectStaff={(s) => {
          setSelectedStaff(s);
          setSelectedZone(null);
        }}
        onClearSelectedStaff={() => setSelectedStaff(null)}
        zones={zones}
        staffList={staff}
        onRunAlgorithm={onRunAlgorithm}
        isAllocating={isAllocating}
        layout={layout}
        storeName={storeName}
      />
    </div>
  );
}
