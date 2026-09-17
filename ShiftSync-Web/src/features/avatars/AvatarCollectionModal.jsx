import React, { useState } from 'react';
import { AVATAR_ROSTER, getAvatarById } from './avatarRegistry';
import Avatar3DPreview from './Avatar3DPreview';
import './AvatarCollectionModal.css';

const CATEGORIES = [
  { key: 'all', label: 'Tất cả (17)' },
  { key: 'barista', label: 'Pha chế' },
  { key: 'cashier', label: 'Thu ngân' },
  { key: 'kitchen', label: 'Bếp' },
  { key: 'manager', label: 'Quản lý' },
  { key: 'security', label: 'An ninh' },
  { key: 'stock', label: 'Kho vận' },
  { key: 'server', label: 'Phục vụ' },
];

export default function AvatarCollectionModal({
  isOpen,
  currentAvatarId = 'dilan',
  onSelectAvatar,
  onClose,
}) {
  const [highlightedId, setHighlightedId] = useState(currentAvatarId || 'dilan');
  const [activeCategory, setActiveCategory] = useState('all');

  if (!isOpen) return null;

  const highlightedAvatar = getAvatarById(highlightedId);

  const filteredAvatars = AVATAR_ROSTER.filter(a => {
    if (activeCategory === 'all') return true;
    return a.roleCategory === activeCategory;
  });

  const handleConfirm = () => {
    if (onSelectAvatar) {
      onSelectAvatar(highlightedId);
    }
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="avatar-modal-overlay" onClick={onClose}>
      <div className="avatar-modal-container" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="avatar-modal-header">
          <div>
            <h2 className="avatar-modal-title">Bộ sưu tập Avatar 3D Digital Twin</h2>
            <p className="avatar-modal-subtitle">Hệ thống 17 nhân vật chuẩn hóa đa nền tảng • Xem trước 3D xoay 360°</p>
          </div>
          <button type="button" className="avatar-modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Content Body */}
        <div className="avatar-modal-body">
          {/* Left Column: 3D Preview & Specs */}
          <div className="avatar-preview-col">
            <div className="avatar-3d-box">
              <Avatar3DPreview
                avatar={highlightedAvatar}
                width={260}
                height={260}
                autoRotate={false}
                showControls={true}
              />
            </div>

            <div className="avatar-specs-card">
              <div className="avatar-specs-header">
                <span className="avatar-specs-name">{highlightedAvatar.name}</span>
                <span className="avatar-specs-badge">{highlightedAvatar.badgeText}</span>
              </div>
              <div className="avatar-specs-dept">
                {highlightedAvatar.department} • {highlightedAvatar.gender}
              </div>
              <p className="avatar-specs-desc">{highlightedAvatar.description}</p>
              
              <div className="avatar-props-tags">
                <span className="avatar-prop-tag">Phụ kiện đầu: {highlightedAvatar.props?.headwear || 'Chuẩn'}</span>
                <span className="avatar-prop-tag">Dụng cụ: {highlightedAvatar.props?.tool || 'Không'}</span>
              </div>
            </div>

            <button
              type="button"
              className="avatar-confirm-btn"
              onClick={handleConfirm}
            >
              Chọn làm Avatar của tôi
            </button>
          </div>

          {/* Right Column: Categories & 17 Avatars Grid */}
          <div className="avatar-roster-col">
            {/* Category Filter Pills */}
            <div className="avatar-filter-bar">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.key}
                  type="button"
                  className={`avatar-filter-pill ${activeCategory === cat.key ? 'active' : ''}`}
                  onClick={() => setActiveCategory(cat.key)}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Grid of Avatars */}
            <div className="avatar-roster-grid">
              {filteredAvatars.map(item => {
                const isHighlighted = item.id === highlightedId;
                const isCurrent = item.id === currentAvatarId;

                return (
                  <div
                    key={item.id}
                    className={`avatar-grid-item ${isHighlighted ? 'selected' : ''}`}
                    onClick={() => setHighlightedId(item.id)}
                  >
                    <div className="avatar-thumb-wrapper">
                      <img src={item.source} alt={item.name} className="avatar-thumb-img" />
                      {isCurrent && <span className="avatar-current-tag">Đang dùng</span>}
                      {isHighlighted && <span className="avatar-check-badge">✓</span>}
                    </div>
                    <div className="avatar-item-name">{item.name}</div>
                    <div className="avatar-item-role">{item.role}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}