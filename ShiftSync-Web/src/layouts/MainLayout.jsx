import { useState, useEffect, useCallback, useRef } from 'react';
import { Outlet, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../components/navbar/Navbar';
import { logout } from '../services/authService';
import { getAllStores } from '../services/storeService';
import { getStoreLeaveRequests, getMyLeaveRequests, approveLeaveRequest, rejectLeaveRequest } from '../services/leaveService';
import { getStoreSwapRequests, getMySwapRequests, approveSwapRequest, rejectSwapRequest } from '../services/swapService';
import { getStoreAdjustmentRequests, getMyAdjustmentRequests, approveAdjustmentRequest, rejectAdjustmentRequest } from '../services/adjustmentService';
import { getMarketplaceShifts } from '../services/marketplaceService';
import './MainLayout.css';
import {useToast} from '../context/ToastContext';
import {
  getMyNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../services/notificationService';

export default function MainLayout() {
  const toast=useToast();
  const readRequestIds=useRef(new Set());
  const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
  const navigate = useNavigate();
  const location = useLocation();
  const [navMode, setNavMode] = useState(() => localStorage.getItem('ss_flyout_mode') || 'top');

  const [stores, setStores] = useState([]);
  const [selectedStoreId, setSelectedStoreId] = useState(() => localStorage.getItem('selectedStoreId') || '');
  const [pendingLeaveCount, setPendingLeaveCount] = useState(0);
  const [pendingSwapCount, setPendingSwapCount] = useState(0);
  const [pendingAdjCount, setPendingAdjCount] = useState(0);
  const [openShiftsCount, setOpenShiftsCount] = useState(0);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [notifications, setNotifications] = useState([]);

  const userRole = (localStorage.getItem('userRole') || 'STAFF').toUpperCase();
  const isManager = userRole === 'MANAGER' || userRole === 'ADMIN';

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
      .catch((err) => console.info('MainLayout store fetch info:', err.message));
    return () => { isMounted = false; };
  }, []);

  const fetchCounts = useCallback(async () => {
    const t = localStorage.getItem('accessToken') || localStorage.getItem('token');
    if (!t) return;
    try {
      const [leaveRes, mktRes, unreadRes, notifRes, swapRes, adjRes] = await Promise.allSettled([
        isManager && selectedStoreId ? getStoreLeaveRequests(selectedStoreId, 'PENDING') : (selectedStoreId ? getMyLeaveRequests(selectedStoreId) : Promise.resolve({ data: [] })),
        selectedStoreId ? getMarketplaceShifts(selectedStoreId) : Promise.resolve({ data: [] }),
        getUnreadNotificationCount(),
        getMyNotifications(),
        isManager && selectedStoreId ? getStoreSwapRequests(selectedStoreId, 'PENDING') : getMySwapRequests(),
        isManager && selectedStoreId ? getStoreAdjustmentRequests(selectedStoreId, 'PENDING') : (selectedStoreId ? getMyAdjustmentRequests(selectedStoreId) : Promise.resolve({ data: [] })),
      ]);

      let leaveItems = [];
      if (leaveRes.status === 'fulfilled') {
        const list = Array.isArray(leaveRes.value.data) ? leaveRes.value.data : (leaveRes.value.data?.content || []);
        setPendingLeaveCount(list.length);
        leaveItems = list.map((l) => ({
          id: `leave-${l.id}`,
          rawId: l.id,
          type: 'leave',
          title: 'Đơn nghỉ phép',
          description: `${l.staffName || 'Nhân viên'} xin nghỉ từ ${l.startDate || ''} đến ${l.endDate || ''}${l.reason ? ` (${l.reason})` : ''}`,
          createdAt: l.createdAt || new Date(),
          read: false,
          needsAction: isManager,
          source: 'leave',
        }));
      }

      let swapItems = [];
      if (swapRes.status === 'fulfilled') {
        const list = Array.isArray(swapRes.value.data) ? swapRes.value.data : (swapRes.value.data?.content || []);
        const pendingSwaps = list.filter((s) => s.status === 'PENDING' || s.status === 'PENDING_MANAGER');
        setPendingSwapCount(pendingSwaps.length);
        swapItems = pendingSwaps.map((s) => ({
          id: `swap-${s.id}`,
          rawId: s.id,
          type: 'swap',
          title: 'Yêu cầu đổi ca',
          description: `${s.fromStaffName || 'Nhân viên'} muốn đổi ca ${s.fromShiftDate ? `ngày ${s.fromShiftDate}` : ''} với ${s.toStaffName || 'đồng nghiệp'}`,
          createdAt: s.createdAt || new Date(),
          read: false,
          needsAction: true,
          source: 'swap',
        }));
      }

      let adjItems = [];
      if (adjRes.status === 'fulfilled') {
        const list = Array.isArray(adjRes.value.data) ? adjRes.value.data : (adjRes.value.data?.content || []);
        const pendingAdjs = list.filter((a) => a.status === 'PENDING');
        setPendingAdjCount(pendingAdjs.length);
        adjItems = pendingAdjs.map((a) => {
          const shiftDate = a.requestedCheckIn ? new Date(a.requestedCheckIn).toLocaleDateString('vi-VN') : '';
          return {
            id: `adj-${a.id}`,
            rawId: a.id,
            type: 'attendance',
            title: 'Giải trình chấm công',
            description: `${a.staffName || 'Nhân viên'} giải trình chấm công${shiftDate ? ` ngày ${shiftDate}` : ''}${a.reason ? `: ${a.reason}` : ''}`,
            createdAt: a.createdAt || new Date(),
            read: false,
            needsAction: isManager,
            source: 'attendance',
          };
        });
      }

      if (mktRes.status === 'fulfilled') {
        const list = Array.isArray(mktRes.value.data) ? mktRes.value.data : (mktRes.value.data?.content || []);
        setOpenShiftsCount(list.length);
      }

      let notifItems = [];
      if (notifRes.status === 'fulfilled') {
        const list = Array.isArray(notifRes.value.data) ? notifRes.value.data : (notifRes.value.data?.content || []);
        notifItems = list.map((n) => {
          let t = (n.type || 'system').toLowerCase();
          if (t.includes('swap')) t = 'swap';
          else if (t.includes('leave')) t = 'leave';
          else if (t.includes('market') || t.includes('shift')) t = 'open_shift';
          else if (t.includes('attendance')) t = 'attendance';
          else t = 'system';

          return {
            id: String(n.id),
            rawId: n.id,
            type: t,
            sourceType: n.type,
            title: n.title || 'Thông báo hệ thống',
            description: n.message || n.description || '',
            createdAt: n.createdAt || new Date(),
            read: Boolean(n.isRead ?? n.read ?? false),
            needsAction: false,
            source: 'notification',
          };
        });
      }

      let inAppUnread = 0;
      if (unreadRes.status === 'fulfilled') {
        inAppUnread = typeof unreadRes.value.data === 'object'
          ? (unreadRes.value.data?.unreadCount ?? 0)
          : Number(unreadRes.value.data) || 0;
      }

      // Tổng hợp thông báo thực tế (Yêu cầu ca kíp + Thông báo hệ thống)
      const combinedRealNotifications = [
        ...swapItems,
        ...leaveItems,
        ...adjItems,
        ...notifItems,
      ];

      setNotifications(combinedRealNotifications.map(n=>readRequestIds.current.has(n.id)?{...n,read:true,isRead:true}:n));

      // Tổng số lượng thông báo chưa đọc thực tế bao gồm các yêu cầu chờ xử lý
      const unreadRequestsCount = swapItems.filter((i) => !i.read&&!readRequestIds.current.has(i.id)).length +
        leaveItems.filter((i) => !i.read&&!readRequestIds.current.has(i.id)).length +
        adjItems.filter((i) => !i.read&&!readRequestIds.current.has(i.id)).length;
      const unreadInAppCount = notifItems.filter((i) => !i.read).length;
      const totalRealCount = unreadRequestsCount + Math.max(inAppUnread, unreadInAppCount);
      setUnreadNotifCount(totalRealCount);
    } catch {
      // ignore
    }
  }, [selectedStoreId, isManager]);

  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, 20000);
    const handleUpdate = () => fetchCounts();
    window.addEventListener('notification_received', handleUpdate);
    window.addEventListener('store_requests_updated', handleUpdate);
    window.addEventListener('store_marketplace_updated', handleUpdate);
    window.addEventListener('storeChanged', handleUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('notification_received', handleUpdate);
      window.removeEventListener('store_requests_updated', handleUpdate);
      window.removeEventListener('store_marketplace_updated', handleUpdate);
      window.removeEventListener('storeChanged', handleUpdate);
    };
  }, [fetchCounts]);

  const handleMarkNotificationRead = async (notif) => {
    const id = typeof notif === 'object' && notif !== null ? notif?.id : notif;
    if (!id) return;
    const strId = String(id);
    const item = notifications.find((n) => String(n.id) === strId);
    const realId = item?.rawId || strId;
    if (item?.source === 'notification' || (!strId.startsWith('leave-') && !strId.startsWith('swap-') && !strId.startsWith('adj-'))) {
      try {
        await markNotificationAsRead(realId);
      } catch (err) {
        toast.error('Không đánh dấu đã đọc được. Vui lòng thử lại.');
        return;
      }
    }
    readRequestIds.current.add(strId);
    setNotifications((prev) =>
      prev.map((n) => (String(n.id) === strId ? { ...n, isRead: true, read: true } : n))
    );
    if(item&&!(item.isRead??item.read))setUnreadNotifCount((prev) => Math.max(0, prev - 1));
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
    } catch (err) {
      toast.error('Không đánh dấu tất cả đã đọc được. Vui lòng thử lại.');
      return;
    }
    notifications.forEach(n=>readRequestIds.current.add(String(n.id)));
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, isRead: true, read: true }))
    );
    setUnreadNotifCount(0);
  };

  const handleAction = async (id, action) => {
    try {
      const strId = String(id);
      const notif = notifications.find((n) => String(n.id) === strId);
      const source = notif?.source;
      const realId = notif?.rawId || strId.replace(/^(swap|leave|adj)-/, '');

      if (source === 'swap' || strId.startsWith('swap-')) {
        if (action === 'approve') await approveSwapRequest(realId);
        else await rejectSwapRequest(realId);
      } else if ((source === 'leave' || strId.startsWith('leave-')) && selectedStoreId) {
        if (action === 'approve') await approveLeaveRequest(selectedStoreId, realId);
        else await rejectLeaveRequest(selectedStoreId, realId, { reason: 'Từ chối bởi quản lý' });
      } else if ((source === 'attendance' || strId.startsWith('adj-')) && selectedStoreId) {
        if (action === 'approve') await approveAdjustmentRequest(selectedStoreId, realId, { note: 'Đã duyệt' });
        else await rejectAdjustmentRequest(selectedStoreId, realId, { note: 'Từ chối' });
      } else {
        throw new Error('Không xác định được yêu cầu cần xử lý hoặc chi nhánh.');
      }

      setNotifications((prev) =>
        prev.map((n) => (String(n.id) === strId ? { ...n, needsAction: false, read: true, isRead: true } : n))
      );
      if(notif&&!(notif.isRead??notif.read))setUnreadNotifCount((prev) => Math.max(0, prev - 1));
      fetchCounts();
    } catch (err) {
      toast.error(err.response?.data?.message||err.message||'Xử lý không thành công. Yêu cầu vẫn đang chờ.');
    }
  };

  const handleToggleNavMode = () => {
    const next = navMode === 'top' ? 'rail' : 'top';
    setNavMode(next);
    localStorage.setItem('ss_flyout_mode', next);
    window.dispatchEvent(new CustomEvent('ss_flyout_mode_changed', { detail: { mode: next } }));
  };

  const handleSelectStore = (id) => {
    const store = stores.find((item) => String(item.id) === String(id));
    if (!store || String(store.id) === String(selectedStoreId)) return;
    setSelectedStoreId(String(store.id));
    localStorage.setItem('selectedStoreId', String(store.id));
    window.dispatchEvent(new CustomEvent('storeChanged', { detail: { storeId: store.id } }));
  };

  useEffect(() => {
    const syncStore = (event) => {
      const id = event.detail?.storeId;
      if (stores.some((store) => String(store.id) === String(id))) setSelectedStoreId(String(id));
    };
    window.addEventListener('storeChanged', syncStore);
    return () => window.removeEventListener('storeChanged', syncStore);
  }, [stores]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleOpenSearch = () => {
    window.dispatchEvent(new CustomEvent('open_command_search'));
  };

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const currentStore = stores.find((s) => String(s.id) === String(selectedStoreId));
  const storeName = currentStore ? currentStore.name : (stores[0]?.name || 'Chưa có cửa hàng');
  const userEmail = localStorage.getItem('userEmail') || 'manager.pvd@shiftsync.com';
  const userName = localStorage.getItem('userName') || userEmail.split('@')[0];
  const userRoleDisplay = isManager ? 'Quản lý' : 'Nhân viên';

  return (
    <div
      className={`ss-app-shell ss-shell-${navMode}`}
      style={{
        fontFamily: 'var(--ss-font, system-ui, sans-serif)',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--ss-bg, #090e0c)',
        color: 'var(--ss-tx, #e6efe9)',
        transition: 'background-color 0.2s, color 0.2s',
      }}
    >
      <Navbar
        key={`${location.pathname}${location.search}`}
        user={{
          name: userName,
          role: userRoleDisplay,
          systemRole: userRole,
          avatarUrl: localStorage.getItem('userAvatarUrl') || undefined,
        }}
        storeName={storeName}
        stores={stores}
        selectedStoreId={selectedStoreId}
        onSelectStore={handleSelectStore}
        counts={{
          pendingLeave: pendingLeaveCount,
          openShifts: openShiftsCount,
          pendingSwap: pendingSwapCount,
          pendingAdj: pendingAdjCount,
          notifications: unreadNotifCount,
        }}
        notificationsList={notifications}
        onMarkNotificationRead={handleMarkNotificationRead}
        onMarkAllRead={handleMarkAllRead}
        onAction={handleAction}
        onToggleSidebar={handleToggleNavMode}
        onOpenSearch={handleOpenSearch}
        onLogout={handleLogout}
      />
      <main
        id="ss-main-content"
        tabIndex={-1}
        className="ss-main-viewport"
        style={{
          padding: 0,
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        <Outlet />
      </main>
      <footer className="ss-page-footer">
        <span>ShiftSync</span>
        <span className="ss-page-footer-separator" aria-hidden="true">·</span>
        <span>Cuối trang</span>
      </footer>
    </div>
  );
}
