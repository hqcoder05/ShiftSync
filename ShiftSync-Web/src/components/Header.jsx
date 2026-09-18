import { useState, useRef, useEffect } from 'react';
import './Header.css';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import Avatar3DWeb from './Avatar3DWeb';
import HoloCard3DWeb from './HoloCard3DWeb';
import { AVATAR_OPTIONS } from './avatarConfigs';
import { getAllAvatarThumbnails } from './avatarThumbnails';
import api from '../services/api';
import iconDashboard from '../assets/icons/icon-dashboard.png';
import iconCalendar from '../assets/icons/icon-calendar.png';
import iconClock from '../assets/icons/icon-clock.png';
import iconReports from '../assets/icons/icon-reports.png';
import iconUser from '../assets/icons/icon-user.png';
import iconSettings from '../assets/icons/icon-settings.png';

const NAV_ITEMS = [
  { to: '/', label: 'DASHBOARD', icon: iconDashboard, key: 'dashboard' },
  { to: '/schedule', label: 'SCHEDULER', icon: iconCalendar, key: 'scheduler' },
  { to: '/attendance', label: 'ATTENDANCE', icon: iconClock, key: 'attendance' },
  { to: '/reports', label: 'REPORTS', icon: iconReports, key: 'reports', aliases: ['/request', '/requests'] },
  { to: '/employees', label: 'EMPLOYEES', icon: iconUser, key: 'employees', aliases: ['/skills', '/stores'] },
];

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [showHoloModal, setShowHoloModal] = useState(false);
  const [previewAvatarId, setPreviewAvatarId] = useState('dilan');
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [thumbnails, setThumbnails] = useState({});
  const menuRef = useRef(null);

  useEffect(() => {
    try {
      setThumbnails(getAllAvatarThumbnails());
    } catch (e) {}
  }, []);

  useEffect(() => {
    // 0. Đọc cache từ localStorage trước để hiển thị tức thì
    const cachedAvatar = localStorage.getItem('userAvatarId');
    const cachedUserStr = localStorage.getItem('currentUser');
    if (cachedUserStr) {
      try {
        const u = JSON.parse(cachedUserStr);
        if (cachedAvatar) u.avatarId = cachedAvatar;
        setCurrentUser(u);
      } catch (e) {}
    } else if (cachedAvatar) {
      setCurrentUser({ avatarId: cachedAvatar });
    }

    api.get('/users/me')
      .then(res => {
        const user = res.data;
        setCurrentUser(user);
        if (user?.avatarId) {
          localStorage.setItem('userAvatarId', user.avatarId);
        }
        if (user) {
          localStorage.setItem('currentUser', JSON.stringify(user));
        }
      })
      .catch(() => {});

    // Lắng nghe sự kiện avatarUpdated từ các trang khác
    const onUpdate = (e) => {
      const newAv = e.detail?.avatarId;
      if (newAv) {
        setCurrentUser(prev => ({ ...prev, avatarId: newAv }));
      }
    };
    window.addEventListener('avatarUpdated', onUpdate);
    return () => window.removeEventListener('avatarUpdated', onUpdate);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('userAvatarId');
    setMenuOpen(false);
    navigate('/login');
  };

  const handleGoSettings = () => {
    setMenuOpen(false);
    navigate('/settings');
  };

  const handleSelectAvatar = async (avatarId) => {
    setSavingAvatar(true);
    // 1. Cập nhật giao diện & localStorage NGAY LẬP TỨC
    setCurrentUser(prev => {
      const next = { ...prev, avatarId };
      try {
        localStorage.setItem('currentUser', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
    localStorage.setItem('userAvatarId', avatarId);
    window.dispatchEvent(new CustomEvent('avatarUpdated', { detail: { avatarId } }));

    // 2. Gửi API đồng bộ Backend
    try {
      await api.put('/users/me/avatar', { avatarId });
      setAvatarModalOpen(false);
    } catch (e) {
      console.error('Failed to update avatar on web:', e);
    } finally {
      setSavingAvatar(false);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isSettingsActive = location.pathname === '/settings' || location.pathname === '/config';

  return (
    <header className="ss-header">
      {/* Main navigation menu */}
      <nav className="ss-header-nav">
        {NAV_ITEMS.map(item => {
          const isSelected = location.pathname === item.to || 
            (item.aliases && item.aliases.some(alias => location.pathname.startsWith(alias)));

          return (
            <NavLink
              key={item.key}
              to={item.to}
              className={isSelected ? 'active' : ''}
            >
              <img 
                src={item.icon} 
                alt="" 
                className={`ss-nav-icon ${item.key === 'reports' ? 'ss-nav-icon-reports' : ''}`} 
              />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Settings */}
      <div className="ss-header-user-section" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="ss-header-settings-wrapper" ref={menuRef}>
          <button
            className={`ss-header-icon ss-settings-btn ${isSettingsActive || menuOpen ? 'active' : ''}`}
            onClick={() => setMenuOpen(prev => !prev)}
            title="Cài đặt & Tuỳ chọn"
          >
            <img src={iconSettings} alt="Cài đặt" className="ss-header-icon-img" />
          </button>

          {menuOpen && (
            <div className="ss-dropdown-menu">
              <button
                className="ss-dropdown-item"
                onClick={() => {
                  setMenuOpen(false);
                  setPreviewAvatarId(currentUser?.avatarId || 'dilan');
                  setAvatarModalOpen(true);
                }}
              >
                <span>Đổi Avatar 3D</span>
              </button>
              <button
                className="ss-dropdown-item"
                onClick={() => {
                  setMenuOpen(false);
                  setShowHoloModal(true);
                }}
              >
                <span>✨ Thẻ 3D Hologram</span>
              </button>
              <button
                className={`ss-dropdown-item ${location.pathname === '/admin' ? 'selected' : ''}`}
                onClick={() => {
                  setMenuOpen(false);
                  navigate('/admin');
                }}
              >
                <span>Quản Trị Hệ Thống (Admin)</span>
              </button>
              <button
                className={`ss-dropdown-item ${isSettingsActive ? 'selected' : ''}`}
                onClick={handleGoSettings}
              >
                <span>Cấu hình</span>
              </button>
              <div className="ss-dropdown-divider" />
              <button
                className="ss-dropdown-item ss-dropdown-logout"
                onClick={handleLogout}
              >
                <span>Đăng xuất</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ═══ MODAL CHỌN AVATAR 3D TRÊN WEB (SPOTLIGHT 3D STAGE) ═══ */}
      {avatarModalOpen && (() => {
        const currentAvatarId = currentUser?.avatarId || 'dilan';
        const isCurrentUsing = currentAvatarId === previewAvatarId;
        const activeThumbnails = Object.keys(thumbnails).length ? thumbnails : getAllAvatarThumbnails();

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
            onClick={() => setAvatarModalOpen(false)}
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
                  onClick={() => setAvatarModalOpen(false)}
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
                    {currentUser?.fullName && (
                      <span style={{ fontSize: 14, color: '#555', fontWeight: 500 }}>
                        ({currentUser.fullName})
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
                      onClick={() => handleSelectAvatar(previewAvatarId)}
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

              {/* ── LƯỚI 18 ẢNH AVATAR 3D THỰC TẾ (KHÔNG DÙNG ICON, KHÔNG HIỂN THỊ TÊN ẢO) ── */}
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
                        onDoubleClick={() => handleSelectAvatar(item.id)}
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
                  onClick={() => setAvatarModalOpen(false)}
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
      })()}

      {/* ═══ MODAL THẺ NHÂN VIÊN 3D HOLOGRAM CẦU VỒNG ═══ */}
      {showHoloModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.72)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
          }}
          onClick={() => setShowHoloModal(false)}
        >
          <div
            style={{
              backgroundColor: '#0F172A',
              borderRadius: 24,
              padding: '24px 32px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
              border: '1px solid rgba(74, 222, 128, 0.35)',
              position: 'relative',
              maxWidth: 440,
              width: '90%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>✨</span>
                <h3 style={{ margin: 0, color: '#F8FAFC', fontSize: 17, fontWeight: 700 }}>
                  Thẻ Hologram 3D Cầu Vồng
                </h3>
              </div>
              <button
                onClick={() => setShowHoloModal(false)}
                style={{
                  background: '#1E293B',
                  border: 'none',
                  color: '#94A3B8',
                  fontSize: 14,
                  borderRadius: 12,
                  width: 28,
                  height: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>
            <p style={{ margin: '0 0 16px', color: '#94A3B8', fontSize: 12.5, textAlign: 'center' }}>
              💡 Rê chuột để nghiêng thẻ và cảm nhận ánh cầu vồng hologram đổi màu đa chiều
            </p>

            <HoloCard3DWeb
              userName={currentUser?.fullName || 'Paul. Lee'}
              role={currentUser?.role || 'Staff Member'}
              staffCode={`SS-00${currentUser?.id || 1}`}
              width={340}
              height={215}
            />

            <button
              onClick={() => setShowHoloModal(false)}
              style={{
                marginTop: 18,
                padding: '8px 24px',
                borderRadius: 10,
                border: 'none',
                background: 'linear-gradient(135deg, #10B981, #059669)',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
              }}
            >
              Đóng thẻ
            </button>
          </div>
        </div>
      )}
    </header>
  );
}