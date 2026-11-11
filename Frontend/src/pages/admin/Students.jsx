import { useMemo, useState } from 'react';
import { STUDENT_STATUS, StudentCard, studentStatus } from '../../components/admin/StudentCard.jsx';
import { PageLoader } from '../../components/ui/PageLoader.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { StatTile, StatTiles } from '../../components/ui/StatTile.jsx';
import { useAdmin } from '../../context/AdminContext.jsx';
import { usePagination } from '../../hooks/usePagination.js';
import { progressOf } from '../../utils/progress.js';

// ---- Admin: Students. Cards: StudentCard. Styles: .ad-* / .dc-* / .sc-* in refinements.css ----
// Data: AdminContext.students, loaded from Firebase by window.CV_FB.listStudents().

const PAGE_SIZE = 9;

const ICON = {
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  pulse: 'M22 12h-4l-3 9L9 3l-3 9H2',
  check: 'M20 6 9 17l-5-5',
  share: 'M16 3h5v5M21 3l-7 7M10 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-4',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
  inbox: 'M22 12h-6l-2 3h-4l-2-3H2M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z',
  refresh: 'M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6',
  layers: 'M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
};

const Svg = ({ d, size = 18 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden={true}>
    <path d={d} />
  </svg>
);

const FILTERS = [['all', 'All students'], ...Object.entries(STUDENT_STATUS).map(([k, v]) => [k, v.label])];

export function AdminStudents({ students, loading, onAllocate, onRefresh, onPerf, onBulk }) {
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');

  // Progress and status are worked out once per student, not on every render of every card.
  const rows = useMemo(
    () =>
      students.map((s) => {
        const progress = progressOf(s);
        return { s, progress, status: studentStatus(s, progress) };
      }),
    [students],
  );

  const q = query.trim().toLowerCase();
  const shown = useMemo(
    () =>
      rows.filter(
        (r) =>
          (filter === 'all' || r.status === filter) &&
          (!q || (r.s.name + ' ' + r.s.id + ' ' + (r.s.email || '')).toLowerCase().includes(q)),
      ),
    [rows, filter, q],
  );
  const pager = usePagination(shown, { pageSize: PAGE_SIZE, resetKey: filter + '|' + q });

  const count = (k) => (k === 'all' ? rows.length : rows.filter((r) => r.status === k).length);
  const totals = rows.reduce(
    (acc, r) => ({ worked: acc.worked + r.progress.worked, allocated: acc.allocated + r.progress.allocated }),
    { worked: 0, allocated: 0 },
  );
  // Hide the "unreadable" tab unless it applies, so the filters stay short.
  const filters = FILTERS.filter(([k]) => k !== 'error' || count('error') > 0);

  return (
    <div className="ad">
      <div className="page-head sc-head">
        <div>
          <h1>Students</h1>
          <p>Students who have registered. Allocate department charts and follow their progress.</p>
        </div>
        <div className="sc-head-acts">
          <button type="button" className="sc-ghost" onClick={onBulk}>
            <Svg d={ICON.layers} size={16} /> Bulk allocate
          </button>
          <button type="button" className="dc-action" onClick={onRefresh} disabled={loading}>
            <Svg d={ICON.refresh} size={16} /> {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      <StatTiles>
        <StatTile lead icon={ICON.users} label="Students" value={rows.length} caption="registered" />
        <StatTile icon={ICON.pulse} label="Active" value={count('active')} caption="have worked charts" />
        <StatTile icon={ICON.check} label="Charts Completed" value={totals.worked.toLocaleString()} caption="across all students" />
        <StatTile
          icon={ICON.share}
          label="Allocated"
          value={totals.allocated.toLocaleString()}
          caption={count('unallocated') + ' student' + (count('unallocated') === 1 ? '' : 's') + ' with no department'}
        />
      </StatTiles>

      <div className="ad-toolbar">
        <div className="pg-filters" role="tablist" aria-label="Student status">
          {filters.map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={filter === k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>
              {label}
              <span>{count(k)}</span>
            </button>
          ))}
        </div>
        <label className="ad-search">
          <Svg d={ICON.search} size={16} />
          <span className="sr-only">Search students</span>
          <input type="search" value={query} onChange={(ev) => setQuery(ev.target.value)} placeholder="Search name, ID or email…" />
        </label>
      </div>

      {loading && rows.length === 0 ? (
        <PageLoader variant="inline" label="Loading students" />
      ) : shown.length ? (
        <>
          <div className="ad-grid">
            {pager.items.map((r) => (
              <StudentCard key={r.s.uid || r.s.id} student={r.s} progress={r.progress} onPerf={onPerf} onAllocate={onAllocate} />
            ))}
          </div>
          <Pagination {...pager.props} itemLabel="students" />
        </>
      ) : (
        <div className="pg-empty">
          <span>
            <Svg d={ICON.inbox} size={24} />
          </span>
          {rows.length === 0 ? (
            <>
              <h3>No students yet</h3>
              <p>Once a student creates an account, press Refresh to see them here.</p>
            </>
          ) : (
            <>
              <h3>No students found</h3>
              <p>Try another search or switch the filter.</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// route: /admin/students
export default function StudentsPage() {
  const { students, loadingStudents, refreshStudents, setModal, setPerfId } = useAdmin();
  return (
    <AdminStudents
      students={students}
      loading={loadingStudents}
      onAllocate={(sid) => setModal({ type: 'allocate', studentId: sid })}
      onRefresh={refreshStudents}
      onPerf={(sid) => setPerfId(sid)}
      onBulk={() => setModal({ type: 'bulkAllocate' })}
    />
  );
}
