/**
 * StaffingKpiBar.jsx
 * High-density operational KPI ribbon docked right below the Command Header.
 * 
 * Displays:
 * - Coverage SLA % (Optimal >= 90%, Warning 70-89%, Critical < 70%)
 * - Active Staff / Required Total
 * - Understaffed Zones indicator (clickable to trigger Attention Center)
 * - Open Shifts count
 * - Estimated Labor Cost / Delta
 * - Overall Staffing Health Status
 */

import React from 'react';
import {
  TrendingUp,
  AlertTriangle,
  Users,
  CheckCircle2,
  DollarSign,
  Briefcase,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

export default function StaffingKpiBar({
  coveragePercent = 100,
  activeStaffCount = 0,
  requiredStaffCount = 0,
  maxStoreCapacity = 0,
  understaffedZonesCount = 0,
  openShiftsCount = 0,
  estimatedCost = 0,
  costDelta = 0,
  isSimulating = false,
  onOpenAttentionCenter,
  onFocusUnderstaffedZone,
}) {
  const isCoverageOptimal = coveragePercent >= 90;
  const isCoverageWarning = coveragePercent >= 70 && coveragePercent < 90;
  const coverageColor = isCoverageOptimal ? '#10B981' : isCoverageWarning ? '#F59E0B' : '#EF4444';
  const coverageBg = isCoverageOptimal
    ? 'rgba(16, 185, 129, 0.12)'
    : isCoverageWarning
    ? 'rgba(245, 158, 11, 0.12)'
    : 'rgba(239, 68, 68, 0.14)';

  return (
    <div
      style={{
        height: 38,
        backgroundColor: '#1E293B',
        borderBottom: '1px solid #334155',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        fontSize: 12,
        color: '#E2E8F0',
        zIndex: 25,
        userSelect: 'none',
      }}
    >
      {/* Left: Primary Staffing Health Telemetry */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        {/* Coverage SLA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#94A3B8', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Độ bao phủ ca:
          </span>
          <div
            style={{
              padding: '2px 8px',
              borderRadius: 6,
              backgroundColor: coverageBg,
              color: coverageColor,
              fontWeight: 800,
              fontSize: 12.5,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {isCoverageOptimal ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
            <span>{coveragePercent}%</span>
          </div>
        </div>

        <div style={{ width: 1, height: 16, backgroundColor: '#334155' }} />

        {/* Active Staff vs Target */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Users size={14} color="#94A3B8" />
          <span style={{ color: '#94A3B8' }}>Nhân sự trực:</span>
          <strong style={{ color: '#FFFFFF', fontWeight: 700 }}>{activeStaffCount}</strong>
          {requiredStaffCount > 0 && (
            <span style={{ color: '#CBD5E1', fontWeight: 600 }}>/ {requiredStaffCount} chỉ tiêu ca</span>
          )}
        </div>

        <div style={{ width: 1, height: 16, backgroundColor: '#334155' }} />

        {/* Understaffed Zones Warning Pill */}
        <div
          onClick={() => {
            if (understaffedZonesCount > 0) {
              onFocusUnderstaffedZone?.();
            } else {
              onOpenAttentionCenter?.();
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            cursor: 'pointer',
            padding: '2px 8px',
            borderRadius: 6,
            backgroundColor:
              understaffedZonesCount > 0 ? 'rgba(239, 68, 68, 0.16)' : 'rgba(16, 185, 129, 0.1)',
            color: understaffedZonesCount > 0 ? '#F87171' : '#34D399',
            fontWeight: 600,
            transition: 'all 0.15s ease',
          }}
          title={
            understaffedZonesCount > 0
              ? 'Click để phóng to phân khu thiếu nhân sự'
              : 'Tất cả phân khu đều đạt chuẩn chỉ tiêu'
          }
        >
          <Layers size={13} />
          <span>
            {understaffedZonesCount > 0
              ? `${understaffedZonesCount} Phân khu thiếu`
              : 'Phân khu đạt chuẩn'}
          </span>
        </div>

        <div style={{ width: 1, height: 16, backgroundColor: '#334155' }} />

        {/* Open Shifts Count */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Briefcase size={14} color="#94A3B8" />
          <span style={{ color: '#94A3B8' }}>Ca chưa gán:</span>
          <span
            style={{
              fontWeight: 700,
              color: openShiftsCount > 0 ? '#FBBF24' : '#94A3B8',
            }}
          >
            {openShiftsCount} ca
          </span>
        </div>
      </div>

      {/* Right: Labor Cost & Simulation Delta */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {isSimulating && costDelta !== 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 11.5,
              fontWeight: 700,
              color: costDelta > 0 ? '#F87171' : '#34D399',
            }}
          >
            {costDelta > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            <span>Biến động chi phí: {costDelta > 0 ? `+${costDelta.toLocaleString()} ₫` : `${costDelta.toLocaleString()} ₫`}</span>
          </div>
        )}

        {estimatedCost > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5 }}>
            <DollarSign size={13} color="#94A3B8" />
            <span style={{ color: '#94A3B8' }}>Ước tính chi phí ca:</span>
            <span style={{ fontWeight: 700, color: '#F8FAFC' }}>
              {estimatedCost.toLocaleString()} ₫
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
