import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { getAllStores } from '../services/storeService';
import { getSkillsByStore, createSkill, deleteSkill } from '../services/skillService';
import './SkillsPage.css';

const COLORS = ['#D98DB3', '#8DD9CC', '#DCD98D', '#8DAAD9', '#D9A08D'];
const colorFor = (name) => COLORS[[...name].reduce((a,c)=>a+c.charCodeAt(0),0) % COLORS.length];

export default function SkillsPage() {
  const [stores, setStores] = useState([]);
  const [storeId, setStoreId] = useState('');
  const [skills, setSkills] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    getAllStores().then(res => {
      setStores(res.data.content);
      if (res.data.content.length) setStoreId(res.data.content[0].id);
    }).catch(() => setError('Không tải được danh sách chi nhánh'));
  }, []);

  const load = async () => {
    if (!storeId) return;
    try { const res = await getSkillsByStore(storeId); setSkills(res.data); }
    catch (e) { setError('Không tải được danh sách vị trí'); }
  };
  useEffect(() => { load(); }, [storeId]);

  const filtered = skills.filter(sk => sk.name.toLowerCase().includes(search.toLowerCase()));

  const handleAdd = async (e) => {
    e.preventDefault(); setError('');
    try {
      await createSkill(storeId, { name });
      setName(''); setShowModal(false); load();
    } catch (err) { setError(err.response?.data?.message || 'Thêm thất bại'); }
  };

  const handleDelete = async (skillId) => {
    if (!confirm('Xoá vị trí này?')) return;
    try { await deleteSkill(storeId, skillId); load(); }
    catch (err) { setError(err.response?.data?.message || 'Xoá thất bại (có thể đang được dùng)'); }
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
          <div className="skill-table-header"><span>Tên vị trí</span></div>
          {filtered.map(sk => (
            <div className="skill-row" key={sk.id}>
              <span className="skill-dot" style={{ background: colorFor(sk.name) }} />
              <span>{sk.name}</span>
              <button className="skill-delete" onClick={() => handleDelete(sk.id)}>Xoá</button>
            </div>
          ))}
          <button className="skill-add-btn" onClick={() => setShowModal(true)}>+ Add</button>
        </div>
      </main>

      {showModal && (
        <div className="skill-modal-overlay" onClick={() => setShowModal(false)}>
          <form className="skill-modal" onClick={e => e.stopPropagation()} onSubmit={handleAdd}>
            <div className="skill-modal-header">
              <h2>Thêm vị trí</h2>
              <button type="button" className="skill-modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <label>Tên gọi<input required value={name} onChange={e => setName(e.target.value)} /></label>
            <button className="skill-save-btn" type="submit">Thêm</button>
          </form>
        </div>
      )}
    </div>
  );
}