import { useState, useEffect, useCallback } from 'react';
import { useConfirmation } from '../context/ConfirmationContext';
import Sidebar from '../components/Sidebar';
import EmployeeModuleLayout from '../components/EmployeeModuleLayout';
import { getAllStores } from '../services/storeService';
import { getSkillsByStore, createSkill, updateSkill, deleteSkill } from '../services/skillService';
import { getSessionRole } from '../services/authSession';
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

const tomorrowInVietnam = () => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const get = (type) => Number(parts.find((part) => part.type === type).value);
  const tomorrow = new Date(Date.UTC(get('year'), get('month') - 1, get('day') + 1));
  return tomorrow.toISOString().slice(0, 10);
};

export default function SkillsPage() {
  const confirm = useConfirmation();
  const [storeId, setStoreId] = useState('');
  const [skills, setSkills] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSkill, setEditingSkill] = useState(null);
  const [name, setName] = useState('');
  const [hourlyRate, setHourlyRate] = useState(23000);
  const [effectiveDate, setEffectiveDate] = useState(tomorrowInVietnam);
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);

  // RBAC Permission Check
  const userRole = getSessionRole();
  const canEdit = userRole === 'ADMIN' || userRole === 'MANAGER';

  useEffect(() => {
    getAllStores()
      .then((res) => {
        const list = res.data?.content || res.data || [];
        if (list.length) {
          const saved = localStorage.getItem('selectedStoreId');
          const target = (saved && list.find((s) => String(s.id) === String(saved))) || list[0];
          setStoreId(target.id);
          localStorage.setItem('selectedStoreId', String(target.id));
        }
      })
      .catch(() => setError('Không tải được danh sách chi nhánh'));
  }, []);

  const load = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    setError('');
    try {
      const res = await getSkillsByStore(storeId);
      const data = res.data;
      setSkills(Array.isArray(data) ? data : data.content || []);
    } catch {
      setError('Không tải được danh sách vị trí');
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    queueMicrotask(load);
  }, [load]);

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
    setEffectiveDate(tomorrowInVietnam());
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
        if (rateNum !== Number(editingSkill.hourlyRate)) payload.effectiveDate = effectiveDate;
        const response = await updateSkill(storeId, editingSkill.id, payload);
        setSuccess(response.data?.scheduledEffectiveDate
          ? `Đã lên lịch mức lương ${formatVND(rateNum)} từ ngày ${response.data.scheduledEffectiveDate}.`
          : `Đã cập nhật vị trí "${name.trim()}".`);
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
    if (!(await confirm({ message: `Xoá vị trí "${skillName}"?`, confirmLabel: 'Xóa' }))) return;
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
      title="Vị trí & kỹ năng"
      subtitle="Quản lý danh sách vị trí làm việc và thiết lập mức lương/giờ áp dụng cho tính lương tự động."
      actions={
        canEdit && (
          <button className="skill-btn-primary ss-btn-elevated" onClick={openAddModal}>
            Thêm vị trí mới
          </button>
        )
      }
    >
      <div className="emp-layout-row">
        <Sidebar
          search={{ value: search, onChange: setSearch, placeholder: 'Tìm kiếm vị trí...' }}
        />

        <main className="emp-layout-main">

        {success && (
          <div className="skill-alert skill-alert--success" role="status">
            <span>{success}</span><button type="button" aria-label="Đóng thông báo" onClick={() => setSuccess('')}>Đóng</button>
          </div>
        )}

        {error && !showModal && (
          <div className="skill-alert skill-alert--error" role="alert">
            <span>{error}</span><button type="button" aria-label="Đóng thông báo" onClick={() => setError('')}>Đóng</button>
          </div>
        )}

        <section className="skill-overview" aria-label="Tổng quan vị trí">
          <div><span>Vị trí đang dùng</span><strong>{skills.length}</strong></div>
          <div><span>Kết quả hiển thị</span><strong>{filtered.length}</strong></div>
          <p>Mỗi vị trí có mức lương và màu nhận diện riêng trên lịch ca.</p>
        </section>

        <div className="skill-table-card" role="region" aria-label="Danh sách vị trí và mức lương" tabIndex={0}>
          <div className="skill-table-header">
            <span className="skill-col-name">Vị trí / Kỹ năng</span>
            <span className="skill-col-rate">Mức lương / giờ</span>
            {canEdit && (
              <span className="skill-col-actions">Thao tác</span>
            )}
          </div>
          {loading && <div className="skill-loading" aria-live="polite"><span /><span /><span /></div>}
          {!loading && filtered.map((sk) => (
            <div className="skill-row" key={sk.id}>
              <div className="skill-cell-name">
                <span
                  className="skill-dot"
                  style={{ background: getSkillColor(sk) }}
                />
                <span>{sk.name}</span>
              </div>
              <div className="skill-cell-rate">
                {formatVND(sk.hourlyRate)}
                {sk.scheduledEffectiveDate && <div className="skill-rate-scheduled">
                  Từ {sk.scheduledEffectiveDate}: {formatVND(sk.scheduledHourlyRate)}
                </div>}
              </div>
              {canEdit && (
                <div className="skill-cell-actions">
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

          {!loading && filtered.length === 0 && (
            <div className="skill-empty">
              <strong>{search ? 'Không tìm thấy vị trí phù hợp' : 'Chưa có vị trí công việc'}</strong>
              <p>{search ? 'Thử một từ khóa khác hoặc xóa bộ lọc để xem toàn bộ vị trí.' : 'Tạo vị trí đầu tiên để dùng trong phân công và tính lương.'}</p>
              {!search && canEdit && <button type="button" onClick={openAddModal}>Tạo vị trí đầu tiên</button>}
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
              <div><p>{editingSkill ? 'ĐIỀU CHỈNH QUY TẮC' : 'CẤU HÌNH VỊ TRÍ'}</p><h2>{editingSkill ? 'Chỉnh mức lương' : 'Thêm vị trí công việc'}</h2></div>
              <button
                type="button"
                className="skill-modal-close"
                aria-label="Đóng biểu mẫu"
                onClick={() => setShowModal(false)}
              >
                Đóng
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
              <span className="skill-rate-preview">
                Xem trước: {formatVND(hourlyRate)}
              </span>
            </label>

            {editingSkill && (
              <label>
                Ngày mức lương mới có hiệu lực
                <input type="date" required value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
              </label>
            )}

            {error && <p className="skill-form-error" role="alert">{error}</p>}

            <label>
              Màu đại diện
              <div className="skill-palette">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    aria-label={`Chọn màu ${c}`}
                    aria-pressed={color === c}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="skill-custom-color"
                  title="Chọn màu tuỳ chỉnh"
                />
              </div>
            </label>

            <div className="skill-modal-footer">
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
