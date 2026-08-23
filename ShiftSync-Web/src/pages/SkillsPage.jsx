import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { getAllStores } from '../services/storeService';
import { getSkillsByStore, createSkill, deleteSkill } from '../services/skillService';
import './SkillsPage.css';

const PRESET_COLORS = [
  '#5BC8B8', // teal
  '#D97FB2', // pink
  '#D98080', // red/salmon
  '#C8C84A', // yellow-green
  '#7AA8D9', // blue
  '#FFA726', // orange
  '#AB47BC', // purple
  '#26A69A', // green
];
const defaultColorFor = (name = '') =>
  PRESET_COLORS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % PRESET_COLORS.length];

export default function SkillsPage() {
  const [stores, setStores] = useState([]);
  const [storeId, setStoreId] = useState('');
  const [skills, setSkills] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [error, setError] = useState('');

  useEffect(() => {
    getAllStores()
      .then((res) => {
        const list = res.data.content || res.data || [];
        setStores(list);
        if (list.length) setStoreId(list[0].id);
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

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await createSkill(storeId, { name, description: color });
      setName('');
      setColor(PRESET_COLORS[0]);
      setShowModal(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Thêm thất bại');
    }
  };

  const handleDelete = async (skillId) => {
    if (!window.confirm('Xoá vị trí này?')) return;
    try {
      await deleteSkill(storeId, skillId);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Xoá thất bại (có thể đang được dùng)');
    }
  };

  const getSkillColor = (sk) => {
    if (sk.description && sk.description.startsWith('#')) return sk.description;
    return defaultColorFor(sk.name);
  };

  return (
    <div className="skill-page">
      <Sidebar
        search={{ value: search, onChange: setSearch, placeholder: 'Tìm kiếm' }}
        pageNav={{
          currentTo: '/skills',
          options: [
            { to: '/employees', label: 'Người dùng' },
            { to: '/skills', label: 'Vị trí công việc' },
            { to: '/stores', label: 'Chi nhánh' },
          ],
        }}
      />

      <main className="skill-main">
        <h1>Vị trí công việc</h1>
        {error && <p className="skill-error">{error}</p>}
        <div className="skill-table-card">
          <div className="skill-table-header">
            <span>Tên vị trí</span>
          </div>
          {filtered.map((sk) => (
            <div className="skill-row" key={sk.id}>
              <span
                className="skill-dot"
                style={{ background: getSkillColor(sk) }}
              />
              <span>{sk.name}</span>
              <button className="skill-delete" onClick={() => handleDelete(sk.id)}>
                Xoá
              </button>
            </div>
          ))}
          <button className="skill-add-btn" onClick={() => setShowModal(true)}>
            + Thêm vị trí mới
          </button>
        </div>
      </main>

      {showModal && (
        <div className="skill-modal-overlay" onClick={() => setShowModal(false)}>
          <form
            className="skill-modal"
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleAdd}
          >
            <div className="skill-modal-header">
              <h2>Thêm vị trí công việc</h2>
              <button
                type="button"
                className="skill-modal-close"
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>
            <label>
              Tên gọi
              <input
                required
                placeholder="VD: Thu ngân, Pha chế, Bảo vệ..."
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label>
              Chọn màu đại diện
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px', alignItems: 'center' }}>
                {PRESET_COLORS.map((c) => (
                  <div
                    key={c}
                    onClick={() => setColor(c)}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: c,
                      cursor: 'pointer',
                      border: color === c ? '2px solid #222' : '2px solid transparent',
                      transform: color === c ? 'scale(1.2)' : 'none',
                      transition: 'all 0.15s',
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
            <button className="skill-save-btn" type="submit">
              Thêm
            </button>
          </form>
        </div>
      )}
    </div>
  );
}