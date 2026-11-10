export const MODULE_TABS = [
  { id: 'employees', label: 'Danh sách nhân viên', to: '/employees', isActive: (pathname, search) => pathname === '/employees' && !search.includes('tab=payroll') },
  { id: 'contracts', label: 'Hợp đồng', to: '/employees/contracts', isActive: (pathname) => pathname === '/employees/contracts' },
  { id: 'payroll', label: 'Bảng lương (Payroll)', to: '/employees?tab=payroll', isActive: (pathname, search) => pathname === '/payroll' || (pathname === '/employees' && search.includes('tab=payroll')) },
  { id: 'skills', label: 'Vị trí & kỹ năng', to: '/employees/skills', isActive: (pathname) => pathname === '/skills' || pathname === '/employees/skills' },
  { id: 'stores', label: 'Chi nhánh', to: '/stores', isActive: (pathname) => pathname === '/stores' },
];
