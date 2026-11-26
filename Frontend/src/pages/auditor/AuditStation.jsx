/* CODIVIA platform — auditor dashboard (route: /auditor/dashboard).
   Reconnected 2026-11-26 when the auditor role came back: tiles from GET /audits/summary, the
   priority charts waiting for audit and the latest completed audits (GET /audits/queue).
   Styles: .ad-* / .au-* in refinements.css */
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageLoader } from '../../components/ui/PageLoader.jsx';
import { StatTile, StatTiles } from '../../components/ui/StatTile.jsx';
import { useSession } from '../../context/SessionContext.jsx';
import { PATHS, auditReviewPath } from '../../routes/paths.js';
import { get } from '../../services/apiHelper.js';
import { AUDIT_QUEUE, AUDIT_SUMMARY } from '../../services/endpoints.js';
import { ScorePill } from './auditUi.jsx';

const ICON = {
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  inbox: 'M22 12h-6l-2 3h-4l-2-3H2M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z',
  check: 'M20 6 9 17l-5-5',
  scale: 'M12 3v18M5 7h14M5 7l-3 7a4 4 0 0 0 6 0L5 7zM19 7l-3 7a4 4 0 0 0 6 0l-3-7z',
};

function MiniList({ title, rows, empty, more }) {
  const navigate = useNavigate();
  return (
    <section className="card au-mini">
      <header>
        <h3>{title}</h3>
        {more}
      </header>
      {!rows ? (
        <PageLoader variant="inline" label="Loading" />
      ) : !rows.length ? (
        <p className="sc-none">{empty}</p>
      ) : (
        <ul>
          {rows.map((r) => (
            <li key={r.student.uid + r.chart}>
              <button type="button" onClick={() => navigate(auditReviewPath(r.student.uid, r.chart))}>
                <span className="au-who">
                  <b>
                    {r.chart} {r.title ? '· ' + r.title : ''}
                  </b>
                  <small>
                    {r.student.name} ({r.student.id}) · {r.deptName}
                  </small>
                </span>
                <ScorePill row={r} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function AuditStation() {
  const { session } = useSession();
  const [summary, setSummary] = useState(null);
  const [priority, setPriority] = useState(null);
  const [recent, setRecent] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fail = (e) => setError(e.message || 'Could not load the dashboard');
    get(AUDIT_SUMMARY).then(setSummary).catch(fail);
    get(AUDIT_QUEUE, { params: { status: 'pending', limit: 6 } })
      .then((r) => setPriority(r.results))
      .catch(fail);
    get(AUDIT_QUEUE, { params: { status: 'completed', limit: 6 } })
      .then((r) => setRecent(r.results))
      .catch(fail);
  }, []);

  const s = summary || { students: 0, departments: 0, pending: 0, draft: 0, completed: 0, priority: 0, agreementRate: null, priorityBelow: null };

  return (
    <div className="ad">
      <div className="page-head">
        <h1>Welcome, {session.user.name}</h1>
        <p>Review your assigned students’ submitted charts against the documentation, record findings and confirm or adjust the score.</p>
      </div>
      {error && (
        <div className="cvx-msg err" role="alert">
          {error}
        </div>
      )}
      <StatTiles>
        <StatTile lead icon={ICON.inbox} label="To audit" value={s.pending + s.draft} caption={s.priority + ' priority' + (s.priorityBelow != null ? ' (below ' + s.priorityBelow + '%)' : '')} />
        <StatTile icon={ICON.check} label="Audited" value={s.completed} caption="completed audits" />
        <StatTile icon={ICON.users} label="Students" value={s.students} caption={'in ' + s.departments + ' department' + (s.departments === 1 ? '' : 's')} />
        <StatTile icon={ICON.scale} label="Agreement" value={s.agreementRate == null ? '—' : s.agreementRate + '%'} caption="audits agreeing with the auto-score" />
      </StatTiles>

      {summary && summary.students === 0 ? (
        <div className="pg-empty">
          <h3>No students assigned yet</h3>
          <p>An administrator assigns students to you per department. Their submitted charts then appear in your Audit Queue.</p>
        </div>
      ) : (
        <div className="au-dash">
          <MiniList
            title="Next to audit"
            rows={priority}
            empty="Nothing waiting — every submitted chart is audited."
            more={<Link to={PATHS.auditorQueue}>Open queue →</Link>}
          />
          <MiniList
            title="Recently audited"
            rows={recent}
            empty="You haven't completed an audit yet."
            more={<Link to={PATHS.auditorQueue + '?status=completed'}>All audited →</Link>}
          />
        </div>
      )}
    </div>
  );
}
