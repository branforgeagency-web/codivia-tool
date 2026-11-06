import { useState } from 'react';
import { DEPTS } from '../../../config/constants.js';
import { activeDeptKeys, allocOverlap, allocRange, deptHasCharts } from '../../../utils/allocation.js';

export function AllocateForm({ student, students, allocate, allocateMany, onClose }) {
  // The student list reloads from Firestore, so students.find() can briefly
  // return undefined. Guard both the student and its depts map.
  const alloc = (student && student.depts) || {};
  // Draft holds a {from,to} per department. Legacy numeric allocations become
  // from=1, to=N. Empty department => from='' to='' (no access).
  const [drafts, setDrafts] = useState(() => {
    const m = {};
    activeDeptKeys().forEach((dk) => {
      const pool = ((window.CHART_DATA && window.CHART_DATA[dk]) || []).length;
      const r = allocRange(alloc[dk], pool);
      m[dk] = r ? { from: String(r.start), to: String(r.end) } : { from: '', to: '' };
    });
    return m;
  });

  const setF = (dk, f, v) =>
    setDrafts((x) => ({ ...x, [dk]: { ...x[dk], [f]: v.replace(/[^0-9]/g, '') } }));

  // Build the allocation payload from drafts: {dept: {start,end}} for filled rows.
  const build = () => {
    const out = {};
    activeDeptKeys().forEach((dk) => {
      const pool = ((window.CHART_DATA && window.CHART_DATA[dk]) || []).length;
      const f = parseInt(drafts[dk].from, 10),
        t = parseInt(drafts[dk].to, 10);
      if (f >= 1 && t >= f && t <= pool) {
        out[dk] = { start: f, end: t };
      }
    });
    return out;
  };

  // Per-department validation + overlap detection against OTHER students.
  const rowInfo = (dk) => {
    const pool = ((window.CHART_DATA && window.CHART_DATA[dk]) || []).length;
    const f = drafts[dk].from,
      t = drafts[dk].to;
    if (f === '' && t === '') return { state: 'empty' };
    const fi = parseInt(f, 10),
      ti = parseInt(t, 10);
    if (isNaN(fi) || isNaN(ti)) return { state: 'error', msg: 'Enter both From and To' };
    if (fi < 1) return { state: 'error', msg: 'From must be at least 1' };
    if (ti < fi) return { state: 'error', msg: 'To must be \u2265 From' };
    if (ti > pool) return { state: 'error', msg: 'To exceeds pool (' + pool + ')' };
    // overlap check
    const clashes = [];
    (students || []).forEach((other) => {
      if (!other || other.id === student.id) return;
      const ov = allocOverlap({ start: fi, end: ti }, other.depts && other.depts[dk], pool);
      if (ov) clashes.push(other.name + ' (' + ov.start + '\u2013' + ov.end + ')');
    });
    return {
      state: clashes.length ? 'warn' : 'ok',
      count: ti - fi + 1,
      msg: clashes.length ? 'overlaps ' + clashes.join(', ') : null,
    };
  };

  const save = () => {
    if (student) allocateMany(student.id, build());
  };

  if (!student) {
    return (
      <div>
        <div style={{ padding: '26px 22px' }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--navy)' }}>Student not found</h2>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6, lineHeight: 1.6 }}>
            This student record could not be loaded — the list may still be refreshing. Close this
            dialog and try again.
          </p>
        </div>
        <div className="result-actions">
          <button style={{ background: 'var(--teal)', color: 'var(--color-white)' }} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    );
  }
  const inp = {
    width: 64,
    padding: '7px 8px',
    border: '1px solid var(--line)',
    borderRadius: 7,
    fontSize: 13,
    textAlign: 'center',
  };
  return (
    <div>
      <div style={{ padding: '20px 22px 0' }}>
        <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--navy)' }}>
          {'Manage Access \u2014 ' + student.name}
        </h2>
        <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 3 }}>
          Assign each student a CHART RANGE per department (e.g. 1–25). Leave blank for no access.
          Ranges that overlap another student are flagged.
        </p>
      </div>
      <div style={{ padding: '12px 22px', maxHeight: '52vh', overflowY: 'auto' }}>
        {Object.entries(DEPTS)
          .filter(([dk]) => deptHasCharts(dk))
          .map(([dk, d]) => {
            const pool = ((window.CHART_DATA && window.CHART_DATA[dk]) || []).length;
            const info = rowInfo(dk);
            const border =
              info.state === 'error'
                ? 'var(--tone-fca5a5)'
                : info.state === 'warn'
                  ? 'var(--tone-fbbf24)'
                  : 'var(--line)';
            return (
              <div
                key={dk}
                style={{ padding: '9px 0', borderBottom: '1px solid var(--line-soft)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>
                    {d.icon + ' ' + d.name}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {'pool 1\u2013' + pool}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>From</span>
                  <input
                    value={drafts[dk].from}
                    placeholder="1"
                    onChange={(ev) => setF(dk, 'from', ev.target.value)}
                    style={{ ...inp, borderColor: border }}
                  />
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>To</span>
                  <input
                    value={drafts[dk].to}
                    placeholder={String(pool)}
                    onChange={(ev) => setF(dk, 'to', ev.target.value)}
                    style={{ ...inp, borderColor: border }}
                  />
                  <span
                    style={{
                      width: 64,
                      fontSize: 11,
                      fontWeight: 800,
                      textAlign: 'right',
                      color: info.state === 'ok' ? 'var(--teal-d)' : 'var(--muted)',
                    }}
                  >
                    {info.count ? info.count + ' chts' : ''}
                  </span>
                </div>
                {info.msg && (
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      marginTop: 4,
                      color: info.state === 'error' ? 'var(--tone-b4232a)' : 'var(--tone-b45309)',
                    }}
                  >
                    {(info.state === 'warn' ? '\u26a0 ' : '') + info.msg}
                  </div>
                )}
              </div>
            );
          })}
      </div>
      <div className="result-actions">
        <button
          style={{ background: 'var(--color-white)', border: '1px solid var(--line)', color: 'var(--ink)' }}
          onClick={onClose}
        >
          Cancel
        </button>
        <button style={{ background: 'var(--teal)', color: 'var(--color-white)' }} onClick={save}>
          Save Allocation
        </button>
      </div>
    </div>
  );
}
