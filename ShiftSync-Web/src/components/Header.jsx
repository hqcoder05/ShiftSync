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
  Sparkles,
  LayoutGrid,
  TrendingUp,
  Sliders,
  Users,
  Award,
  Building2,
  DollarSign,
  Shield,
  Settings,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  PanelLeft,
  PanelTop,
  ArrowRight,
  Layers,
  Store,
} from 'lucide-react';
import AvatarCollectionModal from './AvatarCollectionModal';
import Avatar3DWeb from './Avatar3DWeb';
import { AVATAR_OPTIONS, getAvatarById } from './avatarConfigs';

// Biểu tượng Logo Độc Quyền ShiftSync (Aero-Precision Kinetic Shift & Sync Monogram)
const ShiftSyncLogoMark = ({ size = 26 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="ss-brand-svg-mark"
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="ss-emblem-grad" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#10b981" />
        <stop offset="55%" stopColor="#059669" />
        <stop offset="100%" stopColor="#06b6d4" />
      </linearGradient>
      <linearGradient id="ss-emblem-sub" x1="28" y1="28" x2="4" y2="4" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#34d399" />
        <stop offset="100%" stopColor="#10b981" />
      </linearGradient>
    </defs>
    {/* Tầng 1: Khối ca làm việc trên (Shift Upper Bar + Anchor Node) */}
    <rect x="4" y="6" width="16" height="5.5" rx="2.75" fill="url(#ss-emblem-grad)" />
    <circle cx="26" cy="8.75" r="2.75" fill="#34d399" />
    
    {/* Tầng 2: Điểm giao thoa đồng bộ trung tâm (Sync Overlap Window) */}
    <rect x="9.5" y="13.25" width="13" height="5.5" rx="2.75" fill="url(#ss-emblem-grad)" />
    
    {/* Tầng 3: Khối ca làm việc dưới (Shift Lower Bar + Anchor Node) */}
    <circle cx="6" cy="23.25" r="2.75" fill="#06b6d4" />
    <rect x="12" y="20.5" width="16" height="5.5" rx="2.75" fill="url(#ss-emblem-sub)" />
  </svg>
);

const NAV_ITEMS = [
  {
    to: '/',
    label: 'Dashboard',
    key: 'dashboard',
    icon: LayoutGrid,
    categoryTag: 'KHÔNG GIAN VẬN HÀNH',
    description: 'Trung tâm chỉ huy, số liệu KPI & không gian 3D Digital Twin',
    subItems: [
      {
        to: '/',
        label: 'Không Gian 3D Digital Twin',
        desc: 'Bản đồ 3D thời gian thực, KPI trạm & Attention Center',
        icon: Layers,
        badge: 'Live 3D',
      },
      {
        to: '/avatar-studio',
        label: 'Studio Avatar 3D',
        desc: 'Tùy biến ngoại hình, kiểu tóc & trang phục nhân sự',
        icon: Sparkles,
      },
      {
        to: '/demand-planning',
        label: 'Dự Báo Nhu Cầu Nhân Sự',
        desc: 'Tính toán định biên ca tối ưu theo dữ liệu kinh doanh',
        icon: TrendingUp,
        roles: ['ADMIN', 'MANAGER'],
      },
    ],
    quickAction: {
      label: 'Mở Không Gian 3D',
      to: '/',
    },
  },
  {
    to: '/schedule',
    label: 'Lập Lịch Ca',
    key: 'scheduler',
    aliases: ['/availability', '/staff-availability', '/demand-planning'],
    title: 'Lập lịch & Quản lý khả năng nhân sự',
    icon: Calendar,
    categoryTag: 'ĐIỀU PHỐI & LẬP LỊCH',
    description: 'Xếp ca tự động, lịch làm việc tuần & khung giờ rảnh nhân viên',
    subItems: [
      {
        to: '/schedule',
        label: 'Lịch Làm Việc Chuỗi',
        desc: 'Lập lịch ca tuần/tháng, điều phối vị trí & phát hành ca',
        icon: Calendar,
      },
      {
        to: '/schedule?tab=availability',
        label: 'Khả Năng Làm Việc Nhân Sự',
        desc: 'Đăng ký khung giờ rảnh & quản lý lịch bận nhân viên',
        icon: Clock,
      },
      {
        to: '/demand-planning',
        label: 'Dự Báo Nhu Cầu (Demand Planning)',
        desc: 'Dự báo lượng khách theo giờ và tính số nhân sự cần thiết',
        icon: TrendingUp,
        roles: ['ADMIN', 'MANAGER'],
      },
      {
        to: '/settings?tab=scheduler',
        label: 'Cấu Hình Thuật Toán Xếp Ca',
        desc: 'Trọng số ưu tiên công bằng, phân bổ giờ công & kỹ năng',
        icon: Sliders,
        roles: ['ADMIN', 'MANAGER'],
      },
    ],
    quickAction: {
      label: 'Xem Lịch Ca Tuần Này',
      to: '/schedule',
    },
  },
  {
    to: '/time-workforce',
    label: 'Chấm Công & Phép',
    key: 'time-workforce',
    aliases: ['/attendance', '/requests', '/request'],
    title: 'Quản lý thời gian làm việc & trạng thái nhân sự',
    icon: Clock,
    categoryTag: 'CHẤM CÔNG & PHÊ DUYỆT',
    description: 'Chấm công thời gian thực, duyệt nghỉ phép & giải trình',
    subItems: [
      {
        to: '/time-workforce',
        label: 'Bảng Chấm Công Thời Gian Thực',
        desc: 'Giám sát check-in, check-out thực tế theo trạm',
        icon: UserCheck,
      },
      {
        to: '/attendance/leave',
        label: 'Đơn Nghỉ Phép',
        desc: 'Phê duyệt & theo dõi đơn xin nghỉ phép của nhân sự',
        icon: FileText,
        badgeKey: 'pendingLeaveCount',
      },
      {
        to: '/attendance/explain',
        label: 'Giải Trình Chấm Công',
        desc: 'Xử lý các ca quên quẹt thẻ, sai lệch giờ làm việc',
        icon: Clock,
        badgeKey: 'pendingAdjCount',
      },

    ],
    quickAction: {
      label: 'Kiểm Tra Chấm Công Hôm Nay',
      to: '/time-workforce',
    },
  },
  {
    to: '/marketplace',
    label: 'Chợ Ca Mở',
    key: 'marketplace',
    icon: ShoppingBag,
    categoryTag: 'SÀN CA & ĐIỀU ĐỘNG',
    description: 'Sàn trao đổi ca trực, nhận ca mở & chi viện nhân sự',
    subItems: [
      {
        to: '/marketplace',
        label: 'Sàn Nhận Ca Mở (Open Shifts)',
        desc: 'Ca trống cần nhân viên nhận thêm để tăng thu nhập',
        icon: ShoppingBag,
        badgeKey: 'openShiftsCount',
      },
      {
        to: '/marketplace?tab=SWAP',
        label: 'Yêu Cầu Đổi Ca (Shift Swap)',
        desc: 'Hoán đổi ca làm việc linh hoạt giữa các nhân viên',
        icon: RefreshCw,
        badgeKey: 'pendingSwapCount',
      },
      {
        to: '/marketplace?tab=WORKFORCE',
        label: 'Chi Viện Nhân Sự Liên Chuỗi',
        desc: 'Mượn & điều động nhân sự hỗ trợ giữa các chi nhánh',
        icon: Users,
        badgeKey: 'pendingWorkforceCount',
      },
    ],
    quickAction: {
      label: 'Khám Phá Sàn Ca Mở',
      to: '/marketplace',
    },
  },
  {
    to: '/employees',
    label: 'Hồ Sơ Nhân Sự',
    key: 'employees',
    aliases: ['/skills', '/stores', '/payroll'],
    roles: ['ADMIN', 'MANAGER'],
    icon: Users,
    categoryTag: 'NHÂN SỰ & CHI NHÁNH',
    description: 'Hồ sơ nhân viên, ma trận kỹ năng, chi nhánh & tính lương',
    subItems: [
      {
        to: '/employees',
        label: 'Danh Bạ Nhân Viên',
        desc: 'Quản lý hồ sơ, chức vụ, hợp đồng và chi nhánh',
        icon: Users,
      },
      {
        to: '/skills',
        label: 'Ma Trận Kỹ Năng (Skills Matrix)',
        desc: 'Đánh giá cấp độ năng lực Barista, Thu ngân, Bếp',
        icon: Award,
      },
      {
        to: '/stores',
        label: 'Mạng Lưới Chi Nhánh (Stores)',
        desc: 'Thông tin cửa hàng, mặt bằng 3D & trạm làm việc',
        icon: Building2,
      },
      {
        to: '/employees?tab=payroll',
        label: 'Bảng Tính Lương & Công (Payroll)',
        desc: 'Tổng hợp giờ làm, hệ số ca đêm & đãi ngộ nhân viên',
        icon: DollarSign,
      },
    ],
    quickAction: {
      label: 'Xem Danh Sách Nhân Sự',
      to: '/employees',
    },
  },
  {
    to: '/admin',
    label: 'Quản Trị',
    key: 'admin',
    roles: ['ADMIN'],
    icon: Shield,
    categoryTag: 'QUẢN TRỊ HỆ THỐNG',
    description: 'Quản lý người dùng, phân quyền & cấu hình toàn cục',
    subItems: [
      {
        to: '/admin',
        label: 'Quản Trị Người Dùng & Phân Quyền',
        desc: 'Cấp quyền truy cập, tạo tài khoản và vai trò bảo mật',
        icon: Shield,
      },
      {
        to: '/settings',
        label: 'Cấu Hình Hệ Thống',
        desc: 'Thiết lập tham số toàn cục và thông số hoạt động',
        icon: Settings,
      },
    ],
    quickAction: {
      label: 'Vào Bảng Quản Trị Admin',
      to: '/admin',
    },
  },
];

export default function Header({ navMode = 'top', onToggleNavMode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Flyout Navigation interactive state
  const [activeFlyoutKey, setActiveFlyoutKey] = useState(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [expandedMobileModule, setExpandedMobileModule] = useState(null);
  const flyoutTimeoutRef = useRef(null);
  const navRef = useRef(null);

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
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    if (!token) return;
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
        const count = typeof unreadRes.value.data === 'object'
          ? (unreadRes.value.data?.unreadCount ?? 0)
          : Number(unreadRes.value.data) || 0;
        setUnreadNotifCount(count);
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchHeaderCounts = useCallback(async () => {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    if (!token || !selectedStoreId) return;
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
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true, read: true })));
      setUnreadNotifCount(0);
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  const handleNotificationClick = async (notif) => {
    const isUnread = !(notif.isRead ?? notif.read ?? false);
    if (isUnread) {
      try {
        await markNotificationAsRead(notif.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, isRead: true, read: true } : n))
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
      navigate('/attendance/leave');
    } else if (type.includes('WORKFORCE')) {
      navigate('/marketplace?tab=CROSS_STORE');
    } else if (type.includes('MARKET')) {
      navigate('/marketplace');
    } else if (type.includes('ATTENDANCE')) {
      navigate('/attendance/explain');
    } else {
      navigate('/');
    }
  };

  const filteredNotifications = useMemo(() => {
    if (notifTab === 'UNREAD') {
      return notifications.filter((n) => !(n.isRead ?? n.read ?? false));
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

  const handleSelectAvatar = (avatarId) => {
    setUserAvatarId(avatarId);
    localStorage.setItem(`user_profile_avatar_${userId}`, avatarId);
    localStorage.setItem('userAvatarId', avatarId);
    window.dispatchEvent(new CustomEvent('user_avatar_changed', { detail: { avatarId, userId } }));
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleGoSettings = () => {
    setMenuOpen(false);
    navigate('/settings');
  };

  const handleSelectStore = (storeId) => {
    setSelectedStoreId(String(storeId));
    localStorage.setItem('selectedStoreId', String(storeId));
    setStoreMenuOpen(false);
    window.dispatchEvent(new CustomEvent('storeChanged', { detail: { storeId } }));
  };

  // Flyout trigger handlers with smooth debounce
  const handleNavMouseEnter = (key) => {
    if (flyoutTimeoutRef.current) clearTimeout(flyoutTimeoutRef.current);
    flyoutTimeoutRef.current = setTimeout(() => {
      setActiveFlyoutKey(key);
    }, 90);
  };

  const handleNavMouseLeave = () => {
    if (flyoutTimeoutRef.current) clearTimeout(flyoutTimeoutRef.current);
    flyoutTimeoutRef.current = setTimeout(() => {
      setActiveFlyoutKey(null);
    }, 180);
  };

  const handleNavClick = (key) => {
    setActiveFlyoutKey((prev) => (prev === key ? null : key));
  };

  // Close flyout on route change
  useEffect(() => {
    setActiveFlyoutKey(null);
    setMobileDrawerOpen(false);
  }, [location.pathname, location.search]);

  // Close flyout and popovers on Escape or outside click
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setActiveFlyoutKey(null);
        setMobileDrawerOpen(false);
        setNotifMenuOpen(false);
        setStoreMenuOpen(false);
        setMenuOpen(false);
      }
    };

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
      if (storeMenuRef.current && !storeMenuRef.current.contains(e.target)) {
        setStoreMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifMenuOpen(false);
      }
      if (navRef.current && !navRef.current.contains(e.target)) {
        setActiveFlyoutKey(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const getBadgeCount = (badgeKey) => {
    if (!badgeKey) return 0;
    switch (badgeKey) {
      case 'pendingLeaveCount':
        return pendingLeaveCount;
      case 'pendingSwapCount':
        return pendingSwapCount;
      case 'pendingAdjCount':
        return pendingAdjCount;
      case 'pendingWorkforceCount':
        return pendingWorkforceCount;
      case 'pendingStaffReqCount':
        return pendingStaffReqCount;
      case 'openShiftsCount':
        return openShiftsCount;
      default:
        return 0;
    }
  };

  const isSettingsActive = location.pathname === '/settings' || location.pathname === '/config';
  const roleClass = userRole === 'ADMIN' ? 'role-admin' : userRole === 'MANAGER' ? 'role-manager' : 'role-staff';
  const currentStore = stores.find((s) => String(s.id) === String(selectedStoreId));

  const visibleNavItems = NAV_ITEMS.filter((item) => {
    if (item.roles && !item.roles.includes(userRole)) return false;
    return true;
  });

  // Render Flyout Submenu Panel (Shared between Top and Rail modes)
  const renderFlyoutPanel = (item, isRail = false) => {
    if (!item.subItems || item.subItems.length === 0) return null;

    return (
      <div
        className={`ss-flyout-panel ${isRail ? 'ss-flyout-rail' : 'ss-flyout-top'}`}
        role="menu"
        aria-label={`Menu con ${item.label}`}
        onMouseEnter={() => handleNavMouseEnter(item.key)}
        onMouseLeave={handleNavMouseLeave}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ss-flyout-header">
          <div className="ss-flyout-tag-row">
            <div className="ss-flyout-tag-cluster">
              <span className="ss-flyout-pip" />
              <span className="ss-flyout-tag">{item.categoryTag || 'PHÂN HỆ QUẢN LÝ'}</span>
            </div>
            <span className="ss-flyout-dismiss-hint">ESC để đóng</span>
          </div>
          <p className="ss-flyout-desc">{item.description}</p>
        </div>

        <div className="ss-flyout-list">
          {item.subItems.map((sub) => {
            if (sub.roles && !sub.roles.includes(userRole)) return null;
            const SubIcon = sub.icon;
            const badgeCount = getBadgeCount(sub.badgeKey);
            const isSubActive =
              location.pathname === sub.to.split('?')[0] &&
              (!sub.to.includes('?') || location.search.includes(sub.to.split('?')[1]));

            return (
              <NavLink
                key={sub.to}
                to={sub.to}
                className={`ss-flyout-item ${isSubActive ? 'is-active' : ''}`}
                onClick={() => {
                  setActiveFlyoutKey(null);
                  setMobileDrawerOpen(false);
                }}
              >
                <div className="ss-flyout-icon-box">
                  <SubIcon size={17} />
                </div>
                <div className="ss-flyout-item-body">
                  <div className="ss-flyout-item-title-row">
                    <span className="ss-flyout-item-title">{sub.label}</span>
                    {badgeCount > 0 && (
                      <span className="ss-flyout-badge-pill">{badgeCount}</span>
                    )}
                    {sub.badge && (
                      <span className="ss-flyout-micro-tag">{sub.badge}</span>
                    )}
                  </div>
                  <span className="ss-flyout-item-desc">{sub.desc}</span>
                </div>
                <ChevronRight size={14} className="ss-flyout-arrow" />
              </NavLink>
            );
          })}
        </div>

        {item.quickAction && (
          <div className="ss-flyout-footer">
            <NavLink
              to={item.quickAction.to}
              className="ss-flyout-quick-action"
              onClick={() => {
                setActiveFlyoutKey(null);
                setMobileDrawerOpen(false);
              }}
            >
              <span className="ss-flyout-quick-label">
                <span className="ss-flyout-quick-prefix">Lối tắt:</span>
                <strong>{item.quickAction.label}</strong>
              </span>
              <ArrowRight size={13} className="ss-flyout-quick-arrow" />
            </NavLink>
          </div>
        )}
      </div>
    );
  };

  // Reusable Notifications Popover Content
  const renderNotificationsPopover = () => (
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
                  navigate('/attendance/leave');
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
                  navigate('/attendance/explain');
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
                  navigate('/attendance');
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
              filteredNotifications.map((notif) => {
                const isUnread = !(notif.isRead ?? notif.read ?? false);
                return (
                  <div
                    key={notif.id}
                    className={`ss-notif-modern-row ${isUnread ? 'is-unread' : ''}`}
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
                    {isUnread && <span className="ss-notif-unread-dot" />}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );

  // Reusable Store Switcher Dropdown
  const renderStoreDropdown = () => (
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
  );

  // Reusable User Profile Dropdown
  const renderUserProfileDropdown = () => (
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
  );

  // ==========================================
  // CASE A: SIDEBAR RAIL FLYOUT NAVBAR MODE
  // ==========================================
  if (navMode === 'rail') {
    return (
      <>
        <aside className="ss-header ss-header-rail" ref={navRef}>
          {/* Rail Brand Top */}
          <div className="ss-rail-top">
            <NavLink to="/" className="ss-rail-brand-link" title="ShiftSync - Về Trang Chủ">
              <div className="ss-brand-emblem-wrap rail-emblem-wrap">
                <ShiftSyncLogoMark size={28} />
              </div>
            </NavLink>
          </div>

          {/* Rail Central Navigation */}
          <nav className="ss-rail-nav" aria-label="Điều hướng Flyout dạng thanh bên">
            {visibleNavItems.map((item) => {
              const ItemIcon = item.icon || LayoutGrid;
              const isCustomActive = item.aliases && item.aliases.includes(location.pathname);
              const twCount = item.key === 'time-workforce' ? (pendingLeaveCount + pendingAdjCount) : 0;
              const mktCount = item.key === 'marketplace' ? (openShiftsCount + pendingSwapCount + pendingWorkforceCount) : 0;
              const badgeCount = twCount || mktCount;
              const isOpen = activeFlyoutKey === item.key;

              return (
                <div
                  key={item.to}
                  className={`ss-rail-item-wrapper ${isOpen ? 'flyout-active' : ''}`}
                  onMouseEnter={() => handleNavMouseEnter(item.key)}
                  onMouseLeave={handleNavMouseLeave}
                >
                  <NavLink
                    to={item.to}
                    title={item.title || item.label}
                    className={({ isActive }) => `ss-rail-item ${isActive || isCustomActive ? 'active' : ''}`}
                    onClick={() => setActiveFlyoutKey(null)}
                  >
                    <ItemIcon size={20} className="ss-rail-icon" />
                    {badgeCount > 0 && (
                      <span className="ss-rail-micro-badge">{badgeCount}</span>
                    )}
                  </NavLink>

                  {/* Flyout panel on hover/click */}
                  {isOpen && renderFlyoutPanel(item, true)}
                </div>
              );
            })}
          </nav>

          {/* Rail Bottom Section */}
          <div className="ss-rail-bottom">
            {/* Switch layout back to Top Bar */}
            <button
              type="button"
              className="ss-rail-action-btn"
              onClick={() => onToggleNavMode?.('top')}
              title="Chuyển về thanh điều hướng Flyout trên cùng (Top Bar)"
              aria-label="Chuyển về Top Bar"
            >
              <PanelTop size={18} />
            </button>

            {/* Store Switcher in rail */}
            <div style={{ position: 'relative' }} ref={storeMenuRef}>
              <button
                type="button"
                className={`ss-rail-action-btn ${storeMenuOpen ? 'active' : ''}`}
                onClick={() => {
                  if (isAdmin && stores.length > 1) {
                    setStoreMenuOpen((p) => !p);
                  }
                }}
                title={isAdmin && stores.length > 1 ? `Chi nhánh: ${currentStore?.name || 'Chọn chi nhánh'}` : `Chi nhánh: ${currentStore?.name || 'Mặc định'}`}
                aria-label="Chọn chi nhánh"
              >
                <Store size={18} />
              </button>
              {isAdmin && stores.length > 1 && storeMenuOpen && renderStoreDropdown()}
            </div>

            {/* Notifications in rail */}
            <div style={{ position: 'relative' }} ref={notifRef}>
              <button
                type="button"
                className={`ss-rail-action-btn ss-bell-btn ${notifMenuOpen ? 'active' : ''}`}
                onClick={() => setNotifMenuOpen((p) => !p)}
                title={`Thông báo hệ thống (${totalNotifs} mới)`}
                aria-label="Thông báo hệ thống"
              >
                <Bell size={18} />
                {totalNotifs > 0 && <span className="ss-rail-bell-badge">{totalNotifs}</span>}
              </button>
              {notifMenuOpen && renderNotificationsPopover()}
            </div>

            {/* User Profile in rail */}
            <div style={{ position: 'relative' }} ref={menuRef}>
              <button
                type="button"
                className={`ss-rail-avatar-btn ${menuOpen ? 'active' : ''}`}
                onClick={() => setMenuOpen((p) => !p)}
                title={`Tài khoản: ${userName} (${userRole})`}
                aria-label="Menu tài khoản"
              >
                <div className="ss-user-avatar rail-avatar" style={{ overflow: 'hidden', padding: 0, background: 'transparent' }}>
                  <Avatar3DWeb avatarId={userAvatarId || 'dilan'} size={32} />
                </div>
              </button>
              {menuOpen && renderUserProfileDropdown()}
            </div>
          </div>
        </aside>

        {avatarModalOpen && (
          <AvatarCollectionModal
            isOpen={avatarModalOpen}
            onClose={() => setAvatarModalOpen(false)}
            currentAvatarId={userAvatarId}
            onSelectAvatar={handleSelectAvatar}
            targetUserName={userName}
          />
        )}
      </>
    );
  }

  // ==========================================
  // CASE B: TOP FLYOUT NAVBAR MODE (DEFAULT)
  // ==========================================
  return (
    <header className="ss-header ss-header-top" ref={navRef}>
      {/* Left Brand Cluster & Mobile Toggle */}
      <div className="ss-header-left-cluster">
        {/* Mobile Hamburger Button */}
        <button
          type="button"
          className="ss-mobile-menu-btn"
          onClick={() => setMobileDrawerOpen(true)}
          title="Mở thanh điều hướng Flyout"
          aria-label="Mở menu điều hướng"
        >
          <Menu size={20} />
        </button>

        {/* ShiftSync Logo Lockup */}
        <NavLink to="/" className="ss-header-brand" title="ShiftSync - Nền tảng Quản lý Ca & Điều phối Thực tế 3D">
          <div className="ss-brand-emblem-wrap">
            <ShiftSyncLogoMark size={24} />
          </div>
          <div className="ss-brand-text-col">
            <span className="ss-brand-name">
              <span className="ss-brand-shift">Shift</span>
              <span className="ss-brand-sync">Sync</span>
            </span>
            <span className="ss-brand-pulse-pip" title="Hệ thống vận hành trực tuyến" />
          </div>
        </NavLink>
      </div>

      {/* Center Flyout Navigation Bar */}
      <nav className="ss-header-nav" aria-label="Điều hướng chính Flyout">
        {visibleNavItems.map((item) => {
          const ItemIcon = item.icon || LayoutGrid;
          const isCustomActive = item.aliases && item.aliases.includes(location.pathname);
          const twCount = item.key === 'time-workforce' ? (pendingLeaveCount + pendingAdjCount) : 0;
          const mktCount = item.key === 'marketplace' ? (openShiftsCount + pendingSwapCount + pendingWorkforceCount) : 0;
          const badgeCount = twCount || mktCount;
          const isOpen = activeFlyoutKey === item.key;

          return (
            <div
              key={item.to}
              className={`ss-nav-item-wrapper ${isOpen ? 'flyout-active' : ''}`}
              onMouseEnter={() => handleNavMouseEnter(item.key)}
              onMouseLeave={handleNavMouseLeave}
            >
              <NavLink
                to={item.to}
                title={item.title || item.label}
                className={({ isActive }) => `ss-nav-item ${isActive || isCustomActive ? 'active' : ''}`}
                onClick={() => setActiveFlyoutKey(null)}
              >
                <ItemIcon size={14} className="ss-nav-icon" />
                <span className="ss-nav-label">{item.label}</span>
                {badgeCount > 0 && (
                  <span
                    className={`ss-nav-micro-badge ${
                      item.key === 'marketplace'
                        ? 'badge-market'
                        : item.key === 'time-workforce'
                        ? 'badge-indigo'
                        : 'badge-req'
                    }`}
                  >
                    {badgeCount}
                  </span>
                )}
                <ChevronDown
                  size={12}
                  className={`ss-nav-chevron ${isOpen ? 'open' : ''}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleNavClick(item.key);
                  }}
                />
              </NavLink>

              {/* Flyout panel on hover/click */}
              {isOpen && renderFlyoutPanel(item, false)}
            </div>
          );
        })}
      </nav>

      {/* Right Cockpit Cluster: Mode Switcher, Store Switcher, Notifications, User */}
      <div className="ss-header-right-cluster">
        {/* Mode Switcher Pill */}
        <button
          type="button"
          className="ss-cockpit-btn ss-mode-pill"
          onClick={() => onToggleNavMode?.('rail')}
          title="Chuyển sang thanh bên (Sidebar Rail) - Giải phóng 100% chiều cao cho Không Gian 3D"
          aria-label="Chuyển sang Sidebar Rail"
        >
          <PanelLeft size={14} className="ss-mode-pill-icon" />
          <span className="ss-mode-pill-text">Sidebar</span>
        </button>

        {/* Global Store Switcher */}
        <div className="ss-header-store-wrapper" ref={storeMenuRef}>
          <button
            type="button"
            id="ss-header-store-btn"
            className={`ss-cockpit-btn ss-store-btn ${storeMenuOpen ? 'active' : ''} ${!isAdmin || stores.length <= 1 ? 'static-store-view' : ''}`}
            onClick={() => {
              if (isAdmin && stores.length > 1) {
                setStoreMenuOpen((prev) => !prev);
              }
            }}
            title={isAdmin && stores.length > 1 ? 'Chọn chi nhánh làm việc' : `Chi nhánh: ${currentStore?.name || 'Chi nhánh của bạn'}`}
            aria-label={`Chi nhánh hiện tại: ${currentStore?.name || 'Chọn chi nhánh'}`}
            aria-expanded={storeMenuOpen}
            aria-haspopup={isAdmin && stores.length > 1}
            style={{ cursor: isAdmin && stores.length > 1 ? 'pointer' : 'default' }}
          >
            <span className="ss-store-telemetry-pip" aria-hidden="true" />
            <Store size={14} className="ss-store-icon" aria-hidden="true" />
            <span className="ss-header-store-name">{currentStore?.name || 'Chọn chi nhánh'}</span>
            {isAdmin && stores.length > 1 && (
              <ChevronDown size={11} className={`ss-chevron-icon ${storeMenuOpen ? 'open' : ''}`} aria-hidden="true" />
            )}
          </button>

          {isAdmin && stores.length > 1 && storeMenuOpen && renderStoreDropdown()}
        </div>

        {/* Notifications Button with real popover */}
        <div style={{ position: 'relative' }} ref={notifRef}>
          <button
            type="button"
            className={`ss-cockpit-btn ss-bell-btn ${notifMenuOpen ? 'active' : ''}`}
            title={`Thông báo hệ thống (${totalNotifs} mới)`}
            aria-label="Thông báo hệ thống"
            aria-expanded={notifMenuOpen}
            onClick={() => setNotifMenuOpen((prev) => !prev)}
          >
            <Bell size={17} className="ss-bell-svg" aria-hidden="true" />
            {totalNotifs > 0 ? (
              <span className="ss-bell-badge">{totalNotifs}</span>
            ) : (
              <span className="ss-bell-dot" aria-hidden="true" />
            )}
          </button>

          {notifMenuOpen && renderNotificationsPopover()}
        </div>

        {/* User Identity & Settings Menu */}
        <div className="ss-header-user-wrapper" ref={menuRef}>
          <button
            type="button"
            className={`ss-cockpit-btn ss-user-profile-btn ${menuOpen ? 'active' : ''}`}
            onClick={() => setMenuOpen((prev) => !prev)}
            title={`Tài khoản: ${userEmail} (${userRole})`}
            aria-expanded={menuOpen}
            aria-haspopup="true"
          >
            <div className="ss-user-avatar-halo">
              <Avatar3DWeb avatarId={userAvatarId || 'dilan'} size={28} />
              <span className="ss-avatar-status-pip" />
            </div>
            <div className="ss-user-info-text">
              <span className="ss-user-email">{userName}</span>
              <span className={`ss-user-role-badge ${roleClass}`}>{userRole}</span>
            </div>
            <ChevronDown size={12} className={`ss-chevron-icon ${menuOpen ? 'open' : ''}`} />
          </button>

          {menuOpen && renderUserProfileDropdown()}
        </div>
      </div>

      {/* Avatar 3D Collection Modal */}
      {avatarModalOpen && (
        <AvatarCollectionModal
          isOpen={avatarModalOpen}
          onClose={() => setAvatarModalOpen(false)}
          currentAvatarId={userAvatarId}
          onSelectAvatar={handleSelectAvatar}
          targetUserName={userName}
        />
      )}

      {/* Mobile Flyout Drawer */}
      {mobileDrawerOpen && (
        <>
          <div
            className="ss-flyout-backdrop"
            onClick={() => setMobileDrawerOpen(false)}
            aria-hidden="true"
          />
          <aside className="ss-mobile-flyout-drawer" role="dialog" aria-label="Menu điều hướng di động">
            <div className="ss-mobile-drawer-header">
              <NavLink to="/" className="ss-header-brand" onClick={() => setMobileDrawerOpen(false)}>
                <div className="ss-brand-emblem-wrap">
                  <ShiftSyncLogoMark size={22} />
                </div>
                <div className="ss-brand-text-col">
                  <span className="ss-brand-name">
                    <span className="ss-brand-shift">Shift</span>
                    <span className="ss-brand-sync">Sync</span>
                  </span>
                  <span className="ss-brand-pulse-pip" />
                </div>
              </NavLink>
              <button
                type="button"
                className="ss-mobile-close-btn"
                onClick={() => setMobileDrawerOpen(false)}
                aria-label="Đóng menu"
              >
                <X size={20} />
              </button>
            </div>

            <div className="ss-mobile-drawer-scroll">
              <div className="ss-mobile-drawer-nav">
                {visibleNavItems.map((item) => {
                  const ItemIcon = item.icon || LayoutGrid;
                  const isExpanded = expandedMobileModule === item.key;
                  const twCount = item.key === 'time-workforce' ? (pendingLeaveCount + pendingAdjCount) : 0;
                  const mktCount = item.key === 'marketplace' ? (openShiftsCount + pendingSwapCount + pendingWorkforceCount) : 0;
                  const badgeCount = twCount || mktCount;

                  return (
                    <div key={item.to} className="ss-mobile-nav-group">
                      <div className="ss-mobile-nav-parent-row">
                        <NavLink
                          to={item.to}
                          className="ss-mobile-nav-link"
                          onClick={() => setMobileDrawerOpen(false)}
                        >
                          <ItemIcon size={18} />
                          <span>{item.label}</span>
                          {badgeCount > 0 && (
                            <span className="ss-nav-micro-badge badge-req">{badgeCount}</span>
                          )}
                        </NavLink>
                        {item.subItems && item.subItems.length > 0 && (
                          <button
                            type="button"
                            className={`ss-mobile-expand-btn ${isExpanded ? 'expanded' : ''}`}
                            onClick={() =>
                              setExpandedMobileModule((prev) => (prev === item.key ? null : item.key))
                            }
                            aria-label="Mở rộng menu con"
                          >
                            <ChevronDown size={16} />
                          </button>
                        )}
                      </div>

                      {isExpanded && item.subItems && (
                        <div className="ss-mobile-subitems-list">
                          {item.subItems.map((sub) => {
                            if (sub.roles && !sub.roles.includes(userRole)) return null;
                            const SubIcon = sub.icon;
                            const subBadge = getBadgeCount(sub.badgeKey);
                            return (
                              <NavLink
                                key={sub.to}
                                to={sub.to}
                                className="ss-mobile-subitem-link"
                                onClick={() => setMobileDrawerOpen(false)}
                              >
                                <SubIcon size={15} />
                                <div className="ss-mobile-subitem-text">
                                  <span>{sub.label}</span>
                                  <small>{sub.desc}</small>
                                </div>
                                {subBadge > 0 && (
                                  <span className="ss-flyout-badge-pill">{subBadge}</span>
                                )}
                              </NavLink>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Mobile Drawer Bottom Actions */}
              <div className="ss-mobile-drawer-footer">
                <button
                  type="button"
                  className="ss-mobile-mode-toggle"
                  onClick={() => {
                    onToggleNavMode?.('rail');
                    setMobileDrawerOpen(false);
                  }}
                >
                  <PanelLeft size={16} />
                  <span>Dùng thử chế độ Flyout Sidebar</span>
                </button>
              </div>
            </div>
          </aside>
        </>
      )}
    </header>
  );
}