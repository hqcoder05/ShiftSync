import api from './api';

/**
 * Service to interact with Spring Boot LayoutController
 * Endpoints under /api/stores/{storeId}
 */

// Lấy thông số kích thước 3D của cửa hàng (length, width, height)
export const getStoreLayout = async (storeId) => {
  if (!storeId) return null;
  return api.get(`/stores/${storeId}/layout`);
};

// Cập nhật hoặc khởi tạo kích thước 3D cửa hàng
export const saveStoreLayout = async (storeId, { length, width, height }) => {
  if (!storeId) return null;
  return api.post(`/stores/${storeId}/layout`, {
    length: Number(length) || 20.0,
    width: Number(width) || 15.0,
    height: Number(height) || 4.0,
  });
};

// Lấy danh sách các khu vực không gian 3D (Store Zones)
export const getStoreZones = async (storeId) => {
  if (!storeId) return { data: [] };
  return api.get(`/stores/${storeId}/zones`);
};

// Thêm mới một khu vực 3D vào cửa hàng
export const addStoreZone = async (storeId, { name, code, zoneType, color, description, x, y, z = 0, width, length, height, capacity = 4, minCapacity, maxCapacity, idealCapacity, parentZoneId }) => {
  if (!storeId) return null;
  return api.post(`/stores/${storeId}/zones`, {
    name,
    code,
    zoneType,
    color,
    description,
    x: Number(x) || 0,
    y: Number(y) || 0,
    z: Number(z) || 0,
    width: width != null ? Number(width) : null,
    length: length != null ? Number(length) : null,
    height: height != null ? Number(height) : null,
    capacity: Number(capacity) || 1,
    minCapacity: minCapacity != null ? Number(minCapacity) : null,
    maxCapacity: maxCapacity != null ? Number(maxCapacity) : null,
    idealCapacity: idealCapacity != null ? Number(idealCapacity) : null,
    parentZoneId,
  });
};

// Cập nhật thông số khu vực 3D
export const updateStoreZone = async (storeId, zoneId, zoneData) => {
  if (!storeId || !zoneId) return null;
  return api.put(`/stores/${storeId}/zones/${zoneId}`, zoneData);
};

// Kích hoạt thuật toán phân bổ không gian 3D Greedy Max-Min Dispersion cho ca làm
export const allocateZonesForShift = async (storeId, shiftId) => {
  if (!storeId || !shiftId) return null;
  return api.post(`/stores/${storeId}/shifts/${shiftId}/allocate-zones`);
};

// Xoá một khu vực 3D khỏi cửa hàng
export const deleteStoreZone = async (storeId, zoneId) => {
  if (!storeId || !zoneId) return null;
  return api.delete(`/stores/${storeId}/zones/${zoneId}`);
};

// ==========================================
// WORKSTATIONS API
// ==========================================

// Lấy danh sách vị trí làm việc (Workstations) của cửa hàng
export const getStoreWorkstations = async (storeId) => {
  if (!storeId) return { data: [] };
  return api.get(`/stores/${storeId}/workstations`);
};

// Tạo vị trí làm việc mới
export const addStoreWorkstation = async (storeId, workstationData) => {
  if (!storeId) return null;
  return api.post(`/stores/${storeId}/workstations`, workstationData);
};

// Cập nhật vị trí làm việc
export const updateStoreWorkstation = async (storeId, workstationId, workstationData) => {
  if (!storeId || !workstationId) return null;
  return api.put(`/stores/${storeId}/workstations/${workstationId}`, workstationData);
};

// Xoá vị trí làm việc
export const deleteStoreWorkstation = async (storeId, workstationId) => {
  if (!storeId || !workstationId) return null;
  return api.delete(`/stores/${storeId}/workstations/${workstationId}`);
};

// ==========================================
// STORE TEMPLATES CATALOG API
// ==========================================

// Lấy danh mục mẫu cửa hàng không gian (Coffee, Shoe Store, Salon, QSR, etc.)
export const getStoreTemplates = async (category = null) => {
  const params = category ? { category } : {};
  return api.get('/store-templates', { params });
};

// Áp dụng nhanh mẫu cấu hình không gian vào cửa hàng
export const applyStoreTemplate = async (storeId, templateId) => {
  if (!storeId || !templateId) return null;
  return api.post(`/stores/${storeId}/apply-template/${templateId}`);
};
