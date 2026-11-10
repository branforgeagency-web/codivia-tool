// Routes are relative to VITE_API_BASE_URL, which includes /api/v1.
export const LOGIN = '/auth/login';
export const REGISTER = '/auth/register';
export const REFRESH_TOKENS = '/auth/refresh-tokens';
export const LOGOUT = '/auth/logout';
export const LOGOUT_ALL = '/auth/logout-all';
export const ME = '/auth/me';
export const HEALTH = '/health';
export const USERS = '/users';
export const USER_BY_ID = (id) => `${USERS}/${encodeURIComponent(id)}`;
export const ACCESS = '/access';
export const ACCESS_PERMISSION = (role, module) =>
  `${ACCESS}/${encodeURIComponent(role)}/${encodeURIComponent(module)}`;
