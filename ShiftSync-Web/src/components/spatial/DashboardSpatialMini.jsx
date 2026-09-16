import { Suspense, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Float } from '@react-three/drei';
import { useNavigate } from 'react-router-dom';
import SpatialErrorBoundary from './SpatialErrorBoundary';
import SceneLighting from './SceneLighting';
import StoreFloor from './StoreFloor';
import StoreWalls from './StoreWalls';
import StoreZone from './StoreZone';
import EmployeeMarker from './EmployeeMarker';
import { ArrowUpRight, Box, Users } from 'lucide-react';

/**
 * DashboardSpatialMini
 * A compact, interactive miniature 3D spatial model for the executive dashboard.
 */
export default function DashboardSpatialMini({
  store,
  layout = { length: 24, width: 16, height: 4.5 },
  zones = [],
  activeShifts = [],
}) {
  const navigate = useNavigate();
  const controlsRef = useRef(null);

  // Extract staff from active shifts
  const activeStaff = [];
  activeShifts.forEach((shift) => {
    if (shift.shiftAssignments && Array.isArray(shift.shiftAssignments)) {
      shift.shiftAssignments.forEach((assign) => {
        activeStaff.push({
          id: assign.id || assign.staffId,
          staffName: assign.staffName || 'Nhân sự',
          skillName: assign.role || 'Barista',
          zoneId: assign.zoneId || (zones[0]?.id),
        });
      });
    } else if (shift.staffName) {
      activeStaff.push({
        id: shift.staffId || shift.id,
        staffName: shift.staffName,
        skillName: shift.skillName || 'Nhân sự',
        zoneId: shift.zoneId || (zones[0]?.id),
      });
    }
  });

  return (
    <div style={{
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      border: '1px solid #E2E8F0',
      boxShadow: '0 4px 16px -2px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      height: 380,
      position: 'relative',
    }}>
      {/* Header Bar */}
      <div style={{
        padding: '14px 18px',
        borderBottom: '1px solid #F1F5F9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        zIndex: 5,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            backgroundColor: '#EEFAEB',
            color: '#51A33D',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Box size={18} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
              Mô hình Không gian 3D Chi nhánh
            </h4>
            <span style={{ fontSize: 11, color: '#64748B' }}>
              {store?.name || 'Highlands Tây Thạnh'} • {zones.length} khu vực hoạt động
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/schedule?view=3d')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '6px 12px',
            borderRadius: 8,
            border: '1px solid #E2E8F0',
            backgroundColor: '#F8FAFC',
            color: '#51A33D',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#EEFAEB';
            e.currentTarget.style.borderColor = '#bbf7d0';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#F8FAFC';
            e.currentTarget.style.borderColor = '#E2E8F0';
          }}
        >
          <span>Xem 3D toàn cảnh</span>
          <ArrowUpRight size={14} />
        </button>
      </div>

      {/* 3D Canvas Area */}
      <div style={{ flex: 1, position: 'relative', backgroundColor: '#F8FAFC' }}>
        <SpatialErrorBoundary>
          <Canvas
            shadows
            camera={{ position: [20, 24, 22], fov: 36 }}
            style={{ width: '100%', height: '100%', background: '#F8FAFC' }}
          >
            <Suspense fallback={null}>
              <SceneLighting />
              <OrbitControls
                ref={controlsRef}
                autoRotate
                autoRotateSpeed={0.8}
                enableDamping
                maxPolarAngle={Math.PI / 2 - 0.1}
                minDistance={10}
                maxDistance={45}
              />
              <Float speed={1.2} rotationIntensity={0.05} floatIntensity={0.1}>
                <StoreFloor length={layout.length} width={layout.width} />
                <StoreWalls length={layout.length} width={layout.width} height={layout.height} />
                {zones.map((zone) => (
                  <StoreZone
                    key={zone.id || zone.name}
                    zone={zone}
                    layout={layout}
                    assignedCount={activeStaff.filter((s) => s.zoneId === zone.id).length}
                    showWorkstations={true}
                  />
                ))}
                {zones.map((zone) => {
                  const zStaff = activeStaff.filter((s) => s.zoneId === zone.id);
                  return zStaff.map((emp, idx) => (
                    <EmployeeMarker
                      key={emp.id || idx}
                      employee={emp}
                      zone={zone}
                      layout={layout}
                      indexInZone={idx}
                      totalInZone={zStaff.length}
                    />
                  ));
                })}
              </Float>
            </Suspense>
          </Canvas>
        </SpatialErrorBoundary>

        {/* Floating Mini Stats Chip */}
        <div style={{
          position: 'absolute',
          bottom: 12,
          left: 14,
          backgroundColor: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(8px)',
          padding: '6px 12px',
          borderRadius: 10,
          border: '1px solid rgba(226, 232, 240, 0.8)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          fontSize: 11,
          pointerEvents: 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#334155', fontWeight: 600 }}>
            <Users size={12} color="#51A33D" />
            <span>{activeStaff.length} nhân sự trực</span>
          </div>
          <div style={{ color: '#94A3B8' }}>•</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#64748B' }}>
            <span>Tối ưu độ phủ không gian</span>
          </div>
        </div>
      </div>
    </div>
  );
}
