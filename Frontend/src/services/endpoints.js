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
export const CODING_GUIDELINES = '/guidelines';
export const DEPARTMENT_POOLS = '/department-pools';
export const RESUMES = '/resumes';
export const RESUME = (resumeId) => `${RESUMES}/${encodeURIComponent(resumeId)}`;
export const RESUME_TEMPLATE_CATALOG = `${RESUMES}/templates`;
// Department records (name, icon, group, code sets, chartCount). Not paged: a few dozen rows.
export const DEPARTMENTS = '/departments';
export const DEPARTMENT = (key) => `${DEPARTMENTS}/${encodeURIComponent(key)}`;
// Student My Charts: the signed-in student's allocated departments + stat tiles (student only)
export const MY_CHARTS = '/my-charts';
// A student's saved chart scores: { results: { chartId: {...} } }
export const CHART_RESULTS = '/chart-results';
export const CHART_RESULT = (chartId) => `${CHART_RESULTS}/${encodeURIComponent(chartId)}`; // PUT: submit a coded chart (server scores it)
// Student chart queue + one chart to code (no answer keys)
export const MY_DEPT_CHARTS = (deptKey) => `/my-charts/${encodeURIComponent(deptKey)}/charts`;
export const MY_CHART = (deptKey, chartId) => `${MY_DEPT_CHARTS(deptKey)}/${encodeURIComponent(chartId)}`;
// Public (no sign-in): active departments with charts, for the sign-in page
export const PUBLIC_DEPARTMENTS = '/departments/public';
// Admin Departments page + Manage allocation (admin only)
export const ADMIN_DEPARTMENTS = '/admin/departments';
export const DEPARTMENT_ALLOCATIONS = (deptKey) => `${ADMIN_DEPARTMENTS}/${encodeURIComponent(deptKey)}/allocations`;
export const DEPARTMENT_ALLOCATION = (deptKey, userId) =>
  `${DEPARTMENT_ALLOCATIONS(deptKey)}/${encodeURIComponent(userId)}`;
// Admin Browse Charts (admin only)
export const ADMIN_CHARTS = '/admin/charts';
export const ADMIN_CHART_DEPARTMENTS = `${ADMIN_CHARTS}/departments`;
export const ADMIN_CHART = (chartId) => `${ADMIN_CHARTS}/${encodeURIComponent(chartId)}`;
// Admin Students page + Manage Access (admin only)
export const ADMIN_STUDENTS = '/admin/students';
export const ADMIN_STUDENT = (userId) => `${ADMIN_STUDENTS}/${encodeURIComponent(userId)}`;
export const ADMIN_STUDENT_ALLOCATIONS = (userId) => `${ADMIN_STUDENT(userId)}/allocations`;
export const ADMIN_STUDENTS_BULK = `${ADMIN_STUDENTS}/bulk-allocate`;
// Admin Upload page: uploaded charts, draft → published (admin only)
export const ADMIN_UPLOADS = '/admin/uploads';
export const ADMIN_UPLOAD = (uploadId) => `${ADMIN_UPLOADS}/${encodeURIComponent(uploadId)}`;
export const ADMIN_UPLOAD_STATUS = (uploadId) => `${ADMIN_UPLOAD(uploadId)}/status`;
