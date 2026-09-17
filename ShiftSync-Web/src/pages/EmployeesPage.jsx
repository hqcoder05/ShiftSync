import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { getEmployees, createEmployee, updateEmployee, deleteEmployee } from '../services/employeeService';
import { getAllStores } from '../services/storeService';
import { assignStaffToStore, getStoresByStaff } from '../services/employmentService';
import { getSkillsByStore } from '../services/skillService';
import avatarPaul from '../assets/avatars/avatar-paul-lee.png';
import avatarThia from '../assets/avatars/avatar-thia-ago.png';
import avatarMew from '../assets/avatars/avatar-mew-ama.png';
import avatarDilan from '../assets/avatars/avatar-dilan-jon.png';
import { AVATAR_OPTIONS, getAvatarById, getAvatarForEmployee } from '../components/avatarConfigs';
import { getAvatarThumbnail } from '../components/avatarThumbnails';
import AvatarCollectionModal from '../components/AvatarCollectionModal';
import townIllustration from '../assets/illustrations/town-illustration.png';
import './EmployeesPage.css';

const ROLES = ['ADMIN', 'MANAGER', 'STAFF'];
const EMPLOYMENT_TYPES = [
  { value: 'FULL_TIME', label: 'Toàn thời gian' },
  { value: 'PART_TIME', label: 'Bán thời gian' },
  { value: 'SEASONAL', label: 'Thời vụ' },
  { value: 'INTERN', label: 'Thực tập' },
];

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
  const [employees, setEmployees] = useState([]);
  const [stores, setStores] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [activeTab, setActiveTab] = useState('hoso');
  const [savedUserId, setSavedUserId] = useState(null);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [currentSelectedAvatarId, setCurrentSelectedAvatarId] = useState(() => {
    const myId = localStorage.getItem('userId');
    return (myId && localStorage.getItem(`user_profile_avatar_${myId}`)) || 'dilan';
  });

  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', role: 'STAFF' });
  const [assignForm, setAssignForm] = useState({ storeId: '', employmentType: 'FULL_TIME', hourlyRate: '', joinedDate: '', skillId: '' });
  const [skills, setSkills] = useState([]);

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
    setEditing(null); 
    setSavedUserId(null); 
    setActiveTab('hoso');
    setError('');
    const defaultStoreId = localStorage.getItem('selectedStoreId') || (stores[0]?.id || '');
    setForm({ fullName: '', email: '', phone: '', password: '', role: 'STAFF' });
    setAssignForm({
      storeId: defaultStoreId,
      employmentType: 'FULL_TIME',
      hourlyRate: '25000',
      joinedDate: new Date().toISOString().split('T')[0],
      skillId: ''
    });
    if (defaultStoreId) {
      getSkillsByStore(defaultStoreId)
        .then(res => setSkills(Array.isArray(res.data) ? res.data : (res.data?.content || [])))
        .catch(() => setSkills([]));
    } else {
      setSkills([]);
    }
    setShowModal(true);
  };

  const openEdit = async (emp) => {
    setEditing(emp); 
    setSavedUserId(emp.id); 
    setActiveTab('hoso');
    setError('');
    setForm({ 
      fullName: emp.fullName || '', 
      email: emp.email || '', 
      phone: emp.phone || '', 
      password: '', 
      role: emp.role || emp.systemRole || 'STAFF' 
    });

    const defaultStoreId = localStorage.getItem('selectedStoreId') || (stores[0]?.id || '');

    try {
      const res = await getStoresByStaff(emp.id);
      const stList = Array.isArray(res.data) ? res.data : (res.data?.content || []);
      const activeSt = stList.find(s => s.status === 'ACTIVE') || stList[0];
      if (activeSt) {
        const initialStoreId = activeSt.storeId || defaultStoreId;
        if (initialStoreId) {
          try {
            const sRes = await getSkillsByStore(initialStoreId);
            setSkills(Array.isArray(sRes.data) ? sRes.data : (sRes.data?.content || []));
          } catch {
            setSkills([]);
          }
        }
        setAssignForm({
          storeId: initialStoreId,
          employmentType: activeSt.employmentType || (activeSt.contractType?.name) || 'FULL_TIME',
          hourlyRate: activeSt.hourlyRate != null ? String(activeSt.hourlyRate) : '25000',
          joinedDate: activeSt.joinedDate || new Date().toISOString().split('T')[0],
          skillId: activeSt.skillId ? String(activeSt.skillId) : ''
        });
      } else {
        if (defaultStoreId) {
          try {
            const sRes = await getSkillsByStore(defaultStoreId);
            setSkills(Array.isArray(sRes.data) ? sRes.data : (sRes.data?.content || []));
          } catch {
            setSkills([]);
          }
        }
        setAssignForm({
          storeId: defaultStoreId,
          employmentType: 'FULL_TIME',
          hourlyRate: '25000',
          joinedDate: new Date().toISOString().split('T')[0],
          skillId: ''
        });
      }
    } catch (e) {
      console.error('Lỗi khi lấy thông tin phân công:', e);
      if (defaultStoreId) {
        getSkillsByStore(defaultStoreId)
          .then(sRes => setSkills(Array.isArray(sRes.data) ? sRes.data : (sRes.data?.content || [])))
          .catch(() => setSkills([]));
      }
      setAssignForm({
        storeId: defaultStoreId,
        employmentType: 'FULL_TIME',
        hourlyRate: '25000',
        joinedDate: new Date().toISOString().split('T')[0],
        skillId: ''
      });
    }

    setShowModal(true);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault(); 
    setError('');

    // Bắt validation dữ liệu chuẩn trước khi gửi
    if (form.phone && form.phone.length < 10) {
      setError('Số điện thoại phải có ít nhất 10 số!');
      return;
    }
    if (!editing && form.password.length < 6) {
      setError('Mật khẩu phải từ 6 ký tự trở lên!');
      return;
    }

    try {
      if (editing) {
        const payload = { fullName: form.fullName, email: form.email, phone: form.phone };
        if (form.password) payload.password = form.password;
        await updateEmployee(editing.id, payload);
        setSavedUserId(editing.id);
      } else {
        // Map đúng payload `systemRole` khớp với UserCreateRequest trong Swagger
        const payload = {
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          password: form.password,
          systemRole: form.role,   // ← fix: service đọc `systemRole`, không phải `role`
        };
        const res = await createEmployee(payload);
        const newId = res.data?.id || res.data?.data?.id || res.data;
        setSavedUserId(newId);
      }
      fetchEmployees();
      showToast(editing ? '✓ Đã cập nhật hồ sơ nhân viên' : '✓ Đã tạo nhân viên mới');
      setActiveTab('phancong'); 
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message;
      if (status === 409) {
        setError(msg || 'Email này đã tồn tại! Vui lòng dùng email khác.');
      } else if (status === 403) {
        setError('Lỗi 403: Không có quyền hoặc Token đã hết hạn! Vui lòng đăng nhập lại.');
      } else {
        setError(msg || 'Lưu hồ sơ thất bại. Kiểm tra lại thông tin!');
      }
    }
  };

  const handleSaveAssignment = async (e) => {
    e.preventDefault(); 
    setError('');
    if (!savedUserId) { setError('Cần lưu Hồ sơ trước khi Phân công'); return; }
    if (!assignForm.storeId) { setError('Vui lòng chọn chi nhánh'); return; }

    try {
      await assignStaffToStore(assignForm.storeId, {
        staffId: savedUserId,
        employmentType: assignForm.employmentType,
        hourlyRate: Number(assignForm.hourlyRate),
        joinedDate: assignForm.joinedDate,
        skillId: assignForm.skillId ? assignForm.skillId : null,
      });
      setShowModal(false);
      fetchEmployees();
      showToast('✓ Đã lưu phân công thành công');
    } catch (err) {
      setError(err.response?.data?.message || 'Phân công thất bại');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Xoá nhân viên này?')) return;
    try { 
      await deleteEmployee(id); 
      fetchEmployees();
      showToast('✓ Đã xoá nhân viên');
    } catch (err) { 
      setError(err.response?.data?.message || 'Xoá thất bại'); 
    }
  };

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showModal) {
        setShowModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showModal]);

  return (
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
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="ss-btn ss-btn-outline"
              onClick={() => setShowAvatarModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '12px' }}
              title="Khám phá và chọn trong 17 Avatar 3D Digital Twin"
            >
              <span style={{ fontSize: '15px' }}>👤</span>
              <span>Bộ sưu tập Avatar 3D</span>
            </button>
            <button type="button" className="ss-btn ss-btn-primary emp-top-add-btn ss-btn-elevated" onClick={openCreate}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Thêm nhân viên</span>
            </button>
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

            <button type="button" className="emp-add-footer-btn" onClick={openCreate}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Thêm nhân viên mới</span>
            </button>
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

      {/* Accessible Modal Dialog */}
      {showModal && (
        <div
          className="emp-modal-overlay"
          onClick={() => setShowModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="emp-modal-title"
        >
          <div className="emp-modal" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              className="emp-modal-close"
              onClick={() => setShowModal(false)}
              aria-label="Đóng cửa sổ"
            >
              ✕
            </button>

            <div className="emp-modal-body">
              <nav className="emp-tabs" aria-label="Tab thông tin">
                <button
                  type="button"
                  className={activeTab === 'hoso' ? 'active' : ''}
                  onClick={() => { setError(''); setActiveTab('hoso'); }}
                >
                  1. Hồ sơ cá nhân
                </button>
                <button
                  type="button"
                  className={activeTab === 'phancong' ? 'active' : ''}
                  onClick={() => { setError(''); setActiveTab('phancong'); }}
                  disabled={!savedUserId}
                  title={!savedUserId ? 'Vui lòng lưu hồ sơ trước' : ''}
                >
                  2. Phân công & Lương
                </button>
              </nav>

              {error && (
                <div className="emp-error-banner" role="alert" style={{ marginBottom: '16px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              <div className="emp-tab-content">
                {activeTab === 'hoso' && (
                  <form className="emp-form-grid" onSubmit={handleSaveProfile}>
                    <h2 id="emp-modal-title" className="emp-modal-title">
                      {editing ? 'Chỉnh sửa hồ sơ người dùng' : 'Thêm mới người dùng'}
                    </h2>

                    <div className="ss-form-group">
                      <label className="ss-label" htmlFor="emp-fullname">
                        Họ và tên <span className="ss-label-required">*</span>
                      </label>
                      <input
                        id="emp-fullname"
                        className="ss-input"
                        required
                        placeholder="VD: Nguyễn Văn A"
                        value={form.fullName}
                        onChange={e => setForm({...form, fullName: e.target.value})}
                      />
                    </div>

                    <div className="ss-form-group">
                      <label className="ss-label" htmlFor="emp-email">
                        Email liên hệ <span className="ss-label-required">*</span>
                      </label>
                      <input
                        id="emp-email"
                        type="email"
                        className="ss-input"
                        required
                        placeholder="name@shiftsync.com"
                        value={form.email}
                        onChange={e => setForm({...form, email: e.target.value})}
                      />
                    </div>

                    <div className="ss-form-group">
                      <label className="ss-label" htmlFor="emp-phone">
                        Số điện thoại
                      </label>
                      <input
                        id="emp-phone"
                        className="ss-input"
                        placeholder="Nhập 10 số (VD: 0912345678)"
                        value={form.phone}
                        onChange={e => setForm({...form, phone: e.target.value})}
                      />
                    </div>

                    <div className="ss-form-group">
                      <label className="ss-label" htmlFor="emp-password">
                        {editing ? 'Mật khẩu mới (bỏ trống nếu giữ nguyên)' : 'Mật khẩu'} {!editing && <span className="ss-label-required">*</span>}
                      </label>
                      <input
                        id="emp-password"
                        type="password"
                        className="ss-input"
                        required={!editing}
                        placeholder={editing ? 'Nhập nếu muốn đổi' : 'Tối thiểu 6 ký tự'}
                        value={form.password}
                        onChange={e => setForm({...form, password: e.target.value})}
                      />
                    </div>

                    {!editing && (
                      <div className="ss-form-group">
                        <label className="ss-label" htmlFor="emp-role">
                          Vai trò hệ thống <span className="ss-label-required">*</span>
                        </label>
                        <select
                          id="emp-role"
                          className="ss-select"
                          value={form.role}
                          onChange={e => setForm({...form, role: e.target.value})}
                        >
                          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                    )}

                    <div className="emp-modal-actions">
                      <button type="button" className="ss-btn ss-btn-outline" onClick={() => setShowModal(false)}>
                        Huỷ bỏ
                      </button>
                      <button type="submit" className="ss-btn ss-btn-primary">
                        {editing ? 'Cập nhật hồ sơ' : 'Lưu & Tiếp tục'}
                      </button>
                    </div>
                  </form>
                )}

                {activeTab === 'phancong' && (
                  <form className="emp-form-grid" onSubmit={handleSaveAssignment}>
                    <h2 id="emp-modal-title" className="emp-modal-title">Phân công cửa hàng & Lương</h2>

                    <div className="ss-form-group">
                      <label className="ss-label" htmlFor="emp-store">
                        Chi nhánh làm việc <span className="ss-label-required">*</span>
                      </label>
                      <select
                        id="emp-store"
                        className="ss-select"
                        required
                        value={assignForm.storeId}
                        onChange={e => {
                          const sid = e.target.value;
                          setAssignForm({...assignForm, storeId: sid, skillId: ''});
                          if (sid) {
                            getSkillsByStore(sid)
                              .then(res => {
                                const d = res.data;
                                setSkills(Array.isArray(d) ? d : (d.content || []));
                              })
                              .catch(() => setSkills([]));
                          } else {
                            setSkills([]);
                          }
                        }}
                      >
                        <option value="">-- Chọn chi nhánh --</option>
                        {stores.map(s => <option key={s.id} value={s.id}>{s.name || s.storeName}</option>)}
                      </select>
                    </div>

                    <div className="ss-form-group">
                      <label className="ss-label" htmlFor="emp-skill">
                        Vị trí chuyên môn
                      </label>
                      <select
                        id="emp-skill"
                        className="ss-select"
                        value={assignForm.skillId}
                        onChange={e => setAssignForm({...assignForm, skillId: e.target.value})}
                      >
                        <option value="">-- Chọn vị trí --</option>
                        {skills.map(sk => <option key={sk.id} value={sk.id}>{sk.name}</option>)}
                      </select>
                    </div>

                    <div className="ss-form-group">
                      <label className="ss-label" htmlFor="emp-type">
                        Loại hình hợp đồng
                      </label>
                      <select
                        id="emp-type"
                        className="ss-select"
                        value={assignForm.employmentType}
                        onChange={e => setAssignForm({...assignForm, employmentType: e.target.value})}
                      >
                        {EMPLOYMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>

                    <div className="ss-form-group">
                      <label className="ss-label" htmlFor="emp-rate">
                        Lương theo giờ (VNĐ) <span className="ss-label-required">*</span>
                      </label>
                      <input
                        id="emp-rate"
                        className="ss-input"
                        required
                        type="number"
                        min="0"
                        placeholder="VD: 25000"
                        value={assignForm.hourlyRate}
                        onChange={e => setAssignForm({...assignForm, hourlyRate: e.target.value})}
                      />
                    </div>

                    <div className="ss-form-group">
                      <label className="ss-label" htmlFor="emp-joined">
                        Ngày bắt đầu làm việc <span className="ss-label-required">*</span>
                      </label>
                      <input
                        id="emp-joined"
                        className="ss-input"
                        required
                        type="date"
                        value={assignForm.joinedDate}
                        onChange={e => setAssignForm({...assignForm, joinedDate: e.target.value})}
                      />
                    </div>

                    <div className="emp-modal-actions">
                      <button type="button" className="ss-btn ss-btn-outline" onClick={() => setShowModal(false)}>
                        Huỷ bỏ
                      </button>
                      <button type="submit" className="ss-btn ss-btn-primary">
                        Lưu phân công
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
            <img src={townIllustration} alt="" className="emp-modal-illustration" />
          </div>
        </div>
      )}
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
    </div>
  );
}