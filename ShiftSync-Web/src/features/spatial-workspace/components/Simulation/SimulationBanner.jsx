/**
 * SimulationBanner.jsx
 * Prominent, enterprise-grade top status banner displayed exclusively in Simulation Room (Mode D).
 * 
 * Features:
 * - Clear warning badge distinguishing simulation sandbox from production
 * - Diff counter badge (e.g. "3 thay đổi chưa áp dụng")
 * - [ Before ] / [ After ] toggle
 * - Fast actions: View Diff, Run AI Simulation, Reset, Apply, Discard
 */

import { FlaskConical, Check, Undo2, ListTree, Sparkles, X, Eye } from 'lucide-react';

export default function SimulationBanner({
  diffCount = 0,
  viewMode = 'after', // 'before' | 'after'
  onToggleViewMode,
  onOpenDiffModal,
  onOpenApplyModal,
  onRunAutoScheduleSim,
  onResetSimulation,
  onExitSimulation,
  isApplying = false,
}) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 66,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 22,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        backgroundColor: 'rgba(255, 251, 235, 0.96)',
        backdropFilter: 'blur(16px)',
        border: '1.5px solid #F59E0B',
        borderRadius: 14,
        padding: '6px 14px',
        boxShadow: '0 8px 24px rgba(245, 158, 11, 0.16)',
        pointerEvents: 'auto',
      }}
    >
      {/* Title & Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            backgroundColor: '#F59E0B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
          }}
        >
          <FlaskConical size={16} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#92400E', textTransform: 'uppercase', letterSpacing: 0.4 }}>
              Phòng thử nghiệm
            </span>
            <span
              style={{
                backgroundColor: diffCount > 0 ? '#FEF3C7' : '#E2E8F0',
                color: diffCount > 0 ? '#B45309' : '#64748B',
                fontSize: 11,
                fontWeight: 700,
                padding: '1px 7px',
                borderRadius: 999,
                border: diffCount > 0 ? '1px solid #FDE68A' : 'none',
              }}
            >
              {diffCount > 0 ? `${diffCount} thay đổi chưa lưu` : 'Chưa có thay đổi'}
            </span>
          </div>
          <span style={{ fontSize: 11, color: '#B45309', display: 'block', lineHeight: 1.1 }}>
            Dữ liệu độc lập • Không ảnh hưởng CSDL thật
          </span>
        </div>
      </div>

      <div style={{ width: 1, height: 26, backgroundColor: '#FDE68A' }} />

      {/* Before / After View Toggle */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: '#FEF3C7',
          padding: 3,
          borderRadius: 8,
          border: '1px solid #FDE68A',
        }}
      >
        <button
          type="button"
          onClick={() => onToggleViewMode('before')}
          style={{
            padding: '4px 10px',
            borderRadius: 6,
            border: 'none',
            backgroundColor: viewMode === 'before' ? '#FFFFFF' : 'transparent',
            color: viewMode === 'before' ? '#92400E' : '#78350F',
            fontWeight: 700,
            fontSize: 11.5,
            cursor: 'pointer',
            boxShadow: viewMode === 'before' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            transition: 'all 0.15s ease',
          }}
          title="Xem trạng thái sản xuất gốc trước khi thử nghiệm"
        >
          Gốc (Before)
        </button>
        <button
          type="button"
          onClick={() => onToggleViewMode('after')}
          style={{
            padding: '4px 10px',
            borderRadius: 6,
            border: 'none',
            backgroundColor: viewMode === 'after' ? '#F59E0B' : 'transparent',
            color: viewMode === 'after' ? '#FFFFFF' : '#78350F',
            fontWeight: 700,
            fontSize: 11.5,
            cursor: 'pointer',
            boxShadow: viewMode === 'after' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            transition: 'all 0.15s ease',
          }}
          title="Xem trạng thái phương án thử nghiệm hiện tại"
        >
          Mô phỏng (After)
        </button>
      </div>

      <div style={{ width: 1, height: 26, backgroundColor: '#FDE68A' }} />

      {/* Tool Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {/* Run AI Auto-Schedule Simulation */}
        <button
          id="btn-sim-autoschedule"
          type="button"
          onClick={onRunAutoScheduleSim}
          style={{
            padding: '5px 10px',
            borderRadius: 8,
            border: '1px solid #FDE68A',
            backgroundColor: '#FFFFFF',
            color: '#92400E',
            fontSize: 11.5,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}
          title="Thử nghiệm chạy thuật toán AI phân bổ nhân sự tự động (không ghi đè CSDL)"
        >
          <Sparkles size={13} color="#D97706" />
          <span>Mô phỏng AI</span>
        </button>

        {/* View Diff Log */}
        {diffCount > 0 && (
          <button
            id="btn-sim-diff"
            type="button"
            onClick={onOpenDiffModal}
            style={{
              padding: '5px 10px',
              borderRadius: 8,
              border: '1px solid #FDE68A',
              backgroundColor: '#FFFFFF',
              color: '#92400E',
              fontSize: 11.5,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <ListTree size={13} color="#D97706" />
            <span>Chi tiết ({diffCount})</span>
          </button>
        )}

        {/* Reset to Snapshot */}
        {diffCount > 0 && (
          <button
            id="btn-sim-reset"
            type="button"
            onClick={onResetSimulation}
            style={{
              padding: '5px 10px',
              borderRadius: 8,
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#475569',
              fontSize: 11.5,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
            title="Khôi phục trạng thái về bản sao gốc ban đầu"
          >
            <Undo2 size={13} />
            <span>Đặt lại</span>
          </button>
        )}

        {/* Apply Simulation to Production */}
        <button
          id="btn-sim-apply"
          type="button"
          onClick={onOpenApplyModal}
          disabled={diffCount === 0 || isApplying}
          style={{
            padding: '5px 12px',
            borderRadius: 8,
            border: 'none',
            backgroundColor: diffCount > 0 ? '#10B981' : '#94A3B8',
            color: '#FFFFFF',
            fontSize: 12,
            fontWeight: 700,
            cursor: diffCount > 0 && !isApplying ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            boxShadow: diffCount > 0 ? '0 2px 8px rgba(16, 185, 129, 0.28)' : 'none',
          }}
        >
          <Check size={14} />
          <span>{isApplying ? 'Đang áp dụng...' : 'Áp dụng vào CSDL'}</span>
        </button>

        {/* Exit Simulation */}
        <button
          id="btn-sim-exit"
          type="button"
          onClick={onExitSimulation}
          style={{
            padding: '5px 8px',
            borderRadius: 8,
            border: 'none',
            background: 'transparent',
            color: '#94A3B8',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Thoát phòng thử nghiệm"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
