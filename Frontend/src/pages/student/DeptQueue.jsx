import { useState } from 'react';
import { StatCard } from '../../components/ui/StatCard.jsx';
import { DEPTS, ELEMENT_LABELS } from '../../config/constants.js';
import { allocSlice } from '../../utils/allocation.js';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useStudent } from '../../context/StudentContext.jsx';
import { PATHS, coderPath } from '../../routes/paths.js';
import { deptHasCharts } from '../../utils/allocation.js';

export function queueFields(record) {
  const out = { mrn: '', dos: '', dosLabel: '', payer: '', facility: '', ptype: '' };
  if (!record) return out;
  const lines = String(record).split('\n');
  for (let i = 0; i < lines.length && i < 14; i++) {
    const l = lines[i];
    let m;
    if (!out.mrn && (m = l.match(/^MRN:\s*([^\s]+)/))) out.mrn = m[1];
    if (!out.payer && (m = l.match(/^Insurance:\s*(.+)$/))) out.payer = m[1].trim();
    if (!out.facility && (m = l.match(/^Facility:\s*(.+)$/))) out.facility = m[1].trim();
    if (!out.dos && (m = l.match(/^Date of Service:\s*(.+)$/))) out.dos = m[1].trim();
    if (!out.dos && (m = l.match(/^SOC Date:\s*(.+)$/))) {
      out.dos = m[1].trim();
      out.dosLabel = 'Start of care';
    }
    if (!out.dos && (m = l.match(/^Admission Date:\s*(.+)$/))) {
      out.dos = m[1].trim();
      out.dosLabel = 'Admission';
    }
    if (!out.ptype && (m = l.match(/^Patient type:\s*(New patient|Established patient)/i)))
      out.ptype = m[1];
  }
  // a header line may carry a second field after the date (e.g. "Arrival Time: 15:27")
  if (out.dos) {
    const cut = out.dos.match(/^(.*?)\s{2,}[A-Z][A-Za-z ]{2,}:\s*\S/);
    if (cut) out.dos = cut[1].trim();
    else {
      const cut2 = out.dos.match(/^(\S+)\s+[A-Z][A-Za-z ]{2,}:\s*\S/);
      if (cut2) out.dos = cut2[1].trim();
    }
  }
  return out;
}

