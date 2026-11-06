import { allocCount } from './allocation.js';

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
