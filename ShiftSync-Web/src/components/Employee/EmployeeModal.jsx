import React, { useState, useEffect } from 'react';

const EmployeeModal = ({ isOpen, onClose, onSubmit, initialData }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    roleId: '',
    storeId: ''
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({ fullName: '', email: '', phone: '', roleId: '', storeId: '' });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h3>{initialData ? 'Cập nhật nhân viên' : 'Thêm nhân viên mới'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Họ và tên</label>
            <input name="fullName" value={formData.fullName} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Số điện thoại</label>
            <input name="phone" value={formData.phone} onChange={handleChange} required />
          </div>
          <div className="modal-actions">
            <button type="button" onClick={onClose}>Hủy</button>
            <button type="submit">Lưu thông tin</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmployeeModal;