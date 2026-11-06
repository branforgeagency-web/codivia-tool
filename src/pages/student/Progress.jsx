import { StatCard } from '../../components/ui/StatCard.jsx';
import { CERT_THRESHOLD, DEPTS } from '../../config/constants.js';
import { useStudent } from '../../context/StudentContext.jsx';

const accTone = (avg) => (avg >= 90 ? 'hi' : avg >= 75 ? 'mid' : 'lo');

function statusOf(st) {
  if (st.certified) return { key: 'complete', label: 'Certified' };
  if (st.worked > 0) return { key: 'active', label: 'In progress' };
  return { key: '', label: 'Not started' };
}

// One department: accuracy, progress toward its certificate, what is left.
function DeptProgressCard({ dept, st }) {
  const status = statusOf(st);
  const pct = Math.min(100, Math.round((st.worked / CERT_THRESHOLD) * 100));
  const left = Math.max(0, CERT_THRESHOLD - st.worked);
  return (
    <article className={'chart-department progress-card' + (st.certified ? ' certified' : '')}>
      <div className="chart-department-top progress-card-top">
        <h3>{dept.name}</h3>
        <span className={'chart-status ' + status.key}>{status.label}</span>
      </div>

      <div className="progress-card-metrics">
        <div>
          <div className={'progress-card-num' + (st.worked > 0 ? ' acc ' + accTone(st.avg) : '')}>
            {st.worked > 0 ? st.avg + '%' : '—'}
          </div>
          <div className="progress-card-k">Accuracy</div>
        </div>
        <div>
          <div className="progress-card-num">{st.worked}</div>
          <div className="progress-card-k">Charts worked</div>
        </div>
      </div>

      <div className="chart-progress-label">
        <span>
          Certificate <span>· {st.worked + ' / ' + CERT_THRESHOLD}</span>
        </span>
        <b>{pct}%</b>
      </div>
      <progress
        className={'chart-progress' + (st.certified ? ' done' : '')}
        max={100}
        value={pct}
        aria-label={dept.name + ' certificate progress'}
      />
      <div className="progress-card-foot">
        {st.certified
          ? 'Counts toward your certificate and resume.'
          : left + ' more chart' + (left === 1 ? '' : 's') + ' to unlock the certificate'}
      </div>
    </article>
  );
}

// ---- Progress view ----
export function ProgressView({ stats }) {
  // Only departments that have charts are tracked in stats.perDept.
  const rows = Object.entries(stats.perDept)
    .filter(([dk]) => DEPTS[dk])
    .map(([dk, st]) => ({ dk, dept: DEPTS[dk], st }))
    // certified first, then most worked, then name
    .sort(
      (a, b) =>
        b.st.certified - a.st.certified ||
        b.st.worked - a.st.worked ||
        a.dept.name.localeCompare(b.dept.name),
    );
  const certCount = rows.filter((r) => r.st.certified).length;
  const started = rows.filter((r) => r.st.worked > 0).length;

  return (
    <div>
      <div className="page-head">
        <h1>My Progress</h1>
        <p>Your coding accuracy by department. These numbers feed your certificate and resume.</p>
      </div>
      <div className="stat-row">
        <StatCard k="Total Worked" v={stats.totalWorked} teal={true} />
        <StatCard
          k="Overall Accuracy"
          v={stats.totalWorked > 0 ? stats.overallAvg + '%' : '—'}
        />
        <StatCard k="Departments Started" v={started + ' / ' + rows.length} />
        <StatCard k="Certificates" v={certCount} s={CERT_THRESHOLD + ' charts per department'} />
      </div>

      <div className="charts-section-head">
        <div>
          <h2>Department Breakdown</h2>
          <p>Certified departments first, then the ones you have worked most.</p>
        </div>
      </div>

      {rows.length ? (
        <div className="charts-departments">
          {rows.map((r) => (
            <DeptProgressCard key={r.dk} dept={r.dept} st={r.st} />
          ))}
        </div>
      ) : (
        <div className="charts-empty">
          <h3>No departments assigned yet</h3>
          <p>Once your instructor assigns departments, your progress shows up here.</p>
        </div>
      )}
    </div>
  );
}

// route: /progress
export default function ProgressPage() {
  const { stats } = useStudent();
  return <ProgressView stats={stats} />;
}
