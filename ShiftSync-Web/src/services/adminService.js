import api from './api';
import { getAllStores, createStore, updateStore, deleteStore } from './storeService';
import { getEmployees, createEmployee, updateEmployee, deleteEmployee } from './employeeService';
import { assignStaffToStore, getStaffByStore, removeStaffFromStore } from './employmentService';

// Fallback local storage key for manager-to-store assignments when backend sync is local
const STORAGE_STORE_MANAGERS = 'shiftsync_admin_store_managers';

export const getStoredManagerAssignments = () => {
  try {
    const raw = localStorage.getItem(STORAGE_STORE_MANAGERS);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
};

export const saveStoredManagerAssignments = (map) => {
  try {
    localStorage.setItem(STORAGE_STORE_MANAGERS, JSON.stringify(map));
  } catch (e) {
    console.error('Failed to save manager assignments', e);
  }
};

export {
  getAllStores,
  createStore,
  updateStore,
  deleteStore,
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  assignStaffToStore,
  getStaffByStore,
  removeStaffFromStore
};
