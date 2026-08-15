import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { getAllStores, createStore, updateStore, deleteStore } from '../services/storeService';
import './StoresPage.css';

export default function StoresPage() {
  const [stores, setStores] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: '',
    address: '',
    latitude: '',
    longitude: '',
    openTime: '08:00',
    closeTime: '22:00',
  });
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');

  // Tải danh sách chi nhánh từ API
  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getAllStores();
      // Hỗ trợ cả API trả về mảng trực tiếp hoặc trả về Page Object (Spring Boot)
      const dataList = Array.isArray(res.data)
        ? res.data
        : (res.data?.content || []);
      setStores(dataList);
    } catch (e) {
      setError('Không tải được danh sách chi nhánh. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Lọc theo tên hoặc địa chỉ chi nhánh
  const filtered = (Array.isArray(stores) ? stores : []).filter((s) => {
    const term = search.toLowerCase().trim();
    const nameMatch = s.name?.toLowerCase().includes(term);
    const addressMatch = s.address?.toLowerCase().includes(term);
    return nameMatch || addressMatch;
  });

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setModalError('');
  };

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: '',
      address: '',
      latitude: '',
      longitude: '',
      openTime: '08:00',
      closeTime: '22:00',
    });
    setModalError('');
    setShowModal(true);
  };

  const openEdit = (s) => {
    setEditing(s);
    setForm({
      name: s.name || '',
      address: s.address || '',
      latitude: s.latitude ?? '',
      longitude: s.longitude ?? '',
      openTime: s.openTime ? s.openTime.slice(0, 5) : '08:00',
      closeTime: s.closeTime ? s.closeTime.slice(0, 5) : '22:00',
    });
    setModalError('');
    setShowModal(true);
  };

  // Chuẩn hóa định dạng HH:mm:ss cho Backend
  const formatTime = (timeStr) => {
    if (!timeStr) return '00:00:00';
    return timeStr.length === 5 ? `${timeStr}:00` : timeStr;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalError('');
    setSubmitting(true);

    const payload = {
      name: form.name.trim(),
      address: form.address.trim(),
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      openTime: formatTime(form.openTime),
      closeTime: formatTime(form.closeTime),
    };

    try {
      if (editing) {
        await updateStore(editing.id, payload);
      } else {
        await createStore(payload);
      }
      closeModal();
      load();
    } catch (err) {
      setModalError(
        err.response?.data?.message || 'Lưu thông tin thất bại'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Xoá chi nhánh này?')) return;
    try {
      await deleteStore(id);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Xoá thất bại');
    }
  };

  return (
    <div className="store-page-layout">
      <Sidebar
        search={{ value: search, onChange: setSearch, placeholder: 'Tìm kiếm chi nhánh...' }}
        pageNav={{
          currentTo: '/stores',
          options: [
            { to: '/employees', label: 'Người dùng' },
            { to: '/skills', label: 'Vị trí công việc' },
            { to: '/stores', label: 'Chi nhánh' },
          ],
        }}
      />

      <div className="store-page">
        <div className="store-header">
          <h1>Chi nhánh</h1>
          <button className="store-add-btn" onClick={openCreate}>
            + Thêm chi nhánh
          </button>
        </div>

        {error && <p className="store-error">{error}</p>}

        {loading ? (
          <p className="store-loading">Đang tải danh sách...</p>
        ) : filtered.length === 0 ? (
          <p className="store-empty">
            {search ? 'Không tìm thấy chi nhánh phù hợp' : 'Chưa có chi nhánh nào'}
          </p>
        ) : (
          <div className="store-grid">
            {filtered.map((s) => (
              <div className="store-card" key={s.id}>
                <h3>{s.name}</h3>
                <p>{s.address}</p>
                <p className="store-hours">
                  {s.openTime?.slice(0, 5)} - {s.closeTime?.slice(0, 5)}
                </p>
                <div className="store-actions">
                  <button onClick={() => openEdit(s)}>Sửa</button>
                  <button onClick={() => handleDelete(s.id)}>Xoá</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="store-modal-overlay" onClick={closeModal}>
          <form
            className="store-modal"
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSubmit}
          >
            <div className="store-modal-header">
              <h2>{editing ? 'Sửa chi nhánh' : 'Thêm chi nhánh'}</h2>
              <button
                type="button"
                className="store-modal-close"
                onClick={closeModal}
              >
                ✕
              </button>
            </div>

            {modalError && <p className="store-modal-error">{modalError}</p>}

            <label>
              Tên gọi
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label>
              Vị trí cửa hàng
              <input
                required
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </label>
            <div className="store-form-row">
              <label>
                Latitude
                <input
                  required
                  type="number"
                  step="any"
                  value={form.latitude}
                  onChange={(e) =>
                    setForm({ ...form, latitude: e.target.value })
                  }
                />
              </label>
              <label>
                Longitude
                <input
                  required
                  type="number"
                  step="any"
                  value={form.longitude}
                  onChange={(e) =>
                    setForm({ ...form, longitude: e.target.value })
                  }
                />
              </label>
            </div>
            <div className="store-form-row">
              <label>
                Giờ mở
                <input
                  required
                  type="time"
                  value={form.openTime}
                  onChange={(e) =>
                    setForm({ ...form, openTime: e.target.value })
                  }
                />
              </label>
              <label>
                Giờ đóng
                <input
                  required
                  type="time"
                  value={form.closeTime}
                  onChange={(e) =>
                    setForm({ ...form, closeTime: e.target.value })
                  }
                />
              </label>
            </div>

            <button
              className="store-save-btn"
              type="submit"
              disabled={submitting}
            >
              {submitting ? 'Đang lưu...' : editing ? 'Lưu' : 'Thêm'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}