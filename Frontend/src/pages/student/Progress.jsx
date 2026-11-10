import { useMemo, useState } from 'react';
import { DeptProgressCard } from '../../components/progress/DeptProgressCard.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { ProgressRing } from '../../components/ui/ProgressRing.jsx';
import { CERT_THRESHOLD, DEPTS } from '../../config/constants.js';
import { useStudent } from '../../context/StudentContext.jsx';
import { usePagination } from '../../hooks/usePagination.js';
import { accTone, DEPT_STATUS, deptStatus } from '../../utils/progress.js';

// ---- My Progress. Styles: .pg-* (page), .dp-* (card), .pager-* (pagination) in styles/refinements.css ----

const PAGE_SIZE = 6;

const Icon = ({ d, size = 18 }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden={true}
  >
    <path d={d} />
  </svg>
);

const ICON = {
  files: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h4',
  target: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
  award: 'M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM8.2 13.9 7 22l5-3 5 3-1.2-8.1',
  inbox: 'M22 12h-6l-2 3h-4l-2-3H2M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z',
};

const FILTERS = [['all', 'All'], ...Object.entries(DEPT_STATUS)];

function EmptyState({ title, text }) {
  return (
    <div className="pg-empty">
      <span>
        <Icon d={ICON.inbox} size={24} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

// ---- Progress view ----
export function ProgressView({ stats }) {
  const [filter, setFilter] = useState('all');

  // Only departments that have charts are tracked in stats.perDept.
  // Certified first, then most worked, then name.
  const rows = useMemo(
    () =>
      Object.entries(stats.perDept)
        .filter(([dk]) => DEPTS[dk])
        .map(([dk, st]) => ({ dk, name: DEPTS[dk].name, st, status: deptStatus(st).key }))
        .sort(
          (a, b) =>
            b.st.certified - a.st.certified || b.st.worked - a.st.worked || a.name.localeCompare(b.name),
        ),
    [stats.perDept],
  );
  const shown = useMemo(
    () => (filter === 'all' ? rows : rows.filter((r) => r.status === filter)),
    [rows, filter],
  );
  const pager = usePagination(shown, { pageSize: PAGE_SIZE, resetKey: filter });

  const certCount = rows.filter((r) => r.st.certified).length;
  const started = rows.filter((r) => r.st.worked > 0).length;
  const counts = Object.fromEntries(
    FILTERS.map(([k]) => [k, k === 'all' ? rows.length : rows.filter((r) => r.status === k).length]),
  );
  const hasWork = stats.totalWorked > 0;

  const tiles = [
    ['files', 'Total Worked', stats.totalWorked, 'charts submitted'],
    ['target', 'Overall Accuracy', hasWork ? stats.overallAvg + '%' : '—', 'audited average'],
    ['grid', 'Departments Started', started + ' / ' + rows.length, 'with at least one chart'],
    ['award', 'Certificates', certCount, CERT_THRESHOLD + ' charts per department'],
  ];

  return (
    <div className="pg">
      <header className="pg-hero">
        <div className="pg-hero-main">
          <div>
            <h1>My Progress</h1>
            <p>Your coding accuracy by department. These numbers feed your certificate and resume.</p>
          </div>
        </div>
        <div className="pg-score">
          <ProgressRing
            value={hasWork ? stats.overallAvg : null}
            tone={hasWork ? accTone(stats.overallAvg) : ''}
            size={104}
            stroke={10}
            label="Overall"
          />
        </div>
      </header>

      <div className="pg-tiles">
        {tiles.map(([ico, k, v, s], i) => (
          <div key={k} className={'pg-tile' + (i === 0 ? ' lead' : '')}>
            <span className="pg-tile-ico">
              <Icon d={ICON[ico]} />
            </span>
            <div>
              <span className="k">{k}</span>
              <b className="v">{v}</b>
              <span className="s">{s}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="pg-section">
        <div>
          <h2>Department Breakdown</h2>
          <p>Certified departments first, then the ones you have worked most.</p>
        </div>
        {rows.length > 0 && (
          <div className="pg-filters" role="tablist" aria-label="Filter departments">
            {FILTERS.map(([k, lbl]) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={filter === k}
                className={filter === k ? 'on' : ''}
                onClick={() => setFilter(k)}
              >
                {lbl}
                <span>{counts[k]}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {!rows.length ? (
        <EmptyState
          title="No departments assigned yet"
          text="Once your instructor assigns departments, your progress shows up here."
        />
      ) : !shown.length ? (
        <EmptyState title="No departments here" text="Nothing matches this filter yet." />
      ) : (
        <>
          <div className="pg-grid">
            {pager.items.map((r) => (
              <DeptProgressCard key={r.dk} deptKey={r.dk} name={r.name} stats={r.st} />
            ))}
          </div>
          <Pagination {...pager.props} itemLabel="departments" pageSizeOptions={[6, 12, 24]} />
        </>
      )}
    </div>
  );
}

// route: /progress
export default function ProgressPage() {
  const { stats } = useStudent();
  return <ProgressView stats={stats} />;
}
