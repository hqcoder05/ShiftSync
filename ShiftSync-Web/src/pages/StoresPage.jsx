import { useState, useEffect, useRef, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import { getAllStores, createStore, updateStore, deleteStore } from '../services/storeService';
import { getSkillsByStore, createSkill, updateSkill, deleteSkill } from '../services/skillService';
import './StoresPage.css';

const POPULAR_LOCATIONS = [
  { name: '123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh', lat: 10.7743, lng: 106.7032 },
  { name: 'Hồ Bơi Tây Thạnh, Đường Tây Thạnh, Phường Tây Thạnh, Quận Tân Phú, TP. Hồ Chí Minh', lat: 10.8166, lng: 106.6264 },
  { name: 'Landmark 81, 720A Điện Biên Phủ, Phường 22, Bình Thạnh, TP. Hồ Chí Minh', lat: 10.7951, lng: 106.7218 },
  { name: 'Vạn Hạnh Mall, 11 Sư Vạn Hạnh, Phường 12, Quận 10, TP. Hồ Chí Minh', lat: 10.7701, lng: 106.6698 },
  { name: 'Aeon Mall Tân Phú, 30 Bờ Bao Tân Thắng, Sơn Kỳ, Tân Phú, TP. Hồ Chí Minh', lat: 10.8016, lng: 106.6181 },
  { name: 'Phố đi bộ Hồ Gươm, Hàng Trống, Hoàn Kiếm, Hà Nội', lat: 21.0285, lng: 105.8542 },
  { name: 'Hồ Gươm Plaza, 102 Trần Phú, Phường Mộ Lao, Hà Đông, Hà Nội', lat: 20.9785, lng: 105.7865 },
];

const PRESET_COLORS = [
  '#5BC8B8', '#D97FB2', '#D98080', '#C8C84A',
  '#7AA8D9', '#FFA726', '#AB47BC', '#26A69A',
];

const defaultColorFor = (name = '') =>
  PRESET_COLORS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % PRESET_COLORS.length];

const getSkillColor = (sk) => {
  if (sk.description && sk.description.startsWith('#')) return sk.description;
  return defaultColorFor(sk.name);
};

// ─── Inline Color Picker Component ──────────────────────────────────────────
function ColorPicker({ value, onChange }) {
  return (
    <div className="store-color-picker-row">
      {PRESET_COLORS.map((c) => (
        <div
          key={c}
          className={`store-color-swatch ${value === c ? 'selected' : ''}`}
          style={{ backgroundColor: c }}
          onClick={() => onChange(c)}
          title={c}
        />
      ))}
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="store-color-custom"
        title="Màu tuỳ chỉnh"
      />
    </div>
  );
}

