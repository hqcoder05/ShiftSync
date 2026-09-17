import { getAllStores, createStore, updateStore, deleteStore } from './storeService';
import { getEmployees, createEmployee, updateEmployee, deleteEmployee } from './employeeService';
import { assignStaffToStore, getStaffByStore, removeStaffFromStore } from './employmentService';

// Clean admin service delegating directly to authoritative backend services

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
