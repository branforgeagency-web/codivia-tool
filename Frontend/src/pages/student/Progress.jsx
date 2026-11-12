import { useEffect, useState } from 'react';
import { DeptProgressCard } from '../../components/progress/DeptProgressCard.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { PageLoader } from '../../components/ui/PageLoader.jsx';
import { ProgressRing } from '../../components/ui/ProgressRing.jsx';
import { StatTile, StatTiles } from '../../components/ui/StatTile.jsx';
import { CERT_THRESHOLD } from '../../config/constants.js';
import { usePagination } from '../../hooks/usePagination.js';
import { get } from '../../services/apiHelper.js';
import { MY_PROGRESS } from '../../services/endpoints.js';
import { accTone } from '../../utils/progress.js';

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
export function ProgressView() {
  const [filter, setFilter] = useState('all');
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadAttempt, setLoadAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    get(MY_PROGRESS, { params: { status: filter } })
      .then((data) => {
        if (active) setProgress(data);
      })
      .catch((e) => {
        if (active) setError(e.message || 'Could not load your progress.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [filter, loadAttempt]);

  const rows = progress?.status === filter ? progress.results : [];
  const summary = progress?.summary || {};
  const filters = progress?.filters || [];
  const pager = usePagination(rows, { pageSize: PAGE_SIZE, resetKey: filter });
  const hasWork = summary.totalWorked > 0;

  const tiles = [
    ['files', 'Total Worked', summary.totalWorked || 0, 'charts submitted'],
    ['target', 'Overall Accuracy', hasWork ? summary.overallAvg + '%' : '—', 'audited average'],
    ['grid', 'Departments Started', (summary.started || 0) + ' / ' + (summary.departments || 0), 'with at least one chart'],
    ['award', 'Certificates', summary.certified || 0, CERT_THRESHOLD + ' charts per department'],
  ];

  if (loading && !progress) return <PageLoader label="Loading your progress" />;
  if (error && !progress) {
    return (
      <div className="page pg">
        <div className="cvx-msg err" role="alert">
          {error}{' '}
          <button type="button" onClick={() => setLoadAttempt((attempt) => attempt + 1)}>
            Retry
          </button>
        </div>
      </div>
    );
  }

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
            value={hasWork ? summary.overallAvg : null}
            tone={hasWork ? accTone(summary.overallAvg) : ''}
            size={104}
            stroke={10}
            label="Overall"
          />
        </div>
      </header>

      <StatTiles>
        {tiles.map(([ico, k, v, s], i) => (
          <StatTile key={k} lead={i === 0} icon={ICON[ico]} label={k} value={v} caption={s} />
        ))}
      </StatTiles>

      <div className="pg-section">
        <div>
          <h2>Department Breakdown</h2>
          <p>Certified departments first, then the ones you have worked most.</p>
        </div>
        {(summary.departments || 0) > 0 && (
          <div className="pg-filters" role="tablist" aria-label="Filter departments">
            {filters.map(({ key, label, count }) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={filter === key}
                className={filter === key ? 'on' : ''}
                onClick={() => setFilter(key)}
              >
                {label}
                <span>{count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <PageLoader variant="inline" label="Updating departments" />
      ) : error ? (
        <div className="cvx-msg err" role="alert">
          {error}{' '}
          <button type="button" onClick={() => setLoadAttempt((attempt) => attempt + 1)}>
            Retry
          </button>
        </div>
      ) : !(summary.departments || 0) ? (
        <EmptyState
          title="No departments assigned yet"
          text="Once your instructor assigns departments, your progress shows up here."
        />
      ) : !rows.length ? (
        <EmptyState title="No departments here" text="Nothing matches this filter yet." />
      ) : (
        <>
          <div className="pg-grid">
            {pager.items.map((department) => (
              <DeptProgressCard
                key={department.key}
                deptKey={department.key}
                name={department.name}
                stats={department}
              />
            ))}
          </div>
          <Pagination {...pager.props} itemLabel="departments" />
        </>
      )}
    </div>
  );
}

// route: /progress
export default function ProgressPage() {
  return <ProgressView />;
}
