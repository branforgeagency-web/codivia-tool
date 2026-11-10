import { allocCount } from './allocation.js';
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

// Summarise one student's saved progress. results maps chartId -> {accuracy,dept,...}
export function progressOf(s) {
  const r = s.results || {};
  const ids = Object.keys(r);
  const allocated = Object.entries(s.depts || {}).reduce(
    (a, [dk, v]) => a + allocCount(v, ((window.CHART_DATA && window.CHART_DATA[dk]) || []).length),
    0,
  );
  let sum = 0,
    n = 0;
  const byDept = {};
  ids.forEach((id) => {
    const v = r[id] || {};
    if (typeof v.accuracy === 'number') {
      sum += v.accuracy;
      n++;
    }
    const dk = v.dept || '?';
    byDept[dk] = (byDept[dk] || 0) + 1;
  });
  return { worked: ids.length, allocated, avg: n ? Math.round(sum / n) : null, byDept };
}
