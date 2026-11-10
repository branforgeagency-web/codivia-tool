import { useMemo, useState } from 'react';
import { AdminDeptCard } from '../../components/admin/AdminDeptCard.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { StatTile, StatTiles } from '../../components/ui/StatTile.jsx';
import { DEPTS } from '../../config/constants.js';
import { useAdmin } from '../../context/AdminContext.jsx';
import { usePagination } from '../../hooks/usePagination.js';
import { deptHasCharts } from '../../utils/allocation.js';

// ---- Admin: Departments. Cards: AdminDeptCard (DeptCard shell). Styles: .ad-* / .dc-* in refinements.css ----

const PAGE_SIZE = 9;

const ICON = {
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
  files: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h4',
  share: 'M16 3h5v5M21 3l-7 7M10 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-4',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
  inbox: 'M22 12h-6l-2 3h-4l-2-3H2M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z',
};

const GROUPS = [
  ['all', 'All departments', ''],
  ['specialty', 'Specialty tracks', 'Specialty tracks — by body system.'],
  ['setting', 'Setting domains', 'Setting / type domains — how RCM hires.'],
];

const Svg = ({ d, size = 18 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden={true}>
    <path d={d} />
  </svg>
);

export function AdminDepartments({ students, deptAlloc, onManage }) {
  const [group, setGroup] = useState('all');
  const [query, setQuery] = useState('');

  // Every department with charts, with its pool, allocation and student count.
  const all = useMemo(
    () =>
      Object.entries(DEPTS)
        .filter(([dk]) => deptHasCharts(dk))
        .map(([dk, d]) => ({
          dk,
          dept: d,
          pool: ((window.CHART_DATA && window.CHART_DATA[dk]) || []).length,
          allocated: deptAlloc[dk] || 0,
          students: students.filter((s) => s.depts && s.depts[dk]).length,
        })),
    [students, deptAlloc],
  );

  const q = query.trim().toLowerCase();
  const shown = useMemo(
    () =>
      all.filter(
        (r) =>
          (group === 'all' || r.dept.group === group) &&
          (!q || (r.dept.name + ' ' + r.dk).toLowerCase().includes(q)),
      ),
    [all, group, q],
  );
  const pager = usePagination(shown, { pageSize: PAGE_SIZE, resetKey: group + '|' + q });

  const count = (g) => (g === 'all' ? all.length : all.filter((r) => r.dept.group === g).length);
  const totalPool = all.reduce((n, r) => n + r.pool, 0);
  const totalAllocated = all.reduce((n, r) => n + r.allocated, 0);
  const assignedStudents = students.filter((s) => s.depts && Object.keys(s.depts).length).length;
  const groupNote = GROUPS.find(([g]) => g === group)[2];

  return (
    <div className="ad">
      <div className="page-head">
        <h1>Departments</h1>
        <p>
          {all.length +
            ' active coding departments across two groups — specialty tracks and RCM setting domains. Chart pools vary by department.'}
        </p>
      </div>

      <StatTiles>
        <StatTile
          lead
          icon={ICON.grid}
          label="Departments"
          value={all.length}
          caption={count('specialty') + ' specialty · ' + count('setting') + ' setting'}
        />
        <StatTile icon={ICON.files} label="Chart Pool" value={totalPool.toLocaleString()} caption="charts across all departments" />
        <StatTile
          icon={ICON.share}
          label="Allocated"
          value={totalAllocated.toLocaleString()}
          caption={(totalPool ? Math.round((totalAllocated / totalPool) * 100) : 0) + '% of the pool'}
        />
        <StatTile
          icon={ICON.users}
          label="Students Assigned"
          value={assignedStudents + ' / ' + students.length}
          caption="with at least one department"
        />
      </StatTiles>

      <div className="ad-toolbar">
        <div className="pg-filters" role="tablist" aria-label="Department group">
          {GROUPS.map(([g, label]) => (
            <button
              key={g}
              type="button"
              role="tab"
              aria-selected={group === g}
              className={group === g ? 'on' : ''}
              onClick={() => setGroup(g)}
            >
              {label}
              <span>{count(g)}</span>
            </button>
          ))}
        </div>
        <label className="ad-search">
          <Svg d={ICON.search} size={16} />
          <span className="sr-only">Search departments</span>
          <input
            type="search"
            value={query}
            onChange={(ev) => setQuery(ev.target.value)}
            placeholder="Search by name or key…"
          />
        </label>
      </div>
      {groupNote && <p className="ad-note">{groupNote}</p>}

      {shown.length ? (
        <>
          <div className="ad-grid">
            {pager.items.map((r) => (
              <AdminDeptCard
                key={r.dk}
                deptKey={r.dk}
                dept={r.dept}
                pool={r.pool}
                allocated={r.allocated}
                students={r.students}
                onManage={onManage}
              />
            ))}
          </div>
          <Pagination {...pager.props} itemLabel="departments" />
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
  const { students, deptAlloc, setModal } = useAdmin();
  return (
    <AdminDepartments
      students={students}
      deptAlloc={deptAlloc}
      onManage={(dk) => setModal({ type: 'deptAllocate', dept: dk })}
    />
  );
}
