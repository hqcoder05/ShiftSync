// Authentication state intentionally lives only in memory.  Do not put bearer
// or refresh tokens, roles, or email addresses in Web Storage: any injected
// script can read it.
let session = { accessToken: null, role: 'STAFF', email: '' };

const notify = () => window.dispatchEvent(new Event('shiftsync:auth-session-changed'));

export const setSession = ({ accessToken, role, email } = {}) => {
  session = {
    accessToken: accessToken || null,
    role: String(role || 'STAFF').toUpperCase(),
    email: email || '',
  };
  notify();
};

export const clearSession = () => {
  session = { accessToken: null, role: 'STAFF', email: '' };
  notify();
};

export const getAccessToken = () => session.accessToken;
export const getSessionRole = () => session.role;
export const getSessionEmail = () => session.email;
export const hasSession = () => Boolean(session.accessToken);
export const hasManagerRole = () => ['ADMIN', 'MANAGER'].includes(session.role);
export const hasAdminRole = () => session.role === 'ADMIN';

export const clearLegacyAuthStorage = () => {
  ['accessToken', 'token', 'refreshToken', 'userRole', 'userEmail', 'role'].forEach((key) => localStorage.removeItem(key));
};
