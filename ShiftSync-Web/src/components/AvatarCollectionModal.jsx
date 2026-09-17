import React, { useState, useEffect } from 'react';
import Avatar3DWeb from './Avatar3DWeb';
import { AVATAR_OPTIONS } from './avatarConfigs';
import { getAllAvatarThumbnails } from './avatarThumbnails';

export default function AvatarCollectionModal({
  isOpen,
  onClose,
  currentAvatarId = 'dilan',
  onSelectAvatar,
  targetUserName = '',
}) {
  const [previewAvatarId, setPreviewAvatarId] = useState(currentAvatarId || 'dilan');
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [thumbnails, setThumbnails] = useState({});

  useEffect(() => {
    try {
      setThumbnails(getAllAvatarThumbnails());
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (isOpen) {
      setPreviewAvatarId(currentAvatarId || 'dilan');
    }
  }, [isOpen, currentAvatarId]);

  if (!isOpen) return null;

  const isCurrentUsing = currentAvatarId === previewAvatarId;
  const activeThumbnails = Object.keys(thumbnails).length ? thumbnails : getAllAvatarThumbnails();

  const handleApply = async (avatarId) => {
    setSavingAvatar(true);
    try {
      if (onSelectAvatar) {
        await onSelectAvatar(avatarId);
      }
    } finally {
      setSavingAvatar(false);
      if (onClose) onClose();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '16px',
        paddingBottom: '16px',
        overflowY: 'auto',
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          width: '92%',
          maxWidth: 880,
          maxHeight: '95vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '18px 24px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
          gap: 12,
          color: '#1E1E1E',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: '#161616' }}>
              Bộ sưu tập Avatar 3D
            </h2>
            <p style={{ margin: '3px 0 0', fontSize: 12.5, color: '#666' }}>
              Chọn diện mạo 3D phù hợp với bạn • Biểu cảm chớp mắt, nháy mắt & nụ cười tự nhiên
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: '#F0F0F0',
              borderRadius: '50%',
              width: 32,
              height: 32,
              cursor: 'pointer',
              fontSize: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600,
            }}
          >
            ✕
          </button>
        </div>

        {/* ── TOP SPOTLIGHT 3D STAGE (CHỈ 1 CANVAS 3D TRÊN TOÀN MODAL) ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#F8F9FB',
            borderRadius: 16,
            padding: '12px 18px',
            border: '1.5px solid #E5E9F0',
            gap: 18,
          }}
        >
          <div style={{ width: 115, height: 115, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Avatar3DWeb avatarId={previewAvatarId} size={105} interactive={true} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#111' }}>
                Xem trước 3D
              </span>
              {targetUserName && (
                <span style={{ fontSize: 14, color: '#555', fontWeight: 500 }}>
                  ({targetUserName})
                </span>
              )}
              {isCurrentUsing && (
                <span
                  style={{
                    backgroundColor: '#E8F5E9',
                    color: '#2E7D32',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 6,
                  }}
                >
                  ✓ Đang sử dụng
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: '#777', marginTop: 4 }}>
              💡 Rê chuột / kéo xoay 360° trực tiếp để xem diện mạo và chuyển động biểu cảm
            </div>
            <div style={{ marginTop: 10 }}>
              <button
                disabled={savingAvatar}
                onClick={() => handleApply(previewAvatarId)}
                style={{
                  backgroundColor: isCurrentUsing ? '#2E7D32' : '#428531',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '7px 18px',
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  transition: 'opacity 0.2s',
                  opacity: savingAvatar ? 0.7 : 1,
                }}
              >
                {savingAvatar ? 'Đang lưu...' : (isCurrentUsing ? '✓ Đang là ảnh đại diện' : 'Áp dụng làm ảnh đại diện')}
              </button>
            </div>
          </div>
        </div>

        {/* ── LƯỚI 17 ẢNH AVATAR 3D THỰC TẾ ── */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 8 }}>
            Chọn diện mạo 3D ({AVATAR_OPTIONS.length}):
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
              gap: 10,
              maxHeight: '54vh',
              overflowY: 'auto',
              padding: '4px 2px',
            }}
          >
            {AVATAR_OPTIONS.map((item) => {
              const isPreviewing = previewAvatarId === item.id;
              const isSelected = currentAvatarId === item.id;
              const imgUrl = activeThumbnails[item.id];

              return (
                <div
                  key={item.id}
                  onClick={() => setPreviewAvatarId(item.id)}
                  onDoubleClick={() => handleApply(item.id)}
                  style={{
                    borderRadius: 14,
                    border: isPreviewing ? '2.5px solid #428531' : '1.5px solid #E5E7EB',
                    backgroundColor: isPreviewing ? '#EDF7EB' : '#FAFAFA',
                    padding: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'all 0.15s ease',
                    height: 94,
                    boxShadow: isPreviewing ? '0 4px 12px rgba(66, 133, 49, 0.2)' : 'none',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    setPreviewAvatarId(item.id);
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {isSelected && (
                    <span
                      style={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        backgroundColor: '#428531',
                        color: '#fff',
                        borderRadius: '50%',
                        width: 17,
                        height: 17,
                        fontSize: 10.5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        zIndex: 2,
                      }}
                    >
                      ✓
                    </span>
                  )}
                  {/* Ảnh thực tế của nhân vật 3D */}
                  {imgUrl ? (
                    <img
                      src={imgUrl}
                      alt=""
                      style={{
                        width: 82,
                        height: 82,
                        objectFit: 'contain',
                        userSelect: 'none',
                        pointerEvents: 'none',
                      }}
                    />
                  ) : (
                    <div style={{ width: 70, height: 70, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 28 }}>{item.icon || '👤'}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 2 }}>
          <button
            onClick={onClose}
            style={{
              padding: '7px 18px',
              borderRadius: 8,
              border: '1px solid #D1D5DB',
              background: '#FFFFFF',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
