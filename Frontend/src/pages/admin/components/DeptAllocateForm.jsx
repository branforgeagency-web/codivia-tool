import { useState } from 'react';
import { DeptIcon } from '../../../components/ui/DeptIcon.jsx';
import { PageLoader } from '../../../components/ui/PageLoader.jsx';
import { Pagination } from '../../../components/ui/Pagination.jsx';
import { useApiList } from '../../../hooks/useApiList.js';
import { useDebounced } from '../../../hooks/useDebounced.js';
import { DEPARTMENT_ALLOCATIONS } from '../../../services/endpoints.js';

// ---- Admin: "Manage allocation" for one department. Students 10 per page with search, from
// GET /admin/departments/:dept/allocations ({ department, summary, results: [{ student, allocation, overlaps }] }).
// Edits are kept across pages; Save sends only the changed rows (onSave = AdminContext.allocateDept). ----

const inp = { width: 60, padding: '7px 8px', border: '1px solid var(--line)', borderRadius: 7, fontSize: 13, textAlign: 'center' };

export function DeptAllocateForm({ deptKey, onSave, onClose }) {
  const [query, setQuery] = useState('');
  const search = useDebounced(query.trim());
  const list = useApiList(DEPARTMENT_ALLOCATIONS(deptKey), { params: { search } });
  // uid -> { from, to, original: {start,end}|null, name } for every row the admin touched
  const [edits, setEdits] = useState({});

  const dept = list.data && list.data.department;
  const pool = dept ? dept.pool : 0;

  const rowValue = (row) => {
    const e = edits[row.student.id];
    if (e) return e;
    const a = row.allocation;
    return { from: a ? String(a.start) : '', to: a ? String(a.end) : '' };
  };
  const setF = (row, f, v) =>
    setEdits((x) => {
      const cur = x[row.student.id] || { ...rowValue(row), original: row.allocation, name: row.student.name };
      return { ...x, [row.student.id]: { ...cur, [f]: v.replace(/[^0-9]/g, '') } };
    });

  // Valid range, null for blank (no access), or 'invalid'.
  const parse = ({ from, to }) => {
    if (from === '' && to === '') return null;
    const f = parseInt(from, 10),
      t = parseInt(to, 10);
    return f >= 1 && t >= f && t <= pool ? { start: f, end: t } : 'invalid';
  };

  const changes = Object.entries(edits)
    .map(([uid, e]) => ({ uid, name: e.name, range: parse(e), original: e.original }))
    .filter((c) => {
      if (c.range === 'invalid') return true;
      const o = c.original;
      return c.range ? !o || o.start !== c.range.start || o.end !== c.range.end : !!o;
    });
  const invalid = changes.filter((c) => c.range === 'invalid');

  const save = () => {
    if (invalid.length) return;
    if (changes.length) onSave(deptKey, changes.map(({ uid, range }) => ({ uid, range })));
    else onClose();
  };

  return (
    <div>
      <div style={{ padding: '20px 22px 0', display: 'flex', gap: 10, alignItems: 'center' }}>
        <span className="ma-ico">
          <DeptIcon dept={deptKey} />
        </span>
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--navy)' }}>{dept ? dept.name : deptKey}</h2>
          <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 3 }}>
            {'Assign a chart RANGE from this department (pool 1–' + pool + ') to each student. Blank = no access.'}
          </p>
        </div>
      </div>
      <div style={{ padding: '12px 22px 0' }}>
        <label className="ad-search" style={{ width: '100%' }}>
          <span className="sr-only">Search students</span>
          <input type="search" value={query} onChange={(ev) => setQuery(ev.target.value)} placeholder="Search name, ID or email…" />
        </label>
      </div>
      <div style={{ padding: '8px 22px', maxHeight: '48vh', overflowY: 'auto' }}>
        {list.error ? (
          <div className="cvx-msg err" role="alert">
            {list.error}
          </div>
        ) : !list.data ? (
          <PageLoader variant="inline" label="Loading students" />
        ) : list.results.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--muted)', padding: '12px 0' }}>No students found.</p>
        ) : (
          list.results.map((row) => {
            const v = rowValue(row);
            const r = parse(v);
            const bad = r === 'invalid';
            // Server-side overlaps describe the saved range; only show them while it's unchanged.
            const showOverlaps = !edits[row.student.id] && row.overlaps.length > 0;
            const bc = bad ? 'var(--err)' : showOverlaps ? 'var(--tone-fbbf24)' : 'var(--line)';
            return (
              <div key={row.student.id} style={{ padding: '9px 0', borderBottom: '1px solid var(--line-soft)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>
                    {row.student.name}
                    <span style={{ display: 'block', fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>{row.student.studentId}</span>
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>From</span>
                  <input value={v.from} placeholder="1" onChange={(ev) => setF(row, 'from', ev.target.value)} style={{ ...inp, borderColor: bc }} />
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>To</span>
                  <input value={v.to} placeholder={String(pool)} onChange={(ev) => setF(row, 'to', ev.target.value)} style={{ ...inp, borderColor: bc }} />
                </div>
                {bad && <div style={{ fontSize: 11, fontWeight: 700, marginTop: 4, color: 'var(--err)' }}>{'Enter From ≥ 1 and To between From and ' + pool}</div>}
                {showOverlaps && (
                  <div style={{ fontSize: 11, fontWeight: 700, marginTop: 4, color: 'var(--tone-b45309)' }}>
                    {'⚠ overlaps ' + row.overlaps.map((o) => o.name + ' (' + o.from + '–' + o.to + ')').join(', ')}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      <div style={{ padding: '0 22px' }}>
        <Pagination {...list.pagerProps} itemLabel="students" />
      </div>
      <div className="result-actions">
        <button style={{ background: 'var(--color-white)', border: '1px solid var(--line)', color: 'var(--ink)' }} onClick={onClose}>
          Cancel
        </button>
        <button style={{ background: 'var(--teal)', color: 'var(--color-white)' }} onClick={save} disabled={invalid.length > 0}>
          {changes.length ? 'Save ' + changes.length + ' change' + (changes.length === 1 ? '' : 's') : 'Save Allocation'}
        </button>
      </div>
    </div>
  );
}
