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
export const DEPARTMENT_POOLS = '/department-pools';
// Admin Departments page + Manage allocation (admin only)
export const ADMIN_DEPARTMENTS = '/admin/departments';
export const DEPARTMENT_ALLOCATIONS = (deptKey) => `${ADMIN_DEPARTMENTS}/${encodeURIComponent(deptKey)}/allocations`;
export const DEPARTMENT_ALLOCATION = (deptKey, userId) =>
  `${DEPARTMENT_ALLOCATIONS(deptKey)}/${encodeURIComponent(userId)}`;
// Admin Browse Charts (admin only)
export const ADMIN_CHARTS = '/admin/charts';
export const ADMIN_CHART_DEPARTMENTS = `${ADMIN_CHARTS}/departments`;
export const ADMIN_CHART = (chartId) => `${ADMIN_CHARTS}/${encodeURIComponent(chartId)}`;