export function DeptQueue({ dept, stu, results, onBack, onOpen }) {
  const d = DEPTS[dept];
  const pool = (window.CHART_DATA && window.CHART_DATA[dept]) || [];
  // The student works their ALLOCATED slice of the department pool — not the whole
  // pool. Allocation is deterministic (first N) so a student's queue is stable
  // across sessions and matches the number shown on the dashboard.
  // Slice the student's ALLOCATED RANGE of the department pool (e.g. charts
  // 26..50), not just the first N. Backward compatible: a legacy numeric
  // allocation N is treated as range 1..N.
  const [_sA, _sB] = allocSlice(stu.depts && stu.depts[dept], pool.length);
  const charts = pool.slice(_sA, _sB);
  const [shown, setShown] = useState(50);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const filtered = charts.filter(c => status === 'all' || (status === 'worked' ? !!results[c.id] : !results[c.id])).filter((c) => {
        if (!q.trim()) return true;
        const h = queueFields(c.record);
        return (c.id + ' ' + h.mrn + ' ' + h.dos + ' ' + h.payer + ' ' + h.facility)
          .toLowerCase()
          .includes(q.toLowerCase().trim());
      });
  const visible = filtered.slice(0, shown);
  const doneIds = Object.keys(results);
  const workedCount = charts.filter((c) => doneIds.includes(c.id)).length;
  const accs = charts.filter((c) => results[c.id]).map((c) => results[c.id].accuracy);
  const avgAcc = accs.length ? Math.round(accs.reduce((a, b) => a + b, 0) / accs.length) : 0;
  // 'alloc' here is the number of charts allocated to this student in this dept,
  // which is exactly the length of their sliced queue.
  const allocCountForDept = charts.length;
  const pct = allocCountForDept ? Math.round((workedCount / allocCountForDept) * 100) : 0;

  return (
    <div className="chart-queue">
      <button className="backbtn" onClick={onBack}>
        ← All departments
      </button>
      <div className="page-head">
        <h1>{d.icon + ' ' + d.name}</h1>
        <p>
          {allocCountForDept +
            ' charts allocated to you \u00b7 ' +
            (d.elements || []).map((x) => ELEMENT_LABELS[x] || x).join(' \u00b7 ')}
        </p>
      </div>
      <div className="stat-row">
        <StatCard k="Allocated" v={allocCountForDept} s="assigned to you" />
        <StatCard k="Worked" v={workedCount} s="in this allocation" teal={true} />
        <StatCard k="Avg Accuracy" v={(avgAcc || 0) + '%'} s="across worked" />
        <StatCard k="Progress" v={pct + '%'} s="of allocated charts worked" />
      </div>
      <div className="card">
        <div
          className="card-h"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <h3>Your Chart Queue</h3>
          <input
            type="search"
            aria-label="Search chart ID, MRN, date, payer, or facility"
            value={q}
            placeholder="Search MRN, date, payer, facility…"
            style={{
              fontSize: 12,
              padding: '6px 10px',
              border: '1px solid var(--line)',
              borderRadius: 6,
              minWidth: 220,
            }}
            onChange={(ev) => {
              setQ(ev.target.value);
              setShown(50);
            }}
          />
        </div>
        <div className="queue-toolbar">
          <div className="charts-filters" role="group" aria-label="Filter charts by status">
            {[['all', 'All charts', charts.length], ['pending', 'Not started', charts.length - workedCount], ['worked', 'Worked', workedCount]].map(([value, label, count]) =>
              <button type="button" key={value} aria-pressed={status === value} onClick={() => { setStatus(value); setShown(50); }}>{label}<span>{count}</span></button>)}
          </div>
          <span className="charts-result-count" role="status">Showing {visible.length} of {filtered.length} charts</span>
        </div>
        <div className="queue-table-scroll" role="region" aria-label="Chart queue" tabIndex={0}>
        <table>
          <caption className="sr-only">Allocated charts for {d.name}</caption>
          <thead>
            <tr>
              {['MRN', 'Date of Service', 'Insurance', 'Facility', 'Status', 'Action'].map((h) => (
                <th key={h} scope="col">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((c) => {
              const res = results[c.id];
              const h = queueFields(c.record);
              return (
                <tr key={c.id}>
                  <td>
                    <div
                      style={{ fontWeight: 600, fontFamily: "'SF Mono',monospace", fontSize: 12.5 }}
                    >
                      {h.mrn || '\u2014'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                      {c.id}
                      {h.ptype ? (
                        <span
                          style={{
                            marginLeft: 6,
                            fontSize: 9.5,
                            fontWeight: 800,
                            letterSpacing: 0.2,
                            padding: '1px 6px',
                            borderRadius: 4,
                            color: /^new/i.test(h.ptype) ? 'var(--tone-0b6b57)' : 'var(--tone-5a6472)',
                            background: /^new/i.test(h.ptype) ? 'var(--tone-e6f7f2)' : 'var(--tone-eef1f4)',
                            border: '1px solid ' + (/^new/i.test(h.ptype) ? 'var(--tone-a8dfd0)' : 'var(--tone-dfe4ea)'),
                          }}
                        >
                          {/^new/i.test(h.ptype) ? 'NEW' : 'EST'}
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
                    <div style={{ fontSize: 12.5 }}>{h.dos || '\u2014'}</div>
                    {h.dosLabel && (
                      <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>{h.dosLabel}</div>
                    )}
                  </td>
                  <td>
                    <div style={{ fontSize: 12.5 }}>{h.payer || '\u2014'}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: 12.5 }}>{h.facility || '\u2014'}</div>
                  </td>
                  <td>
                    {res ? (
                      <span
                        className={
                          'acc ' + (res.accuracy >= 90 ? 'hi' : res.accuracy >= 75 ? 'mid' : 'lo')
                        }
                      >
                        {res.accuracy + '%'}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--muted)', fontSize: 12 }}>Not started</span>
                    )}
                  </td>
                  <td>
                    <button
                      className={'btn ' + (res ? 'btn-ghost' : 'btn-teal')}
                      onClick={() => onOpen(c)}
                    >
                      {res ? 'Redo' : 'Code it'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
        {shown < filtered.length ? (
          <div style={{ textAlign: 'center', padding: '14px' }}>
            <button className="btn btn-ghost" onClick={() => setShown(shown + 50)}>
              {'Show more (' + (filtered.length - shown) + ' remaining)'}
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div
            style={{ textAlign: 'center', padding: '14px', color: 'var(--muted)', fontSize: 13 }}
          >
            <strong>{charts.length ? 'No matching charts' : 'No charts allocated yet'}</strong>
            <p>{charts.length ? 'Try a different search or status filter.' : 'Your trainer can assign charts to this department.'}</p>
            {charts.length > 0 && <button className="btn btn-ghost" onClick={() => { setQ(''); setStatus('all'); setShown(50); }}>Clear filters</button>}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// route: /charts/:dept — only departments allocated to the student
export default function DeptQueuePage() {
  const { dept } = useParams();
  const { stu, results } = useStudent();
  const navigate = useNavigate();
  if (!(DEPTS[dept] && stu.depts && stu.depts[dept] != null && deptHasCharts(dept))) {
    return <Navigate to={PATHS.charts} replace />;
  }
  return (
    <DeptQueue
      dept={dept}
      stu={stu}
      results={results}
      onBack={() => navigate(PATHS.charts)}
      onOpen={(chart) => navigate(coderPath(dept, chart.id))}
    />
  );
}
