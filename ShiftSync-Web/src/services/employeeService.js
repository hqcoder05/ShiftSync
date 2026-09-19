import api from './api';

// GET /api/users?page=&size=&search=  — tránh gửi search rỗng gây lỗi
export const getEmployees = (page = 0, size = 20, search = '') => {
  let url = `/users?page=${page}&size=${size}`;
  if (search && search.trim() !== '') {
    url += `&search=${encodeURIComponent(search)}`;
  }
  return api.get(url);
};

// POST /api/users — payload phải khớp UserCreateRequest: fullName, email, password, phone, systemRole, skillIds
export const createEmployee = (data) => {
  const payload = {
    fullName: data.fullName,
    email: data.email,
    password: data.password,
    phone: data.phone,
    systemRole: data.systemRole || data.role, // đúng tên field backend yêu cầu (SystemRole enum: ADMIN/MANAGER/STAFF)
  };
  if (Array.isArray(data.skillIds) && data.skillIds.length > 0) {
    payload.skillIds = data.skillIds;
  }
  return api.post('/users', payload);
};

// PUT /api/users/{id} — UserUpdateRequest KHÔNG có systemRole, chỉ nhận fullName/email/phone/password(optional)
export const updateEmployee = (id, data) => {
  const payload = {
    fullName: data.fullName,
    email: data.email,
    phone: data.phone,
  };
  if (data.password) payload.password = data.password; // chỉ gửi nếu người dùng thật sự đổi mật khẩu
  return api.put(`/users/${id}`, payload);
};

export const getEmployeeById = (id) => api.get(`/users/${id}`);

export const getMyProfile = () => api.get('/users/me');

export const updateMyProfile = (data) => api.put('/users/me', data);

export const getMyShifts = () => api.get('/users/me/shifts');

export const deleteEmployee = (id) => api.delete(`/users/${id}`);