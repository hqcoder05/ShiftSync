import React, { useState, useEffect } from 'react';
import { storeService } from '../services/storeService';
import Sidebar from '../components/Sidebar';


const StoreListPage = () => {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStore, setEditingStore] = useState(null);
  const [formData, setFormData] = useState({ name: '', address: '', phone: '' });

  const fetchStores = async () => {
    setLoading(true);
    try {
      const data = await storeService.getStores();
      setStores(data || []);
    } catch (error) {
      console.error('Lỗi tải danh sách cửa hàng:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStores();
  }, []);

  const handleOpenModal = (store = null) => {
    setEditingStore(store);
    setFormData(store ? { name: store.name, address: store.address, phone: store.phone } : { name: '', address: '', phone: '' });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingStore) {
        await storeService.updateStore(editingStore.id, formData);
      } else {
        await storeService.createStore(formData);
      }
      setIsModalOpen(false);
      fetchStores();
    } catch (error) {
      alert('Lỗi khi lưu cửa hàng!');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa cửa hàng này?')) {
      try {
        await storeService.deleteStore(id);
        fetchStores();
      } catch (error) {
        alert('Không thể xóa cửa hàng!');
      }
    }
  };

  return (
    <div className="page-container" style={{ padding: '20px' }}>
      <h2>Quản lý Cửa hàng (Store Management)</h2>
      <button onClick={() => handleOpenModal()} style={{ marginBottom: '16px', padding: '8px 16px' }}>
        + Thêm cửa hàng mới
      </button>

      {loading ? <p>Đang tải...</p> : (
        <table border="1" cellPadding="10" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Tên Cửa Hàng</th>
              <th>Địa chỉ</th>
              <th>Số điện thoại</th>
              <th>Số nhân viên</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {stores.map(s => (
              <tr key={s.id}>
                <td>{s.id}</td>
                <td>{s.name}</td>
                <td>{s.address}</td>
                <td>{s.phone}</td>
                <td>{s.employeeCount || 0}</td>
                <td>
                  <button onClick={() => handleOpenModal(s)}>Sửa</button>{' '}
                  <button onClick={() => handleDelete(s.id)}>Xóa</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Modal Thêm/Sửa Cửa Hàng */}
      {isModalOpen && (
        <div className="modal" style={{ position: 'fixed', top: '20%', left: '35%', background: '#fff', padding: '20px', border: '1px solid #ccc', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
          <h3>{editingStore ? 'Sửa cửa hàng' : 'Thêm cửa hàng'}</h3>
          <form onSubmit={handleSave}>
            <div>
              <label>Tên cửa hàng: </label>
              <input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
            </div>
            <div style={{ marginTop: '10px' }}>
              <label>Địa chỉ: </label>
              <input value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} required />
            </div>
            <div style={{ marginTop: '10px' }}>
              <label>Số điện thoại: </label>
              <input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} required />
            </div>
            <div style={{ marginTop: '15px' }}>
              <button type="button" onClick={() => setIsModalOpen(false)}>Hủy</button>{' '}
              <button type="submit">Lưu</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default StoreListPage;