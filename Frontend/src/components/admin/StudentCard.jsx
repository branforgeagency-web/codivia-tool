/* CODIVIA platform — admin view of one student: name, ID, email, status, progress ring,
 * completed / allocated / accuracy / departments, allocated department ranges, and the
 * "View performance" and "Manage access" actions. Same look as AdminDeptCard (.dc-* styles).
 * Props: student ({ id, name, email, depts, progressError }), progress (progressOf(student)),
 *        onPerf(studentId), onAllocate(studentId)
 * Styles: .dc-* and .sc-* in styles/refinements.css
 */
import { DEPTS } from '../../config/constants.js';
import { accTone } from '../../utils/progress.js';
import { allocCount, allocRange } from '../../utils/allocation.js';
import { ProgressRing } from '../ui/ProgressRing.jsx';

const MAX_DEPT_CHIPS = 3;

const initials = (name) =>
  String(name || '')
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || '?';

// Student status, used for the badge and the page filters.
export const STUDENT_STATUS = Object.freeze({
  active: { label: 'Active', tone: 'ok' },
  idle: { label: 'Not started', tone: 'warn' },
  unallocated: { label: 'Unallocated', tone: 'muted' },
  error: { label: 'Progress unreadable', tone: 'danger' },
});
export function studentStatus(student, progress) {
  if (student.progressError) return 'error';
  if (!Object.keys(student.depts || {}).some((dk) => DEPTS[dk])) return 'unallocated';
  return progress.worked > 0 ? 'active' : 'idle';
}

// One chip per allocated department: "Cardiology · 1–50 · 12/50".
function deptChips(student, progress) {
  return Object.entries(student.depts || {})
    .filter(([dk]) => DEPTS[dk])
    .map(([dk, v]) => {
      const pool = ((window.CHART_DATA && window.CHART_DATA[dk]) || []).length;
      const range = allocRange(v, pool);
      const done = progress.byDept[dk] || 0;
      const count = allocCount(v, pool);
      return {
        dk,
        text: DEPTS[dk].name + (range ? ' · ' + range.start + '–' + range.end : '') + ' · ' + done + '/' + count,
        complete: count > 0 && done >= count,
      };
    });
}

export function StudentCard({ student, progress, onPerf, onAllocate }) {
  const status = studentStatus(student, progress);
  const badge = STUDENT_STATUS[status];
  const chips = deptChips(student, progress);
  const shown = chips.slice(0, MAX_DEPT_CHIPS);
  const hidden = chips.slice(MAX_DEPT_CHIPS);
  const done = progress.allocated ? Math.min(100, Math.round((progress.worked / progress.allocated) * 100)) : null;

  return (
    <article className="dc-card sc-card">
      <div className="dc-top">
        <span className="sc-avatar" aria-hidden="true">
          {initials(student.name)}
        </span>
        <div className="dc-title">
          <h3 title={student.name}>{student.name}</h3>
          <span className="dc-meta" title={student.email}>
            {student.id + (student.email ? ' · ' + student.email : '')}
          </span>
        </div>
        <span className={'dc-badge ' + badge.tone}>{badge.label}</span>
      </div>

      {status === 'error' ? (
        <p className="sc-error">
          This student's progress could not be read ({student.progressError}). Their charts and allocation are
          unaffected; try Refresh.
        </p>
      ) : (
        <div className="dc-metrics">
          <ProgressRing value={done} tone="brand" size={72} stroke={7} label="done" />
          <dl className="dc-stats">
            <div>
              <dt>Completed</dt>
              <dd>{progress.worked.toLocaleString()}</dd>
            </div>
            <div>
              <dt>Allocated</dt>
              <dd>{progress.allocated.toLocaleString()}</dd>
            </div>
            <div>
              <dt>Accuracy</dt>
              <dd className={progress.avg == null ? '' : 'acc-' + accTone(progress.avg)}>
                {progress.avg == null ? '—' : progress.avg + '%'}
              </dd>
            </div>
            <div>
              <dt>Departments</dt>
              <dd>{chips.length}</dd>
            </div>
          </dl>
        </div>
      )}

      <div className="sc-depts">
        {chips.length === 0 ? (
          <span className="sc-none">No departments allocated yet.</span>
        ) : (
          <>
            {shown.map((c) => (
              <span key={c.dk} className={'sc-chip' + (c.complete ? ' done' : '')}>
                {c.text}
              </span>
            ))}
            {hidden.length > 0 && (
              <span className="sc-chip more" title={hidden.map((c) => c.text).join('\n')}>
                {'+' + hidden.length + ' more'}
              </span>
            )}
          </>
        )}
      </div>

      <div className="dc-foot sc-foot">
        <button type="button" className="sc-ghost" onClick={() => onPerf(student.id)}>
          View performance
        </button>
        <button type="button" className="dc-action" onClick={() => onAllocate(student.id)}>
          Manage access <span aria-hidden="true">→</span>
        </button>
      </div>
    </article>
  );
}
