import { useState } from 'react';
import { DeptIcon } from '../../../components/ui/DeptIcon.jsx';
import { Modal } from '../../../components/ui/Modal.jsx';
import { DEPTS } from '../../../config/constants.js';
import { activeDeptKeys, allocOverlap, allocRange, deptHasCharts } from '../../../utils/allocation.js';

// ---- Admin: Manage Access for one student. A chart range (From–To) per department; blank = no
// access. Ranges that overlap another student are flagged. Styles: .md-* and .ma-* in refinements.css ----

const poolOf = (dk) => ((window.CHART_DATA && window.CHART_DATA[dk]) || []).length;

export function AllocateForm({ student, students, allocateMany, onClose }) {
  // The student list reloads from Firestore, so students.find() can briefly
  // return undefined. Guard both the student and its depts map.
  const alloc = (student && student.depts) || {};
  // Draft holds a {from,to} per department. Legacy numeric allocations become
  // from=1, to=N. Empty department => from='' to='' (no access).
  const [drafts, setDrafts] = useState(() => {
    const m = {};
    activeDeptKeys().forEach((dk) => {
      const r = allocRange(alloc[dk], poolOf(dk));
      m[dk] = r ? { from: String(r.start), to: String(r.end) } : { from: '', to: '' };
    });
    return m;
  });

  const setF = (dk, f, v) => setDrafts((x) => ({ ...x, [dk]: { ...x[dk], [f]: v.replace(/[^0-9]/g, '') } }));

  // Build the allocation payload from drafts: {dept: {start,end}} for filled rows.
  const build = () => {
    const out = {};
    activeDeptKeys().forEach((dk) => {
      const f = parseInt(drafts[dk].from, 10),
        t = parseInt(drafts[dk].to, 10);
      if (f >= 1 && t >= f && t <= poolOf(dk)) out[dk] = { start: f, end: t };
    });
    return out;
  };

  // Per-department validation + overlap detection against OTHER students.
  const rowInfo = (dk) => {
    const pool = poolOf(dk);
    const f = drafts[dk].from,
      t = drafts[dk].to;
    if (f === '' && t === '') return { state: 'empty' };
    const fi = parseInt(f, 10),
      ti = parseInt(t, 10);
    if (isNaN(fi) || isNaN(ti)) return { state: 'error', msg: 'Enter both From and To' };
    if (fi < 1) return { state: 'error', msg: 'From must be at least 1' };
    if (ti < fi) return { state: 'error', msg: 'To must be ≥ From' };
    if (ti > pool) return { state: 'error', msg: 'To exceeds pool (' + pool + ')' };
    const clashes = [];
    (students || []).forEach((other) => {
      if (!other || other.id === student.id) return;
      const ov = allocOverlap({ start: fi, end: ti }, other.depts && other.depts[dk], pool);
      if (ov) clashes.push(other.name + ' (' + ov.start + '–' + ov.end + ')');
    });
    return { state: clashes.length ? 'warn' : 'ok', count: ti - fi + 1, msg: clashes.length ? 'overlaps ' + clashes.join(', ') : null };
  };

  const save = () => {
    if (student) allocateMany(student.id, build());
  };

  if (!student) {
    return (
      <Modal
        title="Student not found"
        closeButton={false}
        onClose={onClose}
        footer={
          <button type="button" className="dc-action" onClick={onClose}>
            Close
          </button>
        }
      >
        <p className="ma-note">
          This student record could not be loaded — the list may still be refreshing. Close this dialog and try again.
        </p>
      </Modal>
    );
  }

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
          <button type="button" className="dc-action" onClick={save}>
            Save Allocation
          </button>
        </>
      }
    >
      <p className="ma-note">
        Assign each student a CHART RANGE per department (e.g. 1–25). Leave blank for no access. Ranges that overlap
        another student are flagged.
      </p>
      <div className="ma-list">
        {Object.entries(DEPTS)
          .filter(([dk]) => deptHasCharts(dk))
          .map(([dk, d]) => {
            const pool = poolOf(dk);
            const info = rowInfo(dk);
            return (
              <div key={dk} className={'ma-row ' + info.state}>
                <span className="ma-ico">
                  <DeptIcon dept={dk} />
                </span>
                <div className="ma-name">
                  <b>{d.name}</b>
                  <span>{'pool 1–' + pool}</span>
                </div>
                <div className="ma-range">
                  <span>From</span>
                  <input aria-label={d.name + ' from'} inputMode="numeric" value={drafts[dk].from} placeholder="1" onChange={(ev) => setF(dk, 'from', ev.target.value)} />
                  <span>To</span>
                  <input aria-label={d.name + ' to'} inputMode="numeric" value={drafts[dk].to} placeholder={String(pool)} onChange={(ev) => setF(dk, 'to', ev.target.value)} />
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
    </Modal>
  );
}
