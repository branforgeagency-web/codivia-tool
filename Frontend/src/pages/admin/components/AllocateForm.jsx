import { useEffect, useState } from 'react';
import { DeptIcon } from '../../../components/ui/DeptIcon.jsx';
import { Modal } from '../../../components/ui/Modal.jsx';
import { PageLoader } from '../../../components/ui/PageLoader.jsx';
import { get } from '../../../services/apiHelper.js';
import { ADMIN_STUDENT_ALLOCATIONS } from '../../../services/endpoints.js';

// ---- Admin: Manage Access for one student. A chart range (From–To) per department; blank = no
// access. Ranges that overlap another student are flagged. Styles: .md-* and .ma-* in refinements.css
// Data: GET /admin/students/:id/allocations -> { student, departments: [{ key, name, pool, range, others }] }.
// Saved by onSave(student, { DEPT: {start,end} }) -> PUT /admin/students/:id/allocations. ----

const EMPTY = { from: '', to: '' };

export function AllocateForm({ student, onSave, onClose }) {
  const [departments, setDepartments] = useState(null);
  const [error, setError] = useState('');
  const [drafts, setDrafts] = useState({}); // { DEPT: { from, to } }

  useEffect(() => {
    let cancelled = false;
    get(ADMIN_STUDENT_ALLOCATIONS(student.uid))
      .then((r) => {
        if (cancelled) return;
        setDepartments(r.departments);
        setDrafts(
          Object.fromEntries(
            r.departments.map((d) => [d.key, d.range ? { from: String(d.range.start), to: String(d.range.end) } : EMPTY]),
          ),
        );
      })
      .catch((e) => !cancelled && setError(e.message || 'Could not load departments.'));
    return () => {
      cancelled = true;
    };
  }, [student.uid]);

  const dr = (dk) => drafts[dk] || EMPTY;
  const setF = (dk, f, v) => setDrafts((x) => ({ ...x, [dk]: { ...dr(dk), [f]: v.replace(/[^0-9]/g, '') } }));

  // Per-department validation + overlap with the other students' ranges.
  const rowInfo = (d) => {
    const { from: f, to: t } = dr(d.key);
    if (f === '' && t === '') return { state: 'empty' };
    const fi = parseInt(f, 10),
      ti = parseInt(t, 10);
    if (isNaN(fi) || isNaN(ti)) return { state: 'error', msg: 'Enter both From and To' };
    if (fi < 1) return { state: 'error', msg: 'From must be at least 1' };
    if (ti < fi) return { state: 'error', msg: 'To must be ≥ From' };
    if (ti > d.pool) return { state: 'error', msg: 'To exceeds pool (' + d.pool + ')' };
    const clashes = d.others
      .map((o) => ({ name: o.name, lo: Math.max(fi, o.start), hi: Math.min(ti, o.end) }))
      .filter((o) => o.lo <= o.hi)
      .map((o) => o.name + ' (' + o.lo + '–' + o.hi + ')');
    return { state: clashes.length ? 'warn' : 'ok', count: ti - fi + 1, msg: clashes.length ? 'overlaps ' + clashes.join(', ') : null };
  };

  const hasErrors = departments ? departments.some((d) => rowInfo(d).state === 'error') : true;

  // { DEPT: {start,end} } for the filled, valid rows.
  const save = () => {
    const out = {};
    departments.forEach((d) => {
      const info = rowInfo(d);
      if (info.state === 'ok' || info.state === 'warn') {
        out[d.key] = { start: parseInt(dr(d.key).from, 10), end: parseInt(dr(d.key).to, 10) };
      }
    });
    onSave(student, out);
  };

  return (
    <Modal
      size="lg"
      title={'Manage Access — ' + student.name}
      closeButton={false}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="sc-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="dc-action" onClick={save} disabled={hasErrors}>
            Save Allocation
          </button>
        </>
      }
    >
      <p className="ma-note">
        Assign each student a CHART RANGE per department (e.g. 1–25). Leave blank for no access. Ranges that overlap
        another student are flagged.
      </p>
      {error ? (
        <div className="cvx-msg err" role="alert">
          {error}
        </div>
      ) : !departments ? (
        <PageLoader variant="inline" label="Loading departments" />
      ) : (
        <div className="ma-list">
          {departments.map((d) => {
            const info = rowInfo(d);
            return (
              <div key={d.key} className={'ma-row ' + info.state}>
                <span className="ma-ico">
                  <DeptIcon dept={d.key} />
                </span>
                <div className="ma-name">
                  <b>{d.name}</b>
                  <span>{'pool 1–' + d.pool}</span>
                </div>
                <div className="ma-range">
                  <span>From</span>
                  <input aria-label={d.name + ' from'} inputMode="numeric" value={dr(d.key).from} placeholder="1" onChange={(ev) => setF(d.key, 'from', ev.target.value)} />
                  <span>To</span>
                  <input aria-label={d.name + ' to'} inputMode="numeric" value={dr(d.key).to} placeholder={String(d.pool)} onChange={(ev) => setF(d.key, 'to', ev.target.value)} />
                </div>
                <span className="ma-count">{info.count ? info.count + ' chts' : ''}</span>
                {info.msg && (
                  <p className="ma-msg">
                    <i className={'bi ' + (info.state === 'error' ? 'bi-exclamation-circle' : 'bi-exclamation-triangle')} aria-hidden="true" /> {info.msg}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
