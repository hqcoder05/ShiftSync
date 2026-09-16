/**
 * ZoneDecals.js
 * Builds interactive zone floor pads, corner beacon pillars, status lighting,
 * and floating billboard tags supporting numerical staffing requirements,
 * Skill Layer highlighting, and multiple Heatmap visualization modes.
 */

import * as THREE from 'three';
import { getZoneStatus, getZoneStatusColor, ZONE_STATUS } from '../visualization/ZoneStatus';
import { getZoneIcon, getShortZoneName } from '../../../components/spatial/spatial.constants';

/**
 * Creates high-quality CanvasTexture for Floating 3D Zone Tag
 */
export function createZoneTagSprite(
  zone,
  assignedCount = 0,
  capacity = 4,
  isSelected = false,
  heatmapMode = 'STAFFING',
  requiredStaff = null,
  isSkillMatched = false
) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 140;
  const ctx = canvas.getContext('2d');

  const effectiveTarget = requiredStaff !== null ? requiredStaff : Math.max(1, Math.floor(capacity * 0.5));
  const status = getZoneStatus(assignedCount, capacity);
  const statusColor = getZoneStatusColor(status);

  // Background rounded glass rect
  const r = 28;
  const w = 512;
  const h = 140;

  ctx.fillStyle = isSelected ? 'rgba(15, 23, 42, 0.96)' : 'rgba(15, 23, 42, 0.88)';
  ctx.beginPath();
  ctx.roundRect(8, 8, w - 16, h - 16, r);
  ctx.fill();

  // Highlight Border (Skill match or selection)
  ctx.lineWidth = isSelected ? 8 : (isSkillMatched ? 6 : (status === ZONE_STATUS.UNDERSTAFFED ? 5 : 4));
  ctx.strokeStyle = isSelected ? '#10B981' : (isSkillMatched ? '#06B6D4' : statusColor.main);
  ctx.stroke();

  // Zone icon and short name
  const icon = getZoneIcon(zone.name);
  const shortName = getShortZoneName(zone.name);

  ctx.font = 'bold 36px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${icon}  ${shortName}`, 28, h / 2 - 12);

  // Subtitle showing status or mode
  ctx.font = '600 20px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = isSkillMatched ? '#38BDF8' : statusColor.main;

  let subtitle = statusColor.label;
  if (isSkillMatched) {
    subtitle = '★ Cần kỹ năng đang lọc';
  } else if (heatmapMode === 'COVERAGE') {
    subtitle = `Bao phủ SLA: ${Math.round((assignedCount / Math.max(1, effectiveTarget)) * 100)}%`;
  } else if (heatmapMode === 'WORKLOAD') {
    subtitle = assignedCount >= effectiveTarget ? 'Tải tối ưu' : 'Thiếu tải phục vụ';
  } else if (status === ZONE_STATUS.UNDERSTAFFED) {
    const missing = Math.max(0, effectiveTarget - assignedCount);
    subtitle = `Thiếu ${missing} nhân sự định biên`;
  }

  ctx.fillText(subtitle, 28, h / 2 + 28);

  // Occupancy ratio pill badge on the right
  const badgeW = 126;
  const badgeH = 58;
  const badgeX = w - badgeW - 24;
  const badgeY = (h - badgeH) / 2;

  ctx.fillStyle = isSkillMatched ? '#0891B2' : statusColor.main;
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 16);
  ctx.fill();

  ctx.font = 'bold 28px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const ratioLabel = requiredStaff !== null
    ? `${assignedCount}/${requiredStaff}`
    : `${assignedCount}/${capacity}`;
  ctx.fillText(ratioLabel, badgeX + badgeW / 2, h / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const spriteMat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
  });

  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(3.1, 0.85, 1);
  return sprite;
}

/**
 * Builds zone floor pad with status glow, corner beacon pillars, and architectural pillars
 */
