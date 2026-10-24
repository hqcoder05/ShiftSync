/**
 * WorkstationEditorBanner.jsx
 * Floating visual banner and control strip for the Workstation Layout Editor in ShiftSync 3D Digital Twin.
 */

import { Wrench, Check, X, AlertTriangle, Loader2, ArrowRight, RotateCw } from 'lucide-react';

export default function WorkstationEditorBanner({
  isEditing = true,
  selectedWorkstation = null,
  draftCoords = null,
  isColliding = false,
  conflictingWorkstation = null,
  collisionInfo = null,
  isSaving = false,
  onSave,
  onCancel,
  onExit,
  onRotate,
}) {
  if (isEditing === false) return null;

  const actualColliding = Boolean(isColliding || collisionInfo?.isColliding);
  const actualConflict = conflictingWorkstation || collisionInfo?.conflictingWorkstation;

  const hasChanges = Boolean(
    selectedWorkstation &&
    draftCoords &&
    (draftCoords.x !== selectedWorkstation.x || draftCoords.y !== selectedWorkstation.y)
  );

  return (
    <div
      style={{
        position: 'absolute',
        top: 68,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 28,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 16px',
        backgroundColor: 'rgba(15, 23, 42, 0.94)',
        borderRadius: 14,
        border: actualColliding ? '1.5px solid #EF4444' : (hasChanges ? '1.5px solid #10B981' : '1px solid #334155'),
        boxShadow: actualColliding
          ? '0 8px 32px rgba(239, 68, 68, 0.28)'
          : (hasChanges ? '0 8px 32px rgba(16, 185, 129, 0.25)' : '0 8px 24px rgba(0, 0, 0, 0.3)'),
        backdropFilter: 'blur(12px)',
        color: '#FFFFFF',
        fontSize: 13,
        maxWidth: '90%',
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      {/* Icon Badge */}
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          backgroundColor: actualColliding ? '#EF4444' : (hasChanges ? '#10B981' : '#0284C7'),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {actualColliding ? (
          <AlertTriangle size={16} color="#FFF" />
        ) : (
          <Wrench size={16} color="#FFF" />
        )}
      </div>

      {/* Status & Info Message */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
          <span>CHẾ ĐỘ BỐ TRÍ TRẠM LÀM VIỆC</span>
          {actualColliding && (
            <span style={{ color: '#F87171', fontSize: 11, fontWeight: 600 }}>
              •  Cảnh báo: Trùng vị trí với {actualConflict?.name || 'trạm khác'}
            </span>
          )}
        </div>

        <div style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 1 }}>
          {!selectedWorkstation ? (
            <span>Kéo bất kỳ món nào trong trạm để di chuyển cả cụm. Chỉ lưu khi bấm Lưu vị trí.</span>
          ) : hasChanges ? (
            <span style={{ color: '#E2E8F0' }}>
              Trạm: <strong style={{ color: '#38BDF8' }}>{selectedWorkstation.name}</strong> • Vị trí mới: X: <strong>{draftCoords.x}m</strong>, Y: <strong>{draftCoords.y}m</strong>
            </span>
          ) : (
            <span>
              Đang chọn: <strong style={{ color: '#38BDF8' }}>{selectedWorkstation.name}</strong> • Kéo cả cụm trạm; đổi trạm hoặc thoát sẽ hủy vị trí chưa lưu.
            </span>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 12 }}>
        {selectedWorkstation && onRotate && (
          <button
            type="button"
            onClick={onRotate}
            disabled={isSaving}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid #0284C7',
              backgroundColor: 'rgba(2, 132, 199, 0.25)',
              color: '#38BDF8',
              fontSize: 12,
              fontWeight: 600,
              cursor: isSaving ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Xoay trạm 90° theo chiều kim đồng hồ"
          >
            <RotateCw size={13} />
            Xoay 90°
          </button>
        )}

        {hasChanges && (
          <>
            <button
              type="button"
              onClick={onSave}
              disabled={isSaving || actualColliding}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '6px 14px',
                borderRadius: 8,
                border: 'none',
                backgroundColor: actualColliding ? '#475569' : '#10B981',
                color: '#FFFFFF',
                fontSize: 12,
                fontWeight: 700,
                cursor: actualColliding || isSaving ? 'not-allowed' : 'pointer',
                opacity: actualColliding ? 0.6 : 1,
                boxShadow: actualColliding ? 'none' : '0 2px 8px rgba(16, 185, 129, 0.4)',
                transition: 'all 0.15s ease',
              }}
              title={actualColliding ? 'Không thể lưu khi vị trí bị trùng với trạm khác' : 'Lưu vị trí mới vào cơ sở dữ liệu'}
            >
              {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              {isSaving ? 'Đang lưu...' : 'Lưu vị trí'}
            </button>

            <button
              type="button"
              onClick={onCancel}
              disabled={isSaving}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '6px 12px',
                borderRadius: 8,
                border: '1px solid #475569',
                backgroundColor: 'transparent',
                color: '#E2E8F0',
                fontSize: 12,
                fontWeight: 600,
                cursor: isSaving ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Hủy bỏ thay đổi và quay lại vị trí ban đầu"
            >
              <X size={13} />
              Hủy
            </button>
          </>
        )}

        <button
          type="button"
          onClick={onExit}
          disabled={isSaving}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '6px 12px',
            borderRadius: 8,
            border: 'none',
            backgroundColor: '#1E293B',
            color: '#94A3B8',
            fontSize: 11.5,
            fontWeight: 600,
            cursor: isSaving ? 'not-allowed' : 'pointer',
            marginLeft: hasChanges ? 4 : 0,
            transition: 'all 0.15s ease',
          }}
          title="Thoát khỏi chế độ bố trí trạm làm việc"
        >
          Đóng
        </button>
      </div>
    </div>
  );
}
