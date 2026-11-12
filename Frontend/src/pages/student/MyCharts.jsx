import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DeptChartCard } from '../../components/charts/DeptChartCard.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { StatCard } from '../../components/ui/StatCard.jsx';
import { PageLoader } from '../../components/ui/PageLoader.jsx';
import { usePagination } from '../../hooks/usePagination.js';
import { NavIcon } from '../../components/ui/NavIcon.jsx';
import { deptQueuePath } from '../../routes/paths.js';
import { get } from '../../services/apiHelper.js';
import { MY_CHARTS } from '../../services/endpoints.js';

// Data: GET /my-charts -> { results: [card], statistics: { assigned, worked, remaining, departments } }.
// Each card is the DeptChartCard shape: { key, name, group, elements, assigned, worked, avg,
// remaining, percent, range, status }. Search / filter / paging stay client-side.
export function DeptSelect({ departments, statistics, onSelect }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const { assigned, worked } = statistics;
  const filters = [['all', 'All departments'], ['active', 'In progress'], ['new', 'Not started'], ['complete', 'Completed']];
  const visible = departments.filter(d => (filter === 'all' || d.status === filter) &&
    (d.name + ' ' + d.key).toLowerCase().includes(query.trim().toLowerCase()));
  // Back to page 1 whenever the filter or search changes.
  const pager = usePagination(visible, { pageSize: 8, resetKey: filter + '|' + query.trim().toLowerCase() });
  return (
    <div className="my-charts">
      <div className="page-head"><div className="charts-eyebrow">Your practice workspace</div>
        <h1>My Charts</h1><p>Choose a department, pick up a chart, and build your coding confidence.</p>
      </div>
      <div className="stat-row">
        <StatCard k="Allocated charts" v={assigned} s="ready in your workspace" />
        <StatCard k="Worked" v={worked} s="across your departments" teal />
        <StatCard k="Remaining" v={Math.max(0, assigned - worked)} s="charts still to explore" />
        <StatCard k="Departments" v={departments.length} s="allocated to you" />
      </div>
      {departments.length > 0 ? <>
        <div className="charts-section-head"><div><h2>Your departments</h2><p>Track your progress and continue where you left off.</p></div>
          <label className="charts-search"><NavIcon name="findcode" /><span className="sr-only">Search departments</span>
            <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search departments…" />
          </label>
        </div>
        <div className="charts-filters" role="group" aria-label="Filter departments by progress">
          {filters.map(([value, label]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>
            {label}<span>{value === 'all' ? departments.length : departments.filter(d => d.status === value).length}</span>
          </button>)}
        </div>
        <p className="charts-result-count" role="status">Showing {visible.length} of {departments.length} departments</p>
        <div className="charts-departments">
          {pager.items.map(d => <DeptChartCard key={d.key} dept={d} onOpen={onSelect} />)}
        </div>
        <Pagination {...pager.props} itemLabel="departments" />
        {!visible.length && <div className="charts-empty"><NavIcon name="findcode" /><h3>No departments found</h3><p>Try another search or show all departments.</p>
          <button className="btn btn-ghost" onClick={() => { setQuery(''); setFilter('all'); }}>Clear filters</button></div>}
      </> : <div className="charts-empty"><NavIcon name="charts" /><h2>Your charts will appear here</h2><p>Your trainer will allocate departments to your account. Once assigned, you can start coding and track your progress here.</p></div>}
    </div>
  );
}

export default function MyChartsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null); // { results, statistics }
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setError('');
    setData(null);
    return get(MY_CHARTS)
      .then(setData)
      .catch((e) => {
        console.error('load my charts', e);
        setError(e.message || 'Could not load your charts.');
      });
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <div className="charts-empty" role="alert">
        <NavIcon name="charts" />
        <h2>Couldn't load your charts</h2>
        <p>{error}</p>
        <button className="btn btn-ghost" onClick={load}>Try again</button>
      </div>
    );
  }
  if (!data) return <PageLoader label="Loading your charts" />;
  return (
    <DeptSelect
      departments={data.results}
      statistics={data.statistics}
      onSelect={(key) => navigate(deptQueuePath(key))}
    />
  );
}
