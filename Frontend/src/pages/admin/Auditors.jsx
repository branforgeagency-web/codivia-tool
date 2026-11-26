import { useState } from 'react';
import { AuditorCard } from '../../components/admin/AuditorCard.jsx';
import { PageLoader } from '../../components/ui/PageLoader.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { StatTile, StatTiles } from '../../components/ui/StatTile.jsx';
import { useApiList } from '../../hooks/useApiList.js';
import { useDebounced } from '../../hooks/useDebounced.js';
import { ADMIN_AUDITORS } from '../../services/endpoints.js';

// ---- Admin: Users page → Auditors tab. Same layout as the Students tab (Students.jsx).
// Data: GET /admin/auditors — 10 cards per page; search, status tabs and statistics from the server. ----

const ICON = {
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  link: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
  check: 'M20 6 9 17l-5-5',
  clip: 'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M9 2h6v4H9z',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
  inbox: 'M22 12h-6l-2 3h-4l-2-3H2M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z',
  refresh: 'M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6',
  userPlus: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM19 8v6M22 11h-6',
};

const Svg = ({ d, size = 18 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden={true}>
    <path d={d} />
  </svg>
);

export function AdminAuditors({ tabs, reloadKey, onRefresh, onAdd, onAssign, onEdit, onToggleStatus }) {
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const search = useDebounced(query.trim());
  const list = useApiList(ADMIN_AUDITORS, { params: { status: filter, search }, reloadKey });
  const stats = (list.data && list.data.statistics) || { auditors: 0, assigned: 0, assignments: 0, completed: 0, disabled: 0 };
  const filters = (list.data && list.data.filters) || [{ key: 'all', label: 'All auditors', count: 0 }];

  return (
    <div className="ad">
      <div className="page-head sc-head">
        <div>
          <h1>Users</h1>
          <p>Auditors review the submitted charts of the students you assign to them, per department, and can adjust the score.</p>
          {tabs}
        </div>
        <div className="sc-head-acts">
          <button type="button" className="sc-ghost" onClick={onRefresh} disabled={list.loading}>
            <Svg d={ICON.refresh} size={16} /> {list.loading ? 'Refreshing…' : 'Refresh'}
          </button>
          <button type="button" className="dc-action" onClick={onAdd}>
            <Svg d={ICON.userPlus} size={16} /> Add user
          </button>
        </div>
      </div>

      <StatTiles>
        <StatTile lead icon={ICON.users} label="Auditors" value={stats.auditors} caption={stats.disabled ? stats.disabled + ' disabled' : 'accounts'} />
        <StatTile icon={ICON.link} label="Assigned" value={stats.assigned} caption="auditors with students" />
        <StatTile icon={ICON.clip} label="Assignments" value={stats.assignments.toLocaleString()} caption="student × department" />
        <StatTile icon={ICON.check} label="Charts Audited" value={stats.completed.toLocaleString()} caption="completed audits" />
      </StatTiles>

      <div className="ad-toolbar">
        <div className="pg-filters" role="tablist" aria-label="Auditor status">
          {filters.map((f) => (
            <button key={f.key} type="button" role="tab" aria-selected={filter === f.key} className={filter === f.key ? 'on' : ''} onClick={() => setFilter(f.key)}>
              {f.label}
              <span>{f.count}</span>
            </button>
          ))}
        </div>
        <label className="ad-search">
          <Svg d={ICON.search} size={16} />
          <span className="sr-only">Search auditors</span>
          <input type="search" value={query} onChange={(ev) => setQuery(ev.target.value)} placeholder="Search name or email…" />
        </label>
      </div>

      {list.error ? (
        <div className="cvx-msg err" role="alert">
          {list.error}
        </div>
      ) : !list.data ? (
        <PageLoader variant="inline" label="Loading auditors" />
      ) : list.results.length ? (
        <>
          <div className="ad-grid">
            {list.results.map((a) => (
              <AuditorCard key={a.uid} auditor={a} onAssign={onAssign} onEdit={onEdit} onToggleStatus={onToggleStatus} />
            ))}
          </div>
          <Pagination {...list.pagerProps} itemLabel="auditors" />
        </>
      ) : (
        <div className="pg-empty">
          <span>
            <Svg d={ICON.inbox} size={24} />
          </span>
          {stats.auditors === 0 ? (
            <>
              <h3>No auditors yet</h3>
              <p>Add an auditor with “Add user”, then assign students to them per department.</p>
              <button type="button" className="dc-action" onClick={onAdd} style={{ marginTop: 12 }}>
                <Svg d={ICON.userPlus} size={16} /> Add user
              </button>
            </>
          ) : (
            <>
              <h3>No auditors found</h3>
              <p>Try another search or switch the filter.</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
