import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { ErrorState } from '../../components/ui/ErrorState.jsx';
import { PageLoader } from '../../components/ui/PageLoader.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { StatCard } from '../../components/ui/StatCard.jsx';
import { ELEMENT_LABELS } from '../../config/constants.js';
import { useStudent } from '../../context/StudentContext.jsx';
import { useApiList } from '../../hooks/useApiList.js';
import { useDebounced } from '../../hooks/useDebounced.js';
import { PATHS, coderPath } from '../../routes/paths.js';
import { MY_DEPT_CHARTS } from '../../services/endpoints.js';
import { useReference, workTypeInfo } from '../../hooks/useReference.js';

// ---- Student: one department's chart queue ----
// Data: GET /my-charts/:dept/charts — the signed-in student's allocated charts, 10 per page.
// Tabs follow the student's own work (To do / Deferred / Completed), chips filter by work type
// (new chart, charge review, denial, DRG validation), search covers chart ID, patient and header.
const TYPE_TONE = {
  navy: { color: 'var(--navy)', background: 'var(--tone-eef1f4)', border: 'var(--tone-dfe4ea)' },
  brand: { color: 'var(--teal-d)', background: 'var(--teal-lt)', border: 'var(--tone-e3bd5c)' },
  err: { color: '#B42318', background: '#FDECEA', border: '#F4B9B2' },
};
const pill = (tone) => ({
  display: 'inline-block',
  fontSize: 11,
  fontWeight: 800,
  padding: '2px 8px',
  borderRadius: 999,
  whiteSpace: 'nowrap',
  color: tone.color,
  background: tone.background,
  border: '1px solid ' + tone.border,
});
const muted = { fontSize: 11.5, color: 'var(--muted)', marginTop: 3 };

function WorkNotes({ c, info }) {
  if (c.workType === 'review' || c.workType === 'drg')
    return c.rules.length ? (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <span style={pill(TYPE_TONE.err)}>{c.rules.length} rule{c.rules.length > 1 ? 's' : ''} fired</span>
        <span style={muted}>{c.rules.slice(0, 2).join(' · ')}</span>
      </div>
    ) : (
      <span style={muted}>{info.hint}</span>
    );
  if (c.workType === 'denial')
    return (
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {c.remit && <span style={pill(TYPE_TONE.err)}>{c.remit}</span>}
        {c.daysToAppeal != null && <span style={pill(c.daysToAppeal <= 30 ? TYPE_TONE.brand : TYPE_TONE.navy)}>{c.daysToAppeal} days to appeal</span>}
      </div>
    );
  return <span style={{ fontSize: 12, color: 'var(--muted)' }}>{info.hint}</span>;
}

function Status({ c }) {
  if (c.accuracy !== null)
    return (
      <>
        <span className={'acc ' + (c.accuracy >= 90 ? 'hi' : c.accuracy >= 75 ? 'mid' : 'lo')}>{c.accuracy + '%'}</span>
        {c.transferredTo && <div style={muted}>then transferred</div>}
      </>
    );
  if (c.transferredTo)
    return (
      <>
        <span style={pill(TYPE_TONE.navy)}>Transferred</span>
        <div style={muted}>{c.transferredTo}</div>
      </>
    );
  if (c.deferReason)
    return (
      <>
        <span style={pill(TYPE_TONE.navy)}>Deferred</span>
        <div style={muted}>{c.deferReason}</div>
      </>
    );
  if (c.inProgress) return <span style={pill(TYPE_TONE.brand)}>In progress</span>;
  return <span style={{ color: 'var(--muted)', fontSize: 12 }}>Not started</span>;
}

const actionLabel = (c, info) => (c.accuracy !== null ? 'Redo' : c.deferReason || c.transferredTo ? 'Resume' : c.inProgress ? 'Continue' : info.act);

