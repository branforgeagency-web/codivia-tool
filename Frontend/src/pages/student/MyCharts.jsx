import { DeptIcon } from '../../components/ui/DeptIcon.jsx';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ElementTiles } from '../../components/ui/ElementTiles.jsx';
import { StatCard } from '../../components/ui/StatCard.jsx';
import { NavIcon } from '../../components/ui/NavIcon.jsx';
import { DEPTS } from '../../config/constants.js';
import { allocCount, allocRange, deptHasCharts } from '../../utils/allocation.js';
import { useStudent } from '../../context/StudentContext.jsx';
import { deptQueuePath } from '../../routes/paths.js';

export function DeptSelect({ stu, stats, onSelect }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const departments = Object.entries(stu.depts || {})
    .filter(([key]) => DEPTS[key] && deptHasCharts(key))
    .map(([key, allocation]) => {
      const pool = window.CHART_DATA[key].length;
      const assigned = allocCount(allocation, pool);
      const progress = stats.perDept[key] || { worked: 0, avg: 0 };
      const worked = Math.min(assigned, progress.worked);
      return { key, ...DEPTS[key], assigned, worked, avg: progress.avg,
        remaining: assigned - worked, range: allocRange(allocation, pool),
        percent: assigned ? Math.round(worked / assigned * 100) : 0,
        status: assigned > 0 && worked === assigned ? 'complete' : worked ? 'active' : 'new' };
    });
  const assigned = departments.reduce((total, d) => total + d.assigned, 0);
  const worked = departments.reduce((total, d) => total + d.worked, 0);
  const filters = [['all', 'All departments'], ['active', 'In progress'], ['new', 'Not started'], ['complete', 'Completed']];
  const visible = departments.filter(d => (filter === 'all' || d.status === filter) &&
    (d.name + ' ' + d.key).toLowerCase().includes(query.trim().toLowerCase()));
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
          {visible.map(d => <article key={d.key} className="chart-department">
            <div className="chart-department-top"><div className="chart-department-title"><span className="chart-department-icon" aria-hidden="true"><DeptIcon dept={d.key} /></span><h3>{d.name}</h3></div>
              <span className={'chart-status ' + d.status}>{d.status === 'complete' ? 'Completed' : d.status === 'active' ? 'In progress' : 'Not started'}</span>
            </div>
            <ElementTiles dept={d} setting={d.group === 'setting'} />
            <div className="chart-progress-label"><span>{d.worked} <span>of {d.assigned} worked</span></span><b>{d.percent}%</b></div>
            <progress className="chart-progress" value={d.worked} max={d.assigned || 1} aria-label={d.name + ' chart progress'} />
            <div className="chart-department-details"><span>{d.remaining} remaining</span><span>{d.worked ? d.avg + '% avg accuracy' : 'Your next challenge'}</span></div>
            <div className="chart-department-footer"><span>{d.range ? `Charts ${d.range.start}–${d.range.end}` : 'No charts assigned'}</span>
              <button type="button" className={'btn ' + (d.status === 'complete' ? 'btn-ghost' : 'btn-teal')} onClick={() => onSelect(d.key)} aria-label={'Open ' + d.name + ' charts'}>
                {d.status === 'complete' ? 'Review charts' : d.worked ? 'Continue coding' : 'Start coding'} <span aria-hidden="true">→</span>
              </button>
            </div>
          </article>)}
        </div>
        {!visible.length && <div className="charts-empty"><NavIcon name="findcode" /><h3>No departments found</h3><p>Try another search or show all departments.</p>
          <button className="btn btn-ghost" onClick={() => { setQuery(''); setFilter('all'); }}>Clear filters</button></div>}
      </> : <div className="charts-empty"><NavIcon name="charts" /><h2>Your charts will appear here</h2><p>Your trainer will allocate departments to your account. Once assigned, you can start coding and track your progress here.</p></div>}
    </div>
  );
}

export default function MyChartsPage() {
  const { stu, stats } = useStudent();
  const navigate = useNavigate();
  return <DeptSelect stu={stu} stats={stats} onSelect={key => navigate(deptQueuePath(key))} />;
}
