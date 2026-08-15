import React, { useState, useEffect } from 'react';
import { roleService } from '../services/roleService';

const RoleListPage = () => {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [assignedPermissions, setAssignedPermissions] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const rolesData = await roleService.getRoles();
        const permsData = await roleService.getPermissions();
        setRoles(rolesData || []);
        setPermissions(permsData || []);
        if (rolesData && rolesData.length > 0) {
          setSelectedRole(rolesData[0]);
          setAssignedPermissions(rolesData[0].permissions || []);
        }
      } catch (err) {
        console.error('Lỗi tải dữ liệu Role/Permission:', err);
      }
    };
    loadData();
  }, []);

  const handleSelectRole = (role) => {
    setSelectedRole(role);
    setAssignedPermissions(role.permissions || []);
  };

  const handleTogglePermission = (permId) => {
    if (assignedPermissions.includes(permId)) {
      setAssignedPermissions(assignedPermissions.filter(id => id !== permId));
    } else {
      setAssignedPermissions([...assignedPermissions, permId]);
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    try {
      await roleService.updateRolePermissions(selectedRole.id, assignedPermissions);
      alert(`Đã cập nhật quyền cho vai trò ${selectedRole.name}!`);
    } catch (error) {
      alert('Lỗi cập nhật quyền!');
    }
  };

  return (
    <div className="page-container" style={{ padding: '20px', display: 'flex', gap: '20px' }}>
      {/* Cột trái: Danh sách Vai trò */}
      <div style={{ width: '30%', borderRight: '1px solid #ddd', paddingRight: '15px' }}>
        <h3>Danh sách Vai trò</h3>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {roles.map(role => (
            <li
              key={role.id}
              onClick={() => handleSelectRole(role)}
              style={{
                padding: '10px',
                cursor: 'pointer',
                background: selectedRole?.id === role.id ? '#e7f1ff' : '#f8f9fa',
                marginBottom: '8px',
                borderRadius: '4px',
                fontWeight: selectedRole?.id === role.id ? 'bold' : 'normal'
              }}
            >
              {role.name} ({role.code})
            </li>
          ))}
        </ul>
      </div>

      {/* Cột phải: Bảng Gán Quyền */}
      <div style={{ width: '70%' }}>
        {selectedRole ? (
          <>
            <h3>Phân quyền cho: <span style={{ color: '#007AFF' }}>{selectedRole.name}</span></h3>
            <div style={{ margin: '15px 0' }}>
              {permissions.map(perm => (
                <div key={perm.id} style={{ marginBottom: '8px' }}>
                  <label style={{ cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={assignedPermissions.includes(perm.id)}
                      onChange={() => handleTogglePermission(perm.id)}
                    />
                    {' '}<strong>{perm.name}</strong> - <i>{perm.description}</i>
                  </label>
                </div>
              ))}
            </div>
            <button onClick={handleSavePermissions} style={{ padding: '8px 20px', background: '#007AFF', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              Lưu phân quyền
            </button>
          </>
        ) : <p>Vui lòng chọn một vai trò để phân quyền</p>}
      </div>
    </div>
  );
};

export default RoleListPage;