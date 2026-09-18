import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import PayrollPage from './PayrollPage';
import Sidebar from '../components/Sidebar';
import { getEmployees, deleteEmployee } from '../services/employeeService';
import { getAllStores } from '../services/storeService';
import avatarPaul from '../assets/avatars/avatar-paul-lee.png';
import avatarThia from '../assets/avatars/avatar-thia-ago.png';
import avatarMew from '../assets/avatars/avatar-mew-ama.png';
import avatarDilan from '../assets/avatars/avatar-dilan-jon.png';
import { AVATAR_OPTIONS, getAvatarById, getAvatarForEmployee } from '../components/avatarConfigs';
import { getAvatarThumbnail } from '../components/avatarThumbnails';
import AvatarCollectionModal from '../components/AvatarCollectionModal';
import AddUserModal from '../components/AddUserModal';
import './EmployeesPage.css';


const getEmployeeAvatarId = (emp) => {
  if (!emp) return 'dilan';
  const custom = emp.id ? localStorage.getItem(`user_profile_avatar_${emp.id}`) : null;
  if (custom) return custom;
  if (emp.avatarId) return emp.avatarId;
  return getAvatarForEmployee(emp).id;
};

const getEmployeeAvatar = (emp) => {
  const id = getEmployeeAvatarId(emp);
  const thumb = getAvatarThumbnail(id);
  if (thumb) return thumb;
  if (id === 'mew') return avatarMew;
  if (id === 'paul') return avatarPaul;
  if (id === 'thia') return avatarThia;
  return avatarDilan;
};

