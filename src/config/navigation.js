/* CODIVIA platform — sidebar menus (student + admin) */
import { PATHS } from '../routes/paths.js';
import { theme } from '../theme/theme.js';

const { tiles } = theme;

export const STUDENT_NAV = [
  { id: 'dashboard', path: PATHS.dashboard, ic: '🏠', lbl: 'Dashboard', ...tiles.dashboard },
  { id: 'charts', path: PATHS.charts, ic: '📋', lbl: 'My Charts', ...tiles.charts },
  { id: 'progress', path: PATHS.progress, ic: '📊', lbl: 'My Progress', ...tiles.progress },
  { id: 'findcode', path: PATHS.codeSearch, ic: '🔍', lbl: 'CODIVIA Code Search', ...tiles.codeSearch },
  { id: 'guide', path: PATHS.guidelines, ic: '📘', lbl: 'Coding Guidelines', ...tiles.guidelines },
  { id: 'drugref', path: PATHS.drugReference, ic: '💊', lbl: 'Drug Reference', ...tiles.drugReference },
  { id: 'certificate', path: PATHS.certificate, ic: '🎓', lbl: 'Certificate', ...tiles.certificate },
  { id: 'mycerts', path: PATHS.myCertificates, ic: '📎', lbl: 'My Certificates', ...tiles.myCertificates },
  { id: 'resume', path: PATHS.resume, ic: '📄', lbl: 'Resume Builder', ...tiles.resume },
];

export const ADMIN_NAV = [
  { id: 'overview', path: PATHS.adminOverview, ic: '🏠', lbl: 'Overview', ...tiles.dashboard },
  { id: 'departments', path: PATHS.adminDepartments, ic: '🗂️', lbl: 'Departments', ...tiles.charts },
  { id: 'charts', path: PATHS.adminCharts, ic: '📄', lbl: 'Browse Charts', ...tiles.myCertificates },
  { id: 'students', path: PATHS.adminStudents, ic: '👥', lbl: 'Students', ...tiles.progress },
  { id: 'upload', path: PATHS.adminUpload, ic: '📤', lbl: 'Upload Charts', ...tiles.upload },
];
