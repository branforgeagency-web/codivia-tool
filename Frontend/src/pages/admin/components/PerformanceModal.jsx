import { useMemo } from 'react';
import { DataTable } from '../../../components/ui/DataTable.jsx';
import { DeptIcon } from '../../../components/ui/DeptIcon.jsx';
import { Avatar, Modal } from '../../../components/ui/Modal.jsx';
import { ProgressRing } from '../../../components/ui/ProgressRing.jsx';
import { DEPTS } from '../../../config/constants.js';
import { accTone } from '../../../utils/progress.js';

// ---- Admin: one student's performance. Score bands, per-department accuracy, the codes they
// miss or get wrong most, and every chart they submitted. Data: student.results (Firebase progress).
// Styles: .md-* (modal) and .pf-* in styles/refinements.css ----

const BANDS = [
  { key: 'ship', label: '90%+', min: 90, tone: 'hi' },
  { key: 'solid', label: '75–89%', min: 75, tone: 'ok' },
  { key: 'polish', label: '50–74%', min: 50, tone: 'mid' },
  { key: 'weak', label: 'Under 50%', min: 0, tone: 'lo' },
];
const bandOf = (a) => BANDS.find((b) => a >= b.min);
const deptName = (dk) => (DEPTS[dk] ? DEPTS[dk].name : dk || 'Unknown');
const fmtDate = (ms) => (ms ? new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const top = (counts, n) => Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, n);

function summarize(results) {
  const rows = Object.entries(results || {}).map(([id, v]) => ({ id, ...v, accuracy: typeof v.accuracy === 'number' ? v.accuracy : null }));
  rows.sort((a, b) => (b.at || 0) - (a.at || 0));
  const scored = rows.filter((r) => r.accuracy !== null);
  const avg = scored.length ? Math.round(scored.reduce((n, r) => n + r.accuracy, 0) / scored.length) : null;

  const bands = Object.fromEntries(BANDS.map((b) => [b.key, 0]));
  scored.forEach((r) => (bands[bandOf(r.accuracy).key] += 1));

  const byDept = {};
  rows.forEach((r) => {
    const d = (byDept[r.dept || '?'] ||= { dk: r.dept || '?', n: 0, sum: 0, scored: 0 });
    d.n += 1;
    if (r.accuracy !== null) {
      d.sum += r.accuracy;
      d.scored += 1;
    }
  });
  const depts = Object.values(byDept)
    .map((d) => ({ ...d, avg: d.scored ? Math.round(d.sum / d.scored) : null }))
    .sort((a, b) => b.n - a.n);

  const missed = {};
  const wrong = {};
  rows.forEach((r) => {
    (r.miss || []).forEach((c) => (missed[c] = (missed[c] || 0) + 1));
    (r.wrong || []).forEach(([code, fix]) => {
      const k = code + '|' + (fix || '');
      wrong[k] = (wrong[k] || 0) + 1;
    });
  });

  return { rows, avg, bands, depts, scoredCount: scored.length, topMissed: top(missed, 8), topWrong: top(wrong, 8), lastAt: rows[0]?.at };
}

const CHART_COLUMNS = [
  { key: 'id', header: 'Chart', sortable: true, render: (r) => <b className="pf-id">{r.id}</b> },
  { key: 'dept', header: 'Department', sortable: true, sortValue: (r) => deptName(r.dept), render: (r) => deptName(r.dept) },
  { key: 'at', header: 'Submitted', sortable: true, sortValue: (r) => r.at || 0, render: (r) => fmtDate(r.at) },
  { key: 'correct', header: 'Codes', align: 'right', render: (r) => (r.total ? (r.correct || 0) + ' / ' + r.total : '—') },
  {
    key: 'accuracy',
    header: 'Accuracy',
    align: 'right',
    sortable: true,
    sortValue: (r) => (r.accuracy === null ? -1 : r.accuracy),
    render: (r) => (r.accuracy === null ? '—' : <span className={'pf-pill ' + bandOf(r.accuracy).tone}>{r.accuracy + '%'}</span>),
  },
];

function CodeCount({ items, render, empty }) {
  if (!items.length) return <p className="pf-none">{empty}</p>;
  const max = items[0][1];
  return (
    <ul className="pf-codes">
      {items.map(([k, n]) => (
        <li key={k}>
          <span className="pf-code-label">{render(k)}</span>
          <span className="pf-count">
            <i style={{ width: (n / max) * 100 + '%' }} />
          </span>
          <b>{n + '×'}</b>
        </li>
      ))}
    </ul>
  );
}

