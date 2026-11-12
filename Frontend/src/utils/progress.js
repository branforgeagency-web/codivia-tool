import { CERT_THRESHOLD } from '../config/constants.js';

// Accuracy colour band: hi ≥ 90, mid ≥ 75, lo below.
export const accTone = (avg) => (avg >= 90 ? 'hi' : avg >= 75 ? 'mid' : 'lo');

// Department status from its per-department stats ({ worked, certified }).
export const DEPT_STATUS = Object.freeze({
  complete: 'Certified',
  active: 'In progress',
  idle: 'Not started',
});
export function deptStatus(st) {
  const key = st.certified ? 'complete' : st.worked > 0 ? 'active' : 'idle';
  return { key, label: DEPT_STATUS[key] };
}

// Progress toward a department certificate.
export function certProgress(worked) {
  return {
    pct: Math.min(100, Math.round((worked / CERT_THRESHOLD) * 100)),
    left: Math.max(0, CERT_THRESHOLD - worked),
    threshold: CERT_THRESHOLD,
  };
}
