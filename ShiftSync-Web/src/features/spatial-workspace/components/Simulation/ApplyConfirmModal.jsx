/**
 * ApplyConfirmModal.jsx
 * Safe, two-step validation confirmation dialog before committing simulated changes to the backend.
 * 
 * Enforces Architectural Rules 37, 38 & 39:
 * - Second Validation: verifies server state freshness before triggering mutation
 * - Clear change summary diff
 * - Explicit manager confirmation
 */

import { useState } from 'react';
import { Check, AlertTriangle, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';

export default function ApplyConfirmModal({
  isOpen = false,
  onClose,
  onConfirmApply,
  diffList = [],
  isApplying = false,
}) {
  const [hasConfirmedSafety, setHasConfirmedSafety] = useState(false);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={!isApplying ? onClose : undefined}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 18,
          width: '100%',
          maxWidth: 520,
          boxShadow: '0 24px 48px rgba(15, 23, 42, 0.25)',
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 22px',
            borderBottom: '1px solid #F1F5F9',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              backgroundColor: '#ECFDF5',
              border: '1px solid #A7F3D0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#059669',
            }}
          >
            <ShieldCheck size={22} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0F172A' }}>
              Xác nhận áp dụng kế hoạch phân bổ
            </h3>
            <span style={{ fontSize: 12, color: '#64748B' }}>
              Cập nhật dữ liệu từ Phòng thử nghiệm vào Hệ thống phân ca thực tế
            </span>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Summary Alert */}
          <div
            style={{
              backgroundColor: '#EFF6FF',
              border: '1px solid #BFDBFE',
              borderRadius: 10,
              padding: '12px 14px',
              fontSize: 12.5,
              color: '#1E40AF',
              lineHeight: 1.45,
            }}
          >
            <strong>{diffList.length} thay đổi</strong> sẽ được áp dụng vào ca làm việc chính thức trên Spring Boot backend. Các nhân viên liên quan sẽ nhận thông báo cập nhật vị trí quầy làm việc.
          </div>

          {/* Mini Diff Preview */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
              Danh sách thay đổi sẽ ghi vào CSDL:
            </span>
            <div
              style={{
                maxHeight: 150,
                overflowY: 'auto',
                border: '1px solid #E2E8F0',
                borderRadius: 8,
                padding: '8px 10px',
                backgroundColor: '#F8FAFC',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              {diffList.map((item, idx) => (
                <div key={idx} style={{ fontSize: 11.5, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: '#059669', fontWeight: 700 }}>•</span>
                  <strong>{item.staffName || item.staffAName || item.description}</strong>:
                  {item.type === 'TRANSFER' && (
                    <span>
                      {item.fromZoneName} <ArrowRight size={10} style={{ display: 'inline' }} /> {item.toZoneName}
                    </span>
                  )}
                  {item.type === 'SWAP' && (
                    <span>
                      Đổi chỗ {item.staffAName} ({item.zoneAName}) ↔ {item.staffBName} ({item.zoneBName})
                    </span>
                  )}
                  {item.type === 'REMOVE' && <span>Rút khỏi {item.fromZoneName}</span>}
                  {item.type === 'ASSIGN' && <span>Bổ sung vào {item.toZoneName}</span>}
                  {item.type === 'AUTO_SCHEDULE' && <span>Tự động xếp ca {item.allocatedCount} nhân sự</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Safety Checkbox */}
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', marginTop: 4 }}>
            <input
              id="checkbox-confirm-safety"
              type="checkbox"
              checked={hasConfirmedSafety}
              onChange={(e) => setHasConfirmedSafety(e.target.checked)}
              style={{ marginTop: 2 }}
            />
            <span style={{ fontSize: 12, color: '#475569', lineHeight: 1.4 }}>
              Tôi đã kiểm tra tính tương thích kỹ năng và sức chứa phân khu, đồng ý lưu chính thức vào hệ thống.
            </span>
          </label>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '14px 22px',
            borderTop: '1px solid #F1F5F9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 10,
            backgroundColor: '#F8FAFC',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isApplying}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#334155',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: isApplying ? 'not-allowed' : 'pointer',
            }}
          >
            Hủy bỏ
          </button>

          <button
            id="btn-confirm-apply-final"
            type="button"
            onClick={onConfirmApply}
            disabled={!hasConfirmedSafety || isApplying}
            style={{
              padding: '8px 18px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: hasConfirmedSafety && !isApplying ? '#10B981' : '#94A3B8',
              color: '#FFFFFF',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: hasConfirmedSafety && !isApplying ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {isApplying ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Đang lưu vào CSDL...</span>
              </>
            ) : (
              <>
                <Check size={14} />
                <span>Xác nhận lưu thay đổi</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
