import { useCallback, useEffect, useMemo, useState } from 'react';
import { DataTable } from '../../components/ui/DataTable.jsx';
import { DeptCard } from '../../components/ui/DeptCard.jsx';
import { DeptIcon } from '../../components/ui/DeptIcon.jsx';
import { ElementTiles } from '../../components/ui/ElementTiles.jsx';
import { PageLoader } from '../../components/ui/PageLoader.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { StatTile, StatTiles } from '../../components/ui/StatTile.jsx';
import { useAdmin } from '../../context/AdminContext.jsx';
import { useApiList } from '../../hooks/useApiList.js';
import { useDebounced } from '../../hooks/useDebounced.js';
import { get } from '../../services/apiHelper.js';
import { ADMIN_CHART, ADMIN_CHARTS, ADMIN_CHART_DEPARTMENTS } from '../../services/endpoints.js';

// ---- Admin: Browse Charts. Department cards (DeptCard), then the department's charts (DataTable).
// Data: GET /admin/charts/departments (cards + statistics), GET /admin/charts (one department's
// charts, paged / sorted / filtered by the server), GET /admin/charts/:id (full record for View).
// Styles: .ad-* / .dc-* / .bc-* ----

// Table column -> API sortBy.
const SORT_FIELD = { title: 'position', patient: 'patient', difficulty: 'difficulty' };

const LEVELS = ['beginner', 'moderate', 'advanced'];
const LEVEL_LABEL = { beginner: 'Beginner', moderate: 'Moderate', advanced: 'Advanced' };
const GROUP_LABEL = { specialty: 'Specialty track', setting: 'Setting domain' };
const MAX_KEY_CODES = 4;

const ICON = {
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
  files: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h4',
  pen: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
  upload: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
  inbox: 'M22 12h-6l-2 3h-4l-2-3H2M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z',
  back: 'M19 12H5M12 19l-7-7 7-7',
};

