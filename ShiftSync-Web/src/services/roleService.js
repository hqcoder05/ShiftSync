import api from './api';

export const roleService = {
  getRoles: async () => {
    const response = await api.get('/roles');
    return response.data;
  },
  getPermissions: async () => {
    const response = await api.get('/permissions');
    return response.data;
  },
  updateRolePermissions: async (roleId, permissionIds) => {
    const response = await api.put(`/roles/${roleId}/permissions`, { permissionIds });
    return response.data;
  }
};