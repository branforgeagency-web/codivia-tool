import { useState } from 'react';
import { DEPTS } from '../../../config/constants.js';
import { allocRange } from '../../../utils/allocation.js';

export function DeptAllocateForm({ deptKey, students, allocate, onClose }) {
  const d = DEPTS[deptKey];
  const pool = ((window.CHART_DATA && window.CHART_DATA[deptKey]) || []).length;
  const [drafts, setDrafts] = useState(() => {
    const m = {};
    students.forEach((s) => {
      const r = allocRange(s.depts && s.depts[deptKey], pool);
      m[s.id] = r ? { from: String(r.start), to: String(r.end) } : { from: '', to: '' };
    });
    return m;
  });
  const setF = (sid, f, v) =>
    setDrafts((x) => ({ ...x, [sid]: { ...x[sid], [f]: v.replace(/[^0-9]/g, '') } }));
  const save = () => {
    Object.entries(drafts).forEach(([sid, r]) => {
      const f = parseInt(r.from, 10),
        t = parseInt(r.to, 10);
      allocate(sid, deptKey, f >= 1 && t >= f && t <= pool ? { start: f, end: t } : 0);
    });
    onClose();
  };
  // overlap check for a given student's draft range against the OTHER drafts
  const overlapMsg = (sid) => {
    const r = drafts[sid];
    const f = parseInt(r.from, 10),
      t = parseInt(r.to, 10);
    if (!(f >= 1 && t >= f)) return null;
    const cl = [];
    students.forEach((o) => {
      if (o.id === sid) return;
      const ro = drafts[o.id];
      const of = parseInt(ro.from, 10),
        ot = parseInt(ro.to, 10);
      if (!(of >= 1 && ot >= of)) return;
      const lo = Math.max(f, of),
        hi = Math.min(t, ot);
      if (lo <= hi) cl.push(o.name + ' (' + lo + '\u2013' + hi + ')');
    });
    return cl.length ? '\u26a0 overlaps ' + cl.join(', ') : null;
  };
  const inp = {
    width: 60,
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
          {d.icon + ' ' + d.name}
        </h2>
        <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 3 }}>
          {'Assign a chart RANGE from this department (pool 1\u2013' +
            pool +
            ') to each student. Blank = no access.'}
        </p>
      </div>
      <div style={{ padding: '12px 22px', maxHeight: '52vh', overflowY: 'auto' }}>
        {students.map((s) => {
          const om = overlapMsg(s.id);
          const bc = om ? 'var(--tone-fbbf24)' : 'var(--line)';
          return (
            <div
              key={s.id}
              style={{ padding: '9px 0', borderBottom: '1px solid var(--line-soft)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{s.name}</span>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>From</span>
                <input
                  value={drafts[s.id].from}
                  placeholder="1"
                  onChange={(ev) => setF(s.id, 'from', ev.target.value)}
                  style={{ ...inp, borderColor: bc }}
                />
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>To</span>
                <input
                  value={drafts[s.id].to}
                  placeholder={String(pool)}
                  onChange={(ev) => setF(s.id, 'to', ev.target.value)}
                  style={{ ...inp, borderColor: bc }}
                />
              </div>
              {om && (
                <div style={{ fontSize: 11, fontWeight: 700, marginTop: 4, color: 'var(--tone-b45309)' }}>
                  {om}
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
