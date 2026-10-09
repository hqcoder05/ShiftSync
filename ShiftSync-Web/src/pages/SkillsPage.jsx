import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import EmployeeModuleLayout from '../components/EmployeeModuleLayout';
import { getAllStores } from '../services/storeService';
import { getSkillsByStore, createSkill, updateSkill, deleteSkill } from '../services/skillService';
import './SkillsPage.css';

const PRESET_COLORS = [
  '#8DD9CC', // Pastel Mint / Teal
  '#F4A8C4', // Pastel Rose / Blush Pink
  '#A5B4FC', // Pastel Periwinkle / Lavender
  '#FDBA74', // Pastel Apricot / Soft Peach
  '#93C5FD', // Pastel Sky Blue
  '#FDE68A', // Pastel Warm Butter Yellow
  '#C4B5FD', // Pastel Soft Violet
  '#86EFAC', // Pastel Soft Sage Green
];
const defaultColorFor = (name = '') =>
  PRESET_COLORS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % PRESET_COLORS.length];

const formatVND = (num) => {
  if (num === null || num === undefined || isNaN(num) || num === '') return '—';
  const val = Math.round(Number(num));
  return new Intl.NumberFormat('vi-VN').format(val) + 'đ/giờ';
};

export default function SkillsPage() {
  const [stores, setStores] = useState([]);
  const [storeId, setStoreId] = useState('');
  const [skills, setSkills] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSkill, setEditingSkill] = useState(null);
  const [name, setName] = useState('');
  const [hourlyRate, setHourlyRate] = useState(23000);
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // RBAC Permission Check
  const userRole = localStorage.getItem('userRole') || localStorage.getItem('role') || '';
  const canEdit = userRole === 'ADMIN' || userRole === 'MANAGER';

  useEffect(() => {
    getAllStores()
      .then((res) => {
        const list = res.data?.content || res.data || [];
        setStores(list);
        if (list.length) {
          const saved = localStorage.getItem('selectedStoreId');
          const target = (saved && list.find((s) => String(s.id) === String(saved))) || list[0];
          setStoreId(target.id);
          localStorage.setItem('selectedStoreId', String(target.id));
        }
      })
      .catch(() => setError('Không tải được danh sách chi nhánh'));
  }, []);

  const load = async () => {
    if (!storeId) return;
    try {
      const res = await getSkillsByStore(storeId);
      const data = res.data;
      setSkills(Array.isArray(data) ? data : data.content || []);
    } catch (e) {
      setError('Không tải được danh sách vị trí');
    }
  };

  useEffect(() => {
    load();
  }, [storeId]);

  const filtered = skills.filter((sk) =>
    sk.name.toLowerCase().includes(search.toLowerCase())
  );

  const openAddModal = () => {
    setEditingSkill(null);
    setName('');
    setHourlyRate(23000);
    setColor(PRESET_COLORS[0]);
    setError('');
    setShowModal(true);
  };

  const openEditModal = (sk) => {
    setEditingSkill(sk);
    setName(sk.name);
    setHourlyRate(Number(sk.hourlyRate) >= 0 ? Number(sk.hourlyRate) : 23000);
    setColor(getSkillColor(sk));
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!name || !name.trim()) {
      setError('Vui lòng nhập tên vị trí.');
      return;
    }

    const rateNum = Number(hourlyRate);
    if (hourlyRate === '' || isNaN(rateNum) || rateNum < 0) {
      setError('Mức lương theo giờ phải là số hợp lệ không âm (>= 0 VNĐ/giờ).');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        description: color,
        hourlyRate: rateNum,
      };

      if (editingSkill) {
        await updateSkill(storeId, editingSkill.id, payload);
        setSuccess(`Đã cập nhật mức lương cho vị trí "${name.trim()}" thành ${formatVND(rateNum)}.`);
      } else {
        await createSkill(storeId, payload);
        setSuccess(`Đã thêm vị trí "${name.trim()}" với mức lương ${formatVND(rateNum)}.`);
      }
      setShowModal(false);
      await load();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.message || (editingSkill ? 'Cập nhật thất bại' : 'Thêm thất bại'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (skillId, skillName) => {
    if (!window.confirm(`Xoá vị trí "${skillName}"?`)) return;
    try {
      await deleteSkill(storeId, skillId);
      setSuccess(`Đã xoá vị trí "${skillName}".`);
      await load();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Xoá thất bại (có thể vị trí đang được dùng trong ca)');
    }
  };

  const getSkillColor = (sk) => {
    if (sk.description && sk.description.startsWith('#')) return sk.description;
    return defaultColorFor(sk.name);
  };

  return (
    <EmployeeModuleLayout
      title="Vị trí & Mức lương"
      subtitle="Quản lý danh sách vị trí làm việc và thiết lập mức lương/giờ áp dụng cho tính lương tự động."
      actions={
        canEdit && (
          <button className="skill-btn-primary ss-btn-elevated" onClick={openAddModal}>
            + Thêm vị trí mới
          </button>
        )
      }
    >
      <div className="emp-layout-row">
        <Sidebar
          search={{ value: search, onChange: setSearch, placeholder: 'Tìm kiếm vị trí...' }}
        />

        <main className="emp-layout-main">

        {/* Success Alert Banner */}
        {success && (
          <div style={{
            backgroundColor: '#F0FDF4',
            border: '1px solid #86EFAC',
            color: '#166534',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}>
            <span>✅ {success}</span>
            <button
              onClick={() => setSuccess('')}
              style={{
                background: 'none',
                border: 'none',
                color: '#166534',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '16px'
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Error Alert Banner */}
        {error && (
          <div style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5',
            color: '#991B1B',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}>
            <span>⚠️ {error}</span>
            <button
              onClick={() => setError('')}
              style={{
                background: 'none',
                border: 'none',
                color: '#991B1B',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '16px'
              }}
            >
              ✕
            </button>
          </div>
        )}

        <div className="skill-table-card">
          <div className="skill-table-header">
            <span style={{ width: canEdit ? '40%' : '55%' }}>Vị trí / Kỹ năng</span>
            <span style={{ width: canEdit ? '35%' : '45%' }}>Mức lương / giờ</span>
            {canEdit && (
              <span style={{ width: '25%', textAlign: 'right' }}>Thao tác</span>
            )}
          </div>
          {filtered.map((sk) => (
            <div className="skill-row" key={sk.id}>
              <div className="skill-cell-name" style={{ width: canEdit ? '40%' : '55%', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span
                  className="skill-dot"
                  style={{ background: getSkillColor(sk) }}
                />
                <span style={{ fontWeight: 500, color: '#18181B' }}>{sk.name}</span>
              </div>
              <div className="skill-cell-rate" style={{ width: canEdit ? '35%' : '45%', color: '#15803D', fontWeight: 600 }}>
                {formatVND(sk.hourlyRate)}
              </div>
              {canEdit && (
                <div className="skill-cell-actions" style={{ width: '25%', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button className="skill-edit-btn" onClick={() => openEditModal(sk)}>
                    Sửa
                  </button>
                  <button className="skill-delete" onClick={() => handleDelete(sk.id, sk.name)}>
                    Xoá
                  </button>
                </div>
              )}
            </div>
          ))}

          {filtered.length === 0 && (
            <div style={{ padding: '32px', textAlign: 'center', color: '#71717A', fontSize: '14px' }}>
              Chưa có vị trí công việc nào được cấu hình cho chi nhánh này.
            </div>
          )}
        </div>
      </main>
      </div>

      {showModal && (
        <div className="skill-modal-overlay" onClick={() => setShowModal(false)}>
          <form
            className="skill-modal"
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSubmit}
          >
            <div className="skill-modal-header">
              <h2>{editingSkill ? 'Chỉnh mức lương' : 'Thêm vị trí công việc'}</h2>
              <button
                type="button"
                className="skill-modal-close"
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>
            
            <label>
              Tên vị trí
              <input
                required
                placeholder="VD: Thu ngân, Pha chế, Phục vụ, Bếp..."
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>

            <label>
              Mức lương / giờ
              <input
                type="number"
                required
                min={0}
                step={1000}
                placeholder="26000"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
              />
              <span style={{ fontSize: '13px', color: '#15803D', fontWeight: 600, marginTop: '4px' }}>
                Xem trước: {formatVND(hourlyRate)}
              </span>
            </label>

            {error && <p className="skill-form-error" style={{ color: '#EF4444', fontSize: '13px', margin: '4px 0' }}>{error}</p>}

            <label>
              Màu đại diện
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px', flexWrap: 'wrap' }}>
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      backgroundColor: c,
                      border: color === c ? '2.5px solid #18181B' : '1.5px solid rgba(0,0,0,0.1)',
                      cursor: 'pointer',
                      transform: color === c ? 'scale(1.15)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  />
                ))}
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  style={{
                    width: '32px',
                    height: '32px',
                    padding: 0,
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: 'none',
                  }}
                  title="Chọn màu tuỳ chỉnh"
                />
              </div>
            </label>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
              <button
                type="button"
                className="skill-modal-btn-cancel"
                onClick={() => setShowModal(false)}
              >
                Hủy
              </button>
              <button className="skill-save-btn" type="submit" disabled={submitting}>
                {submitting ? 'Đang lưu...' : (editingSkill ? 'Lưu' : 'Thêm vị trí')}
              </button>
            </div>
          </form>
        </div>
      )}
    </EmployeeModuleLayout>
  );
}