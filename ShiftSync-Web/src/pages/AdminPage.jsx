import { useState, useEffect, useMemo, useRef } from 'react';
import {
  getAllStores,
  createStore,
  updateStore,
  deleteStore,
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getStoredManagerAssignments,
  saveStoredManagerAssignments,
  getStaffByStore,
  assignStaffToStore
} from '../services/adminService';
import avatarPaul from '../assets/avatars/avatar-paul-lee.png';
import avatarThia from '../assets/avatars/avatar-thia-ago.png';
import avatarMew from '../assets/avatars/avatar-mew-ama.png';
import avatarDilan from '../assets/avatars/avatar-dilan-jon.png';
import './AdminPage.css';

const AVATAR_MAP = {
  'Paul. Lee': avatarPaul,
  'Paul Lee': avatarPaul,
  'Thia. Ago': avatarThia,
  'Thia Ago': avatarThia,
  'Mew. Ama': avatarMew,
  'Mew Ama': avatarMew,
  'Dilan. Jon': avatarDilan,
  'Dilan Jon': avatarDilan,
};
const DEFAULT_AVATAR = avatarPaul;
const getAvatar = (name = '') => AVATAR_MAP[name] || DEFAULT_AVATAR;

const POPULAR_LOCATIONS = [
  { name: '123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh', lat: 10.7743, lng: 106.7032 },
  { name: 'Hồ Bơi Tây Thạnh, Đường Tây Thạnh, Phường Tây Thạnh, Quận Tân Phú, TP. Hồ Chí Minh', lat: 10.8166, lng: 106.6264 },
  { name: 'Landmark 81, 720A Điện Biên Phủ, Phường 22, Bình Thạnh, TP. Hồ Chí Minh', lat: 10.7951, lng: 106.7218 },
  { name: 'Vạn Hạnh Mall, 11 Sư Vạn Hạnh, Phường 12, Quận 10, TP. Hồ Chí Minh', lat: 10.7701, lng: 106.6698 },
  { name: 'Aeon Mall Tân Phú, 30 Bờ Bao Tân Thắng, Sơn Kỳ, Tân Phú, TP. Hồ Chí Minh', lat: 10.8016, lng: 106.6181 },
  { name: 'Phố đi bộ Hồ Gươm, Hàng Trống, Hoàn Kiếm, Hà Nội', lat: 21.0285, lng: 105.8542 },
];

