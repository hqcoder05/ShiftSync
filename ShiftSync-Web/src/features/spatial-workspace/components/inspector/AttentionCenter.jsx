/**
 * AttentionCenter.jsx
 * Operational Attention Center view for the ShiftSync Contextual Inspector (State 1: Default / Store Overview).
 * 
 * Aggregates prioritized staffing alerts:
 * - Understaffed zones
 * - Skill mismatches
 * - Unassigned workstations
 * 
 * Provides:
 * - 1-Click Camera Glide to 3D zone
 * - 1-Click Smart Replacement recommendation launcher
 * - Store-wide capacity health gauge
 * - Zone directory with live occupancy badges
 * - Max-Min Dispersion spatial allocation trigger
 */

import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Search,
  Sparkles,
  Users,
  Layers,
  ArrowRight,
  Zap,
  Clock,
  ShieldAlert,
  ChevronRight,
} from 'lucide-react';
import { getZoneIcon, getZoneShiftRequirements } from '../../../../components/spatial/spatial.constants';
import { getZoneStatus, getZoneStatusColor } from '../../visualization/ZoneStatus';

export default function AttentionCenter({
  zones = [],
  staff = [],
  currentShift = null,
  skills = [],
  onSelectZone,
  onFocusZone,
  onRunAlgorithm,
  isAllocating = false,
  onOpenAutoSchedule,
}) {
  // Map staff by zone
  const staffByZone = {};
  staff.forEach((s) => {
    const zid = s.zoneId || s.zone?.id;
    if (zid) {
      if (!staffByZone[zid]) staffByZone[zid] = [];
      staffByZone[zid].push(s);
    }
  });

  // Calculate shift requirements per zone
  const zoneRequirements = getZoneShiftRequirements(zones, currentShift, skills);
  const totalShiftTarget = Object.values(zoneRequirements).reduce((sum, val) => sum + val, 0);

  // Calculate total physical capacity and understaffed issues
  let totalCapacity = 0;
  const issues = [];

  zones.forEach((zone) => {
    const cap = zone.capacity || 4;
    totalCapacity += cap;
    const zStaff = staffByZone[zone.id] || [];
    const count = zStaff.length;
    const target = zoneRequirements[zone.id] !== undefined ? zoneRequirements[zone.id] : Math.ceil(cap * 0.5);

    // If target is 0, this zone is not requested in this shift
    if (target > 0) {
      if (count === 0) {
        issues.push({
          id: `empty-${zone.id}`,
          severity: 'CRITICAL',
          zone,
          title: `Trống nhân sự: ${zone.name}`,
          description: `Chưa có nhân sự trực (Chỉ tiêu ca: ${target} nhân sự • Sức chứa quầy: ${cap} chỗ).`,
          impact: 'Nguy cơ gián đoạn phục vụ vị trí này trong ca trực.',
        });
      } else if (count < target) {
        issues.push({
          id: `understaffed-${zone.id}`,
          severity: 'WARNING',
          zone,
          title: `Thiếu định biên: ${zone.name}`,
          description: `Đang trực ${count}/${target} nhân sự theo ca (Thiếu ${target - count} người • Sức chứa: ${cap}).`,
          impact: 'Dung lượng phục vụ giảm, thời gian xử lý đơn kéo dài.',
        });
      } else if (count > target || count > cap) {
        const surplus = count - target;
        issues.push({
          id: `overstaffed-${zone.id}`,
          severity: 'OVERSTAFFED',
          zone,
          title: `Dư thừa nhân sự: ${zone.name}`,
          description: `Đang trực ${count}/${target} nhân sự (Dư ${surplus} người so với định biên ca • Sức chứa: ${cap}).`,
          impact: 'Lãng phí chi phí nhân công. Có thể điều chuyển sang quầy thiếu.',
        });
      }
    } else if (count > 0) {
      issues.push({
        id: `overstaffed-${zone.id}`,
        severity: 'OVERSTAFFED',
        zone,
        title: `Ngoài kế hoạch ca: ${zone.name}`,
        description: `Đang có ${count} nhân sự trực tại quầy không yêu cầu trong ca này.`,
        impact: 'Nên điều chuyển nhân sự sang các quầy trọng yếu đang thiếu.',
      });
    }
  });

  const effectiveTarget = totalShiftTarget > 0 ? totalShiftTarget : totalCapacity;
  const shiftCoveragePercent = effectiveTarget > 0
    ? Math.min(100, Math.round((staff.length / effectiveTarget) * 100))
    : 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', gap: 14 }}>
      {/* Header Banner */}
      <div
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid #E2E8F0',
          backgroundColor: '#F8FAFC',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <h4 style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={16} color={issues.length > 0 ? '#EF4444' : '#10B981'} />
            <span>Attention Center</span>
          </h4>
          <span style={{ fontSize: 11.5, color: '#64748B' }}>
            {issues.length > 0
              ? `${issues.length} sự cố cần can thiệp vận hành`
              : 'Tất cả phân khu vận hành tối ưu'}
          </span>
        </div>

        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: 6,
            backgroundColor: issues.length > 0 ? '#FEE2E2' : '#DCFCE7',
            color: issues.length > 0 ? '#DC2626' : '#166534',
          }}
        >
          {issues.length > 0 ? `${issues.length} CẢNH BÁO` : 'CHUẨN 100%'}
        </span>
      </div>

      {/* Body Content */}
      <div style={{ padding: '0 16px 16px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Priority Issue Queue */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Hàng đợi sự cố ưu tiên ({issues.length})
          </span>

          {issues.length === 0 ? (
            <div
              style={{
                padding: '14px',
                borderRadius: 10,
                backgroundColor: '#F0FDF4',
                border: '1px solid #BBF7D0',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: 12,
                color: '#15803D',
              }}
            >
              <CheckCircle2 size={18} color="#16A34A" />
              <span>Các phân khu đều đạt chuẩn chỉ tiêu nhân sự trong ca làm này.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {issues.map((issue) => (
                <div
                  key={issue.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 10,
                    border: issue.severity === 'CRITICAL'
                      ? '1px solid #FCA5A5'
                      : issue.severity === 'OVERSTAFFED'
                        ? '1px solid #C4B5FD'
                        : '1px solid #FDE68A',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 18 }}>{getZoneIcon(issue.zone.name)}</span>
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0F172A' }}>
                          {issue.title}
                        </div>
                        <span style={{ fontSize: 11, color: '#64748B' }}>
                          {issue.description}
                        </span>
                      </div>
                    </div>

                    <span
                      style={{
                        fontSize: 9.5,
                        fontWeight: 800,
                        padding: '2px 6px',
                        borderRadius: 4,
                        backgroundColor: issue.severity === 'CRITICAL'
                          ? '#EF4444'
                          : issue.severity === 'OVERSTAFFED'
                            ? '#8B5CF6'
                            : '#F59E0B',
                        color: '#FFFFFF',
                      }}
                    >
                      {issue.severity === 'OVERSTAFFED' ? 'DƯ NHÂN SỰ' : issue.severity}
                    </span>
                  </div>

                  <div style={{
                    fontSize: 11,
                    color: issue.severity === 'OVERSTAFFED' ? '#5B21B6' : '#991B1B',
                    backgroundColor: issue.severity === 'OVERSTAFFED' ? '#F5F3FF' : '#FEF2F2',
                    padding: '6px 8px',
                    borderRadius: 6,
                  }}>
                    {issue.severity === 'OVERSTAFFED' ? '⇄ ' : '⚠️ '}{issue.impact}
                  </div>

                  {/* Quick Action Buttons */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 2 }}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectZone?.(issue.zone);
                        onFocusZone?.(issue.zone);
                      }}
                      style={{
                        padding: '6px 8px',
                        borderRadius: 6,
                        border: '1px solid #E2E8F0',
                        backgroundColor: '#F8FAFC',
                        color: '#0F172A',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <Search size={12} color="#0284C7" />
                      <span>Zoom 3D</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onSelectZone?.(issue.zone);
                      }}
                      style={{
                        padding: '6px 8px',
                        borderRadius: 6,
                        border: '1px solid #0284C7',
                        backgroundColor: '#F0F9FF',
                        color: '#0369A1',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <Sparkles size={12} color="#0284C7" />
                      <span>Tìm ứng viên</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Compact Capacity Bar */}
        <div
          style={{
            backgroundColor: '#F8FAFC',
            borderRadius: 8,
            padding: '8px 12px',
            border: '1px solid #E2E8F0',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11 }}>
            <span style={{ fontWeight: 600, color: '#475569' }}>
              Độ phủ định biên ca:
            </span>
            <strong style={{ color: shiftCoveragePercent >= 90 ? '#10B981' : '#F59E0B' }}>
              {staff.length} / {effectiveTarget} ({shiftCoveragePercent}%)
            </strong>
          </div>
          <div style={{ width: '100%', height: 5, backgroundColor: '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
            <div
              style={{
                width: `${shiftCoveragePercent}%`,
                height: '100%',
                backgroundColor: shiftCoveragePercent >= 90 ? '#10B981' : shiftCoveragePercent >= 60 ? '#F59E0B' : '#EF4444',
                borderRadius: 3,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>

        {/* Spatial Algorithm 1-Click Action */}
        <button
          type="button"
          onClick={onRunAlgorithm}
          disabled={isAllocating}
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            border: '1px solid #3B82F6',
            backgroundColor: isAllocating ? '#94A3B8' : '#EFF6FF',
            color: '#1D4ED8',
            fontSize: 12,
            fontWeight: 700,
            cursor: isAllocating ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            boxShadow: '0 2px 6px rgba(59, 130, 246, 0.15)',
          }}
        >
          <Zap size={14} color="#2563EB" />
          <span>{isAllocating ? 'Đang tính toán phân bổ...' : 'Chạy phân bổ tối ưu (Max-Min Dispersion)'}</span>
        </button>

        {/* Zone Directory */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Danh sách phân khu ({zones.length})
          </span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {zones.map((z) => {
              const zStaff = staffByZone[z.id] || [];
              const cap = z.capacity || 4;
              const target = zoneRequirements[z.id] !== undefined ? zoneRequirements[z.id] : cap;
              const status = getZoneStatus(zStaff.length, cap, target);
              const statusColor = getZoneStatusColor(status);

              return (
                <div
                  key={z.id}
                  onClick={() => {
                    onSelectZone?.(z);
                    onFocusZone?.(z);
                  }}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 8,
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'border 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>{getZoneIcon(z.name)}</span>
                    <div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', display: 'block' }}>
                        {z.name}
                      </span>
                      <span style={{ fontSize: 10, color: '#94A3B8' }}>
                        Sức chứa tối đa: {cap} chỗ
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 4,
                        backgroundColor: statusColor.bg,
                        color: statusColor.text,
                      }}
                      title={target > 0 ? `Hiện trực: ${zStaff.length}/${target} (Chỉ tiêu ca)` : `Hiện trực: ${zStaff.length}/${cap}`}
                    >
                      {target > 0 ? `${zStaff.length}/${target}` : `${zStaff.length}/${cap}`}
                    </span>
                    <ChevronRight size={13} color="#94A3B8" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
