/**
 * ExitWarningModal.jsx
 * Enforces Architectural Rule 41: Exit Warning.
 * Prevents accidental loss of unsaved workforce simulation experiments.
 */

import { AlertCircle } from 'lucide-react';

export default function ExitWarningModal({
  isOpen = false,
  diffCount = 0,
  onStay,
  onDiscardAndExit,
}) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 55,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onStay}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 18,
          width: '100%',
          maxWidth: 440,
          boxShadow: '0 24px 48px rgba(15, 23, 42, 0.25)',
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
          padding: 22,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: '#FEF2F2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#EF4444',
            }}
          >
            <AlertCircle size={22} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0F172A' }}>
              Bạn có thay đổi chưa áp dụng
            </h3>
            <span style={{ fontSize: 12, color: '#64748B' }}>
              Hiện có {diffCount} thao tác điều chuyển chưa được lưu vào CSDL
            </span>
          </div>
        </div>

        <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
          Nếu bạn thoát hoặc chuyển chế độ ngay bây giờ, toàn bộ phương án thử nghiệm này sẽ bị hủy bỏ và không thể khôi phục.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
          <button
            id="btn-modal-stay"
            type="button"
            onClick={onStay}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#334155',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Ở lại thử nghiệm
          </button>

          <button
            id="btn-modal-discard-exit"
            type="button"
            onClick={onDiscardAndExit}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: '#EF4444',
              color: '#FFFFFF',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Hủy thay đổi & Thoát
          </button>
        </div>
      </div>
    </div>
  );
}