export default function AdminPage() {
  // Navigation & Filter Tabs
  const [activeTab, setActiveTab] = useState('stores'); // 'stores' | 'managers' | 'users'
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStoreStatus, setFilterStoreStatus] = useState('ALL'); // 'ALL' | 'ASSIGNED' | 'UNASSIGNED'
  const [filterUserRole, setFilterUserRole] = useState('ALL'); // 'ALL' | 'ADMIN' | 'MANAGER' | 'STAFF'
  const [viewLayout, setViewLayout] = useState('grid'); // 'grid' | 'table'

  // Data States
  const [stores, setStores] = useState([]);
  const [users, setUsers] = useState([]);
  const [managerAssignments, setManagerAssignments] = useState(getStoredManagerAssignments());
  const [storeStaffCounts, setStoreStaffCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState(null);

  // Modal States
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignStoreTarget, setAssignStoreTarget] = useState(null);
  const [selectedManagerId, setSelectedManagerId] = useState('');

  const [showStoreModal, setShowStoreModal] = useState(false);
  const [editingStore, setEditingStore] = useState(null);
  const [storeForm, setStoreForm] = useState({
    name: '',
    address: '',
    openTime: '08:00',
    closeTime: '22:00',
    latitude: 10.7743,
    longitude: 106.7032
  });

  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    systemRole: 'MANAGER'
  });

  const [confirmDelete, setConfirmDelete] = useState(null); // { type: 'store' | 'user', id, name }

  const showToast = (title, desc, isError = false) => {
    setToastMessage({ title, desc, isError });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Load initial data
  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Stores
      const storeRes = await getAllStores(0, 100);
      let storeList = [];
      if (storeRes && storeRes.data) {
        storeList = Array.isArray(storeRes.data) ? storeRes.data : (storeRes.data.content || []);
      }
      setStores(storeList);

      // 2. Fetch Users
      const userRes = await getEmployees(0, 100);
      let userList = [];
      if (userRes && userRes.data) {
        userList = Array.isArray(userRes.data) ? userRes.data : (userRes.data.content || []);
      }
      setUsers(userList);

      // 3. Fetch staff counts per store
      const counts = {};
      await Promise.allSettled(
        storeList.map(async (st) => {
          try {
            const sRes = await getStaffByStore(st.id, 0, 50);
            const list = sRes?.data?.content || sRes?.data || [];
            counts[st.id] = list.length;
          } catch (e) {
            counts[st.id] = 0;
          }
        })
      );
      setStoreStaffCounts(counts);
    } catch (err) {
      console.error('Failed to load admin data:', err);
      showToast('Lỗi tải dữ liệu', 'Không thể đồng bộ dữ liệu với máy chủ, vui lòng kiểm tra kết nối.', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter Managers from Users
  const managers = useMemo(() => {
    return users.filter(u => {
      const role = u.systemRole || u.role || '';
      return role.toUpperCase() === 'MANAGER';
    });
  }, [users]);

  // Map store to manager helper
  const getStoreManager = (storeId) => {
    const managerId = managerAssignments[storeId];
    if (!managerId) return null;
    return users.find(u => (u.id || u.staffId) === managerId) || null;
  };

  // Map manager to assigned stores helper
  const getManagerAssignedStores = (managerId) => {
    const assigned = [];
    Object.entries(managerAssignments).forEach(([stId, mId]) => {
      if (mId === managerId) {
        const foundStore = stores.find(s => s.id === stId);
        if (foundStore) assigned.push(foundStore);
      }
    });
    return assigned;
  };

  // Statistics Computations
  const stats = useMemo(() => {
    const totalStores = stores.length;
    let assignedStoresCount = 0;
    stores.forEach(s => {
      if (managerAssignments[s.id]) assignedStoresCount++;
    });
    const unassignedStoresCount = totalStores - assignedStoresCount;
    const totalManagers = managers.length;
    const assignedManagersCount = managers.filter(m => getManagerAssignedStores(m.id || m.staffId).length > 0).length;
    const totalUsers = users.length;

    return {
      totalStores,
      assignedStoresCount,
      unassignedStoresCount,
      totalManagers,
      assignedManagersCount,
      totalUsers,
    };
  }, [stores, managers, managerAssignments, users]);

  // Handle Assign Manager
  const openAssignModal = (store) => {
    setAssignStoreTarget(store);
    const currentM = getStoreManager(store.id);
    setSelectedManagerId(currentM ? (currentM.id || currentM.staffId) : '');
    setShowAssignModal(true);
  };

  const handleSaveAssignment = async () => {
    if (!assignStoreTarget) return;
    const storeId = assignStoreTarget.id;
    const newAssignments = { ...managerAssignments };

    if (!selectedManagerId) {
      delete newAssignments[storeId];
      setManagerAssignments(newAssignments);
      saveStoredManagerAssignments(newAssignments);
      setShowAssignModal(false);
      showToast('Đã gỡ Quản lý', `Đã hủy phân công quản lý tại chi nhánh ${assignStoreTarget.name}.`);
      return;
    }

    newAssignments[storeId] = selectedManagerId;
    setManagerAssignments(newAssignments);
    saveStoredManagerAssignments(newAssignments);

    // Attempt backend employment sync if possible
    try {
      await assignStaffToStore(storeId, {
        staffId: selectedManagerId,
        contractTypeId: '00000000-0000-0000-0000-000000000001',
        hourlyRate: 50000,
        joinedDate: new Date().toISOString().slice(0, 10)
      });
    } catch (e) {
      // If backend already has it or contractTypeId varies, local assignment still persists
      console.log('Backend sync notice:', e?.response?.data || e.message);
    }

    const assignedMgr = users.find(u => (u.id || u.staffId) === selectedManagerId);
    setShowAssignModal(false);
    showToast('Phân công thành công', `Đã phân công ${assignedMgr?.fullName || 'Quản lý'} phụ trách chi nhánh ${assignStoreTarget.name}.`);
  };

  const handleRemoveManagerFromStore = (storeId, storeName) => {
    const newAssignments = { ...managerAssignments };
    delete newAssignments[storeId];
    setManagerAssignments(newAssignments);
    saveStoredManagerAssignments(newAssignments);
    showToast('Đã gỡ Quản lý', `Chi nhánh ${storeName} hiện đang để trống vị trí quản lý.`);
  };

  // Handle Store Form (Create / Edit)
  const openCreateStoreModal = () => {
    setEditingStore(null);
    setStoreForm({
      name: '',
      address: '',
      openTime: '08:00',
      closeTime: '22:00',
      latitude: 10.7743,
      longitude: 106.7032
    });
    setShowStoreModal(true);
  };

  const openEditStoreModal = (store) => {
    setEditingStore(store);
    setStoreForm({
      name: store.name || '',
      address: store.address || '',
      openTime: store.openTime?.slice(0, 5) || '08:00',
      closeTime: store.closeTime?.slice(0, 5) || '22:00',
      latitude: store.latitude || 10.7743,
      longitude: store.longitude || 106.7032
    });
    setShowStoreModal(true);
  };

  const handleSaveStore = async (e) => {
    e.preventDefault();
    if (!storeForm.name.trim() || !storeForm.address.trim()) {
      showToast('Thiếu thông tin', 'Vui lòng nhập tên chi nhánh và địa chỉ.', true);
      return;
    }

    const payload = {
      name: storeForm.name.trim(),
      address: storeForm.address.trim(),
      openTime: storeForm.openTime.length === 5 ? `${storeForm.openTime}:00` : storeForm.openTime,
      closeTime: storeForm.closeTime.length === 5 ? `${storeForm.closeTime}:00` : storeForm.closeTime,
      latitude: Number(storeForm.latitude) || 10.7743,
      longitude: Number(storeForm.longitude) || 106.7032
    };

    try {
      if (editingStore) {
        await updateStore(editingStore.id, payload);
        showToast('Cập nhật thành công', `Đã cập nhật chi nhánh "${payload.name}".`);
      } else {
        await createStore(payload);
        showToast('Tạo mới thành công', `Đã tạo thêm chi nhánh "${payload.name}".`);
      }
      setShowStoreModal(false);
      loadData();
    } catch (err) {
      console.error(err);
      showToast('Lỗi lưu chi nhánh', err?.response?.data?.message || 'Không thể lưu chi nhánh vào hệ thống.', true);
    }
  };

  // Handle User Form (Create / Edit)
  const openCreateUserModal = (defaultRole = 'MANAGER') => {
    setEditingUser(null);
    setUserForm({
      fullName: '',
      email: '',
      password: '',
      phone: '',
      systemRole: defaultRole
    });
    setShowUserModal(true);
  };

  const openEditUserModal = (user) => {
    setEditingUser(user);
    setUserForm({
      fullName: user.fullName || '',
      email: user.email || '',
      password: '',
      phone: user.phone || '',
      systemRole: user.systemRole || user.role || 'STAFF'
    });
    setShowUserModal(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!userForm.fullName.trim() || !userForm.email.trim()) {
      showToast('Thiếu thông tin', 'Vui lòng nhập họ tên và email.', true);
      return;
    }
    if (!editingUser && (!userForm.password || userForm.password.length < 6)) {
      showToast('Mật khẩu yếu', 'Mật khẩu phải có ít nhất 6 ký tự.', true);
      return;
    }

    try {
      if (editingUser) {
        const payload = {
          fullName: userForm.fullName.trim(),
          email: userForm.email.trim(),
          phone: userForm.phone.trim(),
        };
        if (userForm.password.trim()) payload.password = userForm.password.trim();
        await updateEmployee(editingUser.id || editingUser.staffId, payload);
        showToast('Cập nhật tài khoản', `Đã cập nhật tài khoản "${payload.fullName}".`);
      } else {
        await createEmployee({
          fullName: userForm.fullName.trim(),
          email: userForm.email.trim(),
          password: userForm.password.trim(),
          phone: userForm.phone.trim(),
          systemRole: userForm.systemRole
        });
        showToast('Tạo tài khoản', `Đã tạo tài khoản ${userForm.systemRole}: "${userForm.fullName}".`);
      }
      setShowUserModal(false);
      loadData();
    } catch (err) {
      console.error(err);
      showToast('Lỗi tạo tài khoản', err?.response?.data?.message || 'Không thể lưu tài khoản người dùng.', true);
    }
  };

  // Handle Delete Confirm
  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      if (confirmDelete.type === 'store') {
        await deleteStore(confirmDelete.id);
        const newMgrs = { ...managerAssignments };
        delete newMgrs[confirmDelete.id];
        setManagerAssignments(newMgrs);
        saveStoredManagerAssignments(newMgrs);
        showToast('Đã xóa chi nhánh', `Chi nhánh ${confirmDelete.name} đã được gỡ bỏ khỏi hệ thống.`);
      } else if (confirmDelete.type === 'user') {
        await deleteEmployee(confirmDelete.id);
        showToast('Đã xóa người dùng', `Tài khoản ${confirmDelete.name} đã được xóa.`);
      }
      setConfirmDelete(null);
      loadData();
    } catch (err) {
      console.error(err);
      showToast('Lỗi xóa mục', err?.response?.data?.message || 'Không thể hoàn thành thao tác xóa.', true);
      setConfirmDelete(null);
    }
  };

  // Filtered Stores
  const filteredStores = useMemo(() => {
    return stores.filter(s => {
      const matchesSearch = !searchQuery ||
        s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.address?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const hasManager = Boolean(managerAssignments[s.id]);
      if (filterStoreStatus === 'ASSIGNED' && !hasManager) return false;
      if (filterStoreStatus === 'UNASSIGNED' && hasManager) return false;
      return matchesSearch;
    });
  }, [stores, searchQuery, filterStoreStatus, managerAssignments]);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const role = (u.systemRole || u.role || 'STAFF').toUpperCase();
      if (filterUserRole !== 'ALL' && role !== filterUserRole) return false;
      const matchesSearch = !searchQuery ||
        u.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.phone?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [users, filterUserRole, searchQuery]);

  // Filtered Managers
  const filteredManagers = useMemo(() => {
    return managers.filter(m => {
      const matchesSearch = !searchQuery ||
        m.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.phone?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [managers, searchQuery]);

  return (
    <div className="adm-container">
      {/* ═══ TOP HERO BANNER & STATS ═══ */}
      <section className="adm-hero">
        <div className="adm-hero-content">
          <div className="adm-hero-badge">
            <span>Trung Tâm Điều Hành Hệ Thống Toàn Chuỗi</span>
          </div>
          <h1 className="adm-hero-title">Quản Trị Hệ Thống & Phân Công Chi Nhánh</h1>
          <p className="adm-hero-desc">
            Quản lý tập trung toàn bộ chuỗi cửa hàng, bổ nhiệm Quản lý chi nhánh phụ trách và phân quyền tài khoản người dùng ShiftSync.
          </p>
        </div>

        <div className="adm-hero-actions">
          <button
            type="button"
            className="adm-btn adm-btn-primary"
            onClick={openCreateStoreModal}
          >
            Thêm Chi Nhánh Mới
          </button>
          <button
            type="button"
            className="adm-btn adm-btn-secondary"
            onClick={() => openCreateUserModal('MANAGER')}
          >
            Tạo Quản Lý Mới
          </button>
        </div>
      </section>

      {/* ═══ KEY METRIC STAT CARDS ═══ */}
      <section className="adm-stats-grid">
        <div className="adm-stat-card">
          <div className="adm-stat-info">
            <span className="adm-stat-label">Tổng Chi Nhánh</span>
            <div className="adm-stat-value">{stats.totalStores}</div>
            <div className="adm-stat-sub">
              <span className="adm-badge-dot success" /> {stats.assignedStoresCount} đã có Quản lý &bull; {stats.unassignedStoresCount} đang trống
            </div>
          </div>
        </div>

        <div className="adm-stat-card">
          <div className="adm-stat-info">
            <span className="adm-stat-label">Đội Ngũ Quản Lý</span>
            <div className="adm-stat-value">{stats.totalManagers}</div>
            <div className="adm-stat-sub">
              {stats.assignedManagersCount} quản lý đang phụ trách các cửa hàng
            </div>
          </div>
        </div>

        <div className="adm-stat-card">
          <div className="adm-stat-info">
            <span className="adm-stat-label">Tổng Tài Khoản</span>
            <div className="adm-stat-value">{stats.totalUsers}</div>
            <div className="adm-stat-sub">
              Bao gồm Admin, Quản lý chi nhánh và Nhân viên
            </div>
          </div>
        </div>
      </section>

      {/* ═══ MAIN TABS & TOOLBAR ═══ */}
      <div className="adm-main-card">
        <div className="adm-card-header">
          {/* Tabs */}
          <div className="adm-tabs">
            <button
              type="button"
              className={`adm-tab-btn ${activeTab === 'stores' ? 'active' : ''}`}
              onClick={() => setActiveTab('stores')}
            >
              <span>Chi Nhánh & Phân Công Quản Lý</span>
              <span className="adm-tab-count">{stores.length}</span>
            </button>

            <button
              type="button"
              className={`adm-tab-btn ${activeTab === 'managers' ? 'active' : ''}`}
              onClick={() => setActiveTab('managers')}
            >
              <span>Đội Ngũ Quản Lý</span>
              <span className="adm-tab-count">{managers.length}</span>
            </button>

            <button
              type="button"
              className={`adm-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              <span>Tài Khoản & Phân Quyền</span>
              <span className="adm-tab-count">{users.length}</span>
            </button>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="adm-toolbar">
            <div className="adm-search-input-wrap">
              <svg className="adm-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder={
                  activeTab === 'stores'
                    ? 'Tìm theo tên, địa chỉ chi nhánh...'
                    : 'Tìm theo họ tên, email, sđt...'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="adm-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="adm-search-clear"
                  onClick={() => setSearchQuery('')}
                >
                  ✕
                </button>
              )}
            </div>

            {activeTab === 'stores' && (
              <div className="adm-filter-group">
                <select
                  value={filterStoreStatus}
                  onChange={(e) => setFilterStoreStatus(e.target.value)}
                  className="adm-select"
                >
                  <option value="ALL">Tất cả chi nhánh ({stores.length})</option>
                  <option value="ASSIGNED">Đã có Quản lý ({stats.assignedStoresCount})</option>
                  <option value="UNASSIGNED">Chưa có Quản lý ({stats.unassignedStoresCount})</option>
                </select>

                <div className="adm-view-toggle">
                  <button
                    type="button"
                    className={`adm-view-btn ${viewLayout === 'grid' ? 'active' : ''}`}
                    onClick={() => setViewLayout('grid')}
                    title="Dạng Thẻ (Card Grid)"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="3" y="3" width="7" height="7" rx="1.5" />
                      <rect x="14" y="3" width="7" height="7" rx="1.5" />
                      <rect x="3" y="14" width="7" height="7" rx="1.5" />
                      <rect x="14" y="14" width="7" height="7" rx="1.5" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className={`adm-view-btn ${viewLayout === 'table' ? 'active' : ''}`}
                    onClick={() => setViewLayout('table')}
                    title="Dạng Bảng (Table List)"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="8" y1="6" x2="21" y2="6" />
                      <line x1="8" y1="12" x2="21" y2="12" />
                      <line x1="8" y1="18" x2="21" y2="18" />
                      <line x1="3" y1="6" x2="3.01" y2="6" />
                      <line x1="3" y1="12" x2="3.01" y2="12" />
                      <line x1="3" y1="18" x2="3.01" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'users' && (
              <div className="adm-filter-group">
                <select
                  value={filterUserRole}
                  onChange={(e) => setFilterUserRole(e.target.value)}
                  className="adm-select"
                >
                  <option value="ALL">Tất cả vai trò</option>
                  <option value="ADMIN">Quản trị viên (ADMIN)</option>
                  <option value="MANAGER">Quản lý (MANAGER)</option>
                  <option value="STAFF">Nhân viên (STAFF)</option>
                </select>
                <button
                  type="button"
                  className="adm-btn adm-btn-sm adm-btn-primary"
                  onClick={() => openCreateUserModal('STAFF')}
                >
                  + Thêm Người Dùng
                </button>
              </div>
            )}

            {activeTab === 'managers' && (
              <button
                type="button"
                className="adm-btn adm-btn-sm adm-btn-primary"
                onClick={() => openCreateUserModal('MANAGER')}
              >
                + Thêm Quản Lý
              </button>
            )}
          </div>
        </div>

        {/* ═══ TAB CONTENT 1: STORES & MANAGER ASSIGNMENTS ═══ */}
        {activeTab === 'stores' && (
          <div className="adm-tab-content">
            {loading ? (
              <div className="adm-empty-state">
                <div className="adm-spinner" />
                <p>Đang tải danh sách chi nhánh và phân công quản lý...</p>
              </div>
            ) : filteredStores.length === 0 ? (
              <div className="adm-empty-state">
                <h3>Không tìm thấy chi nhánh phù hợp</h3>
                <p>Thử tìm kiếm với từ khóa khác hoặc tạo thêm chi nhánh mới.</p>
                <button
                  type="button"
                  className="adm-btn adm-btn-primary"
                  onClick={openCreateStoreModal}
                >
                  + Tạo Chi Nhánh Mới
                </button>
              </div>
            ) : viewLayout === 'grid' ? (
              /* GRID CARD VIEW */
              <div className="adm-stores-grid">
                {filteredStores.map((store) => {
                  const manager = getStoreManager(store.id);
                  const staffCount = storeStaffCounts[store.id] || 0;

                  return (
                    <div key={store.id} className="adm-store-card">
                      {/* Card Header */}
                      <div className="adm-store-card-header">
                        <div className="adm-store-title-wrap">
                          <h3 className="adm-store-name">{store.name}</h3>
                          <span className="adm-store-hours">
                            Giờ hoạt động: {store.openTime?.slice(0, 5) || '08:00'} – {store.closeTime?.slice(0, 5) || '22:00'}
                          </span>
                        </div>
                        <div className="adm-store-actions">
                          <button
                            type="button"
                            className="adm-btn adm-btn-xs adm-btn-secondary"
                            onClick={() => openEditStoreModal(store)}
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            className="adm-btn adm-btn-xs adm-btn-ghost text-danger"
                            onClick={() => setConfirmDelete({ type: 'store', id: store.id, name: store.name })}
                          >
                            Xóa
                          </button>
                        </div>
                      </div>

                      {/* Store Details */}
                      <div className="adm-store-address">
                        <span>{store.address}</span>
                      </div>

                      {/* Manager Section (Core Feature) */}
                      <div className="adm-store-mgr-box">
                        <div className="adm-store-mgr-label">
                          <span>Quản Lý Phụ Trách</span>
                          {manager && (
                            <button
                              type="button"
                              className="adm-mgr-reassign-link"
                              onClick={() => openAssignModal(store)}
                            >
                              Đổi Quản lý
                            </button>
                          )}
                        </div>

                        {manager ? (
                          <div className="adm-store-mgr-card">
                            <img
                              src={getAvatar(manager.fullName)}
                              alt={manager.fullName}
                              className="adm-store-mgr-avatar"
                            />
                            <div className="adm-store-mgr-details">
                              <div className="adm-store-mgr-name">{manager.fullName}</div>
                              <div className="adm-store-mgr-email">{manager.email}</div>
                              {manager.phone && (
                                <div className="adm-store-mgr-phone">{manager.phone}</div>
                              )}
                            </div>
                            <button
                              type="button"
                              className="adm-mgr-unlink-btn"
                              title="Gỡ Quản lý khỏi chi nhánh này"
                              onClick={() => handleRemoveManagerFromStore(store.id, store.name)}
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="adm-store-unassigned-box">
                            <div className="adm-unassigned-warning">
                              <span>Chưa có Quản lý phụ trách</span>
                            </div>
                            <button
                              type="button"
                              className="adm-btn adm-btn-sm adm-btn-assign"
                              onClick={() => openAssignModal(store)}
                            >
                              <span>Phân công Quản lý ngay</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Card Footer */}
                      <div className="adm-store-footer">
                        <div className="adm-store-stat-pill">
                          <span>{staffCount} nhân sự trực thuộc</span>
                        </div>
                        <button
                          type="button"
                          className="adm-btn adm-btn-sm adm-btn-outline"
                          onClick={() => openAssignModal(store)}
                        >
                          Phân công
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* TABLE VIEW */
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>Chi Nhánh</th>
                      <th>Địa Chỉ & Khung Giờ</th>
                      <th>Quản Lý Phụ Trách</th>
                      <th>Quy Mô Nhân Sự</th>
                      <th style={{ textAlign: 'right' }}>Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStores.map((store) => {
                      const manager = getStoreManager(store.id);
                      const staffCount = storeStaffCounts[store.id] || 0;

                      return (
                        <tr key={store.id}>
                          <td>
                            <div className="adm-table-cell-title">
                              <strong>{store.name}</strong>
                            </div>
                          </td>
                          <td>
                            <div className="adm-table-addr-text">{store.address}</div>
                            <div className="adm-table-time-sub">
                              {store.openTime?.slice(0, 5) || '08:00'} - {store.closeTime?.slice(0, 5) || '22:00'}
                            </div>
                          </td>
                          <td>
                            {manager ? (
                              <div className="adm-table-mgr-flex">
                                <img
                                  src={getAvatar(manager.fullName)}
                                  alt=""
                                  className="adm-table-mgr-avatar"
                                />
                                <div>
                                  <div className="adm-table-mgr-name">{manager.fullName}</div>
                                  <div className="adm-table-mgr-sub">{manager.email}</div>
                                </div>
                              </div>
                            ) : (
                              <span className="adm-badge-warning">Chưa có Quản lý</span>
                            )}
                          </td>
                          <td>
                            <span className="adm-table-badge">{staffCount} nhân sự</span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div className="adm-table-actions">
                              <button
                                type="button"
                                className="adm-btn adm-btn-xs adm-btn-assign"
                                onClick={() => openAssignModal(store)}
                              >
                                {manager ? 'Đổi Quản lý' : 'Phân công'}
                              </button>
                              <button
                                type="button"
                                className="adm-btn adm-btn-xs adm-btn-secondary"
                                onClick={() => openEditStoreModal(store)}
                              >
                                Sửa
                              </button>
                              <button
                                type="button"
                                className="adm-btn adm-btn-xs adm-btn-ghost text-danger"
                                onClick={() => setConfirmDelete({ type: 'store', id: store.id, name: store.name })}
                              >
                                Xóa
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ═══ TAB CONTENT 2: MANAGERS DIRECTORY ═══ */}
        {activeTab === 'managers' && (
          <div className="adm-tab-content">
            {loading ? (
              <div className="adm-empty-state">
                <div className="adm-spinner" />
                <p>Đang tải danh sách Quản lý...</p>
              </div>
            ) : filteredManagers.length === 0 ? (
              <div className="adm-empty-state">
                <h3>Chưa có Quản lý nào trong hệ thống</h3>
                <p>Hãy tạo tài khoản Quản lý mới để phân công quản lý chi nhánh.</p>
                <button
                  type="button"
                  className="adm-btn adm-btn-primary"
                  onClick={() => openCreateUserModal('MANAGER')}
                >
                  + Tạo Quản Lý Mới
                </button>
              </div>
            ) : (
              <div className="adm-managers-grid">
                {filteredManagers.map((mgr) => {
                  const mId = mgr.id || mgr.staffId;
                  const assignedStores = getManagerAssignedStores(mId);

                  return (
                    <div key={mId} className="adm-manager-card">
                      <div className="adm-manager-card-top">
                        <img
                          src={getAvatar(mgr.fullName)}
                          alt={mgr.fullName}
                          className="adm-manager-avatar"
                        />
                        <div className="adm-manager-info">
                          <h3 className="adm-manager-name">{mgr.fullName}</h3>
                          <span className="adm-manager-email">{mgr.email}</span>
                          {mgr.phone && (
                            <span className="adm-manager-phone">{mgr.phone}</span>
                          )}
                        </div>
                        <span className="adm-role-badge role-manager">MANAGER</span>
                      </div>

                      <div className="adm-manager-stores-section">
                        <div className="adm-manager-section-title">
                          Chi Nhánh Đang Phụ Trách ({assignedStores.length})
                        </div>
                        {assignedStores.length > 0 ? (
                          <div className="adm-assigned-stores-tags">
                            {assignedStores.map(s => (
                              <span key={s.id} className="adm-store-tag">
                                {s.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div className="adm-unassigned-manager-note">
                            Chưa được phân công phụ trách chi nhánh nào.
                          </div>
                        )}
                      </div>

                      <div className="adm-manager-card-actions">
                        <button
                          type="button"
                          className="adm-btn adm-btn-sm adm-btn-outline"
                          onClick={() => {
                            if (stores.length > 0) {
                              openAssignModal(stores[0]);
                              setSelectedManagerId(mId);
                            }
                          }}
                        >
                          Phân công chi nhánh
                        </button>
                        <button
                          type="button"
                          className="adm-btn adm-btn-sm adm-btn-ghost"
                          onClick={() => openEditUserModal(mgr)}
                        >
                          Sửa tài khoản
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══ TAB CONTENT 3: USER DIRECTORY & ROLES ═══ */}
        {activeTab === 'users' && (
          <div className="adm-tab-content">
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Họ Tên & Tài Khoản</th>
                    <th>Email</th>
                    <th>Số Điện Thoại</th>
                    <th>Vai Trò Hệ Thống</th>
                    <th style={{ textAlign: 'right' }}>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => {
                    const role = (u.systemRole || u.role || 'STAFF').toUpperCase();
                    const uId = u.id || u.staffId;

                    return (
                      <tr key={uId}>
                        <td>
                          <div className="adm-table-mgr-flex">
                            <img
                              src={getAvatar(u.fullName)}
                              alt=""
                              className="adm-table-mgr-avatar"
                            />
                            <strong>{u.fullName}</strong>
                          </div>
                        </td>
                        <td>{u.email}</td>
                        <td>{u.phone || '—'}</td>
                        <td>
                          <span className={`adm-role-badge role-${role.toLowerCase()}`}>
                            {role}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="adm-table-actions">
                            <button
                              type="button"
                              className="adm-btn adm-btn-xs adm-btn-secondary"
                              onClick={() => openEditUserModal(u)}
                            >
                              Sửa
                            </button>
                            <button
                              type="button"
                              className="adm-btn adm-btn-xs adm-btn-ghost text-danger"
                              onClick={() => setConfirmDelete({ type: 'user', id: uId, name: u.fullName })}
                            >
                              Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 1: PHÂN CÔNG QUẢN LÝ CHO CHI NHÁNH
          ══════════════════════════════════════════════════════════════════════ */}
      {showAssignModal && assignStoreTarget && (
        <div className="adm-modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="adm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="adm-modal-header">
              <div className="adm-modal-header-text">
                <h2>Phân Công Quản Lý Chi Nhánh</h2>
                <p>Bổ nhiệm người phụ trách vận hành và lịch làm việc tại chi nhánh.</p>
              </div>
              <button
                type="button"
                className="adm-modal-close"
                onClick={() => setShowAssignModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="adm-modal-body">
              {/* Selected Store Card Preview */}
              <div className="adm-modal-store-preview">
                <div>
                  <div className="adm-modal-store-name">{assignStoreTarget.name}</div>
                  <div className="adm-modal-store-addr">{assignStoreTarget.address}</div>
                </div>
              </div>

              {/* Manager Select Field */}
              <div className="adm-form-group">
                <label className="adm-form-label">
                  Chọn Quản Lý Phụ Trách:
                </label>
                <select
                  value={selectedManagerId}
                  onChange={(e) => setSelectedManagerId(e.target.value)}
                  className="adm-form-select"
                >
                  <option value="">-- Để trống (Chưa bổ nhiệm Quản lý) --</option>
                  {managers.map((m) => {
                    const mId = m.id || m.staffId;
                    const assignedList = getManagerAssignedStores(mId);
                    const isCurrent = managerAssignments[assignStoreTarget.id] === mId;
                    const assignedText = isCurrent
                      ? ' (Hiện đang phụ trách chi nhánh này)'
                      : assignedList.length > 0
                      ? ` (Đang phụ trách: ${assignedList.map(s => s.name).join(', ')})`
                      : ' (Sẵn sàng phân công)';

                    return (
                      <option key={mId} value={mId}>
                        {m.fullName} - {m.email} {assignedText}
                      </option>
                    );
                  })}
                </select>
                <small className="adm-form-hint">
                  Chỉ các tài khoản có vai trò <strong>MANAGER</strong> mới có quyền điều hành và duyệt ca tại chi nhánh.
                </small>
              </div>

              {/* Quick Create Manager prompt if needed */}
              <div className="adm-modal-tip-box">
                <span>Chưa có Quản lý phù hợp? </span>
                <button
                  type="button"
                  className="adm-tip-link"
                  onClick={() => {
                    setShowAssignModal(false);
                    openCreateUserModal('MANAGER');
                  }}
                >
                  Tạo tài khoản Quản lý mới
                </button>
              </div>
            </div>

            <div className="adm-modal-footer">
              <button
                type="button"
                className="adm-btn adm-btn-secondary"
                onClick={() => setShowAssignModal(false)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="adm-btn adm-btn-primary"
                onClick={handleSaveAssignment}
              >
                Lưu Phân Công
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 2: THÊM / SỬA CHI NHÁNH CỬA HÀNG
          ══════════════════════════════════════════════════════════════════════ */}
      {showStoreModal && (
        <div className="adm-modal-overlay" onClick={() => setShowStoreModal(false)}>
          <div className="adm-modal" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSaveStore}>
              <div className="adm-modal-header">
                <div className="adm-modal-header-text">
                  <h2>{editingStore ? 'Chỉnh Sửa Chi Nhánh' : 'Thêm Chi Nhánh Cửa Hàng Mới'}</h2>
                  <p>Thiết lập thông tin vị trí và thời gian hoạt động của chi nhánh.</p>
                </div>
                <button
                  type="button"
                  className="adm-modal-close"
                  onClick={() => setShowStoreModal(false)}
                >
                  ✕
                </button>
              </div>

              <div className="adm-modal-body">
                <div className="adm-form-group">
                  <label className="adm-form-label">Tên Chi Nhánh *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: ShiftSync Quận 1 - Nguyễn Huệ"
                    value={storeForm.name}
                    onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
                    className="adm-form-input"
                  />
                </div>

                <div className="adm-form-group">
                  <label className="adm-form-label">Địa Chỉ Chi Nhánh *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nhập địa chỉ hoặc chọn địa điểm mẫu bên dưới..."
                    value={storeForm.address}
                    onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })}
                    className="adm-form-input"
                  />
                  {/* Suggestions */}
                  <div className="adm-location-suggestions">
                    <span className="adm-sugg-title">Gợi ý nhanh:</span>
                    {POPULAR_LOCATIONS.slice(0, 3).map((loc, i) => (
                      <button
                        key={i}
                        type="button"
                        className="adm-sugg-btn"
                        onClick={() => setStoreForm({
                          ...storeForm,
                          address: loc.name,
                          latitude: loc.lat,
                          longitude: loc.lng
                        })}
                      >
                        {loc.name.split(',')[0]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="adm-form-row">
                  <div className="adm-form-group">
                    <label className="adm-form-label">Giờ Mở Cửa</label>
                    <input
                      type="time"
                      value={storeForm.openTime}
                      onChange={(e) => setStoreForm({ ...storeForm, openTime: e.target.value })}
                      className="adm-form-input"
                    />
                  </div>
                  <div className="adm-form-group">
                    <label className="adm-form-label">Giờ Đóng Cửa</label>
                    <input
                      type="time"
                      value={storeForm.closeTime}
                      onChange={(e) => setStoreForm({ ...storeForm, closeTime: e.target.value })}
                      className="adm-form-input"
                    />
                  </div>
                </div>
              </div>

              <div className="adm-modal-footer">
                <button
                  type="button"
                  className="adm-btn adm-btn-secondary"
                  onClick={() => setShowStoreModal(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="adm-btn adm-btn-primary"
                >
                  {editingStore ? 'Cập Nhật' : 'Tạo Chi Nhánh'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 3: TẠO / SỬA TÀI KHOẢN NGƯỜI DÙNG & QUẢN LÝ
          ══════════════════════════════════════════════════════════════════════ */}
      {showUserModal && (
        <div className="adm-modal-overlay" onClick={() => setShowUserModal(false)}>
          <div className="adm-modal" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSaveUser}>
              <div className="adm-modal-header">
                <div className="adm-modal-header-text">
                  <h2>{editingUser ? 'Chỉnh Sửa Tài Khoản' : 'Tạo Tài Khoản Người Dùng Mới'}</h2>
                  <p>Thiết lập thông tin đăng nhập và phân quyền hệ thống.</p>
                </div>
                <button
                  type="button"
                  className="adm-modal-close"
                  onClick={() => setShowUserModal(false)}
                >
                  ✕
                </button>
              </div>

              <div className="adm-modal-body">
                <div className="adm-form-group">
                  <label className="adm-form-label">Họ và Tên *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Nguyễn Văn Quản Lý"
                    value={userForm.fullName}
                    onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
                    className="adm-form-input"
                  />
                </div>

                <div className="adm-form-group">
                  <label className="adm-form-label">Địa Chỉ Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="manager@shiftsync.vn"
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    className="adm-form-input"
                  />
                </div>

                <div className="adm-form-group">
                  <label className="adm-form-label">
                    {editingUser ? 'Mật Khẩu Mới (Để trống nếu không đổi)' : 'Mật Khẩu Khởi Tạo *'}
                  </label>
                  <input
                    type="password"
                    required={!editingUser}
                    placeholder="Tối thiểu 6 ký tự..."
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    className="adm-form-input"
                  />
                </div>

                <div className="adm-form-row">
                  <div className="adm-form-group">
                    <label className="adm-form-label">Số Điện Thoại</label>
                    <input
                      type="tel"
                      placeholder="0901234567"
                      value={userForm.phone}
                      onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                      className="adm-form-input"
                    />
                  </div>

                  <div className="adm-form-group">
                    <label className="adm-form-label">Vai Trò Hệ Thống *</label>
                    <select
                      value={userForm.systemRole}
                      disabled={Boolean(editingUser)}
                      onChange={(e) => setUserForm({ ...userForm, systemRole: e.target.value })}
                      className="adm-form-select"
                    >
                      <option value="MANAGER">Quản Lý Chi Nhánh (MANAGER)</option>
                      <option value="STAFF">Nhân Viên (STAFF)</option>
                      <option value="ADMIN">Quản Trị Viên (ADMIN)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="adm-modal-footer">
                <button
                  type="button"
                  className="adm-btn adm-btn-secondary"
                  onClick={() => setShowUserModal(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="adm-btn adm-btn-primary"
                >
                  {editingUser ? 'Lưu Thay Đổi' : 'Tạo Tài Khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 4: XÁC NHẬN XÓA
          ══════════════════════════════════════════════════════════════════════ */}
      {confirmDelete && (
        <div className="adm-modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="adm-modal adm-modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="adm-modal-header">
              <h2>Xác Nhận Xóa</h2>
              <button
                type="button"
                className="adm-modal-close"
                onClick={() => setConfirmDelete(null)}
              >
                ✕
              </button>
            </div>
            <div className="adm-modal-body">
              <p>
                Bạn có chắc chắn muốn xóa {confirmDelete.type === 'store' ? 'chi nhánh' : 'tài khoản'}{' '}
                <strong>"{confirmDelete.name}"</strong>?
              </p>
              <p style={{ color: '#ef4444', fontSize: '13px', marginTop: '6px' }}>
                Hành động này không thể hoàn tác sau khi xác nhận.
              </p>
            </div>
            <div className="adm-modal-footer">
              <button
                type="button"
                className="adm-btn adm-btn-secondary"
                onClick={() => setConfirmDelete(null)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="adm-btn adm-btn-danger"
                onClick={handleDelete}
              >
                Xác Nhận Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ TOAST NOTIFICATION ═══ */}
      {toastMessage && (
        <div className={`adm-toast ${toastMessage.isError ? 'error' : 'success'}`}>
          <div className="adm-toast-body">
            <div className="adm-toast-title">{toastMessage.title}</div>
            <div className="adm-toast-desc">{toastMessage.desc}</div>
          </div>
        </div>
      )}
    </div>
  );
}
