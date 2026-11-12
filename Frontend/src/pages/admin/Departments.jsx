import { useState } from 'react';
import { AdminDeptCard } from '../../components/admin/AdminDeptCard.jsx';
import { PageLoader } from '../../components/ui/PageLoader.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { StatTile, StatTiles } from '../../components/ui/StatTile.jsx';
import { useAdmin } from '../../context/AdminContext.jsx';
import { useApiList } from '../../hooks/useApiList.js';
import { useDebounced } from '../../hooks/useDebounced.js';
import { ADMIN_DEPARTMENTS } from '../../services/endpoints.js';

// ---- Admin: Departments. Cards: AdminDeptCard (DeptCard shell). Styles: .ad-* / .dc-* in refinements.css ----
// Data: GET /admin/departments — 10 cards per page; group tabs, search and statistics from the server.

const ICON = {
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
  files: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h4',
  share: 'M16 3h5v5M21 3l-7 7M10 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-4',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
  inbox: 'M22 12h-6l-2 3h-4l-2-3H2M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z',
};

// Group notes shown under the tabs (tab labels and counts come from the API).
const GROUP_NOTES = {
  specialty: 'Specialty tracks — by body system.',
  setting: 'Setting / type domains — how RCM hires.',
};

const Svg = ({ d, size = 18 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden={true}>
    <path d={d} />
  </svg>
);

export function AdminDepartments({ reloadKey, onManage }) {
  const [group, setGroup] = useState('all');
  const [query, setQuery] = useState('');
  const search = useDebounced(query.trim());
  const list = useApiList(ADMIN_DEPARTMENTS, { params: { group, search }, reloadKey });
  const stats = list.data && list.data.statistics;
  const filters = (list.data && list.data.filters) || [];

  if (list.error && !list.data) {
    return (
      <div className="cvx-msg err" role="alert">
        {list.error}
      </div>
    );
  }
  if (!stats) return <PageLoader label="Loading departments" />;

  return (
    <div className="ad">
      <div className="page-head">
        <h1>Departments</h1>
        <p>
          {stats.departments +
            ' active coding departments across two groups — specialty tracks and RCM setting domains. Chart pools vary by department.'}
        </p>
      </div>

      <StatTiles>
        <StatTile lead icon={ICON.grid} label="Departments" value={stats.departments} caption={stats.specialty + ' specialty · ' + stats.setting + ' setting'} />
        <StatTile icon={ICON.files} label="Chart Pool" value={stats.chartPool.toLocaleString()} caption="charts across all departments" />
        <StatTile icon={ICON.share} label="Allocated" value={stats.allocated.toLocaleString()} caption={stats.allocatedPercent + '% of the pool'} />
        <StatTile icon={ICON.users} label="Students Assigned" value={stats.studentsAssigned + ' / ' + stats.students} caption="with at least one department" />
      </StatTiles>

      <div className="ad-toolbar">
        <div className="pg-filters" role="tablist" aria-label="Department group">
          {filters.map((f) => (
            <button key={f.key} type="button" role="tab" aria-selected={group === f.key} className={group === f.key ? 'on' : ''} onClick={() => setGroup(f.key)}>
              {f.label}
              <span>{f.count}</span>
            </button>
          ))}
        </div>
        <label className="ad-search">
          <Svg d={ICON.search} size={16} />
          <span className="sr-only">Search departments</span>
          <input type="search" value={query} onChange={(ev) => setQuery(ev.target.value)} placeholder="Search by name or key…" />
        </label>
      </div>
      {GROUP_NOTES[group] && <p className="ad-note">{GROUP_NOTES[group]}</p>}

      {list.results.length ? (
        <>
          <div className="ad-grid">
            {list.results.map((d) => (
              <AdminDeptCard key={d.key} deptKey={d.key} dept={d} pool={d.pool} allocated={d.allocated} students={d.students} onManage={onManage} />
            ))}
          </div>
          <Pagination {...list.pagerProps} itemLabel="departments" />
        </>
      ) : (
        <div className="pg-empty">
          <span>
            <Svg d={ICON.inbox} size={24} />
          </span>
          <h3>No departments found</h3>
          <p>Try another search or switch the group.</p>
        </div>
      )}
    </div>
  );
}

// route: /admin/departments
export default function DepartmentsPage() {
  const { setModal, version } = useAdmin();
  return <AdminDepartments reloadKey={version} onManage={(dk) => setModal({ type: 'deptAllocate', dept: dk })} />;
}