export function DeptQueue({ dept, results, onBack, onOpen }) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('todo');
  const [type, setType] = useState('all');
  const search = useDebounced(q.trim());
  const { ref } = useReference(); // work-type labels from the database
  // Reload when a chart is submitted (results change), so scores and counts stay current.
  const list = useApiList(MY_DEPT_CHARTS(dept), { params: { status, type, search }, reloadKey: Object.keys(results).length });

  if (list.error && !list.data) {
    return (
      <div className="chart-queue">
        <button className="backbtn" onClick={onBack}>
          ← All departments
        </button>
        <ErrorState title="Couldn't load your chart queue" message={list.error} onRetry={list.reload} />
      </div>
    );
  }
  if (!list.data) return <PageLoader label="Loading your charts" />;

  const d = list.data.department;
  const sum = list.data.summary;
  const charts = list.results;
  const types = list.data.types || [];
  const typeTotal = types.reduce((n, t) => n + t.count, 0);

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
            aria-label="Search chart ID, patient, MRN, date, payer or facility"
            value={q}
            placeholder="Search patient, MRN, chart ID, payer…"
            style={{ fontSize: 12, padding: '6px 10px', border: '1px solid var(--line)', borderRadius: 6, minWidth: 240 }}
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
        {types.length > 1 && (
          <div className="queue-toolbar" style={{ paddingTop: 0 }}>
            <div className="charts-filters" role="group" aria-label="Filter charts by work type">
              <button type="button" aria-pressed={type === 'all'} onClick={() => setType('all')}>
                All types<span>{typeTotal}</span>
              </button>
              {types.map((t) => (
                <button type="button" key={t.key} aria-pressed={type === t.key} onClick={() => setType(t.key)}>
                  {workTypeInfo(ref, t.key).label + 's'}
                  <span>{t.count}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="queue-table-scroll" role="region" aria-label="Chart queue" tabIndex={0}>
          <table>
            <caption className="sr-only">Allocated charts for {d.name}</caption>
            <thead>
              <tr>
                {['MRN · Chart', 'Type', 'Date of service', 'Patient', 'Provider', 'Payer', 'Work notes', 'Status', 'Action'].map((h) => (
                  <th key={h} scope="col">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {charts.map((c) => {
                const t = workTypeInfo(ref, c.workType || 'code');
                const isNewPt = /^new/i.test(c.ptype || '');
                return (
                  <tr key={c.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontFamily: "'SF Mono',monospace", fontSize: 12.5 }}>{c.mrn || '—'}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                        {c.id}
                        {c.ptype ? <span style={{ ...pill(isNewPt ? TYPE_TONE.brand : TYPE_TONE.navy), marginLeft: 6, fontSize: 9.5, padding: '1px 6px' }}>{isNewPt ? 'NEW' : 'EST'}</span> : null}
                        {c.handwritten ? <span style={{ ...pill(TYPE_TONE.brand), marginLeft: 6, fontSize: 9.5, padding: '1px 6px' }}>✎ HANDWRITTEN</span> : null}
                      </div>
                    </td>
                    <td>
                      <span style={pill(TYPE_TONE[t.cls] || TYPE_TONE.navy)}>{t.label}</span>
                    </td>
                    <td>
                      <div style={{ fontSize: 12.5 }}>{c.dos || '—'}</div>
                      {c.dosLabel && <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>{c.dosLabel}</div>}
                    </td>
                    <td>
                      <div style={{ fontSize: 12.5, fontWeight: 700 }}>{c.patient || '—'}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: 12.5 }}>{c.provider || '—'}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: 12.5 }}>{c.payer || '—'}</div>
                      {c.facility && <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>{c.facility}</div>}
                    </td>
                    <td>
                      <WorkNotes c={c} info={t} />
                    </td>
                    <td>
                      <Status c={c} />
                    </td>
                    <td>
                      <button className={'btn ' + (c.accuracy !== null ? 'btn-ghost' : 'btn-teal')} style={{ whiteSpace: 'nowrap' }} onClick={() => onOpen(c)}>
                        {actionLabel(c, t)}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {list.total === 0 ? (
          <div style={{ textAlign: 'center', padding: '14px', color: 'var(--muted)', fontSize: 13 }}>
            <strong>{!sum.assigned ? 'No charts allocated yet' : status === 'deferred' ? 'Nothing deferred' : status === 'done' ? 'No completed charts yet' : 'No matching charts'}</strong>
            <p>{!sum.assigned ? 'Your trainer can assign charts to this department.' : search || type !== 'all' ? 'Try a different search or type filter.' : status === 'todo' ? 'Everything in this allocation is worked. Nice!' : ''}</p>
            {sum.assigned > 0 && (search || type !== 'all') && (
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setQ('');
                  setType('all');
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
