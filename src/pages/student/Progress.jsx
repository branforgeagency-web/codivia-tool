import { StatCard } from '../../components/ui/StatCard.jsx';
import { CERT_THRESHOLD, DEPTS } from '../../config/constants.js';
import { useStudent } from '../../context/StudentContext.jsx';

// ---- Progress view ----
export function ProgressView({ stu, stats }) {
  return (
    <div>
      <div className="page-head">
        <h1>My Progress</h1>
        <p>Your coding accuracy by department. These numbers feed your certificate and resume.</p>
      </div>
      <div className="stat-row">
        <StatCard k="Total Worked" v={stats.totalWorked} teal={true} />
        <StatCard k="Overall Accuracy" v={stats.overallAvg + '%'} />
      </div>
      <div className="card">
        <div className="card-h">
          <h3>Department Breakdown</h3>
        </div>
        <div style={{ padding: '6px 16px 14px' }}>
          {Object.entries(stu.depts).map(([dk, alloc]) => {
            const d = DEPTS[dk];
            const st = stats.perDept[dk];
            const pctToCert = Math.min(100, Math.round((st.worked / CERT_THRESHOLD) * 100));
            return (
              <div
                key={dk}
                style={{ padding: '14px 0', borderBottom: '1px solid var(--line-soft)' }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 8,
                  }}
                >
                  <span style={{ fontWeight: 700 }}>{d.icon + ' ' + d.name}</span>
                  <span className={'acc ' + (st.avg >= 90 ? 'hi' : st.avg >= 75 ? 'mid' : 'lo')}>
                    {st.worked > 0 ? st.avg + '%' : '—'}
                  </span>
                </div>
                <div
                  style={{
                    height: 8,
                    background: 'var(--line-soft)',
                    borderRadius: 4,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: pctToCert + '%',
                      background: st.certified ? 'var(--ok)' : 'var(--teal)',
                    }}
                  />
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 5 }}>
                  {st.worked +
                    ' / ' +
                    CERT_THRESHOLD +
                    ' charts toward certificate' +
                    (st.certified ? ' · ✓ unlocked' : '')}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// route: /progress
export default function ProgressPage() {
  const { stu, stats } = useStudent();
  return <ProgressView stu={stu} stats={stats} />;
}
