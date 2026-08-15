import api from './api';

// Fix API lấy danh sách: Tránh gửi tham số rỗng gây lỗi Bad Request từ Backend
export const getEmployees = (page = 0, size = 20, search = '') => {
  let url = `/users?page=${page}&size=${size}`;
  if (search && search.trim() !== '') {
    url += `&search=${encodeURIComponent(search)}`;
  }
  return api.get(url);
};

// Fix API tạo mới: Đảm bảo gửi đúng payload chuẩn khớp với UserCreateRequest
export const createEmployee = (data) => {
  return api.post('/users', {
    fullName: data.fullName,
    email: data.email,
    password: data.password,
    phone: data.phone,
    role: data.role || data.systemRole || 'STAFF'
  });
};

export const updateEmployee = (id, data) => api.put(`/users/${id}`, data);

export const deleteEmployee = (id) => api.delete(`/users/${id}`);