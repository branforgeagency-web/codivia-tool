import { DEPTS } from '../config/constants.js';

// ---- Allocation range model ----
// An allocation value per department is EITHER a legacy number N (meaning charts
// 1..N) OR a range object {start,end} (1-based, inclusive) meaning charts
// start..end of that department's pool. These helpers normalise both forms so
// every read site can treat allocation uniformly.
export function allocRange(val, poolLen) {
  if (val == null) return null;
  if (typeof val === 'number') {
    const n = Math.max(0, Math.min(val | 0, poolLen));
    return n > 0 ? { start: 1, end: n } : null;
  }
  if (typeof val === 'object') {
    let s = Math.max(1, Math.min(val.start | 0 || 1, poolLen));
    let en = Math.max(s, Math.min(val.end | 0 || 0, poolLen));
    if (en < 1) return null;
    return { start: s, end: en };
  }
  return null;
}

export function allocCount(val, poolLen) {
  const r = allocRange(val, poolLen);
  return r ? r.end - r.start + 1 : 0;
}

// zero-based slice indices for pool.slice(a,b)
export function allocSlice(val, poolLen) {
  const r = allocRange(val, poolLen);
  return r ? [r.start - 1, r.end] : [0, 0];
}

// do two allocation values overlap within the same pool?
export function allocOverlap(a, b, poolLen) {
  const ra = allocRange(a, poolLen),
    rb = allocRange(b, poolLen);
  if (!ra || !rb) return null;
  const lo = Math.max(ra.start, rb.start),
    hi = Math.min(ra.end, rb.end);
  return lo <= hi ? { start: lo, end: hi } : null;
}

// Only departments that actually have charts behind them should ever be shown
// or allocated — a tile with an empty queue is worse than no tile.
export function deptHasCharts(key) {
  const d = (window.CHART_DATA && window.CHART_DATA[key]) || null;
  return !!(d && d.length);
}

export function activeDeptKeys() {
  return Object.keys(DEPTS).filter(deptHasCharts);
}
