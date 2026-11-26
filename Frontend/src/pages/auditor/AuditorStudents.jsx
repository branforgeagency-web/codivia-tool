/* CODIVIA platform — auditor My Students (route: /auditor/students).
   The students an admin assigned to this auditor, with their departments and audit counts.
   "Open charts" goes to the Audit Queue filtered to that student.
   Data: GET /audits/students. Styles: .dc-* / .sc-* / .au-* in refinements.css */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageLoader } from '../../components/ui/PageLoader.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { useApiList } from '../../hooks/useApiList.js';
import { useDebounced } from '../../hooks/useDebounced.js';
import { PATHS } from '../../routes/paths.js';
import { AUDIT_STUDENTS } from '../../services/endpoints.js';
import { accTone } from '../../utils/progress.js';

const initials = (name) =>
  String(name || '')
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || '?';

export default function AuditorStudents() {
  const navigate = useNavigate();
  const [dept, setDept] = useState('');
  const [query, setQuery] = useState('');
  const search = useDebounced(query.trim());
  const list = useApiList(AUDIT_STUDENTS, { params: { dept, search } });
  const departments = (list.data && list.data.departments) || [];
  const openQueue = (uid, deptKey) => navigate(`${PATHS.auditorQueue}?status=all&student=${encodeURIComponent(uid)}${deptKey ? '&dept=' + encodeURIComponent(deptKey) : ''}`);

  return (
    <div className="ad">
      <div className="page-head">
        <h1>My Students</h1>
        <p>Students assigned to you for audit, by department. Open a student to see their submitted charts.</p>
      </div>

      <div className="ad-toolbar">
        <div className="pg-filters" role="tablist" aria-label="Department">
          <button type="button" role="tab" aria-selected={!dept} className={!dept ? 'on' : ''} onClick={() => setDept('')}>
            All departments
          </button>
          {departments.map((d) => (
            <button key={d.key} type="button" role="tab" aria-selected={dept === d.key} className={dept === d.key ? 'on' : ''} onClick={() => setDept(d.key)}>
              {d.name}
            </button>
          ))}
        </div>
        <label className="ad-search">
          <i className="bi bi-search" aria-hidden="true" />
          <span className="sr-only">Search students</span>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, ID or email…" />
        </label>
      </div>

      {list.error ? (
        <div className="cvx-msg err" role="alert">
          {list.error}
        </div>
      ) : !list.data ? (
        <PageLoader variant="inline" label="Loading students" />
      ) : !list.results.length ? (
        <div className="pg-empty">
          <h3>{departments.length ? 'No students found' : 'No students assigned yet'}</h3>
          <p>{departments.length ? 'Try another search or department.' : 'An administrator assigns students to you per department.'}</p>
        </div>
      ) : (
        <>
          <div className="ad-grid">
            {list.results.map((s) => (
              <article key={s.uid} className={'dc-card sc-card ' + (s.accountStatus === 'disabled' ? 'is-disabled' : 'is-enabled')}>
                <div className="dc-top">
                  <span className="sc-avatar" aria-hidden="true">
                    {initials(s.name)}
                  </span>
                  <div className="dc-title">
                    <h3 title={s.name}>{s.name}</h3>
                    <span className="dc-meta">
                      {s.id} · {s.email}
                    </span>
                  </div>
                  {s.totals.pending + s.totals.draft > 0 ? (
                    <span className="dc-badge warn">{s.totals.pending + s.totals.draft} to audit</span>
                  ) : (
                    <span className="dc-badge ok">Up to date</span>
                  )}
                </div>
                <div className="dc-metrics au-metrics">
                  <dl className="dc-stats">
                    <div>
                      <dt>Submitted</dt>
                      <dd>{s.totals.submitted}</dd>
                    </div>
                    <div>
                      <dt>Audited</dt>
                      <dd>{s.totals.completed}</dd>
                    </div>
                    <div>
                      <dt>Priority</dt>
                      <dd>{s.totals.priority}</dd>
                    </div>
                    <div>
                      <dt>Accuracy</dt>
                      <dd className={s.totals.avg == null ? '' : 'acc-' + accTone(s.totals.avg)}>{s.totals.avg == null ? '—' : s.totals.avg + '%'}</dd>
                    </div>
                  </dl>
                </div>
                <div className="sc-depts">
                  {s.departments.map((d) => (
                    <button key={d.key} type="button" className="sc-chip au-chip" onClick={() => openQueue(s.uid, d.key)} title={`Open ${d.name} charts`}>
                      {d.name} · {d.completed}/{d.submitted} audited
                    </button>
                  ))}
                </div>
                <div className="dc-foot sc-foot">
                  <span />
                  <button type="button" className="dc-action" onClick={() => openQueue(s.uid)}>
                    Open charts <span aria-hidden="true">→</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
          <Pagination {...list.pagerProps} itemLabel="students" />
        </>
      )}
    </div>
  );
}
