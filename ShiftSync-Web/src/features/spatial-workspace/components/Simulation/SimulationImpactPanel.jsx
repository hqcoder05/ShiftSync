/**
 * SimulationImpactPanel.jsx
 * Real-time operational KPI comparison widget displayed during simulation.
 * 
 * Demonstrates:
 * - Coverage % (Before vs After)
 * - Understaffed / Overstaffed Zones
 * - Skill & Shift Conflicts
 * - Zone-level staffing delta
 */

import { TrendingUp, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';

export default function SimulationImpactPanel({
  impact = null,
  isDrawerOpen = false,
}) {
  if (!impact) return null;

  const { before, after, delta } = impact;
  const isImproved = delta.coverageDelta >= 0 && delta.understaffedDelta <= 0;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 74,
        left: 14,
        zIndex: 18,
        backgroundColor: 'rgba(255, 255, 255, 0.96)',
        backdropFilter: 'blur(16px)',
        border: '1px solid #E2E8F0',
        borderRadius: 14,
        padding: '12px 14px',
        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
        width: 280,
        pointerEvents: 'auto',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', textTransform: 'uppercase', letterSpacing: 0.3 }}>
          Tác động vận hành (KPI)
        </span>
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 700,
            padding: '2px 6px',
            borderRadius: 6,
            backgroundColor: isImproved ? '#ECFDF5' : '#FEF2F2',
            color: isImproved ? '#059669' : '#DC2626',
          }}
        >
          {isImproved ? '✓ Tối ưu hơn' : '⚠️ Có rủi ro'}
        </span>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
        {/* Coverage SLA */}
        <div style={{ backgroundColor: '#F8FAFC', padding: '8px 10px', borderRadius: 8, border: '1px solid #F1F5F9' }}>
          <span style={{ fontSize: 10, color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
            Độ bao phủ SLA
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }}>
              {after.coveragePercent}%
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: delta.coverageDelta > 0 ? '#10B981' : delta.coverageDelta < 0 ? '#EF4444' : '#64748B',
              }}
            >
              {delta.coverageDelta > 0 ? `+${delta.coverageDelta}%` : `${delta.coverageDelta}%`}
            </span>
          </div>
          <span style={{ fontSize: 9.5, color: '#94A3B8' }}>Gốc: {before.coveragePercent}%</span>
        </div>

        {/* Understaffed Zones */}
        <div style={{ backgroundColor: '#F8FAFC', padding: '8px 10px', borderRadius: 8, border: '1px solid #F1F5F9' }}>
          <span style={{ fontSize: 10, color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
            Khu thiếu người
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: after.understaffedCount === 0 ? '#10B981' : '#F59E0B' }}>
              {after.understaffedCount}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: delta.understaffedDelta < 0 ? '#10B981' : delta.understaffedDelta > 0 ? '#EF4444' : '#64748B',
              }}
            >
              {delta.understaffedDelta < 0 ? `${delta.understaffedDelta}` : delta.understaffedDelta > 0 ? `+${delta.understaffedDelta}` : '0'}
            </span>
          </div>
          <span style={{ fontSize: 9.5, color: '#94A3B8' }}>Gốc: {before.understaffedCount} khu</span>
        </div>
      </div>

      {/* Skill Issues / Conflicts */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 8px',
          borderRadius: 6,
          backgroundColor: after.skillIssueCount > 0 ? '#FFFBEB' : '#F8FAFC',
          border: after.skillIssueCount > 0 ? '1px solid #FDE68A' : '1px solid #F1F5F9',
          fontSize: 11,
          color: after.skillIssueCount > 0 ? '#B45309' : '#64748B',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {after.skillIssueCount > 0 ? (
            <AlertTriangle size={13} color="#D97706" />
          ) : (
            <CheckCircle2 size={13} color="#10B981" />
          )}
          <span>Xung đột kỹ năng</span>
        </div>
        <span style={{ fontWeight: 700, color: after.skillIssueCount > 0 ? '#D97706' : '#10B981' }}>
          {after.skillIssueCount === 0 ? 'Không có' : `${after.skillIssueCount} lỗi`}
        </span>
      </div>

      {/* Zone Occupancy Bars (Top 3) */}
      <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
        {after.zoneDetails.slice(0, 3).map((z) => (
          <div key={z.zoneId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10.5 }}>
            <span style={{ color: '#475569', fontWeight: 500 }}>{z.zoneName}</span>
            <span style={{ fontWeight: 700, color: z.count < z.minTarget ? '#F59E0B' : '#10B981' }}>
              {z.count} / {z.capacity}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
