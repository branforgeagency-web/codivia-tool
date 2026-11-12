import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DeptChartCard } from '../../components/charts/DeptChartCard.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { StatCard } from '../../components/ui/StatCard.jsx';
import { PageLoader } from '../../components/ui/PageLoader.jsx';
import { NavIcon } from '../../components/ui/NavIcon.jsx';
import { useStudent } from '../../context/StudentContext.jsx';
import { useApiList } from '../../hooks/useApiList.js';
import { useDebounced } from '../../hooks/useDebounced.js';
import { deptQueuePath } from '../../routes/paths.js';
import { MY_CHARTS } from '../../services/endpoints.js';

// Data: GET /my-charts — department cards 10 per page, status tabs + search on the server,
// statistics for the stat tiles. Each card is the DeptChartCard shape: { key, name, group, elements,
// assigned, worked, avg, remaining, percent, range, status }.
export function DeptSelect({ reloadKey, onSelect }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const search = useDebounced(query.trim());
  const list = useApiList(MY_CHARTS, { params: { status: filter, search }, reloadKey });

  if (list.error && !list.data) {
    return (
      <div className="charts-empty" role="alert">
        <NavIcon name="charts" />
        <h2>Couldn't load your charts</h2>
        <p>{list.error}</p>
        <button className="btn btn-ghost" onClick={list.reload}>
          Try again
        </button>
      </div>
    );
  }
  if (!list.data) return <PageLoader label="Loading your charts" />;

  const { assigned, worked, departments } = list.data.statistics;
  return (
    <div className="my-charts">
      <div className="page-head">
        <div className="charts-eyebrow">Your practice workspace</div>
        <h1>My Charts</h1>
        <p>Choose a department, pick up a chart, and build your coding confidence.</p>
      </div>
      <div className="stat-row">
        <StatCard k="Allocated charts" v={assigned} s="ready in your workspace" />
        <StatCard k="Worked" v={worked} s="across your departments" teal />
        <StatCard k="Remaining" v={Math.max(0, assigned - worked)} s="charts still to explore" />
        <StatCard k="Departments" v={departments} s="allocated to you" />
      </div>
      {departments > 0 ? (
        <>
          <div className="charts-section-head">
            <div>
              <h2>Your departments</h2>
              <p>Track your progress and continue where you left off.</p>
            </div>
            <label className="charts-search">
              <NavIcon name="findcode" />
              <span className="sr-only">Search departments</span>
              <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search departments…" />
            </label>
          </div>
          <div className="charts-filters" role="group" aria-label="Filter departments by progress">
            {list.data.filters.map((f) => (
              <button key={f.key} type="button" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
                {f.label}
                <span>{f.count}</span>
              </button>
            ))}
          </div>
          <p className="charts-result-count" role="status">
            Showing {list.results.length} of {list.total} departments
          </p>
          <div className="charts-departments">
            {list.results.map((d) => (
              <DeptChartCard key={d.key} dept={d} onOpen={onSelect} />
            ))}
          </div>
          <Pagination {...list.pagerProps} itemLabel="departments" />
          {!list.total && (
            <div className="charts-empty">
              <NavIcon name="findcode" />
              <h3>No departments found</h3>
              <p>Try another search or show all departments.</p>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setQuery('');
                  setFilter('all');
                }}
              >
                Clear filters
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="charts-empty">
          <NavIcon name="charts" />
          <h2>Your charts will appear here</h2>
          <p>Your trainer will allocate departments to your account. Once assigned, you can start coding and track your progress here.</p>
        </div>
      )}
    </div>
  );
}

export default function MyChartsPage() {
  const navigate = useNavigate();
  const { results } = useStudent();
  // Reload after a chart is submitted, so worked / remaining stay current.
  return <DeptSelect reloadKey={Object.keys(results).length} onSelect={(key) => navigate(deptQueuePath(key))} />;
}