const Svg = ({ d, size = 18 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden={true}>
    <path d={d} />
  </svg>
);

function SearchBox({ value, onChange, placeholder, label }) {
  return (
    <label className="ad-search">
      <Svg d={ICON.search} size={16} />
      <span className="sr-only">{label}</span>
      <input type="search" value={value} onChange={(ev) => onChange(ev.target.value)} placeholder={placeholder} />
    </label>
  );
}

function Empty({ title, text }) {
  return (
    <div className="pg-empty">
      <span>
        <Svg d={ICON.inbox} size={24} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

// Beginner / moderate / advanced split as one stacked bar.
function LevelBar({ counts, total }) {
  return (
    <div className="bc-levels">
      <div className="bc-bar" aria-hidden="true">
        {LEVELS.map((l) => (counts[l] ? <span key={l} className={l} style={{ width: (counts[l] / total) * 100 + '%' }} /> : null))}
      </div>
      <div className="bc-legend">
        {LEVELS.map((l) => (
          <span key={l}>
            <i className={l} />
            {LEVEL_LABEL[l] + ' ' + counts[l]}
          </span>
        ))}
      </div>
    </div>
  );
}

// ---------- screen 1: departments ----------
// GET /admin/charts/departments — 10 cards per page; group tabs, search and statistics from the server.
function DepartmentList({ reloadKey, onOpen }) {
  const [group, setGroup] = useState('all');
  const [query, setQuery] = useState('');
  const search = useDebounced(query.trim());
  const list = useApiList(ADMIN_CHART_DEPARTMENTS, { params: { group, search }, reloadKey });
  const stats = list.data && list.data.statistics;
  const filters = (list.data && list.data.filters) || [];

  if (list.error && !list.data) return <div className="cvx-msg err" role="alert">{list.error}</div>;
  if (!stats) return <PageLoader label="Loading charts" />;

  return (
    <div className="ad">
      <div className="page-head">
        <h1>Browse Charts</h1>
        <p>Open a department to review its charts: read the record and check the answer key.</p>
      </div>

      <StatTiles>
        <StatTile lead icon={ICON.grid} label="Departments" value={stats.departments} caption={stats.specialty + ' specialty · ' + stats.setting + ' setting'} />
        <StatTile icon={ICON.files} label="Charts" value={stats.charts.toLocaleString()} caption="across all departments" />
        <StatTile icon={ICON.pen} label="Handwritten" value={stats.handwritten.toLocaleString()} caption="scanned-style records" />
        <StatTile icon={ICON.upload} label="Uploaded" value={stats.uploaded.toLocaleString()} caption="published by admins" />
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
        <SearchBox value={query} onChange={setQuery} placeholder="Search by name or key…" label="Search departments" />
      </div>

      {list.results.length ? (
        <>
          <div className="ad-grid">
            {list.results.map((d) => (
              <DeptCard
                key={d.key}
                deptKey={d.key}
                name={d.name}
                meta={d.key + ' · ' + (GROUP_LABEL[d.group] || d.group)}
                badge={{ label: d.charts.toLocaleString() + ' charts', tone: 'brand' }}
                footer={
                  <button type="button" className="dc-action" onClick={() => onOpen(d)}>
                    Browse charts <span aria-hidden="true">→</span>
                  </button>
                }
              >
                <ElementTiles dept={d} setting={d.group === 'setting'} />
                <LevelBar counts={d.levels} total={d.charts} />
              </DeptCard>
            ))}
          </div>
          <Pagination {...list.pagerProps} itemLabel="departments" />
        </>
      ) : (
        <Empty title="No departments found" text="Try another search or switch the group." />
      )}
    </div>
  );
}

// ---------- screen 2: one department's charts ----------
const CHART_COLUMNS = (onView) => [
  {
    key: 'title',
    header: 'Chart',
    sortable: true,
    sortValue: (c) => c.id,
    render: (c) => (
      <div className="bc-chart">
        <b title={c.title}>{c.title}</b>
        <span>
          {c.id}
          {c.handwritten ? <em className="bc-tag hw">Handwritten</em> : null}
          {c.uploaded ? <em className="bc-tag up">Uploaded</em> : null}
        </span>
      </div>
    ),
  },
  {
    key: 'patient',
    header: 'Patient',
    sortable: true,
    sortValue: (c) => c.patient.name,
    render: (c) => (
      <div className="bc-patient">
        {c.patient.name}
        <span>{c.patient.sex + ' · ' + c.patient.age + 'y'}</span>
      </div>
    ),
  },
  {
    key: 'answerKey',
    header: 'Answer Key',
    render: (c) => {
      const codes = c.answerKey.map((a) => a.code);
      return (
        <div className="bc-codes" title={codes.join(', ')}>
          {codes.slice(0, MAX_KEY_CODES).map((code, i) => (
            <code key={code + i}>{code}</code>
          ))}
          {codes.length > MAX_KEY_CODES ? <span>{'+' + (codes.length - MAX_KEY_CODES)}</span> : null}
        </div>
      );
    },
  },
  {
    key: 'difficulty',
    header: 'Level',
    sortable: true,
    sortValue: (c) => LEVELS.indexOf(c.difficulty),
    render: (c) => <span className={'badge ' + c.difficulty}>{c.difficulty}</span>,
  },
  {
    key: 'action',
    header: '',
    align: 'right',
    render: (c) => (
      <button
        type="button"
        className="sc-ghost bc-view"
        onClick={(ev) => {
          ev.stopPropagation();
          onView(c);
        }}
      >
        View
      </button>
    ),
  },
];

function DepartmentCharts({ dept, onBack, onView }) {
  const dk = dept.key;
  const [level, setLevel] = useState('all');
  const [query, setQuery] = useState('');
  const search = useDebounced(query.trim());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sort, setSort] = useState(null); // { key, dir } from the table
  const [data, setData] = useState(null); // GET /admin/charts response
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const columns = useMemo(() => CHART_COLUMNS(onView), [onView]);

  // New filter or search: back to page 1.
  useEffect(() => setPage(1), [level, search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    get(ADMIN_CHARTS, {
      params: {
        dept: dk,
        status: level,
        search: search || undefined,
        sortBy: sort ? SORT_FIELD[sort.key] : 'position',
        order: sort ? sort.dir : 'asc',
        page,
        limit: pageSize,
      },
    })
      .then((r) => !cancelled && setData(r))
      .catch((e) => !cancelled && setError(e.message || 'Could not load charts.'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [dk, level, search, sort, page, pageSize]);

  // Tab counts cover the whole department; hide empty level tabs.
  const tabs = (data ? data.filters : [{ key: 'all', label: 'All', count: dept.charts }]).filter((f) => f.key === 'all' || f.count > 0);

  return (
    <div className="ad">
      <button type="button" className="bc-back" onClick={onBack}>
        <Svg d={ICON.back} size={16} /> All departments
      </button>

      <div className="bc-head">
        <span className="bc-head-ico">
          <DeptIcon dept={dk} />
        </span>
        <div>
          <h1>{dept.name}</h1>
          <p>{dk + ' · ' + (GROUP_LABEL[dept.group] || dept.group) + ' · ' + dept.charts.toLocaleString() + ' charts'}</p>
          <ElementTiles dept={dept} setting={dept.group === 'setting'} />
        </div>
      </div>

      <div className="ad-toolbar">
        <div className="pg-filters" role="tablist" aria-label="Chart level">
          {tabs.map((f) => (
            <button key={f.key} type="button" role="tab" aria-selected={level === f.key} className={level === f.key ? 'on' : ''} onClick={() => setLevel(f.key)}>
              {f.label}
              <span>{f.count}</span>
            </button>
          ))}
        </div>
        <SearchBox value={query} onChange={setQuery} placeholder="Search title, ID, code, patient…" label="Search charts" />
      </div>

      {error && <div className="cvx-msg err" role="alert">{error}</div>}
      <div className="bc-table">
        <DataTable
          columns={columns}
          data={data ? data.results : []}
          rowKey="id"
          itemLabel="charts"
          loading={loading}
          serverSide
          totalCount={data ? data.totalResults : 0}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          pageSizeOptions={[10]}
          onPageSizeChange={setPageSize}
          onSortChange={setSort}
          onRowClick={onView}
          emptyMessage={dept.charts ? 'No charts match your search.' : 'This department has no charts yet.'}
        />
      </div>
    </div>
  );
}

export function AdminCharts({ onView, version }) {
  const [dept, setDept] = useState(null); // the department card that was opened
  return dept ? (
    <DepartmentCharts key={dept.key} dept={dept} onBack={() => setDept(null)} onView={onView} />
  ) : (
    <DepartmentList reloadKey={version} onOpen={setDept} />
  );
}

// route: /admin/charts
export default function ChartsPage() {
  const { setBrowseChart, setNotice, version } = useAdmin();
  // The list leaves out the long record; View loads the whole chart.
  const view = useCallback(
    (c) =>
      get(ADMIN_CHART(c.id))
        .then(setBrowseChart)
        .catch((e) => setNotice({ tone: 'err', text: 'Could not open ' + c.id + ': ' + e.message })),
    [setBrowseChart, setNotice],
  );
  return <AdminCharts onView={view} version={version} />;
}