export default function StoresPage() {
  const [stores, setStores] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: '',
    address: '',
    latitude: 10.7743,
    longitude: 106.7032,
    openTime: '08:00',
    closeTime: '22:00',
  });
  const [suggestions, setSuggestions] = useState(POPULAR_LOCATIONS);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeoutRef = useRef(null);

  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');

  // ─── Skills (Vị trí công việc) per store ────────────────────────────────
  const [expandedStoreId, setExpandedStoreId] = useState(null);
  const [storeSkills, setStoreSkills] = useState({}); // { storeId: [] }
  const [skillsLoading, setSkillsLoading] = useState(false);

  // Skill add form (inline)
  const [showAddSkill, setShowAddSkill] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillColor, setNewSkillColor] = useState(PRESET_COLORS[0]);
  const [skillFormError, setSkillFormError] = useState('');

  // Edit skill color inline
  const [editingSkillId, setEditingSkillId] = useState(null);
  const [editingSkillColor, setEditingSkillColor] = useState('');

  // Black Toast
  const [toastMsg, setToastMsg] = useState('');
  const toastTimerRef = useRef(null);
  const showToast = useCallback((msg) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMsg(msg);
    toastTimerRef.current = setTimeout(() => setToastMsg(''), 3000);
  }, []);

  // Tải danh sách chi nhánh từ API
  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getAllStores();
      const dataList = Array.isArray(res.data) ? res.data : (res.data?.content || []);
      setStores(dataList);
    } catch (e) {
      setError('Không tải được danh sách chi nhánh. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Load skills khi expand store
  const loadSkills = useCallback(async (storeId) => {
    setSkillsLoading(true);
    try {
      const res = await getSkillsByStore(storeId);
      const data = res.data;
      setStoreSkills((prev) => ({
        ...prev,
        [storeId]: Array.isArray(data) ? data : (data.content || []),
      }));
    } catch {
      setStoreSkills((prev) => ({ ...prev, [storeId]: [] }));
    } finally {
      setSkillsLoading(false);
    }
  }, []);

  const handleToggleExpand = (storeId) => {
    if (expandedStoreId === storeId) {
      setExpandedStoreId(null);
      setShowAddSkill(false);
      setEditingSkillId(null);
    } else {
      setExpandedStoreId(storeId);
      setShowAddSkill(false);
      setEditingSkillId(null);
      setNewSkillName('');
      setNewSkillColor(PRESET_COLORS[0]);
      setSkillFormError('');
      if (!storeSkills[storeId]) {
        loadSkills(storeId);
      }
    }
  };

  // ─── Skill CRUD ──────────────────────────────────────────────────────────
  const handleAddSkill = async (e) => {
    e.preventDefault();
    setSkillFormError('');
    if (!newSkillName.trim()) { setSkillFormError('Vui lòng nhập tên vị trí'); return; }
    try {
      await createSkill(expandedStoreId, { name: newSkillName.trim(), description: newSkillColor });
      setNewSkillName('');
      setNewSkillColor(PRESET_COLORS[0]);
      setShowAddSkill(false);
      loadSkills(expandedStoreId);
      showToast(`✓ Đã thêm vị trí "${newSkillName.trim()}"`);
    } catch (err) {
      setSkillFormError(err.response?.data?.message || 'Thêm thất bại');
    }
  };

  const handleSaveSkillColor = async (storeId, skillId) => {
    try {
      const skill = (storeSkills[storeId] || []).find((s) => s.id === skillId);
      if (!skill) return;
      await updateSkill(storeId, skillId, { name: skill.name, description: editingSkillColor });
      setEditingSkillId(null);
      loadSkills(storeId);
      showToast('✓ Đã cập nhật màu vị trí');
    } catch {
      showToast('✗ Cập nhật màu thất bại');
    }
  };

  const handleDeleteSkill = async (storeId, skillId, skillName) => {
    if (!window.confirm(`Xoá vị trí "${skillName}"?`)) return;
    try {
      await deleteSkill(storeId, skillId);
      loadSkills(storeId);
      showToast(`✓ Đã xoá vị trí "${skillName}"`);
    } catch (err) {
      showToast(err.response?.data?.message || '✗ Xoá thất bại (vị trí đang được dùng)');
    }
  };

  // ─── Store CRUD ──────────────────────────────────────────────────────────
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
    setShowSuggestions(false);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: '',
      address: '',
      latitude: 10.7743,
      longitude: 106.7032,
      openTime: '08:00',
      closeTime: '22:00',
    });
    setSuggestions(POPULAR_LOCATIONS);
    setShowSuggestions(false);
    setModalError('');
    setShowModal(true);
  };

  const openEdit = (s) => {
    setEditing(s);
    setForm({
      name: s.name || '',
      address: s.address || '',
      latitude: s.latitude ?? 10.7743,
      longitude: s.longitude ?? 106.7032,
      openTime: s.openTime ? s.openTime.slice(0, 5) : '08:00',
      closeTime: s.closeTime ? s.closeTime.slice(0, 5) : '22:00',
    });
    setSuggestions(POPULAR_LOCATIONS);
    setShowSuggestions(false);
    setModalError('');
    setShowModal(true);
  };

  const handleAddressChange = (val) => {
    setForm((prev) => ({ ...prev, address: val }));
    const localMatches = POPULAR_LOCATIONS.filter((loc) =>
      loc.name.toLowerCase().includes(val.toLowerCase())
    );
    setSuggestions(localMatches.length > 0 ? localMatches : POPULAR_LOCATIONS);
    setShowSuggestions(true);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (val.trim().length >= 3) {
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&limit=5&countrycodes=vn`
          );
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const apiSuggestions = data.map((d) => ({
              name: d.display_name,
              lat: parseFloat(d.lat),
              lng: parseFloat(d.lon),
            }));
            setSuggestions((prev) => {
              const combined = [...localMatches];
              apiSuggestions.forEach((item) => {
                if (!combined.some((c) => c.name === item.name)) combined.push(item);
              });
              return combined;
            });
            if (data[0]) {
              setForm((prev) => ({
                ...prev,
                latitude: parseFloat(data[0].lat),
                longitude: parseFloat(data[0].lon),
              }));
            }
          }
        } catch {
          // dùng tọa độ mặc định
        }
      }, 400);
    }
  };

  const handleSelectSuggestion = (loc) => {
    setForm((prev) => ({ ...prev, address: loc.name, latitude: loc.lat, longitude: loc.lng }));
    setShowSuggestions(false);
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '00:00:00';
    return timeStr.length === 5 ? `${timeStr}:00` : timeStr;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalError('');
    setSubmitting(true);
    const parseNum = (val, fallback) => {
      const num = parseFloat(val);
      return isNaN(num) ? fallback : num;
    };
    const payload = {
      name: form.name.trim(),
      address: form.address.trim(),
      latitude: parseNum(form.latitude, 10.7743),
      longitude: parseNum(form.longitude, 106.7032),
      openTime: formatTime(form.openTime),
      closeTime: formatTime(form.closeTime),
    };
    try {
      if (editing) {
        await updateStore(editing.id, payload);
        showToast(`✓ Đã cập nhật chi nhánh "${payload.name}"`);
      } else {
        await createStore(payload);
        showToast(`✓ Đã thêm chi nhánh "${payload.name}"`);
      }
      closeModal();
      load();
    } catch (err) {
      setModalError(err.response?.data?.message || 'Lưu thông tin thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Xoá chi nhánh "${name}"?`)) return;
    try {
      await deleteStore(id);
      load();
      showToast(`✓ Đã xoá chi nhánh "${name}"`);
    } catch (err) {
      setError(err.response?.data?.message || 'Xoá thất bại');
    }
  };

  const mapQuery = form.address.trim() || form.name.trim() || 'Hồ Bơi Tây Thạnh, Quận Tân Phú, TP. Hồ Chí Minh';
  const dynamicMapEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

  return (
    <div className="store-page-layout">
      {/* Black Toast */}
      {toastMsg && <div className="black-toast">{toastMsg}</div>}

      <Sidebar
        search={{ value: search, onChange: setSearch, placeholder: 'Tìm kiếm chi nhánh...' }}
        pageNav={{
          currentTo: '/stores',
          options: [
            { to: '/employees', label: 'Người dùng' },
            { to: '/stores', label: 'Chi nhánh & Vị trí' },
          ],
        }}
      />

      <div className="store-page">
        <div className="store-header">
          <h1>Chi nhánh &amp; Vị trí</h1>
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
            {filtered.map((s) => {
              const isExpanded = expandedStoreId === s.id;
              const skills = storeSkills[s.id] || [];
              return (
                <div className={`store-card ${isExpanded ? 'expanded' : ''}`} key={s.id}>
                  {/* Card header */}
                  <div className="store-card-top">
                    <div className="store-card-info">
                      <h3>{s.name}</h3>
                      <p>{s.address}</p>
                      <p className="store-hours">
                        {s.openTime?.slice(0, 5)} – {s.closeTime?.slice(0, 5)}
                      </p>
                    </div>
                    <div className="store-card-actions">
                      <button
                        className="store-expand-btn"
                        onClick={() => handleToggleExpand(s.id)}
                        title={isExpanded ? 'Thu gọn' : 'Xem vị trí công việc'}
                      >
                        {isExpanded ? '▲ Thu gọn' : '▼ Vị trí'}
                      </button>
                      <button onClick={() => openEdit(s)}>Sửa</button>
                      <button onClick={() => handleDelete(s.id, s.name)}>Xoá</button>
                    </div>
                  </div>

                  {/* Expand: Skills panel */}
                  {isExpanded && (
                    <div className="store-skills-panel">
                      <div className="store-skills-header">
                        <span className="store-skills-title">Vị trí công việc</span>
                        <button
                          className="store-skill-add-btn"
                          onClick={() => {
                            setShowAddSkill((v) => !v);
                            setSkillFormError('');
                            setNewSkillName('');
                            setNewSkillColor(PRESET_COLORS[0]);
                          }}
                        >
                          + Thêm vị trí
                        </button>
                      </div>

                      {/* Add skill form */}
                      {showAddSkill && (
                        <form className="store-skill-form" onSubmit={handleAddSkill}>
                          <input
                            className="store-skill-input"
                            placeholder="Tên vị trí (VD: Thu ngân, Pha chế...)"
                            value={newSkillName}
                            onChange={(e) => setNewSkillName(e.target.value)}
                            autoFocus
                          />
                          <ColorPicker value={newSkillColor} onChange={setNewSkillColor} />
                          {skillFormError && <p className="store-skill-error">{skillFormError}</p>}
                          <div className="store-skill-form-actions">
                            <button type="submit" className="store-skill-save">Thêm</button>
                            <button type="button" className="store-skill-cancel" onClick={() => setShowAddSkill(false)}>Huỷ</button>
                          </div>
                        </form>
                      )}

                      {/* Skills list */}
                      {skillsLoading ? (
                        <p className="store-skills-loading">Đang tải vị trí...</p>
                      ) : skills.length === 0 ? (
                        <p className="store-skills-empty">Chưa có vị trí nào. Thêm vị trí đầu tiên!</p>
                      ) : (
                        <div className="store-skills-list">
                          {skills.map((sk) => {
                            const skColor = getSkillColor(sk);
                            const isEditingColor = editingSkillId === sk.id;
                            return (
                              <div className="store-skill-item" key={sk.id}>
                                <div
                                  className="store-skill-dot"
                                  style={{ backgroundColor: skColor }}
                                />
                                <span className="store-skill-name">{sk.name}</span>
                                <div className="store-skill-item-actions">
                                  {isEditingColor ? (
                                    <>
                                      <ColorPicker
                                        value={editingSkillColor}
                                        onChange={setEditingSkillColor}
                                      />
                                      <button
                                        className="store-skill-save-color"
                                        onClick={() => handleSaveSkillColor(s.id, sk.id)}
                                      >
                                        Lưu
                                      </button>
                                      <button
                                        className="store-skill-cancel"
                                        onClick={() => setEditingSkillId(null)}
                                      >
                                        Huỷ
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      className="store-skill-edit-color"
                                      onClick={() => {
                                        setEditingSkillId(sk.id);
                                        setEditingSkillColor(skColor);
                                      }}
                                      title="Đổi màu"
                                    >
                                      🎨
                                    </button>
                                  )}
                                  <button
                                    className="store-skill-delete"
                                    onClick={() => handleDeleteSkill(s.id, sk.id, sk.name)}
                                    title="Xoá vị trí"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Store Modal */}
      {showModal && (
        <div className="store-modal-overlay" onClick={closeModal}>
          <form
            className="store-modal"
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSubmit}
          >
            <div className="store-modal-header">
              <h2>{editing ? 'Sửa chi nhánh' : 'Thêm chi nhánh'}</h2>
              <button type="button" className="store-modal-close" onClick={closeModal}>✕</button>
            </div>

            {modalError && <p className="store-modal-error">{modalError}</p>}

            <label>
              Tên gọi
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ví dụ: ShiftSync Chi Nhánh 1..."
              />
            </label>

            <div className="store-location-wrapper">
              <label>
                Vị trí cửa hàng
                <div className="store-address-input-box">
                  <input
                    required
                    value={form.address}
                    onChange={(e) => handleAddressChange(e.target.value)}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder="Nhập địa chỉ thực tế (VD: 123 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh)..."
                    autoComplete="off"
                  />
                  {showSuggestions && (
                    <div className="store-suggestions-dropdown">
                      <div className="store-suggestions-header">Gợi ý vị trí thực tế:</div>
                      {suggestions.map((loc, idx) => (
                        <div
                          key={idx}
                          className="store-suggestion-item"
                          onClick={() => handleSelectSuggestion(loc)}
                        >
                          <span className="store-suggestion-pin">📍</span>
                          <span className="store-suggestion-title">{loc.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </label>
              {form.address && (
                <div className="store-map-container">
                  <iframe
                    title="Bản đồ vị trí cửa hàng"
                    src={dynamicMapEmbedUrl}
                    width="100%"
                    height="190"
                    style={{ border: '1px solid var(--ss-border)', borderRadius: '8px', display: 'block' }}
                    allowFullScreen=""
                    loading="lazy"
                  />
                </div>
              )}
            </div>

            <div className="store-form-row">
              <label>
                Giờ mở
                <input
                  required
                  type="time"
                  value={form.openTime}
                  onChange={(e) => setForm({ ...form, openTime: e.target.value })}
                />
              </label>
              <label>
                Giờ đóng
                <input
                  required
                  type="time"
                  value={form.closeTime}
                  onChange={(e) => setForm({ ...form, closeTime: e.target.value })}
                />
              </label>
            </div>

            <button className="store-save-btn" type="submit" disabled={submitting}>
              {submitting ? 'Đang lưu...' : editing ? 'Lưu' : 'Thêm'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}