export default function EmployeesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const currentTab = searchParams.get('tab') === 'payroll' ? 'payroll' : 'staff';

  const [employees, setEmployees] = useState([]);
  const [stores, setStores] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [currentSelectedAvatarId, setCurrentSelectedAvatarId] = useState(() => {
    const myId = localStorage.getItem('userId');
    return (myId && localStorage.getItem(`user_profile_avatar_${myId}`)) || 'dilan';
  });

  // RBAC: determine if current user is allowed to create new staff
  const currentRole = (localStorage.getItem('userRole') || '').toUpperCase();
  const canCreateUser = currentRole === 'ADMIN' || currentRole === 'MANAGER';

  // Black Toast
  const [toastMsg, setToastMsg] = useState('');
  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const fetchEmployees = async () => {
    setLoading(true); 
    setError('');
    try {
      const res = await getEmployees(page, 20, search);
      const list = res.data?.content || res.data || [];
      setEmployees(Array.isArray(list) ? list : []);
      setTotalPages(res.data?.totalPages || 1);
    } catch (err) {
      if (err.response?.status === 403) {
        setError('Hết phiên đăng nhập (Lỗi 403). Vui lòng Đăng xuất và Đăng nhập lại!');
      } else {
        setError(err.response?.data?.message || 'Không tải được danh sách nhân viên');
      }
      setEmployees([]);
    } finally { 
      setLoading(false); 
    }
  };

  const fetchStores = async () => {
    try { 
      const res = await getAllStores(); 
      const list = res.data?.content || res.data || [];
      setStores(Array.isArray(list) ? list : []); 
    } catch (err) {
      console.error('Không tải được danh sách cửa hàng (403/Forbidden):', err);
      setStores([]);
    }
  };

  useEffect(() => { fetchEmployees(); }, [page, search]);
  useEffect(() => { fetchStores(); }, []);

  const openCreate = () => {
    if (!canCreateUser) {
      showToast('Bạn không có quyền thêm nhân sự mới.');
      return;
    }
    setShowAddUserModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Xoá nhân viên này?')) return;
    try { 
      await deleteEmployee(id); 
      fetchEmployees();
      showToast('Đã xoá nhân viên');
    } catch (err) { 
      setError(err.response?.data?.message || 'Xoá thất bại'); 
    }
  };


  return (
    <div className="emp-page-container">
      {/* ═══ DOMAIN SUBTAB BAR ═══ */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #e2e8f0', background: '#fff', padding: '0 24px' }}>
        <button
          type="button"
          onClick={() => navigate('/employees', { replace: true })}
          style={{
            padding: '12px 20px', fontWeight: 600, fontSize: 13, border: 'none', background: 'none',
            borderBottom: currentTab === 'staff' ? '3px solid #0d9488' : '3px solid transparent',
            color: currentTab === 'staff' ? '#0d9488' : '#64748b',
            cursor: 'pointer', transition: 'all 0.15s',
          }}
        >
          Danh sách nhân viên
        </button>
        <button
          type="button"
          onClick={() => navigate('/employees?tab=payroll', { replace: true })}
          style={{
            padding: '12px 20px', fontWeight: 600, fontSize: 13, border: 'none', background: 'none',
            borderBottom: currentTab === 'payroll' ? '3px solid #0d9488' : '3px solid transparent',
            color: currentTab === 'payroll' ? '#0d9488' : '#64748b',
            cursor: 'pointer', transition: 'all 0.15s',
          }}
        >
          Bảng lương (Payroll)
        </button>
      </div>

      {currentTab === 'payroll' ? (
        <div style={{ padding: '0' }}>
          <PayrollPage />
        </div>
      ) : (
        <div className="emp-page">
          {/* Black Toast */}
          {toastMsg && <div className="black-toast">{toastMsg}</div>}

          <Sidebar
            search={{ value: search, onChange: setSearch, placeholder: 'Tìm theo tên hoặc email...' }}
            pageNav={{
              currentTo: '/employees',
              options: [
                { to: '/employees', label: 'Người dùng' },
                { to: '/stores', label: 'Chi nhánh & Vị trí' },
              ],
            }}
          />

      <main className="emp-main">
        {/* Page Header with Add CTA */}
        <div className="emp-header-row">
          <div className="emp-title-col">
            <h1>Quản lý người dùng</h1>
            <p className="emp-subtitle">Danh sách tất cả tài khoản nhân viên, quản lý và phân quyền hệ thống</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              type="button"
              className="ss-btn ss-btn-outline"
              onClick={() => setShowAvatarModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '12px' }}
              title="Khám phá và chọn trong 17 Avatar 3D Digital Twin"
            >
              <span>Bộ sưu tập Avatar 3D</span>
            </button>
            {canCreateUser && (
              <button
                type="button"
                className="ss-btn ss-btn-primary emp-top-add-btn ss-btn-elevated"
                onClick={() => setShowAddUserModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '7px' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>Thêm nhân viên</span>
              </button>
            )}
          </div>
        </div>

        {error && !showModal && (
          <div className="emp-error-banner" role="alert">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="emp-loading-card ss-card-25d">
            <span className="ss-spinner" style={{ borderColor: '#cbd5e1', borderTopColor: '#51A33D', width: '28px', height: '28px' }} />
            <span>Đang tải danh sách nhân viên...</span>
          </div>
        ) : (
          <div className="emp-table-card ss-card-25d">
            <div className="emp-table-header">
              <span className="col-emp">Nhân viên</span>
              <span className="col-role">Vai trò hệ thống</span>
              <span className="col-email">Email liên hệ</span>
              <span className="col-actions">Thao tác</span>
            </div>

            {employees.length === 0 ? (
              <div className="emp-empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="emp-empty-icon">
                  <circle cx="12" cy="8" r="5" />
                  <path d="M20 21a8 8 0 0 0-16 0" />
                </svg>
                <div className="emp-empty-title">Chưa có người dùng nào</div>
                <p className="emp-empty-desc">Không tìm thấy nhân viên phù hợp với từ khoá hoặc chưa có nhân viên được tạo.</p>
                <button type="button" className="ss-btn ss-btn-primary ss-btn-sm" onClick={openCreate}>
                  + Tạo nhân viên mới
                </button>
              </div>
            ) : (
              employees.map(emp => {
                const roleStr = (emp.role || emp.systemRole || 'STAFF').toUpperCase();
                const roleBadgeClass = roleStr === 'ADMIN' ? 'badge-admin' : roleStr === 'MANAGER' ? 'badge-manager' : 'badge-staff';
                return (
                  <div className="emp-row" key={emp.id || emp.email}>
                    <div
                      className="emp-name col-emp"
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/employees/${emp.id || emp.email}`)}
                      title="Xem và chỉnh sửa hồ sơ chi tiết"
                    >
                      <img
                        className="emp-avatar"
                        src={getEmployeeAvatar(emp)}
                        alt={emp.fullName || 'Avatar'}
                      />
                      <div className="emp-name-details">
                        <span className="emp-name-text">{emp.fullName || 'Chưa đặt tên'}</span>
                        {emp.phone && <span className="emp-phone-text">{emp.phone}</span>}
                      </div>
                    </div>

                    <div className="col-role">
                      <span className={`emp-role-badge ${roleBadgeClass}`}>
                        {roleStr}
                      </span>
                    </div>

                    <div className="col-email">
                      <span className="emp-email-text">{emp.email}</span>
                    </div>

                    <div className="emp-actions col-actions">
                      <button
                        type="button"
                        className="emp-action-btn edit"
                        onClick={() => navigate(`/employees/${emp.id || emp.email}`)}
                        title="Chỉnh sửa thông tin chi tiết"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                        </svg>
                        <span>Sửa</span>
                      </button>
                      <button
                        type="button"
                        className="emp-action-btn delete"
                        onClick={() => handleDelete(emp.id)}
                        title="Xoá người dùng"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                        <span>Xoá</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}

            {canCreateUser && (
              <button type="button" className="emp-add-footer-btn" onClick={openCreate}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>Thêm nhân sự mới</span>
              </button>
            )}
          </div>
        )}

        {/* Pagination bar */}
        <div className="emp-pagination">
          <button
            type="button"
            className="ss-btn ss-btn-outline ss-btn-sm"
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
          >
            ← Trang trước
          </button>
          <span className="emp-pagination-text">Trang <strong>{page + 1}</strong> / {totalPages || 1}</span>
          <button
            type="button"
            className="ss-btn ss-btn-outline ss-btn-sm"
            disabled={page + 1 >= totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            Trang sau →
          </button>
        </div>
      </main>

      {/* 3D Avatar Collection Modal */}
      <AvatarCollectionModal
        isOpen={showAvatarModal}
        currentAvatarId={currentSelectedAvatarId}
        onSelectAvatar={(newId) => {
          setCurrentSelectedAvatarId(newId);
          const myId = localStorage.getItem('userId');
          if (myId) {
            localStorage.setItem(`user_profile_avatar_${myId}`, newId);
          }
          showToast(`Đã chọn avatar 3D: ${getAvatarById(newId).label || newId}`);
        }}
        onClose={() => setShowAvatarModal(false)}
      />

      {/* Add User Modal — Enterprise RBAC-aware single-step modal */}
      <AddUserModal
        isOpen={showAddUserModal}
        onClose={() => setShowAddUserModal(false)}
        storeId={localStorage.getItem('selectedStoreId') || ''}
        onSuccess={(newUser) => {
          showToast(`Đã tạo nhân sự mới: ${newUser?.fullName || 'Nhân viên'}`);
          fetchEmployees();
        }}
      />
        </div>
      )}
    </div>
  );
}