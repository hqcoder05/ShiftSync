import api from './api';
import { getAllStores, createStore, updateStore, deleteStore } from './storeService';
import { getEmployees, createEmployee, updateEmployee, deleteEmployee } from './employeeService';
import { assignStaffToStore, getStaffByStore, removeStaffFromStore } from './employmentService';

// Explicitly declare export for Vite static analysis
export const getStoreOverview = () => api.get('/stores/overview');

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

export default {
  getAllStores,
  createStore,
  updateStore,
  deleteStore,
  getStoreOverview,
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  assignStaffToStore,
  getStaffByStore,
  removeStaffFromStore
};
