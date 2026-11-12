import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { PageLoader } from '../../components/ui/PageLoader.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { StatCard } from '../../components/ui/StatCard.jsx';
import { ELEMENT_LABELS } from '../../config/constants.js';
import { useStudent } from '../../context/StudentContext.jsx';
import { useApiList } from '../../hooks/useApiList.js';
import { useDebounced } from '../../hooks/useDebounced.js';
import { PATHS, coderPath } from '../../routes/paths.js';
import { MY_DEPT_CHARTS } from '../../services/endpoints.js';

// ---- Student: one department's chart queue ----
// Data: GET /my-charts/:dept/charts — the student's allocated charts, 10 per page, with the header
// columns (MRN, date of service, payer, facility) read from each record on the server, the
// student's score, status tabs and search. No answer keys.
export function DeptQueue({ dept, results, onBack, onOpen }) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const search = useDebounced(q.trim());
  // Reload when a chart is submitted (results change), so scores and counts stay current.
  const list = useApiList(MY_DEPT_CHARTS(dept), { params: { status, search }, reloadKey: Object.keys(results).length });

  if (list.error && !list.data) {
    return (
      <div className="chart-queue">
        <button className="backbtn" onClick={onBack}>
          ← All departments
        </button>
        <div className="cvx-msg err" role="alert">
          {list.error}
        </div>
      </div>
    );
  }
  if (!list.data) return <PageLoader label="Loading your charts" />;

  const d = list.data.department;
  const sum = list.data.summary;
  const charts = list.results;

  return (
    <div className="chart-queue">
      <button className="backbtn" onClick={onBack}>
        ← All departments
      </button>
      <div className="page-head">
        <h1>{d.name}</h1>
        <p>{sum.assigned + ' charts allocated to you · ' + (d.elements || []).map((x) => ELEMENT_LABELS[x] || x).join(' · ')}</p>
      </div>
      <div className="stat-row">
        <StatCard k="Allocated" v={sum.assigned} s="assigned to you" />
        <StatCard k="Worked" v={sum.worked} s="in this allocation" teal={true} />
        <StatCard k="Avg Accuracy" v={(sum.avg || 0) + '%'} s="across worked" />
        <StatCard k="Progress" v={sum.percent + '%'} s="of allocated charts worked" />
      </div>
      <div className="card">
        <div className="card-h" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <h3>Your Chart Queue</h3>
          <input
            type="search"
            aria-label="Search chart ID, MRN, date, payer, or facility"
            value={q}
            placeholder="Search MRN, date, payer, facility…"
            style={{ fontSize: 12, padding: '6px 10px', border: '1px solid var(--line)', borderRadius: 6, minWidth: 220 }}
            onChange={(ev) => setQ(ev.target.value)}
          />
        </div>
        <div className="queue-toolbar">
          <div className="charts-filters" role="group" aria-label="Filter charts by status">
            {list.data.filters.map((f) => (
              <button type="button" key={f.key} aria-pressed={status === f.key} onClick={() => setStatus(f.key)}>
                {f.label}
                <span>{f.count}</span>
              </button>
            ))}
          </div>
          <span className="charts-result-count" role="status">
            {list.loading ? 'Loading…' : 'Showing ' + charts.length + ' of ' + list.total + ' charts'}
          </span>
        </div>
        <div className="queue-table-scroll" role="region" aria-label="Chart queue" tabIndex={0}>
          <table>
            <caption className="sr-only">Allocated charts for {d.name}</caption>
            <thead>
              <tr>
                {['MRN', 'Date of Service', 'Insurance', 'Facility', 'Status', 'Action'].map((h) => (
                  <th key={h} scope="col">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {charts.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div
                        style={{ fontWeight: 600, fontFamily: "'SF Mono',monospace", fontSize: 12.5 }}
                      >
                        {c.mrn || '\u2014'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                        {c.id}
                        {c.ptype ? (
                          <span
                            style={{
                              marginLeft: 6,
                              fontSize: 9.5,
                              fontWeight: 800,
                              letterSpacing: 0.2,
                              padding: '1px 6px',
                              borderRadius: 4,
                              color: /^new/i.test(c.ptype) ? 'var(--tone-0b6b57)' : 'var(--tone-5a6472)',
                              background: /^new/i.test(c.ptype) ? 'var(--tone-e6f7f2)' : 'var(--tone-eef1f4)',
                              border: '1px solid ' + (/^new/i.test(c.ptype) ? 'var(--tone-a8dfd0)' : 'var(--tone-dfe4ea)'),
                            }}
                          >
                            {/^new/i.test(c.ptype) ? 'NEW' : 'EST'}
                          </span>
                        ) : null}
                        {c.handwritten ? (
                          <span
                            style={{
                              marginLeft: 6,
                              fontSize: 10,
                              fontWeight: 700,
                              color: 'var(--tone-9a6b12)',
                              background: 'var(--tone-fff2cf)',
                              border: '1px solid var(--tone-e3bd5c)',
                              borderRadius: 4,
                              padding: '1px 5px',
                              letterSpacing: 0.3,
                            }}
                          >
                            ✎ HANDWRITTEN
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: 12.5 }}>{c.dos || '\u2014'}</div>
                      {c.dosLabel && (
                        <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>{c.dosLabel}</div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: 12.5 }}>{c.payer || '\u2014'}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: 12.5 }}>{c.facility || '\u2014'}</div>
                    </td>
                    <td>
                      {c.accuracy !== null ? (
                        <span
                          className={
                            'acc ' + (c.accuracy >= 90 ? 'hi' : c.accuracy >= 75 ? 'mid' : 'lo')
                          }
                        >
                          {c.accuracy + '%'}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--muted)', fontSize: 12 }}>Not started</span>
                      )}
                    </td>
                    <td>
                      <button
                        className={'btn ' + (c.accuracy !== null ? 'btn-ghost' : 'btn-teal')}
                        onClick={() => onOpen(c)}
                      >
                        {c.accuracy !== null ? 'Redo' : 'Code it'}
                      </button>
                    </td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>
        {list.total === 0 ? (
          <div style={{ textAlign: 'center', padding: '14px', color: 'var(--muted)', fontSize: 13 }}>
            <strong>{sum.assigned ? 'No matching charts' : 'No charts allocated yet'}</strong>
            <p>{sum.assigned ? 'Try a different search or status filter.' : 'Your trainer can assign charts to this department.'}</p>
            {sum.assigned > 0 && (
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setQ('');
                  setStatus('all');
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div style={{ padding: '0 14px' }}>
            <Pagination {...list.pagerProps} itemLabel="charts" />
          </div>
        )}
      </div>
    </div>
  );
}

// route: /charts/:dept — only departments allocated to the student
export default function DeptQueuePage() {
  const { dept } = useParams();
  const { stu, results } = useStudent();
  const navigate = useNavigate();
  if (!(stu.depts && stu.depts[dept] != null)) return <Navigate to={PATHS.charts} replace />;
  return <DeptQueue dept={dept} results={results} onBack={() => navigate(PATHS.charts)} onOpen={(chart) => navigate(coderPath(dept, chart.id))} />;
}
