/* CODIVIA platform — admin view of one student: name, ID, email, status, progress ring,
 * completed / allocated / accuracy / departments, allocated department ranges, and the
 * "View performance" and "Manage access" actions. Same look as AdminDeptCard (.dc-* styles).
 * Props: student (a GET /admin/students card: { uid, id, name, email, status, progress: { worked, allocated, avg },
 *        departments: [{ key, name, start, end, assigned, worked, complete }] }), onPerf(student), onAllocate(student)
 * Styles: .dc-* and .sc-* in styles/refinements.css
 */
import { accTone } from '../../utils/progress.js';
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

// One chip per allocated department: "Cardiology · 1–50 · 12/50" (student.departments from the API).
function deptChips(student) {
  return (student.departments || []).map((d) => ({
    dk: d.key,
    text: d.name + ' · ' + d.start + '–' + d.end + ' · ' + d.worked + '/' + d.assigned,
    complete: d.complete,
  }));
}

export function StudentCard({ student, onPerf, onAllocate }) {
  const { progress, status } = student;
  const badge = STUDENT_STATUS[status] || STUDENT_STATUS.idle;
  const chips = deptChips(student);
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
        <button type="button" className="sc-ghost" onClick={() => onPerf(student)}>
          View performance
        </button>
        <button type="button" className="dc-action" onClick={() => onAllocate(student)}>
          Manage access <span aria-hidden="true">→</span>
        </button>
      </div>
    </article>
  );
}
