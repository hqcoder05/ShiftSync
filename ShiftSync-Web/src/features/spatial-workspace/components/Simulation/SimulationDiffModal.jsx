/**
 * SimulationDiffModal.jsx
 * Detailed modal auditing and visualizing every change made in the active simulation scenario.
 */

import { X, ArrowRight, RefreshCw, UserMinus, UserPlus, Sparkles } from 'lucide-react';

export default function SimulationDiffModal({
  isOpen = false,
  onClose,
  diffList = [],
}) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          width: '100%',
          maxWidth: 520,
          boxShadow: '0 20px 40px rgba(15, 23, 42, 0.2)',
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '80vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #F1F5F9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#F8FAFC',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0F172A' }}>
              Nhật ký thay đổi thử nghiệm
            </h3>
            <span style={{ fontSize: 12, color: '#64748B' }}>
              Toàn bộ các điều chuyển đã thực hiện trong kịch bản này ({diffList.length} thao tác)
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Diff List */}
        <div style={{ padding: 18, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {diffList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: '#94A3B8', fontSize: 13 }}>
              Chưa có thay đổi nào được thực hiện trong kịch bản này.
            </div>
          ) : (
            diffList.map((item, index) => {
              let icon = <ArrowRight size={14} color="#0284C7" />;
              let badgeText = 'Điều chuyển';
              let badgeColor = '#E0F2FE';
              let textColor = '#0369A1';

              if (item.type === 'SWAP') {
                icon = <RefreshCw size={14} color="#7C3AED" />;
                badgeText = 'Hoán đổi';
                badgeColor = '#EDE9FE';
                textColor = '#6D28D9';
              } else if (item.type === 'REMOVE') {
                icon = <UserMinus size={14} color="#EF4444" />;
                badgeText = 'Rút nhân sự';
                badgeColor = '#FEE2E2';
                textColor = '#B91C1C';
              } else if (item.type === 'ASSIGN') {
                icon = <UserPlus size={14} color="#10B981" />;
                badgeText = 'Bổ sung';
                badgeColor = '#D1FAE5';
                textColor = '#047857';
              } else if (item.type === 'AUTO_SCHEDULE') {
                icon = <Sparkles size={14} color="#D97706" />;
                badgeText = 'Auto-Schedule AI';
                badgeColor = '#FEF3C7';
                textColor = '#B45309';
              }

              return (
                <div
                  key={item.id || index}
                  style={{
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: 10,
                    padding: '10px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {icon}
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                        {item.staffName || item.staffAName || item.description || 'Thao tác phân bổ'}
                      </span>
                    </div>
                    <span
                      style={{
                        backgroundColor: badgeColor,
                        color: textColor,
                        fontSize: 10.5,
                        fontWeight: 700,
                        padding: '2px 7px',
                        borderRadius: 6,
                      }}
                    >
                      {badgeText}
                    </span>
                  </div>

                  {item.type === 'TRANSFER' && (
                    <div style={{ fontSize: 11.5, color: '#475569', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>{item.fromZoneName}</span>
                      <ArrowRight size={12} color="#94A3B8" />
                      <strong style={{ color: '#0F172A' }}>{item.toZoneName}</strong>
                    </div>
                  )}

                  {item.type === 'SWAP' && (
                    <div style={{ fontSize: 11.5, color: '#475569' }}>
                      Đổi chỗ giữa <strong>{item.staffAName}</strong> ({item.zoneAName}) và{' '}
                      <strong>{item.staffBName}</strong> ({item.zoneBName})
                    </div>
                  )}

                  {item.type === 'REMOVE' && (
                    <div style={{ fontSize: 11.5, color: '#EF4444' }}>
                      Rút khỏi phân khu <strong>{item.fromZoneName}</strong>
                    </div>
                  )}

                  {item.type === 'ASSIGN' && (
                    <div style={{ fontSize: 11.5, color: '#10B981' }}>
                      Phân công vào phân khu <strong>{item.toZoneName}</strong>
                    </div>
                  )}

                  {item.type === 'AUTO_SCHEDULE' && (
                    <div style={{ fontSize: 11.5, color: '#B45309' }}>
                      Thuật toán đã bố trí tự động {item.allocatedCount} nhân sự
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #F1F5F9',
            display: 'flex',
            justifyContent: 'flex-end',
            backgroundColor: '#FAFAFA',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#334155',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
