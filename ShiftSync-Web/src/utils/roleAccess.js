export const ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  STAFF: 'STAFF',
});

export const normalizeRole = (role) => {
  const normalized = String(role || ROLES.STAFF).replace(/^ROLE_/, '').toUpperCase();
  return Object.values(ROLES).includes(normalized) ? normalized : ROLES.STAFF;
};

export const isAdmin = (role) => normalizeRole(role) === ROLES.ADMIN;
export const isManager = (role) => normalizeRole(role) === ROLES.MANAGER;
export const canAdministerSystem = (role) => isAdmin(role);
export const canManageStore = (role) => isAdmin(role) || isManager(role);
export const canUseStaffSelfService = () => true;

export const getRoleLabel = (role) => ({
  [ROLES.ADMIN]: 'Quản trị viên',
  [ROLES.MANAGER]: 'Quản lý',
  [ROLES.STAFF]: 'Nhân viên',
}[normalizeRole(role)]);

export const getDefaultRoute = (role) => {
  if (isAdmin(role)) return '/admin';
  if (isManager(role)) return '/dashboard';
  return '/schedule';
};

export const getDefaultSettingsRoute = (role) => {
  if (isAdmin(role)) return '/settings/system';
  if (isManager(role)) return '/settings/store';
  return '/settings/personal';
};

export const canAccessSettingsScope = (role, scope) => {
  if (scope === 'personal') return canUseStaffSelfService(role);
  if (scope === 'store') return canManageStore(role);
  if (scope === 'system') return canAdministerSystem(role);
  return false;
};

export const isSystemWorkspace = (role, pathname) =>
  isAdmin(role) && (pathname === '/admin' || pathname.startsWith('/settings/system'));
