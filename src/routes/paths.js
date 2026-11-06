/* CODIVIA platform — every URL in the app, in one place */
export const PATHS = {
  signIn: '/sign-in',
  // student
  dashboard: '/dashboard',
  charts: '/charts',
  progress: '/progress',
  codeSearch: '/code-search',
  guidelines: '/guidelines',
  drugReference: '/drug-reference',
  certificate: '/certificate',
  myCertificates: '/my-certificates',
  resume: '/resume',
  // admin
  adminOverview: '/admin/overview',
  adminDepartments: '/admin/departments',
  adminCharts: '/admin/charts',
  adminStudents: '/admin/students',
  adminUpload: '/admin/upload',
  // auditor
  auditor: '/auditor',
};

export const deptQueuePath = (deptKey) => `${PATHS.charts}/${deptKey}`;
export const coderPath = (deptKey, chartId) =>
  `${PATHS.charts}/${deptKey}/${encodeURIComponent(chartId)}`;
