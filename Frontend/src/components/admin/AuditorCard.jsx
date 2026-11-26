/* CODIVIA platform — admin view of one auditor: name, email, status, assigned departments (with the
 * number of students in each), audit counts, and the Edit / Disable / Assign students actions.
 * Same look as StudentCard (.dc-* / .sc-* styles).
 * Props: auditor (a GET /admin/auditors card: { uid, name, email, status, accountStatus,
 *        departments: [{ key, name, students }], progress: { assignments, completed, inProgress } }),
 *        onAssign(auditor), onEdit(auditor), onToggleStatus(auditor).
 */
const MAX_DEPT_CHIPS = 3;

const initials = (name) =>
  String(name || '')
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || '?';

export const AUDITOR_STATUS = Object.freeze({
  assigned: { label: 'Assigned', tone: 'ok' },
  unassigned: { label: 'Unassigned', tone: 'muted' },
  disabled: { label: 'Disabled', tone: 'danger' },
});

export function AuditorCard({ auditor, onAssign, onEdit, onToggleStatus }) {
  const isDisabled = auditor.accountStatus === 'disabled';
  const badge = AUDITOR_STATUS[auditor.status] || AUDITOR_STATUS.unassigned;
  const chips = (auditor.departments || []).map((d) => ({ dk: d.key, text: `${d.name} · ${d.students} student${d.students === 1 ? '' : 's'}` }));
  const shown = chips.slice(0, MAX_DEPT_CHIPS);
  const hidden = chips.slice(MAX_DEPT_CHIPS);
  const p = auditor.progress;

  return (
    <article className={'dc-card sc-card ' + (isDisabled ? 'is-disabled' : 'is-enabled')}>
      <div className="dc-top">
        <span className="sc-avatar au-avatar" aria-hidden="true">
          {initials(auditor.name)}
        </span>
        <div className="dc-title">
          <h3 title={auditor.name}>{auditor.name}</h3>
          <span className="dc-meta" title={auditor.email}>
            Auditor · {auditor.email}
          </span>
          {auditor.lastLoginAt && <span className="dc-meta">Last sign-in {new Date(auditor.lastLoginAt).toLocaleDateString()}</span>}
        </div>
        <span className={'dc-badge ' + badge.tone}>{badge.label}</span>
        <span className="sc-tools">
          <button type="button" className="sc-icon" onClick={() => onEdit(auditor)} title="Edit auditor" aria-label={'Edit ' + auditor.name}>
            <i className="bi bi-pencil" aria-hidden="true" />
          </button>
          {isDisabled ? (
            <button type="button" className="sc-icon sc-status enable" onClick={() => onToggleStatus(auditor)} title="Enable account" aria-label={'Enable ' + auditor.name}>
              <i className="bi bi-person-check" aria-hidden="true" />
            </button>
          ) : (
            <button type="button" className="sc-icon sc-status disable" onClick={() => onToggleStatus(auditor)} title="Disable account" aria-label={'Disable ' + auditor.name}>
              <i className="bi bi-person-slash" aria-hidden="true" />
            </button>
          )}
        </span>
      </div>

      <div className="dc-metrics au-metrics">
        <dl className="dc-stats">
          <div>
            <dt>Students</dt>
            <dd>{p.assignments.toLocaleString()}</dd>
          </div>
          <div>
            <dt>Departments</dt>
            <dd>{chips.length}</dd>
          </div>
          <div>
            <dt>Audited</dt>
            <dd>{p.completed.toLocaleString()}</dd>
          </div>
          <div>
            <dt>In progress</dt>
            <dd>{p.inProgress.toLocaleString()}</dd>
          </div>
        </dl>
      </div>

      <div className="sc-depts">
        {chips.length === 0 ? (
          <span className="sc-none">No students assigned yet.</span>
        ) : (
          <>
            {shown.map((c) => (
              <span key={c.dk} className="sc-chip">
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
        <span />
        <button type="button" className="dc-action" onClick={() => onAssign(auditor)}>
          Assign students <span aria-hidden="true">→</span>
        </button>
      </div>
    </article>
  );
}
