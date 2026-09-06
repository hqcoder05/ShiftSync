import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { getEmployees, createEmployee, updateEmployee, deleteEmployee } from '../services/employeeService';
import { getAllStores } from '../services/storeService';
import { assignStaffToStore, getStoresByStaff } from '../services/employmentService';
import { getSkillsByStore } from '../services/skillService';
import avatarPaul from '../assets/avatars/avatar-paul-lee.png';
import avatarThia from '../assets/avatars/avatar-thia-ago.png';
import avatarMew from '../assets/avatars/avatar-mew-ama.png';
import avatarDilan from '../assets/avatars/avatar-dilan-jon.png';
import townIllustration from '../assets/illustrations/town-illustration.png';
import './EmployeesPage.css';

const ROLES = ['ADMIN', 'MANAGER', 'STAFF'];
const EMPLOYMENT_TYPES = [
  { value: 'FULL_TIME', label: 'Toàn thời gian' },
  { value: 'PART_TIME', label: 'Bán thời gian' },
  { value: 'SEASONAL', label: 'Thời vụ' },
  { value: 'INTERN', label: 'Thực tập' },
];

const AVATAR_MAP = {
  'Paul. Lee': avatarPaul,
  'Thia. Ago': avatarThia,
  'Mew. Ama': avatarMew,
  'Dilan. Jon': avatarDilan,
};
const DEFAULT_AVATAR = avatarPaul;

export default function EmployeesPage() {
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
    let initialStoreId = defaultStoreId;

    try {
      const res = await getStoresByStaff(emp.id);
      const stList = Array.isArray(res.data) ? res.data : (res.data?.content || []);
      const activeSt = stList.find(s => s.status === 'ACTIVE') || stList[0];
      if (activeSt) {
        initialStoreId = activeSt.storeId || defaultStoreId;
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

  return (
    <div className="emp-page">
      {/* Black Toast */}
      {toastMsg && <div className="black-toast">{toastMsg}</div>}

      <Sidebar
        search={{ value: search, onChange: setSearch, placeholder: 'Tìm kiếm' }}
        pageNav={{
          currentTo: '/employees',
          options: [
            { to: '/employees', label: 'Người dùng' },
            { to: '/stores', label: 'Chi nhánh & Vị trí' },
          ],
        }}
      />

      <main className="emp-main">
        <h1>Người dùng</h1>
        {error && !showModal && <p className="emp-error" style={{ color: 'red' }}>{error}</p>}
        {loading ? <p>Đang tải...</p> : (
          <div className="emp-table-card">
            <div className="emp-table-header">
              <span>Nhân viên</span><span>Vai trò</span><span>Email</span><span></span>
            </div>
            {employees.length === 0 ? (
              <div className="emp-empty" style={{ padding: '20px', textAlign: 'center' }}>
                Chưa có dữ liệu người dùng
              </div>
            ) : (
              employees.map(emp => (
                <div className="emp-row" key={emp.id || emp.email}>
                  <span className="emp-name">
                    <img
                      className="emp-avatar"
                      src={AVATAR_MAP[emp.fullName] || DEFAULT_AVATAR}
                      alt={emp.fullName || 'Avatar'}
                    />
                    {emp.fullName}
                  </span>
                  <span>{emp.role || emp.systemRole}</span>
                  <span>{emp.email}</span>
                  <span className="emp-actions">
                    <button onClick={() => openEdit(emp)}>Sửa</button>
                    <button onClick={() => handleDelete(emp.id)}>Xoá</button>
                  </span>
                </div>
              ))
            )}
            <button className="emp-add-btn" onClick={openCreate}>+ Add User</button>
          </div>
        )}
        <div className="emp-pagination">
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)}>Trước</button>
          <span>Trang {page + 1}/{totalPages || 1}</span>
          <button disabled={page + 1 >= totalPages} onClick={() => setPage(p => p + 1)}>Sau</button>
        </div>
      </main>

      {showModal && (
        <div className="emp-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="emp-modal" onClick={e => e.stopPropagation()}>
            <button className="emp-modal-close" onClick={() => setShowModal(false)}>✕</button>
            <div className="emp-modal-body">
              <nav className="emp-tabs">
                <button 
                  className={activeTab === 'hoso' ? 'active' : ''} 
                  onClick={() => { setError(''); setActiveTab('hoso'); }}
                >
                  Hồ sơ
                </button>
                <button 
                  className={activeTab === 'phancong' ? 'active' : ''} 
                  onClick={() => { setError(''); setActiveTab('phancong'); }} 
                  disabled={!savedUserId}
                >
                  Phân công
                </button>
              </nav>

              {error && <p className="emp-error" style={{ color: 'red', margin: '10px 0' }}>{error}</p>}

              <div className="emp-tab-content">
                {activeTab === 'hoso' && (
                  <form className="emp-form-grid" onSubmit={handleSaveProfile}>
                    <h2>{editing ? 'Sửa hồ sơ' : 'Thêm người'}</h2>
                    <label>Họ tên<input required value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})} /></label>
                    <label>Email<input type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></label>
                    <label>Số điện thoại<input value={form.phone} placeholder="Nhập đủ 10 số (VD: 0912345678)" onChange={e => setForm({...form, phone: e.target.value})} /></label>
                    <label>{editing ? 'Mật khẩu mới (bỏ trống nếu giữ nguyên)' : 'Mật khẩu'}
                      <input type="password" required={!editing} value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
                    </label>
                    {!editing && (
                      <label>Vai trò
                        <select value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </label>
                    )}
                    <button className="emp-save-btn" type="submit">Lưu</button>
                  </form>
                )}

                {activeTab === 'phancong' && (
                  <form className="emp-form-grid" onSubmit={handleSaveAssignment}>
                    <h2>Phân công & Tiền lương</h2>
                    <label>Chi nhánh
                      <select required value={assignForm.storeId} onChange={e => {
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
                      }}>
                        <option value="">-- Chọn chi nhánh --</option>
                        {stores.map(s => <option key={s.id} value={s.id}>{s.name || s.storeName}</option>)}
                      </select>
                    </label>
                    <label>Vị trí công việc
                      <select value={assignForm.skillId} onChange={e => setAssignForm({...assignForm, skillId: e.target.value})}>
                        <option value="">-- Chọn vị trí --</option>
                        {skills.map(sk => <option key={sk.id} value={sk.id}>{sk.name}</option>)}
                      </select>
                    </label>
                    <label>Loại hình
                      <select value={assignForm.employmentType} onChange={e => setAssignForm({...assignForm, employmentType: e.target.value})}>
                        {EMPLOYMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </label>
                    <label>Lương theo giờ (VNĐ)
                      <input required type="number" min="0" value={assignForm.hourlyRate} onChange={e => setAssignForm({...assignForm, hourlyRate: e.target.value})} />
                    </label>
                    <label>Ngày vào làm
                      <input required type="date" value={assignForm.joinedDate} onChange={e => setAssignForm({...assignForm, joinedDate: e.target.value})} />
                    </label>
                    <button className="emp-save-btn" type="submit">Lưu</button>
                  </form>
                )}
              </div>
            </div>
            <img src={townIllustration} alt="" className="emp-modal-illustration" />
          </div>
        </div>
      )}
    </div>
  );
}