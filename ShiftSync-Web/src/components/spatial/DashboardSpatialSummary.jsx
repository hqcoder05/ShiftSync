import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Box, Users, MapPin, Layers, TrendingUp } from 'lucide-react';
import { getZoneThemeColor } from './spatial.constants';

/**
 * DashboardSpatialSummary
 * High-performance, executive 2.5D spatial store summary card for the Dashboard.
 * Eliminates unnecessary 3D canvas overhead on the main operational landing page
 * while presenting actionable spatial metrics, zone occupancy, and direct 3D access.
 */
export default function DashboardSpatialSummary({
  store,
  layout = { length: 24, width: 16, height: 5 },
  zones = [],
  activeShifts = [],
}) {
  const navigate = useNavigate();

  // Extract staff stationed in active shifts with intelligent role-based zone allocation fallback
  const activeStaff = useMemo(() => {
    if (!zones || zones.length === 0) return [];

    const list = [];
    // Track occupied count per zone for capacity-aware fallback
    const zoneOccupancy = {};
    zones.forEach((z) => {
      zoneOccupancy[z.id] = 0;
    });

    // Helper to find best zone with capacity awareness
    const findBestZoneForRole = (roleOrSkill = '') => {
      const lower = (roleOrSkill || '').toLowerCase();
      // Try to find zone whose name or type matches the role
      let targetZone = zones.find((z) => {
        const zn = (z.name || '').toLowerCase();
        const zt = (z.zoneType || '').toLowerCase();
        return (zn && lower.includes(zn)) || (zt && lower.includes(zt));
      });

      // If matched zone still has capacity, use it
      if (targetZone && (zoneOccupancy[targetZone.id] || 0) < (targetZone.capacity || 4)) {
        return targetZone.id;
      }

      // If matched zone is full, or no role matched, find any zone with available capacity
      const availableZone = zones.find((z) => (zoneOccupancy[z.id] || 0) < (z.capacity || 4));
      if (availableZone) return availableZone.id;

      // Fallback: balance across least occupied zones (round-robin)
      let minZone = zones[0];
      let minCount = Infinity;
      zones.forEach((z) => {
        const cnt = zoneOccupancy[z.id] || 0;
        if (cnt < minCount) {
          minCount = cnt;
          minZone = z;
        }
      });
      return minZone?.id;
    };

    activeShifts.forEach((shift) => {
      if (shift.shiftAssignments && Array.isArray(shift.shiftAssignments)) {
        shift.shiftAssignments.forEach((assign, aIdx) => {
          let role = assign.skillName || assign.requiredSkillName || assign.role || '';
          if (!role && shift.skillRequirements && Array.isArray(shift.skillRequirements) && shift.skillRequirements.length > 0) {
            const req = shift.skillRequirements[aIdx % shift.skillRequirements.length];
            role = req?.skillName || '';
          }
          if (!role) role = shift.skillName || '';

          const assignedZoneId = assign.zoneId && zones.some((z) => z.id === assign.zoneId)
            ? assign.zoneId
            : findBestZoneForRole(role);

          if (assignedZoneId) {
            zoneOccupancy[assignedZoneId] = (zoneOccupancy[assignedZoneId] || 0) + 1;
          }

          list.push({
            id: assign.id || assign.staffId,
            staffName: assign.staffName || 'Nhân sự',
            skillName: role || 'Nhân sự',
            zoneId: assignedZoneId,
          });
        });
      } else if (shift.staffName) {
        const role = shift.skillName || '';
        const assignedZoneId = shift.zoneId && zones.some((z) => z.id === shift.zoneId)
          ? shift.zoneId
          : findBestZoneForRole(role);

        if (assignedZoneId) {
          zoneOccupancy[assignedZoneId] = (zoneOccupancy[assignedZoneId] || 0) + 1;
        }

        list.push({
          id: shift.staffId || shift.id,
          staffName: shift.staffName,
          skillName: role || 'Nhân sự',
          zoneId: assignedZoneId,
        });
      }
    });
    return list;
  }, [activeShifts, zones]);

  // Aggregate stats
  const totalCapacity = useMemo(() => {
    return zones.reduce((sum, z) => sum + (z.capacity || 4), 0);
  }, [zones]);

  const staffedZonesCount = useMemo(() => {
    const activeZoneIds = new Set(activeStaff.map((s) => s.zoneId).filter(Boolean));
    return activeZoneIds.size;
  }, [activeStaff]);

  const utilizationPercent = totalCapacity > 0
    ? Math.min(100, Math.round((activeStaff.length / totalCapacity) * 100))
    : 0;

  const floorArea = Math.round((layout.length || 24) * (layout.width || 16));

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        border: '1px solid #E2E8F0',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          padding: '14px 18px',
          borderBottom: '1px solid #F1F5F9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              backgroundColor: '#EEFAEB',
              color: '#10B981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Box size={18} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>Tổng quan Không gian Chi nhánh</span>
              <span
                style={{
                  fontSize: 10.5,
                  padding: '1px 6px',
                  borderRadius: 10,
                  backgroundColor: '#F1F5F9',
                  color: '#64748B',
                  fontWeight: 600,
                }}
              >
                2.5D Spatial
              </span>
            </h4>
            <span style={{ fontSize: 11.5, color: '#64748B' }}>
              {store?.name || 'Highlands'} • {layout.length || 24}m × {layout.width || 16}m • Cao {layout.height || 5}m ({floorArea}m²)
            </span>
          </div>
        </div>

        {/* CTA: Open full 3D viewport on demand */}
        <button
          type="button"
          onClick={() => navigate('/schedule?view=3d')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 14px',
            borderRadius: 8,
            border: '1px solid #CBD5E1',
            backgroundColor: '#F8FAFC',
            color: '#0F172A',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#EEFAEB';
            e.currentTarget.style.borderColor = '#A7F3D0';
            e.currentTarget.style.color = '#047857';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#F8FAFC';
            e.currentTarget.style.borderColor = '#CBD5E1';
            e.currentTarget.style.color = '#0F172A';
          }}
        >
          <span>Mở Không gian 3D Chi nhánh</span>
          <ArrowUpRight size={14} />
        </button>
      </div>

      {/* Content: KPI Tiles & Zone Occupancy Grid */}
      <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* 4 Metric Tiles */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <div
            style={{
              backgroundColor: '#F8FAFC',
              padding: '12px 14px',
              borderRadius: 10,
              border: '1px solid #E2E8F0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748B', fontSize: 11, fontWeight: 600 }}>
              <Layers size={13} />
              <span>PHÂN KHU HOẠT ĐỘNG</span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', marginTop: 4 }}>
              {staffedZonesCount} <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500 }}>/ {zones.length} khu</span>
            </div>
            <div style={{ fontSize: 11, color: '#64748B', marginTop: 3, fontWeight: 500 }}>
              {staffedZonesCount < zones.length ? `${zones.length - staffedZonesCount} khu trống (theo ca hiện tại)` : 'Bao phủ toàn bộ mặt bằng'}
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#F8FAFC',
              padding: '12px 14px',
              borderRadius: 10,
              border: '1px solid #E2E8F0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748B', fontSize: 11, fontWeight: 600 }}>
              <Users size={13} color="#10B981" />
              <span>NHÂN SỰ ĐANG TRỰC</span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#10B981', marginTop: 4 }}>
              {activeStaff.length} <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500 }}>nhân viên</span>
            </div>
            <div style={{ fontSize: 11, color: '#64748B', marginTop: 3, fontWeight: 500 }}>
              Trên ca trực hiện tại
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#F8FAFC',
              padding: '12px 14px',
              borderRadius: 10,
              border: '1px solid #E2E8F0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748B', fontSize: 11, fontWeight: 600 }}>
              <MapPin size={13} color="#0284C7" />
              <span>SỨC CHỨA TỐI ĐA</span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', marginTop: 4 }}>
              {totalCapacity} <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500 }}>vị trí</span>
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#F8FAFC',
              padding: '12px 14px',
              borderRadius: 10,
              border: '1px solid #E2E8F0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748B', fontSize: 11, fontWeight: 600 }}>
              <TrendingUp size={13} color="#6366F1" />
              <span>TỶ LỆ LẤP ĐẦY</span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#0284C7', marginTop: 4 }}>
              {utilizationPercent}%
            </div>
          </div>
        </div>

        {/* Capacity Progress Bar */}
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 11,
              color: '#475569',
              marginBottom: 5,
              fontWeight: 600,
            }}
          >
            <span>Phân bổ mật độ nhân sự theo sức chứa mặt bằng:</span>
            <span>{activeStaff.length} / {totalCapacity} ({utilizationPercent}%)</span>
          </div>
          <div
            style={{
              width: '100%',
              height: 6,
              borderRadius: 3,
              backgroundColor: '#E2E8F0',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${utilizationPercent}%`,
                height: '100%',
                backgroundColor: utilizationPercent > 90 ? '#EF4444' : '#10B981',
                borderRadius: 3,
                transition: 'width 0.2s ease',
              }}
            />
          </div>
        </div>

        {/* Zone Chips Grid */}
        {zones.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 8 }}>
              Tình trạng phân bổ theo từng khu vực:
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {zones.map((zone) => {
                const zStaffCount = activeStaff.filter((s) => s.zoneId === zone.id).length;
                const cap = zone.capacity || 4;
                const isOver = zStaffCount > cap;
                const isFull = zStaffCount === cap;
                const color = getZoneThemeColor(zone.name);
                const isElevated = (zone.z || 0) > 0.5;

                return (
                  <div
                    key={zone.id || zone.name}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '5px 10px',
                      borderRadius: 8,
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      fontSize: 11,
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 2,
                        backgroundColor: color,
                      }}
                    />
                    <span style={{ fontWeight: 600, color: '#1E293B' }}>{zone.name}</span>
                    {isElevated && (
                      <span
                        style={{
                          fontSize: 9,
                          padding: '0 4px',
                          borderRadius: 3,
                          backgroundColor: '#EEF2FF',
                          color: '#4338CA',
                          fontWeight: 700,
                        }}
                      >
                        Z+{zone.z}m
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: 10,
                        padding: '1px 5px',
                        borderRadius: 4,
                        backgroundColor: isOver ? '#FEF2F2' : isFull ? '#ECFDF5' : '#FFFFFF',
                        color: isOver ? '#DC2626' : isFull ? '#059669' : '#64748B',
                        border: '1px solid #E2E8F0',
                        fontWeight: 700,
                      }}
                    >
                      {zStaffCount}/{cap}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
