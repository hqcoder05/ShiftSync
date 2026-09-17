import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import './Header.css';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { logout } from '../services/authService';
import { getAllStores } from '../services/storeService';
import { getStoreLeaveRequests, getMyLeaveRequests } from '../services/leaveService';
import { getStoreSwapRequests, getMySwapRequests } from '../services/swapService';
import { getMarketplaceShifts } from '../services/marketplaceService';
import {
  getMyNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../services/notificationService';
import {
  Bell,
  Calendar,
  RefreshCw,
  ShoppingBag,
  UserCheck,
  Clock,
  CheckCheck,
  FileText,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import AvatarCollectionModal from '../features/avatars/AvatarCollectionModal';
import { getAvatarById, getSavedUserAvatar, saveUserAvatar } from '../features/avatars/avatarRegistry';
const NAV_ITEMS = [
  { to: '/', label: 'DASHBOARD', key: 'dashboard' },
  { to: '/schedule', label: 'SCHEDULER', key: 'scheduler' },
  { to: '/availability', label: 'AVAILABILITY', key: 'availability', aliases: ['/staff-availability'] },
  { to: '/attendance', label: 'ATTENDANCE', key: 'attendance' },
  { to: '/marketplace', label: 'MARKETPLACE', key: 'marketplace' },
  { to: '/requests', label: 'REQUESTS', key: 'requests', aliases: ['/request', '/reports'] },
  { to: '/payroll', label: 'PAYROLL', key: 'payroll' },
  { to: '/employees', label: 'EMPLOYEES', key: 'employees', aliases: ['/skills', '/stores'], roles: ['ADMIN', 'MANAGER'] },
  { to: '/admin', label: 'ADMIN', key: 'admin', roles: ['ADMIN'] },
];

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Store switcher state
  const [stores, setStores] = useState([]);
  const [selectedStoreId, setSelectedStoreId] = useState(() => localStorage.getItem('selectedStoreId') || '');
  const [storeMenuOpen, setStoreMenuOpen] = useState(false);
  const storeMenuRef = useRef(null);

  // Notification popover state
  const [notifMenuOpen, setNotifMenuOpen] = useState(false);
  const notifRef = useRef(null);
  const [pendingLeaveCount, setPendingLeaveCount] = useState(0);
  const [pendingSwapCount, setPendingSwapCount] = useState(0);
  const [openShiftsCount, setOpenShiftsCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [notifTab, setNotifTab] = useState('ALL'); // 'ALL' | 'UNREAD' | 'REQUESTS'

  const userRole = (localStorage.getItem('userRole') || 'STAFF').toUpperCase();
  const isAdmin = userRole === 'ADMIN';
  const isManager = userRole === 'MANAGER' || userRole === 'ADMIN';

  const fetchNotifications = useCallback(async () => {
    try {
      const [notifsRes, unreadRes] = await Promise.allSettled([
        getMyNotifications(),
        getUnreadNotificationCount(),
      ]);
      if (notifsRes.status === 'fulfilled') {
        const data = notifsRes.value.data;
        setNotifications(Array.isArray(data) ? data : []);
      }
      if (unreadRes.status === 'fulfilled') {
        setUnreadNotifCount(Number(unreadRes.value.data) || 0);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);

    const handleRealtimeUpdate = () => {
      fetchNotifications();
    };

    window.addEventListener('notification_received', handleRealtimeUpdate);
    window.addEventListener('store_requests_updated', handleRealtimeUpdate);
    window.addEventListener('store_marketplace_updated', handleRealtimeUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('notification_received', handleRealtimeUpdate);
      window.removeEventListener('store_requests_updated', handleRealtimeUpdate);
      window.removeEventListener('store_marketplace_updated', handleRealtimeUpdate);
    };
  }, [fetchNotifications]);

  // Load real pending counts
  useEffect(() => {
    if (!selectedStoreId) return;
    let isMounted = true;

    if (isManager) {
      getStoreLeaveRequests(selectedStoreId, 'PENDING')
        .then((res) => {
          if (isMounted) {
            const list = Array.isArray(res.data) ? res.data : [];
            setPendingLeaveCount(list.length);
          }
        })
        .catch(() => isMounted && setPendingLeaveCount(0));

      getStoreSwapRequests(selectedStoreId, 'PENDING')
        .then((res) => {
          if (isMounted) {
            const list = Array.isArray(res.data) ? res.data : [];
            setPendingSwapCount(list.length);
          }
        })
        .catch(() => isMounted && setPendingSwapCount(0));
    } else {
      getMyLeaveRequests(selectedStoreId)
        .then((res) => {
          if (isMounted) {
            const list = Array.isArray(res.data) ? res.data.filter((r) => r.status === 'PENDING') : [];
            setPendingLeaveCount(list.length);
          }
        })
        .catch(() => isMounted && setPendingLeaveCount(0));

      getMySwapRequests()
        .then((res) => {
          if (isMounted) {
            const list = Array.isArray(res.data) ? res.data.filter((s) => s.status === 'PENDING' || s.status === 'PENDING_MANAGER') : [];
            setPendingSwapCount(list.length);
          }
        })
        .catch(() => isMounted && setPendingSwapCount(0));
    }

    getMarketplaceShifts(selectedStoreId)
      .then((res) => {
        if (isMounted) {
          const list = Array.isArray(res.data) ? res.data : (res.data?.content || []);
          setOpenShiftsCount(list.length);
        }
      })
      .catch(() => isMounted && setOpenShiftsCount(0));

    return () => { isMounted = false; };
  }, [selectedStoreId, isManager]);

  const totalNotifs = unreadNotifCount + pendingLeaveCount + pendingSwapCount;

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadNotifCount(0);
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.read) {
      try {
        await markNotificationAsRead(notif.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
        );
        setUnreadNotifCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.error('Failed to mark notification read', err);
      }
    }
    setNotifMenuOpen(false);

    const type = (notif.type || '').toUpperCase();
    if (type.includes('SCHEDULE')) {
      navigate('/schedule');
    } else if (type.includes('SWAP')) {
      navigate('/requests?tab=swaps');
    } else if (type.includes('LEAVE')) {
      navigate('/requests?tab=leave');
    } else if (type.includes('MARKET')) {
      navigate('/marketplace');
    } else if (type.includes('ATTENDANCE')) {
      navigate('/attendance');
    } else {
      navigate('/');
    }
  };

  const filteredNotifications = useMemo(() => {
    if (notifTab === 'UNREAD') {
      return notifications.filter((n) => !n.read);
    }
    return notifications;
  }, [notifications, notifTab]);

  const formatRelativeTime = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffSec = Math.floor((now - date) / 1000);
      if (diffSec < 60) return 'Vừa xong';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin} phút trước`;
      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return `${diffHours} giờ trước`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return 'Hôm qua';
      if (diffDays < 7) return `${diffDays} ngày trước`;
      return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    } catch {
      return '';
    }
  };

  const renderNotifIcon = (type = '') => {
    const upper = type.toUpperCase();
    if (upper.includes('SCHEDULE')) {
      return <div className="ss-notif-icon-badge badge-blue"><Calendar size={15} /></div>;
    }
    if (upper.includes('SWAP')) {
      return <div className="ss-notif-icon-badge badge-amber"><RefreshCw size={15} /></div>;
    }
    if (upper.includes('LEAVE')) {
      return <div className="ss-notif-icon-badge badge-indigo"><UserCheck size={15} /></div>;
    }
    if (upper.includes('MARKET')) {
      return <div className="ss-notif-icon-badge badge-emerald"><ShoppingBag size={15} /></div>;
    }
    if (upper.includes('ATTENDANCE')) {
      return <div className="ss-notif-icon-badge badge-orange"><Clock size={15} /></div>;
    }
    return <div className="ss-notif-icon-badge badge-default"><Bell size={15} /></div>;
  };

  // Load stores
  useEffect(() => {
    let isMounted = true;
    getAllStores()
      .then((res) => {
        if (!isMounted) return;
        const list = res.data?.content || res.data?.data || (Array.isArray(res.data) ? res.data : []);
        if (list && list.length > 0) {
          setStores(list);
          const saved = localStorage.getItem('selectedStoreId');
          const matched = (saved && list.find((s) => String(s.id) === String(saved))) || list[0];
          setSelectedStoreId(String(matched.id));
          localStorage.setItem('selectedStoreId', String(matched.id));
        }
      })
      .catch((err) => console.info('Header store fetch info:', err.message));
    return () => { isMounted = false; };
  }, []);

  // Listen to global store changes
  useEffect(() => {
    const handleStoreChanged = (e) => {
      const newId = e.detail?.storeId;
      if (newId) {
        setSelectedStoreId(String(newId));
      }
    };
    window.addEventListener('storeChanged', handleStoreChanged);
    return () => window.removeEventListener('storeChanged', handleStoreChanged);
  }, []);

  // Current logged in user info
  const userEmail = localStorage.getItem('userEmail') || 'user@shiftsync.com';
  const userId = localStorage.getItem('userId') || userEmail;
  const userName = userEmail.split('@')[0];
  const [userAvatar, setUserAvatar] = useState(() => getSavedUserAvatar(userId));
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);

  useEffect(() => {
    const handleAvatarUpdate = () => {
      setUserAvatar(getSavedUserAvatar(userId));
    };
    window.addEventListener('user_avatar_changed', handleAvatarUpdate);
    window.addEventListener('storage', handleAvatarUpdate);
    return () => {
      window.removeEventListener('user_avatar_changed', handleAvatarUpdate);
      window.removeEventListener('storage', handleAvatarUpdate);
    };
  }, [userId]);

  const handleSelectAvatar = (avatar) => {
    saveUserAvatar(userId, avatar.id);
    setUserAvatar(avatar);
    window.dispatchEvent(new CustomEvent('user_avatar_changed', { detail: { avatarId: avatar.id } }));
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userEmail');
    }
    setMenuOpen(false);
    navigate('/login');
  };

  const handleGoSettings = () => {
    setMenuOpen(false);
    navigate('/settings');
  };

  const handleSelectStore = (storeId) => {
    const sId = String(storeId);
    setSelectedStoreId(sId);
    localStorage.setItem('selectedStoreId', sId);
    window.dispatchEvent(new CustomEvent('storeChanged', { detail: { storeId: sId } }));
    setStoreMenuOpen(false);
  };

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
      if (storeMenuRef.current && !storeMenuRef.current.contains(event.target)) {
        setStoreMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isSettingsActive = location.pathname === '/settings' || location.pathname === '/config';

  const roleClass = userRole === 'ADMIN' ? 'role-admin' : userRole === 'MANAGER' ? 'role-manager' : 'role-staff';
  const currentStore = stores.find((s) => String(s.id) === String(selectedStoreId));

  const visibleNavItems = NAV_ITEMS.filter((item) => {
    if (item.roles && !item.roles.includes(userRole)) return false;
    if (item.devOnly && !import.meta.env.DEV && userRole !== 'ADMIN') return false;
    return true;
  });

  return (
    <header className="ss-header">
      {/* Notifications Button with real popover */}
      <div style={{ position: 'relative' }} ref={notifRef}>
        <button
          type="button"
          className="ss-header-icon ss-bell-btn"
          title={`Thông báo hệ thống (${totalNotifs} mới)`}
          aria-label="Thông báo hệ thống"
          aria-expanded={notifMenuOpen}
          onClick={() => setNotifMenuOpen((prev) => !prev)}
        >
          <svg
            width="19"
            height="19"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="ss-bell-svg"
            aria-hidden="true"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {totalNotifs > 0 ? (
            <span className="ss-bell-badge">{totalNotifs}</span>
          ) : (
            <span className="ss-bell-dot" aria-hidden="true" />
          )}
        </button>

        {notifMenuOpen && (
          <div className="ss-dropdown-menu ss-header-notif-dropdown" role="menu">
            <div className="ss-notif-panel-header">
              <div className="ss-notif-title-area">
                <span className="ss-notif-main-title">Thông báo</span>
                {unreadNotifCount > 0 && (
                  <span className="ss-notif-unread-count-pill">{unreadNotifCount} mới</span>
                )}
              </div>
              {unreadNotifCount > 0 && (
                <button
                  type="button"
                  className="ss-notif-mark-all-btn"
                  onClick={handleMarkAllAsRead}
                  title="Đánh dấu tất cả đã đọc"
                >
                  <CheckCheck size={13} />
                  <span>Đã đọc tất cả</span>
                </button>
              )}
            </div>

            <div className="ss-notif-tabs-bar">
              <button
                type="button"
                className={`ss-notif-tab-item ${notifTab === 'ALL' ? 'active' : ''}`}
                onClick={() => setNotifTab('ALL')}
              >
                Tất cả
              </button>
              <button
                type="button"
                className={`ss-notif-tab-item ${notifTab === 'UNREAD' ? 'active' : ''}`}
                onClick={() => setNotifTab('UNREAD')}
              >
                Chưa đọc {unreadNotifCount > 0 && `(${unreadNotifCount})`}
              </button>
              <button
                type="button"
                className={`ss-notif-tab-item ${notifTab === 'REQUESTS' ? 'active' : ''}`}
                onClick={() => setNotifTab('REQUESTS')}
              >
                Yêu cầu {pendingLeaveCount + pendingSwapCount + openShiftsCount > 0 && `(${pendingLeaveCount + pendingSwapCount + openShiftsCount})`}
              </button>
            </div>

            <div className="ss-notif-scroll-area">
              {notifTab === 'REQUESTS' ? (
                <div className="ss-notif-requests-box">
                  {pendingLeaveCount > 0 && (
                    <div
                      className="ss-notif-modern-row"
                      onClick={() => {
                        setNotifMenuOpen(false);
                        navigate('/requests?tab=leave');
                      }}
                    >
                      <div className="ss-notif-icon-badge badge-indigo">
                        <UserCheck size={16} />
                      </div>
                      <div className="ss-notif-info">
                        <span className="ss-notif-title">Đơn nghỉ phép chờ duyệt</span>
                        <span className="ss-notif-desc">Có {pendingLeaveCount} đơn đang chờ phê duyệt</span>
                      </div>
                      <span className="ss-notif-pill pill-indigo">{pendingLeaveCount}</span>
                    </div>
                  )}

                  {pendingSwapCount > 0 && (
                    <div
                      className="ss-notif-modern-row"
                      onClick={() => {
                        setNotifMenuOpen(false);
                        navigate('/requests?tab=swaps');
                      }}
                    >
                      <div className="ss-notif-icon-badge badge-amber">
                        <RefreshCw size={16} />
                      </div>
                      <div className="ss-notif-info">
                        <span className="ss-notif-title">Yêu cầu đổi ca</span>
                        <span className="ss-notif-desc">Có {pendingSwapCount} yêu cầu đổi ca cần xử lý</span>
                      </div>
                      <span className="ss-notif-pill pill-amber">{pendingSwapCount}</span>
                    </div>
                  )}

                  {openShiftsCount > 0 && (
                    <div
                      className="ss-notif-modern-row"
                      onClick={() => {
                        setNotifMenuOpen(false);
                        navigate('/marketplace');
                      }}
                    >
                      <div className="ss-notif-icon-badge badge-emerald">
                        <ShoppingBag size={16} />
                      </div>
                      <div className="ss-notif-info">
                        <span className="ss-notif-title">Sàn ca mở</span>
                        <span className="ss-notif-desc">Có {openShiftsCount} ca đang tìm nhân viên nhận</span>
                      </div>
                      <span className="ss-notif-pill pill-emerald">{openShiftsCount}</span>
                    </div>
                  )}

                  {pendingLeaveCount === 0 && pendingSwapCount === 0 && openShiftsCount === 0 && (
                    <div className="ss-notif-empty-state">
                      <FileText size={28} className="ss-empty-icon" />
                      <span>Không có yêu cầu nào đang chờ</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="ss-notif-feed-list">
                  {filteredNotifications.length === 0 ? (
                    <div className="ss-notif-empty-state">
                      <Bell size={28} className="ss-empty-icon" />
                      <span>{notifTab === 'UNREAD' ? 'Bạn đã đọc hết mọi thông báo' : 'Không có thông báo nào'}</span>
                    </div>
                  ) : (
                    filteredNotifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`ss-notif-modern-row ${!notif.read ? 'is-unread' : ''}`}
                        onClick={() => handleNotificationClick(notif)}
                      >
                        {renderNotifIcon(notif.type)}
                        <div className="ss-notif-info">
                          <div className="ss-notif-top-row">
                            <span className="ss-notif-title">{notif.title}</span>
                            <span className="ss-notif-time">{formatRelativeTime(notif.createdAt)}</span>
                          </div>
                          <p className="ss-notif-msg">{notif.message}</p>
                        </div>
                        {!notif.read && <span className="ss-notif-unread-dot" />}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="ss-header-nav" aria-label="Điều hướng chính">
        {visibleNavItems.map((item) => {
          const isCustomActive = item.aliases && item.aliases.includes(location.pathname);
          const reqCount = item.key === 'requests' ? pendingLeaveCount + pendingSwapCount : 0;
          const mktCount = item.key === 'marketplace' ? openShiftsCount : 0;
          const badgeCount = reqCount || mktCount;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `ss-nav-item ${isActive || isCustomActive ? 'active' : ''}`}
            >
              <span className="ss-nav-label">{item.label}</span>
              {badgeCount > 0 && (
                <span className={`ss-nav-micro-badge ${item.key === 'marketplace' ? 'badge-market' : 'badge-req'}`}>
                  {badgeCount}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Global Store Switcher */}
      <div className="ss-header-store-wrapper" ref={storeMenuRef}>
        <button
          type="button"
          id="ss-header-store-btn"
          className={`ss-header-store-btn ${storeMenuOpen ? 'active' : ''} ${!isAdmin || stores.length <= 1 ? 'static-store-view' : ''}`}
          onClick={() => {
            if (isAdmin && stores.length > 1) {
              setStoreMenuOpen((prev) => !prev);
            }
          }}
          title={isAdmin && stores.length > 1 ? "Chọn chi nhánh làm việc" : `Chi nhánh làm việc: ${currentStore?.name || 'Chi nhánh của bạn'}`}
          aria-label={`Chi nhánh hiện tại: ${currentStore?.name || 'Chọn chi nhánh'}`}
          aria-expanded={storeMenuOpen}
          aria-haspopup={isAdmin && stores.length > 1}
          style={{ cursor: isAdmin && stores.length > 1 ? 'pointer' : 'default' }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ss-store-icon" aria-hidden="true">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
          <span className="ss-header-store-name">{currentStore?.name || 'Chọn chi nhánh'}</span>
          {isAdmin && stores.length > 1 && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`ss-chevron-icon ${storeMenuOpen ? 'open' : ''}`} aria-hidden="true">
              <path d="m6 9 6 6 6-6" />
            </svg>
          )}
        </button>

        {isAdmin && stores.length > 1 && storeMenuOpen && (
          <div className="ss-dropdown-menu ss-header-store-dropdown" role="menu" aria-label="Chọn chi nhánh">
            <div className="ss-dropdown-user-header">
              <span className="ss-dropdown-full-email">CHI NHÁNH ({stores.length})</span>
            </div>
            <div className="ss-dropdown-divider" />
            <div className="ss-header-store-list">
              {stores.map((s) => {
                const isSelected = String(s.id) === String(selectedStoreId);
                return (
                  <button
                    key={s.id}
                    type="button"
                    className={`ss-dropdown-item ss-header-store-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelectStore(s.id)}
                    role="menuitem"
                  >
                    <div className="ss-store-menu-item-text">
                      <span className="ss-store-menu-name">{s.name}</span>
                      {s.address && <span className="ss-store-menu-addr">{s.address}</span>}
                    </div>
                    {isSelected && (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#51A33D"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="ss-store-menu-check"
                        aria-hidden="true"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                );
              })}
              {stores.length === 0 && (
                <div className="ss-header-store-empty">Chưa có chi nhánh nào</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* User Identity & Settings Menu */}
      <div className="ss-header-user-wrapper" ref={menuRef}>
        <button
          type="button"
          className={`ss-user-profile-btn ${menuOpen ? 'active' : ''}`}
          onClick={() => setMenuOpen(prev => !prev)}
          title={`Tài khoản: ${userEmail} (${userRole})`}
          aria-expanded={menuOpen}
          aria-haspopup="true"
        >
          <div className="ss-user-avatar" style={userAvatar?.avatar ? { overflow: 'hidden', padding: 0 } : {}}>
            {userAvatar?.avatar ? (
              <img src={userAvatar.avatar} alt={userAvatar.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              userName.slice(0, 2).toUpperCase()
            )}
          </div>
          <div className="ss-user-info-text">
            <span className="ss-user-email">{userName}</span>
            <span className={`ss-user-role-badge ${roleClass}`}>{userRole}</span>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`ss-chevron-icon ${menuOpen ? 'open' : ''}`}>
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        {menuOpen && (
          <div className="ss-dropdown-menu" role="menu">
            <div className="ss-dropdown-user-header">
              <span className="ss-dropdown-full-email">{userEmail}</span>
              <span className={`ss-dropdown-role-tag ${roleClass}`}>{userRole}</span>
            </div>

            <div className="ss-dropdown-divider" />

            {isAdmin && (
              <button
                type="button"
                className={`ss-dropdown-item ${location.pathname === '/admin' ? 'selected' : ''}`}
                onClick={() => {
                  setMenuOpen(false);
                  navigate('/admin');
                }}
                role="menuitem"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <span>Quản trị hệ thống (Admin)</span>
              </button>
            )}

            <button
              type="button"
              className="ss-dropdown-item"
              onClick={() => {
                setMenuOpen(false);
                setAvatarModalOpen(true);
              }}
              role="menuitem"
            >
              <Sparkles size={17} color="#a855f7" />
              <span>Bộ sưu tập Avatar 3D</span>
            </button>

            <button
              type="button"
              className={`ss-dropdown-item ${isSettingsActive ? 'selected' : ''}`}
              onClick={handleGoSettings}
              role="menuitem"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
              <span>Cấu hình hệ thống</span>
            </button>

            <div className="ss-dropdown-divider" />

            <button
              type="button"
              className="ss-dropdown-item ss-dropdown-logout"
              onClick={handleLogout}
              role="menuitem"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              <span>Đăng xuất</span>
            </button>
          </div>
        )}
      </div>

      {avatarModalOpen && (
        <AvatarCollectionModal
          isOpen={avatarModalOpen}
          onClose={() => setAvatarModalOpen(false)}
          currentAvatarId={userAvatar?.id}
          onSelectAvatar={handleSelectAvatar}
          title="Bộ sưu tập Avatar 3D cá nhân"
        />
      )}
    </header>
  );
}