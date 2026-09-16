/**
 * SplitScheduleMatrix.jsx
 * Operational 2D Roster & Staffing Demand Matrix docked alongside the 3D Digital Twin
 * in Split Command Center mode.
 * 
 * Provides:
 * - Live Roster table of all staff assigned in current shift
 * - 1-Click "Xem 3D" to fly camera directly to employee avatar
 * - 1-Click "Theo dõi" to lock camera onto employee movement
 * - Shift Demand fulfillment breakdown by skill/zone
 * - Unfilled open position cards with quick allocation actions
 * - Quick shift switcher tabs
 * - Seamless return to full 3D Twin mode
 */

import React, { useState } from 'react';
import {
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  Video,
  Sparkles,
  Zap,
  Layers,
  ArrowRight,
  Columns2,
  X,
  Plus,
  Briefcase,
} from 'lucide-react';
import { getRoleTheme } from '../../visualization/ZoneStatus';
import { getZoneIcon, getZoneShiftRequirements } from '../../../../components/spatial/spatial.constants';

export default function SplitScheduleMatrix({
  currentShift,
  allDateShifts = [],
  onSelectShift,
  activeDate,
  staff = [],
  zones = [],
  skills = [],
  employees = [],
  onSelectStaff,
  onFocusStaff,
  onFollowStaff,
  onSelectZone,
  onFocusZone,
  onRunAlgorithm,
  isAllocating = false,
  onOpenAutoSchedule,
  onCloseSplit,
}) {
  const [searchKeyword, setSearchKeyword] = useState('');

  // Zone shift requirements
  const zoneRequirements = getZoneShiftRequirements(zones, currentShift, skills);
  const totalShiftTarget = Object.values(zoneRequirements).reduce((sum, val) => sum + val, 0);
  const effectiveTarget = totalShiftTarget > 0 ? totalShiftTarget : (zones.reduce((s, z) => s + (z.capacity || 4), 0));
  const coveragePercent = effectiveTarget > 0
    ? Math.min(100, Math.round((staff.length / effectiveTarget) * 100))
    : 100;

  // Filter staff by keyword
  const filteredStaff = staff.filter((s) => {
    const name = (s.staffName || s.fullName || '').toLowerCase();
    const role = (s.skillName || s.role || '').toLowerCase();
    const zone = (s.zoneName || '').toLowerCase();
    const kw = searchKeyword.toLowerCase().trim();
    return !kw || name.includes(kw) || role.includes(kw) || zone.includes(kw);
  });

  // Calculate open demand requirements
  const demandByZone = zones.map((z) => {
    const zStaff = staff.filter((s) => (s.zoneId || s.zone?.id) === z.id);
    const target = zoneRequirements[z.id] !== undefined ? zoneRequirements[z.id] : Math.ceil((z.capacity || 4) * 0.5);
    const missing = Math.max(0, target - zStaff.length);
    return {
      zone: z,
      currentCount: zStaff.length,
      target,
      missing,
      capacity: z.capacity || 4,
    };
  });

  const totalMissing = demandByZone.reduce((sum, d) => sum + d.missing, 0);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#FFFFFF',
        color: '#0F172A',
        fontFamily: 'Inter, system-ui, sans-serif',
        userSelect: 'none',
        overflow: 'hidden',
      }}
    >
      {/* 1. Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #E2E8F0',
          backgroundColor: '#F8FAFC',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: '#0F172A',
              color: '#38BDF8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Columns2 size={16} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#0F172A' }}>
              Bảng Phân Ca & Định Biên 2D
            </h3>
            <span style={{ fontSize: 11, color: '#64748B' }}>
              Đồng bộ thời gian thực song song với Không gian 3D
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onCloseSplit}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '5px 10px',
            borderRadius: 7,
            border: '1px solid #CBD5E1',
            backgroundColor: '#FFFFFF',
            color: '#334155',
            fontSize: 11.5,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.15s ease',
          }}
          title="Thu gọn bảng để xem toàn màn hình 3D Digital Twin"
        >
          <X size={14} />
          <span>Về 3D Twin</span>
        </button>
      </div>

      {/* 2. Shift Quick Switcher Pills */}
      {allDateShifts && allDateShifts.length > 0 && (
        <div
          style={{
            padding: '8px 16px',
            backgroundColor: '#F1F5F9',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            overflowX: 'auto',
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', whiteSpace: 'nowrap' }}>
            Ca trong ngày:
          </span>
          {allDateShifts.map((s) => {
            const isSelected = currentShift?.id === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onSelectShift?.(s)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: isSelected ? '1.5px solid #2563EB' : '1px solid #CBD5E1',
                  backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
                  color: isSelected ? '#1D4ED8' : '#475569',
                  fontSize: 11,
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  transition: 'all 0.15s ease',
                }}
              >
                <Clock size={11} color={isSelected ? '#2563EB' : '#94A3B8'} />
                <span>{s.name || s.templateName || 'Ca làm'} ({s.startTime?.slice(0, 5)} - {s.endTime?.slice(0, 5)})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* 3. Shift Health & Fulfillment Ribbon */}
      <div
        style={{
          padding: '10px 16px',
          borderBottom: '1px solid #E2E8F0',
          backgroundColor: '#FFFFFF',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#334155' }}>
            <span>Tiến độ ca trực hiện tại:</span>
            <span style={{ color: coveragePercent >= 90 ? '#16A34A' : coveragePercent >= 50 ? '#D97706' : '#DC2626' }}>
              {staff.length} / {effectiveTarget} nhân sự ({coveragePercent}%)
            </span>
          </div>

          <span
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 6,
              backgroundColor: totalMissing > 0 ? '#FEE2E2' : '#DCFCE7',
              color: totalMissing > 0 ? '#DC2626' : '#166534',
            }}
          >
            {totalMissing > 0 ? `Thiếu ${totalMissing} vị trí` : 'Đầy đủ chỉ tiêu'}
          </span>
        </div>

        <div style={{ width: '100%', height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
          <div
            style={{
              width: `${coveragePercent}%`,
              height: '100%',
              backgroundColor: coveragePercent >= 90 ? '#10B981' : coveragePercent >= 60 ? '#F59E0B' : '#EF4444',
              borderRadius: 3,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* 4. Body Content Scrollable Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Search Input */}
        <div style={{ position: 'relative' }}>
          <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: 10, top: 9 }} />
          <input
            type="text"
            placeholder="Tìm theo tên nhân viên, vị trí, hoặc phân khu..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            style={{
              width: '100%',
              padding: '7px 10px 7px 32px',
              borderRadius: 8,
              border: '1px solid #CBD5E1',
              fontSize: 12,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Section A: Assigned Roster */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Nhân sự đang trực ({filteredStaff.length})
            </span>
            <span style={{ fontSize: 11, color: '#64748B' }}>
              Bấm <strong>Xem 3D</strong> để camera bay tới nhân viên
            </span>
          </div>

          {filteredStaff.length === 0 ? (
            <div
              style={{
                padding: '16px',
                borderRadius: 8,
                backgroundColor: '#F8FAFC',
                border: '1px dashed #CBD5E1',
                textAlign: 'center',
                fontSize: 12,
                color: '#94A3B8',
              }}
            >
              Chưa có nhân sự nào được xếp vào ca này.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {filteredStaff.map((emp) => {
                const roleTheme = getRoleTheme(emp.skillName || emp.role);
                const matchedZone = zones.find((z) => z.id === (emp.zoneId || emp.zone?.id));

                return (
                  <div
                    key={emp.id || emp.staffId}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 10,
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <span
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          backgroundColor: roleTheme.color,
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: 12,
                          flexShrink: 0,
                        }}
                      >
                        {(emp.staffName || emp.fullName || 'NV')
                          .trim()
                          .split(/\s+/)
                          .slice(-2)
                          .map((w) => w[0])
                          .join('')
                          .toUpperCase()}
                      </span>

                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {emp.staffName || emp.fullName || 'Nhân viên'}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#64748B', marginTop: 1 }}>
                          <span style={{ fontWeight: 600, color: roleTheme.color }}>
                            {emp.skillName || emp.role || 'Nhân viên'}
                          </span>
                          <span>•</span>
                          <span style={{ color: '#0284C7', cursor: 'pointer' }} onClick={() => matchedZone && onFocusZone?.(matchedZone)}>
                            {emp.zoneName || matchedZone?.name || 'Chưa gán quầy'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons: Focus 3D & Follow */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => {
                          onSelectStaff?.(emp);
                          onFocusStaff?.(emp);
                        }}
                        style={{
                          padding: '5px 8px',
                          borderRadius: 6,
                          border: '1px solid #E2E8F0',
                          backgroundColor: '#F8FAFC',
                          color: '#0284C7',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 3,
                          transition: 'all 0.15s ease',
                        }}
                        title="Camera bay đến nhân sự này trong mô hình 3D"
                      >
                        <Search size={12} color="#0284C7" />
                        <span>Xem 3D</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onFollowStaff?.(emp);
                        }}
                        style={{
                          padding: '5px 7px',
                          borderRadius: 6,
                          border: '1px solid #A7F3D0',
                          backgroundColor: '#ECFDF5',
                          color: '#047857',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 3,
                        }}
                        title="Khóa camera tự động bám theo nhân viên"
                      >
                        <Video size={11} color="#047857" />
                        <span>Theo dõi</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Section B: Open Demand Slots (Vị trí còn thiếu) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Vị trí trống cần định biên ({totalMissing})
          </span>

          {totalMissing === 0 ? (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                backgroundColor: '#F0FDF4',
                border: '1px solid #BBF7D0',
                fontSize: 12,
                color: '#15803D',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <CheckCircle2 size={16} color="#16A34A" />
              <span>Toàn bộ các phân khu đã đạt định biên yêu cầu theo ca.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {demandByZone
                .filter((d) => d.missing > 0)
                .map((d) => (
                  <div
                    key={`missing-${d.zone.id}`}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 10,
                      backgroundColor: '#FFFBEB',
                      border: '1px solid #FDE68A',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 18 }}>{getZoneIcon(d.zone.name)}</span>
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: '#92400E' }}>
                          {d.zone.name}
                        </div>
                        <div style={{ fontSize: 11, color: '#B45309' }}>
                          Hiện có {d.currentCount}/{d.target} nhân sự (Thiếu {d.missing} người)
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <button
                        type="button"
                        onClick={() => {
                          onSelectZone?.(d.zone);
                          onFocusZone?.(d.zone);
                        }}
                        style={{
                          padding: '5px 8px',
                          borderRadius: 6,
                          border: '1px solid #CBD5E1',
                          backgroundColor: '#FFFFFF',
                          color: '#0284C7',
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 3,
                        }}
                      >
                        <Search size={11} />
                        <span>Xem 3D</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onSelectZone?.(d.zone);
                        }}
                        style={{
                          padding: '5px 8px',
                          borderRadius: 6,
                          border: '1px solid #D97706',
                          backgroundColor: '#FEF3C7',
                          color: '#B45309',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 3,
                        }}
                      >
                        <Sparkles size={11} />
                        <span>Tìm ứng viên</span>
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* 5. Footer Quick Actions */}
      <div
        style={{
          padding: '10px 16px',
          borderTop: '1px solid #E2E8F0',
          backgroundColor: '#F8FAFC',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
        }}
      >
        <button
          type="button"
          onClick={onRunAlgorithm}
          disabled={isAllocating}
          style={{
            padding: '8px 10px',
            borderRadius: 7,
            border: '1px solid #3B82F6',
            backgroundColor: '#EFF6FF',
            color: '#1D4ED8',
            fontSize: 11.5,
            fontWeight: 700,
            cursor: isAllocating ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
          }}
          title="Chạy giải thuật tối ưu phân tán khoảng cách Max-Min Dispersion"
        >
          <Zap size={13} color="#2563EB" />
          <span>{isAllocating ? 'Đang tính...' : 'Phân bổ Max-Min'}</span>
        </button>

        <button
          type="button"
          onClick={onOpenAutoSchedule}
          style={{
            padding: '8px 10px',
            borderRadius: 7,
            border: 'none',
            backgroundColor: '#2563EB',
            color: '#FFFFFF',
            fontSize: 11.5,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
          }}
          title="Mở tự động xếp lịch Auto-Scheduling 8 bước"
        >
          <Sparkles size={13} />
          <span>Xếp ca tự động</span>
        </button>
      </div>
    </div>
  );
}
