import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import './Header.css';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { logout } from '../services/authService';
import { getAllStores } from '../services/storeService';
import { getStoreLeaveRequests, getMyLeaveRequests } from '../services/leaveService';
import { getStoreSwapRequests, getMySwapRequests } from '../services/swapService';
import { getMarketplaceShifts } from '../services/marketplaceService';
import { getStoreAdjustmentRequests, getMyAdjustmentRequests } from '../services/adjustmentService';
import { getIncomingWorkforceRequests, getMyWorkforceProposals } from '../services/workforceService';
import { getRequests } from '../services/requestService';
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
import AvatarCollectionModal from './AvatarCollectionModal';
import Avatar3DWeb from './Avatar3DWeb';
import { AVATAR_OPTIONS, getAvatarById } from './avatarConfigs';
const NAV_ITEMS = [
  { to: '/', label: 'DASHBOARD', key: 'dashboard' },
  { to: '/schedule', label: 'WORKFORCE SCHEDULING', key: 'scheduler', aliases: ['/availability', '/staff-availability'], title: 'Lập lịch & Quản lý khả năng nhân sự' },
  { to: '/time-workforce', label: 'TIME & WORKFORCE', key: 'time-workforce', aliases: ['/attendance', '/requests', '/request'], title: 'Quản lý thời gian làm việc & trạng thái nhân sự' },
  { to: '/marketplace', label: 'MARKETPLACE', key: 'marketplace' },
  { to: '/employees', label: 'EMPLOYEES', key: 'employees', aliases: ['/skills', '/stores', '/payroll'], roles: ['ADMIN', 'MANAGER'] },
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
  const [pendingAdjCount, setPendingAdjCount] = useState(0);
  const [pendingWorkforceCount, setPendingWorkforceCount] = useState(0);
  const [pendingStaffReqCount, setPendingStaffReqCount] = useState(0);
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

  const fetchHeaderCounts = useCallback(async () => {
    if (!selectedStoreId) return;
    try {
      if (isManager) {
        const [leaveRes, swapRes, adjRes, wfRes, reqRes, mktRes] = await Promise.allSettled([
          getStoreLeaveRequests(selectedStoreId, 'PENDING'),
          getStoreSwapRequests(selectedStoreId, 'PENDING'),
          getStoreAdjustmentRequests(selectedStoreId, 'PENDING'),
          getIncomingWorkforceRequests(selectedStoreId),
          getRequests(),
          getMarketplaceShifts(selectedStoreId),
        ]);

        if (leaveRes.status === 'fulfilled') {
          const list = Array.isArray(leaveRes.value.data) ? leaveRes.value.data : [];
          setPendingLeaveCount(list.length);
        }
        if (swapRes.status === 'fulfilled') {
          const list = Array.isArray(swapRes.value.data) ? swapRes.value.data : [];
          setPendingSwapCount(list.length);
        }
        if (adjRes.status === 'fulfilled') {
          const list = Array.isArray(adjRes.value.data) ? adjRes.value.data : [];
          setPendingAdjCount(list.length);
        }
        if (wfRes.status === 'fulfilled') {
          const list = Array.isArray(wfRes.value.data) ? wfRes.value.data : [];
          const pendingWf = list.filter((r) => r.status === 'PENDING' || r.status === 'PROPOSED');
          setPendingWorkforceCount(pendingWf.length);
        }
        if (reqRes.status === 'fulfilled') {
          const raw = reqRes.value;
          const list = Array.isArray(raw) ? raw : (raw?.data || []);
          const pendingReqs = list.filter((r) => (r.status === 'PENDING' || !r.status) && r.typeCategory !== 'swap');
          setPendingStaffReqCount(pendingReqs.length);
        }
        if (mktRes.status === 'fulfilled') {
          const list = Array.isArray(mktRes.value.data) ? mktRes.value.data : (mktRes.value.data?.content || []);
          setOpenShiftsCount(list.length);
        }
      } else {
        const [myLeaveRes, mySwapRes, myAdjRes, myWfRes, reqRes, mktRes] = await Promise.allSettled([
          getMyLeaveRequests(selectedStoreId),
          getMySwapRequests(),
          getMyAdjustmentRequests(selectedStoreId),
          getMyWorkforceProposals(),
          getRequests(),
          getMarketplaceShifts(selectedStoreId),
        ]);

        if (myLeaveRes.status === 'fulfilled') {
          const list = Array.isArray(myLeaveRes.value.data) ? myLeaveRes.value.data.filter((r) => r.status === 'PENDING') : [];
          setPendingLeaveCount(list.length);
        }
        if (mySwapRes.status === 'fulfilled') {
          const list = Array.isArray(mySwapRes.value.data) ? mySwapRes.value.data.filter((s) => s.status === 'PENDING' || s.status === 'PENDING_MANAGER') : [];
          setPendingSwapCount(list.length);
        }
        if (myAdjRes.status === 'fulfilled') {
          const list = Array.isArray(myAdjRes.value.data) ? myAdjRes.value.data.filter((r) => r.status === 'PENDING') : [];
          setPendingAdjCount(list.length);
        }
        if (myWfRes.status === 'fulfilled') {
          const list = Array.isArray(myWfRes.value.data) ? myWfRes.value.data.filter((p) => p.status === 'PENDING' || p.status === 'PROPOSED') : [];
          setPendingWorkforceCount(list.length);
        }
        if (reqRes.status === 'fulfilled') {
          const raw = reqRes.value;
          const list = Array.isArray(raw) ? raw : (raw?.data || []);
          const pendingReqs = list.filter((r) => (r.status === 'PENDING' || !r.status) && r.typeCategory !== 'swap');
          setPendingStaffReqCount(pendingReqs.length);
        }
        if (mktRes.status === 'fulfilled') {
          const list = Array.isArray(mktRes.value.data) ? mktRes.value.data : (mktRes.value.data?.content || []);
          setOpenShiftsCount(list.length);
        }
      }
    } catch {
      // ignore
    }
  }, [selectedStoreId, isManager]);

  useEffect(() => {
    fetchNotifications();
    fetchHeaderCounts();
    const interval = setInterval(() => {
      fetchNotifications();
      fetchHeaderCounts();
    }, 20000);

    const handleRealtimeUpdate = () => {
      fetchNotifications();
      fetchHeaderCounts();
    };

    window.addEventListener('notification_received', handleRealtimeUpdate);
    window.addEventListener('store_requests_updated', handleRealtimeUpdate);
    window.addEventListener('store_marketplace_updated', handleRealtimeUpdate);
    window.addEventListener('store_shifts_updated', handleRealtimeUpdate);
    window.addEventListener('store_attendance_updated', handleRealtimeUpdate);
    window.addEventListener('storeChanged', handleRealtimeUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('notification_received', handleRealtimeUpdate);
      window.removeEventListener('store_requests_updated', handleRealtimeUpdate);
      window.removeEventListener('store_marketplace_updated', handleRealtimeUpdate);
      window.removeEventListener('store_shifts_updated', handleRealtimeUpdate);
      window.removeEventListener('store_attendance_updated', handleRealtimeUpdate);
      window.removeEventListener('storeChanged', handleRealtimeUpdate);
    };
  }, [fetchNotifications, fetchHeaderCounts]);

  const totalPendingRequests = pendingLeaveCount;

  const totalNotifs = unreadNotifCount + totalPendingRequests + pendingSwapCount + pendingAdjCount + pendingWorkforceCount;

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
      navigate('/marketplace?tab=SWAP');
    } else if (type.includes('LEAVE')) {
      navigate('/time-workforce?tab=leave');
    } else if (type.includes('WORKFORCE')) {
      navigate('/marketplace?tab=CROSS_STORE');
    } else if (type.includes('MARKET')) {
      navigate('/marketplace');
    } else if (type.includes('ATTENDANCE')) {
      navigate('/time-workforce?tab=adjustments');
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
  const [userAvatarId, setUserAvatarId] = useState(() => localStorage.getItem(`user_profile_avatar_${userId}`) || localStorage.getItem('userAvatarId') || 'dilan');
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);

  useEffect(() => {
    const handleAvatarUpdate = () => {
      const saved = localStorage.getItem(`user_profile_avatar_${userId}`) || localStorage.getItem('userAvatarId') || 'dilan';
      setUserAvatarId(saved);
    };
    window.addEventListener('user_avatar_changed', handleAvatarUpdate);
    window.addEventListener('avatarUpdated', handleAvatarUpdate);
    window.addEventListener('storage', handleAvatarUpdate);
    return () => {
      window.removeEventListener('user_avatar_changed', handleAvatarUpdate);
      window.removeEventListener('avatarUpdated', handleAvatarUpdate);
      window.removeEventListener('storage', handleAvatarUpdate);
    };
  }, [userId]);

  const handleSelectAvatar = async (avatarId) => {
    localStorage.setItem(`user_profile_avatar_${userId}`, avatarId);
    localStorage.setItem('userAvatarId', avatarId);
    setUserAvatarId(avatarId);
    window.dispatchEvent(new CustomEvent('user_avatar_changed', { detail: { avatarId } }));
    window.dispatchEvent(new CustomEvent('avatarUpdated', { detail: { avatarId } }));
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
                Yêu cầu {totalPendingRequests + openShiftsCount > 0 && `(${totalPendingRequests + openShiftsCount})`}
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
                        navigate('/time-workforce?tab=leave');
                      }}
                    >
                      <div className="ss-notif-icon-badge badge-indigo">
                        <UserCheck size={16} />
                      </div>
                      <div className="ss-notif-info">
                        <span className="ss-notif-title">Đơn nghỉ phép chờ duyệt</span>
                        <span className="ss-notif-desc">Có {pendingLeaveCount} đơn đang chờ phê duyệt (Time & Workforce)</span>
                      </div>
                      <span className="ss-notif-pill pill-indigo">{pendingLeaveCount}</span>
                    </div>
                  )}

                  {pendingSwapCount > 0 && (
                    <div
                      className="ss-notif-modern-row"
                      onClick={() => {
                        setNotifMenuOpen(false);
                        navigate('/marketplace?tab=SWAP');
                      }}
                    >
                      <div className="ss-notif-icon-badge badge-amber">
                        <RefreshCw size={16} />
                      </div>
                      <div className="ss-notif-info">
                        <span className="ss-notif-title">Yêu cầu đổi ca</span>
                        <span className="ss-notif-desc">Có {pendingSwapCount} yêu cầu đổi ca cần xử lý (Sàn Marketplace)</span>
                      </div>
                      <span className="ss-notif-pill pill-amber">{pendingSwapCount}</span>
                    </div>
                  )}

                  {pendingAdjCount > 0 && (
                    <div
                      className="ss-notif-modern-row"
                      onClick={() => {
                        setNotifMenuOpen(false);
                        navigate('/time-workforce?tab=adjustments');
                      }}
                    >
                      <div className="ss-notif-icon-badge badge-amber">
                        <Clock size={16} />
                      </div>
                      <div className="ss-notif-info">
                        <span className="ss-notif-title">Giải trình chấm công</span>
                        <span className="ss-notif-desc">Có {pendingAdjCount} giải trình chấm công chờ duyệt (Time & Workforce)</span>
                      </div>
                      <span className="ss-notif-pill pill-amber">{pendingAdjCount}</span>
                    </div>
                  )}

                  {pendingWorkforceCount > 0 && (
                    <div
                      className="ss-notif-modern-row"
                      onClick={() => {
                        setNotifMenuOpen(false);
                        navigate('/marketplace?tab=WORKFORCE');
                      }}
                    >
                      <div className="ss-notif-icon-badge badge-indigo">
                        <Calendar size={16} />
                      </div>
                      <div className="ss-notif-info">
                        <span className="ss-notif-title">Chi viện nhân sự</span>
                        <span className="ss-notif-desc">Có {pendingWorkforceCount} yêu cầu mượn/chi viện nhân sự (Sàn Marketplace)</span>
                      </div>
                      <span className="ss-notif-pill pill-indigo">{pendingWorkforceCount}</span>
                    </div>
                  )}

                  {pendingStaffReqCount > 0 && (
                    <div
                      className="ss-notif-modern-row"
                      onClick={() => {
                        setNotifMenuOpen(false);
                        navigate('/requests');
                      }}
                    >
                      <div className="ss-notif-icon-badge badge-indigo">
                        <FileText size={16} />
                      </div>
                      <div className="ss-notif-info">
                        <span className="ss-notif-title">Yêu cầu từ nhân sự</span>
                        <span className="ss-notif-desc">Có {pendingStaffReqCount} đơn đề xuất chờ xử lý</span>
                      </div>
                      <span className="ss-notif-pill pill-indigo">{pendingStaffReqCount}</span>
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

                  {totalPendingRequests === 0 && openShiftsCount === 0 && (
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
          const twCount = item.key === 'time-workforce' ? (pendingLeaveCount + pendingAdjCount) : 0;
          const mktCount = item.key === 'marketplace' ? (openShiftsCount + pendingSwapCount + pendingWorkforceCount) : 0;
          const badgeCount = twCount || mktCount;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              title={item.title || item.label}
              className={({ isActive }) => `ss-nav-item ${isActive || isCustomActive ? 'active' : ''}`}
            >
              <span className="ss-nav-label">{item.label}</span>
              {badgeCount > 0 && (
                <span className={`ss-nav-micro-badge ${item.key === 'marketplace' ? 'badge-market' : item.key === 'time-workforce' ? 'badge-indigo' : 'badge-req'}`}>
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
          <div className="ss-user-avatar" style={{ overflow: 'hidden', padding: 0, background: 'transparent' }}>
            <Avatar3DWeb avatarId={userAvatarId || 'dilan'} size={34} />
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
          currentAvatarId={userAvatarId}
          onSelectAvatar={handleSelectAvatar}
          targetUserName={userName}
        />
      )}
    </header>
  );
}