export function AdminPerformance({ student, onClose }) {
  const s = useMemo(() => summarize(student.results), [student.results]);
  const total = s.rows.length;

  return (
    <Modal
      size="xl"
      title={student.name}
      subtitle={student.id + (student.email ? ' · ' + student.email : '')}
      icon={<Avatar name={student.name} />}
      onClose={onClose}
    >
      {total === 0 ? (
        <div className="pf-empty">
          <i className={'bi ' + (student.progressError ? 'bi-exclamation-triangle' : 'bi-hourglass-split')} aria-hidden="true" />
          <h3>{student.progressError ? 'Progress could not be read' : 'No charts submitted yet'}</h3>
          <p>
            {student.progressError
              ? 'Reading this student’s progress failed (' + student.progressError + '). Try Refresh list.'
              : 'Results appear here as soon as the student submits their first chart.'}
          </p>
        </div>
      ) : (
        <>
          {/* summary */}
          <section className="pf-summary">
            <div className="pf-ring">
              <ProgressRing value={s.avg} tone={s.avg === null ? '' : accTone(s.avg)} size={96} stroke={9} label="accuracy" />
            </div>
            <dl className="pf-kpis">
              <div>
                <dt>Charts done</dt>
                <dd>{total.toLocaleString()}</dd>
              </div>
              <div>
                <dt>Departments</dt>
                <dd>{s.depts.length}</dd>
              </div>
              <div>
                <dt>Last submitted</dt>
                <dd className="sm">{fmtDate(s.lastAt)}</dd>
              </div>
            </dl>
            <div className="pf-bands">
              <div className="pf-bands-bar" aria-hidden="true">
                {BANDS.map((b) => (s.bands[b.key] ? <span key={b.key} className={b.tone} style={{ width: (s.bands[b.key] / s.scoredCount) * 100 + '%' }} /> : null))}
              </div>
              <ul>
                {BANDS.map((b) => (
                  <li key={b.key}>
                    <i className={b.tone} />
                    {b.label}
                    <b>{s.bands[b.key]}</b>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* departments */}
          <section className="pf-section">
            <h3>By department</h3>
            <div className="pf-depts">
              {s.depts.map((d) => (
                <div key={d.dk} className="pf-dept">
                  <span className="pf-dept-ico">
                    <DeptIcon dept={d.dk} />
                  </span>
                  <div className="pf-dept-main">
                    <div className="pf-dept-top">
                      <b>{deptName(d.dk)}</b>
                      <span>{d.n + (d.n === 1 ? ' chart' : ' charts')}</span>
                    </div>
                    <div className="pf-meter">
                      <i className={d.avg === null ? '' : accTone(d.avg)} style={{ width: (d.avg || 0) + '%' }} />
                    </div>
                  </div>
                  <b className={'pf-dept-avg ' + (d.avg === null ? '' : accTone(d.avg))}>{d.avg === null ? '—' : d.avg + '%'}</b>
                </div>
              ))}
            </div>
          </section>

          {/* mistakes */}
          <section className="pf-section">
            <h3>Where they lose marks</h3>
            <div className="pf-mistakes">
              <div className="pf-box">
                <h4>
                  <i className="bi bi-dash-circle" aria-hidden="true" /> Most often missed
                </h4>
                <CodeCount items={s.topMissed} empty="No missed codes recorded." render={(c) => <code>{c}</code>} />
              </div>
              <div className="pf-box">
                <h4>
                  <i className="bi bi-arrow-left-right" aria-hidden="true" /> Coded incorrectly
                </h4>
                <CodeCount
                  items={s.topWrong}
                  empty="No incorrect codes recorded."
                  render={(k) => {
                    const [code, fix] = k.split('|');
                    return (
                      <>
                        <code className="bad">{code}</code>
                        {fix ? (
                          <>
                            <i className="bi bi-arrow-right" aria-label="should be" />
                            <code>{fix}</code>
                          </>
                        ) : null}
                      </>
                    );
                  }}
                />
              </div>
            </div>
          </section>

          {/* charts */}
          <section className="pf-section">
            <h3>Chart by chart</h3>
            <DataTable columns={CHART_COLUMNS} data={s.rows} rowKey="id" itemLabel="charts" defaultPageSize={8} pageSizeOptions={[8, 25, 50]} />
          </section>
        </>
      )}
    </Modal>
  );
}