export function buildZoneDecal({
  zone,
  tx,
  ty,
  tz,
  sizeX = 4.2,
  sizeZ = 3.6,
  assignedCount = 0,
  isSelected = false,
  heatmapMode = 'STAFFING',
  requiredStaff = null,
  isSkillMatched = false,
}) {
  const group = new THREE.Group();
  group.position.set(tx, ty, tz);

  const capacity = zone.capacity || 4;
  const status = getZoneStatus(assignedCount, capacity);
  const statusColor = getZoneStatusColor(status);

  // 1. Elevated Floor Pad
  const padGeo = new THREE.BoxGeometry(sizeX, 0.05, sizeZ);
  const padColor = isSkillMatched ? 0x0891B2 : statusColor.hexInt;
  const padMat = new THREE.MeshStandardMaterial({
    color: padColor,
    roughness: 0.6,
    transparent: true,
    opacity: isSelected ? 0.52 : (isSkillMatched ? 0.45 : (status === ZONE_STATUS.UNDERSTAFFED ? 0.38 : 0.28)),
  });
  const pad = new THREE.Mesh(padGeo, padMat);
  pad.position.y = 0.025;
  pad.receiveShadow = true;
  if (ty > 0.5) pad.castShadow = true;
  group.add(pad);

  // Pad Outline
  const edgesGeo = new THREE.EdgesGeometry(padGeo);
  const outlineColor = isSelected ? 0x10B981 : (isSkillMatched ? 0x06B6D4 : statusColor.hexInt);
  const edgesMat = new THREE.LineBasicMaterial({
    color: outlineColor,
    linewidth: isSelected || isSkillMatched ? 3 : 2,
    transparent: true,
    opacity: isSelected || isSkillMatched ? 1.0 : 0.8,
  });
  const edges = new THREE.LineSegments(edgesGeo, edgesMat);
  edges.position.copy(pad.position);
  group.add(edges);

  // 2. Corner Glowing Beacon Pillars (Architectural status indicator)
  const beaconH = 0.45;
  const beaconGeo = new THREE.CylinderGeometry(0.04, 0.05, beaconH, 8);
  const beaconMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 });
  const gemGeo = new THREE.SphereGeometry(0.065, 8, 8);
  const gemMat = new THREE.MeshBasicMaterial({ color: outlineColor });

  const hx = sizeX / 2 - 0.12;
  const hz = sizeZ / 2 - 0.12;

  [[-hx, -hz], [hx, -hz], [-hx, hz], [hx, hz]].forEach(([bx, bz]) => {
    const post = new THREE.Mesh(beaconGeo, beaconMat);
    post.position.set(bx, beaconH / 2 + 0.04, bz);
    group.add(post);

    const gem = new THREE.Mesh(gemGeo, gemMat);
    gem.position.set(bx, beaconH + 0.08, bz);
    gem.name = 'beaconGem';
    group.add(gem);
  });

  // 3. Architectural Pillars if zone is elevated (Mezzanine at ty > 0.5m)
  if (ty > 0.5) {
    const pillarGeo = new THREE.BoxGeometry(0.2, ty, 0.2);
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.6 });

    [[-hx, -hz], [hx, -hz], [-hx, hz], [hx, hz]].forEach(([px, pz]) => {
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(px, -ty / 2, pz);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      group.add(pillar);
    });

    // Guardrail around mezzanine
    const railMat = new THREE.MeshStandardMaterial({ color: 0x64748B, roughness: 0.4, metalness: 0.4 });
    const railH = 0.8;
    const railGeo = new THREE.BoxGeometry(sizeX, 0.04, 0.04);
    const railNorth = new THREE.Mesh(railGeo, railMat);
    railNorth.position.set(0, railH, -sizeZ / 2);
    railNorth.castShadow = true;
    group.add(railNorth);
  }

  // Bind userData for raycasting
  group.userData = {
    isZone: true,
    zone,
    assignedCount,
    capacity,
    requiredStaff,
    status,
    statusColor,
    isSkillMatched,
  };

  group.traverse((child) => {
    if (child.isMesh) {
      child.userData = group.userData;
    }
  });

  return group;
}
