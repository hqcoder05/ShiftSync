/**
 * ExploreHUD.jsx
 * High-end SaaS Exploration HUD overlay for Mode 2 (3D Store World Exploration).
 * 
 * Features:
 * - Controls helper pill (WASD, Mouse, Shift, Space, E, F, V, ESC)
 * - Center Reticle / Crosshair with Target Lock indicators
 * - Dedicated Point Lock HUD Banner with release button
 * - Interactive Proximity Card for Zones, Workstations and Employees
 * - Real-time SVG Store Minimap with player position dot, FOV vision cone, and zone click-to-teleport
 * - Fast Teleport Dropdown
 * - Exit / View Mode Switcher
 */

import { useState } from 'react';
import {
  Compass,
  X,
  Eye,
  Zap,
  MapPin,
  Sparkles,
  Crosshair,
  Unlock,
  Target,
  ChevronDown,
} from 'lucide-react';
import { toThreeCoords } from '../../../components/spatial/spatial.constants';

export default function ExploreHUD({
  layout = { length: 24, width: 16 },
  zones = [],
  staff = [],
  playerPosition = { x: 0, z: 0 },
  playerYaw = 0,
  nearbyEntity = null,
  reticleTarget = null,
  targetLock = null,
  viewMode = 'first_person',
  isFlyMode = false,
  isDrawerOpen = false,
  onToggleView,
  onTeleportToZone,
  onInteract,
  onToggleTargetLock,
  onReleaseTargetLock,
  onExit,
}) {
  const [showControlsGuide, setShowControlsGuide] = useState(true);
  const [isTeleportMenuOpen, setIsTeleportMenuOpen] = useState(false);

  const storeLen = Number(layout?.length) || 24.0;
  const storeWid = Number(layout?.width) || 16.0;

  // Minimap dimensions
  const mapW = 190;
  const mapH = Math.round((storeWid / storeLen) * mapW);

  // Helper: map 3D world coord (X, Z) to minimap SVG coord (mx, my)
  const toMapCoord = (wx, wz) => {
    const mx = ((wx + storeLen / 2) / storeLen) * mapW;
    const my = ((wz + storeWid / 2) / storeWid) * mapH;
    return [Math.max(6, Math.min(mapW - 6, mx)), Math.max(6, Math.min(mapH - 6, my))];
  };

  const [px, py] = toMapCoord(playerPosition.x, playerPosition.z);

  // Vision cone triangle points (based on yaw)
  const coneLength = 24;
  const coneAngle = 0.55; // radians FOV half-angle
  const dirX = -Math.sin(playerYaw);
  const dirY = -Math.cos(playerYaw);

  const leftX = px + (Math.cos(coneAngle) * dirX - Math.sin(coneAngle) * dirY) * coneLength;
  const leftY = py + (Math.sin(coneAngle) * dirX + Math.cos(coneAngle) * dirY) * coneLength;

  const rightX = px + (Math.cos(-coneAngle) * dirX - Math.sin(-coneAngle) * dirY) * coneLength;
  const rightY = py + (Math.sin(-coneAngle) * dirX + Math.cos(-coneAngle) * dirY) * coneLength;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        zIndex: 25,
        userSelect: 'none',
      }}
    >
      {/* 1. Center Reticle / Crosshair for First-Person View */}
      {viewMode === 'first_person' && (
        <div
          id="fp-crosshair-reticle"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 26,
          }}
        >
          {targetLock ? (
            // Target Locked brackets
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                animation: 'pulse 1.8s infinite ease-in-out',
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  border: '2px solid #38BDF8',
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(56, 189, 248, 0.12)',
                  boxShadow: '0 0 16px rgba(56, 189, 248, 0.5)',
                }}
              >
                <Target size={20} color="#38BDF8" />
              </div>
              <div
                style={{
                  marginTop: 6,
                  backgroundColor: 'rgba(15, 23, 42, 0.88)',
                  padding: '2px 8px',
                  borderRadius: 6,
                  border: '1px solid rgba(56, 189, 248, 0.4)',
                  color: '#38BDF8',
                  fontSize: 10.5,
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                }}
              >
                 POINT LOCKED: {targetLock.name}
              </div>
            </div>
          ) : reticleTarget ? (
            // Reticle Target in Sight
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  border: '1.5px dashed #FBBF24',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(251, 191, 36, 0.08)',
                }}
              >
                <Crosshair size={15} color="#FBBF24" />
              </div>
              <div
                style={{
                  marginTop: 4,
                  backgroundColor: 'rgba(15, 23, 42, 0.85)',
                  padding: '2px 6px',
                  borderRadius: 4,
                  border: '1px solid rgba(251, 191, 36, 0.3)',
                  color: '#FDE68A',
                  fontSize: 9.5,
                  fontWeight: 700,
                }}
              >
                [F] Khóa nhìn {reticleTarget.name}
              </div>
            </div>
          ) : (
            // Default subtle crosshair dot
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.85)',
                boxShadow: '0 0 6px rgba(0, 0, 0, 0.7)',
              }}
            />
          )}
        </div>
      )}

      {/* 2. Top Bar: Exploration Mode Indicator & Teleport / Exit controls */}
      <div
        style={{
          position: 'absolute',
          top: 14,
          left: 14,
          right: isDrawerOpen ? 376 : 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pointerEvents: 'none',
          transition: 'right 0.25s ease',
        }}
      >
        {/* Left: Mode Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            pointerEvents: 'auto',
            backgroundColor: 'rgba(15, 23, 42, 0.88)',
            backdropFilter: 'blur(12px)',
            color: '#FFFFFF',
            padding: '7px 14px',
            borderRadius: 12,
            border: '1px solid rgba(255, 255, 255, 0.12)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          }}
        >
          
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: '#38BDF8' }}>
                CHẾ ĐỘ THAM QUAN 3D
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  backgroundColor: 'rgba(56, 189, 248, 0.2)',
                  color: '#38BDF8',
                  padding: '1px 6px',
                  borderRadius: 6,
                }}
              >
                LIVE
              </span>
            </div>
            <div style={{ fontSize: 11, color: '#94A3B8' }}>
              Di chuyển tự do góc nhìn thứ nhất (WASD + Chuột)
            </div>
          </div>
        </div>

        {/* Right: Teleport, View Mode & Exit Button */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            pointerEvents: 'auto',
          }}
        >
          {/* Fast Teleport Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              id="btn-teleport-menu"
              type="button"
              onClick={() => setIsTeleportMenuOpen(!isTeleportMenuOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 12px',
                borderRadius: 10,
                border: '1px solid rgba(255, 255, 255, 0.15)',
                backgroundColor: 'rgba(15, 23, 42, 0.85)',
                backdropFilter: 'blur(10px)',
                color: '#E2E8F0',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
              }}
              title="Dịch chuyển nhanh đến phân khu"
            >
              <Zap size={14} color="#FBBF24" />
              <span>Dịch chuyển</span>
              <ChevronDown size={13} />
            </button>

            {isTeleportMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: 6,
                  width: 220,
                  backgroundColor: '#0F172A',
                  border: '1px solid #334155',
                  borderRadius: 10,
                  padding: 4,
                  boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
                  zIndex: 50,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#94A3B8',
                    padding: '6px 10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Chọn phân khu đích
                </div>
                {zones.map((z) => (
                  <button
                    key={z.id}
                    type="button"
                    onClick={() => {
                      onTeleportToZone?.(z);
                      setIsTeleportMenuOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: 6,
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: '#F8FAFC',
                      fontSize: 12,
                      fontWeight: 500,
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1E293B')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <MapPin size={13} color="#38BDF8" />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {z.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 3rd Person / 1st Person Toggle */}
          <button
            id="btn-toggle-view"
            type="button"
            onClick={onToggleView}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '7px 12px',
              borderRadius: 10,
              border: '1px solid rgba(255, 255, 255, 0.15)',
              backgroundColor: 'rgba(15, 23, 42, 0.85)',
              backdropFilter: 'blur(10px)',
              color: '#E2E8F0',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
            title="Đổi góc nhìn (Phím V)"
          >
            <Eye size={14} color="#38BDF8" />
            <span>{viewMode === 'third_person' ? 'Góc nhìn thứ 3 (V)' : 'Góc nhìn thứ 1 (V)'}</span>
          </button>

          {/* Exit Button */}
          <button
            id="btn-exit-explore"
            type="button"
            onClick={onExit}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px',
              borderRadius: 10,
              border: '1px solid rgba(239, 68, 68, 0.4)',
              backgroundColor: 'rgba(239, 68, 68, 0.9)',
              color: '#FFFFFF',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(239, 68, 68, 0.3)',
            }}
            title="Thoát chế độ tham quan (Phím ESC)"
          >
            <X size={15} />
            <span>Thoát tham quan</span>
            <span style={{ fontSize: 10, opacity: 0.8, backgroundColor: 'rgba(0,0,0,0.2)', padding: '1px 5px', borderRadius: 4 }}>
              ESC
            </span>
          </button>
        </div>
      </div>

      {/* 3. Point Lock Active Banner (Top Center) */}
      {targetLock && (
        <div
          id="point-lock-active-banner"
          style={{
            position: 'absolute',
            top: 68,
            left: '50%',
            transform: 'translateX(-50%)',
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            backgroundColor: 'rgba(15, 23, 42, 0.94)',
            backdropFilter: 'blur(14px)',
            padding: '7px 16px',
            borderRadius: 24,
            border: '1.5px solid #38BDF8',
            boxShadow: '0 8px 30px rgba(56, 189, 248, 0.35)',
            color: '#FFFFFF',
            fontSize: 12,
            zIndex: 30,
            animation: 'fadeInDown 0.25s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            
            <span>
              Đang khóa nhìn: <strong>{targetLock.name}</strong>
            </span>
            <span
              style={{
                fontSize: 10,
                backgroundColor: 'rgba(56, 189, 248, 0.2)',
                color: '#38BDF8',
                padding: '1px 6px',
                borderRadius: 4,
                fontWeight: 700,
                textTransform: 'uppercase',
              }}
            >
              {targetLock.type === 'staff' ? 'Nhân sự' : (targetLock.type === 'workstation' ? 'Trạm làm việc' : 'Phân khu')}
            </span>
          </div>

          <button
            id="btn-release-point-lock"
            type="button"
            onClick={onReleaseTargetLock}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              border: 'none',
              backgroundColor: '#0284C7',
              color: '#FFFFFF',
              padding: '3px 9px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.4)',
            }}
            title="Mở khóa góc nhìn để tự do xoay chuột (Phím ESC hoặc F)"
          >
            <Unlock size={12} />
            <span>Mở khóa (ESC)</span>
          </button>
        </div>
      )}

      {/* 4. Interactive Proximity Prompt (When standing near Zone, Workstation or Employee) */}
      {nearbyEntity && (
        <div
          style={{
            position: 'absolute',
            bottom: 84,
            left: '50%',
            transform: 'translateX(-50%)',
            pointerEvents: 'auto',
            animation: 'fadeInUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {/* Main Inspection Button (E) */}
          <button
            id="btn-proximity-action"
            type="button"
            onClick={() => onInteract?.(nearbyEntity)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 18px',
              borderRadius: 16,
              border: '1.5px solid #38BDF8',
              backgroundColor: 'rgba(15, 23, 42, 0.94)',
              backdropFilter: 'blur(14px)',
              boxShadow: '0 8px 32px rgba(56, 189, 248, 0.25)',
              color: '#FFFFFF',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.03)';
              e.currentTarget.style.backgroundColor = '#0F172A';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1.0)';
              e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.94)';
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 28,
                height: 28,
                borderRadius: 8,
                backgroundColor: '#38BDF8',
                color: '#0F172A',
                fontWeight: 800,
                fontSize: 14,
                boxShadow: '0 0 12px rgba(56, 189, 248, 0.6)',
              }}
            >
              E
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>
                {nearbyEntity.type === 'staff' ? 'Nhân sự phụ trách' : (nearbyEntity.type === 'workstation' ? 'Trạm làm việc' : 'Thông số phân khu')}
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: '#F8FAFC' }}>
                {nearbyEntity.name}
              </div>
            </div>
            <Sparkles size={16} color="#38BDF8" />
          </button>

          {/* Dedicated Point Lock Button (F) */}
          <button
            id="btn-proximity-lock"
            type="button"
            onClick={() => onToggleTargetLock?.(nearbyEntity)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 14px',
              borderRadius: 16,
              border: targetLock?.id === nearbyEntity.id ? '1.5px solid #10B981' : '1.5px solid #0284C7',
              backgroundColor: targetLock?.id === nearbyEntity.id ? 'rgba(16, 185, 129, 0.2)' : 'rgba(15, 23, 42, 0.94)',
              backdropFilter: 'blur(14px)',
              boxShadow: '0 8px 24px rgba(2, 132, 199, 0.25)',
              color: '#FFFFFF',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Khóa góc nhìn camera vào đối tượng này (Phím F)"
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 24,
                height: 24,
                borderRadius: 6,
                backgroundColor: targetLock?.id === nearbyEntity.id ? '#10B981' : '#0284C7',
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: 12,
              }}
            >
              F
            </div>
            <span style={{ fontSize: 12, fontWeight: 700 }}>
              {targetLock?.id === nearbyEntity.id ? 'Đang khóa' : 'Khóa nhìn'}
            </span>
          </button>
        </div>
      )}

      {/* 5. Bottom Center: Controls Helper Pill */}
      {showControlsGuide && (
        <div
          style={{
            position: 'absolute',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            backgroundColor: 'rgba(15, 23, 42, 0.86)',
            backdropFilter: 'blur(12px)',
            padding: '7px 16px',
            borderRadius: 30,
            border: '1px solid rgba(255, 255, 255, 0.12)',
            boxShadow: '0 6px 20px rgba(0,0,0,0.25)',
            color: '#CBD5E1',
            fontSize: 11.5,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ backgroundColor: 'rgba(255,255,255,0.15)', padding: '2px 5px', borderRadius: 4, fontWeight: 700, color: '#FFF' }}>WASD</span>
            <span>Di chuyển</span>
          </div>
          <span style={{ opacity: 0.3 }}>•</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ backgroundColor: isFlyMode ? '#10B981' : 'rgba(255,255,255,0.15)', padding: '2px 6px', borderRadius: 4, fontWeight: 700, color: '#FFF' }}>
              C
            </span>
            <span>{isFlyMode ? 'Bay: Bật (Space/Q)' : 'Bay tự do'}</span>
          </div>
          <span style={{ opacity: 0.3 }}>•</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ backgroundColor: 'rgba(255,255,255,0.15)', padding: '2px 5px', borderRadius: 4, fontWeight: 700, color: '#FFF' }}>Chuột</span>
            <span>Xoay nhìn 360°</span>
          </div>
          <span style={{ opacity: 0.3 }}>•</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ backgroundColor: '#0284C7', color: '#FFF', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>F</span>
            <span>Khóa nhìn (Point Lock)</span>
          </div>
          <span style={{ opacity: 0.3 }}>•</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ backgroundColor: 'rgba(255,255,255,0.15)', padding: '2px 5px', borderRadius: 4, fontWeight: 700, color: '#FFF' }}>E</span>
            <span>Tương tác</span>
          </div>
          <span style={{ opacity: 0.3 }}>•</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ backgroundColor: 'rgba(255,255,255,0.15)', padding: '2px 5px', borderRadius: 4, fontWeight: 700, color: '#FFF' }}>ESC</span>
            <span>Mở khóa / Thoát</span>
          </div>

          <button
            type="button"
            onClick={() => setShowControlsGuide(false)}
            style={{
              marginLeft: 4,
              background: 'none',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: 0,
            }}
            title="Thu nhỏ hướng dẫn"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* 6. Bottom Right: Live Store Minimap */}
      <div
        style={{
          position: 'absolute',
          bottom: 18,
          right: isDrawerOpen ? 376 : 18,
          pointerEvents: 'auto',
          backgroundColor: 'rgba(15, 23, 42, 0.88)',
          backdropFilter: 'blur(12px)',
          borderRadius: 14,
          padding: '8px 10px',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          transition: 'right 0.25s ease',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 6,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Compass size={13} color="#38BDF8" />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#F1F5F9' }}>
              BẢN ĐỒ MẶT BẰNG
            </span>
          </div>
          <span style={{ fontSize: 9.5, color: '#94A3B8' }}>Nhấp để dịch chuyển</span>
        </div>

        <svg
          width={mapW}
          height={mapH}
          style={{
            backgroundColor: 'rgba(30, 41, 59, 0.7)',
            borderRadius: 8,
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.06)',
            display: 'block',
          }}
        >
          {/* Store background grid lines */}
          <line x1={0} y1={mapH / 2} x2={mapW} y2={mapH / 2} stroke="rgba(255,255,255,0.05)" />
          <line x1={mapW / 2} y1={0} x2={mapW / 2} y2={mapH} stroke="rgba(255,255,255,0.05)" />

          {/* Zones on minimap */}
          {zones.map((z) => {
            const [tx, , tz] = toThreeCoords(z.x, z.y, z.z, layout);
            const [zx, zy] = toMapCoord(tx, tz);
            const zw = Math.max(22, Math.round((mapW / storeLen) * 3.8));
            const zh = Math.max(16, Math.round((mapH / storeWid) * 3.2));

            return (
              <g
                key={z.id}
                onClick={() => onTeleportToZone?.(z)}
                style={{ cursor: 'pointer' }}
              >
                <rect
                  x={zx - zw / 2}
                  y={zy - zh / 2}
                  width={zw}
                  height={zh}
                  rx={3}
                  fill="rgba(56, 189, 248, 0.22)"
                  stroke="#38BDF8"
                  strokeWidth={1}
                />
                <text
                  x={zx}
                  y={zy + 3}
                  textAnchor="middle"
                  fill="#E2E8F0"
                  fontSize={8}
                  fontWeight={600}
                  style={{ pointerEvents: 'none' }}
                >
                  {z.name?.substring(0, 7) || 'Zone'}
                </text>
              </g>
            );
          })}

          {/* Vision Cone (FOV) */}
          <polygon
            points={`${px},${py} ${leftX},${leftY} ${rightX},${rightY}`}
            fill="rgba(56, 189, 248, 0.25)"
          />

          {/* Player Position Dot */}
          <circle cx={px} cy={py} r={4.5} fill="#38BDF8" stroke="#FFFFFF" strokeWidth={1.5} />
        </svg>
      </div>
    </div>
  );
}
