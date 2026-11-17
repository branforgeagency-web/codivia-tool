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
// Department form options: groups and code sets ({ groups: [{key,label}], elements: [{key,label}] })
export const DEPARTMENTS_META = `${DEPARTMENTS}/meta`;
// Student My Charts: the signed-in student's allocated departments + stat tiles (student only)
export const MY_CHARTS = '/my-charts';
export const MY_PROGRESS = '/my-progress';
// A student's saved chart scores: { results: { chartId: {...} } }
export const CHART_RESULTS = '/chart-results';
export const CHART_RESULT = (chartId) => `${CHART_RESULTS}/${encodeURIComponent(chartId)}`; // PUT: submit a coded chart (server scores it)
export const CERTIFICATES = '/certificates';
// Student chart queue + one chart to code (no answer keys)
export const MY_DEPT_CHARTS = (deptKey) => `/my-charts/${encodeURIComponent(deptKey)}/charts`;
export const MY_CHART = (deptKey, chartId) => `${MY_DEPT_CHARTS(deptKey)}/${encodeURIComponent(chartId)}`;
// The signed-in student's work on one chart: GET/PUT (autosave), defer, transfer, physician query, comment
export const MY_CHART_WORK = (deptKey, chartId) => `${MY_CHART(deptKey, chartId)}/work`;
export const MY_CHART_DEFER = (deptKey, chartId) => `${MY_CHART(deptKey, chartId)}/defer`;
export const MY_CHART_TRANSFER = (deptKey, chartId) => `${MY_CHART(deptKey, chartId)}/transfer`;
export const MY_CHART_QUERIES = (deptKey, chartId) => `${MY_CHART(deptKey, chartId)}/queries`;
export const MY_CHART_COMMENTS = (deptKey, chartId) => `${MY_CHART(deptKey, chartId)}/comments`;
export const MY_CHART_SESSION = (deptKey, chartId) => `${MY_CHART(deptKey, chartId)}/session`; // denial: accept correction
// Reference lists for the workspace and admin upload (dispositions, POA, MS-DRGs, remit codes …)
export const REFERENCE_WORK_QUEUE = '/reference/work-queue';
// ICD-10-CM tabular notes for a code and its parents (Excludes1, Use additional code …)
export const CODE_NOTES = (code) => `/codes/notes/${encodeURIComponent(code)}`;
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
export const ADMIN_UPLOADS_EXTRACT = `${ADMIN_UPLOADS}/extract`;
export const ADMIN_UPLOAD = (uploadId) => `${ADMIN_UPLOADS}/${encodeURIComponent(uploadId)}`;
export const ADMIN_UPLOAD_STATUS = (uploadId) => `${ADMIN_UPLOAD(uploadId)}/status`;
