import { useMemo, useState } from 'react';
import { DataTable } from '../../components/ui/DataTable.jsx';
import { DeptCard } from '../../components/ui/DeptCard.jsx';
import { DeptIcon } from '../../components/ui/DeptIcon.jsx';
import { ElementTiles } from '../../components/ui/ElementTiles.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { StatTile, StatTiles } from '../../components/ui/StatTile.jsx';
import { DEPTS } from '../../config/constants.js';
import { useAdmin } from '../../context/AdminContext.jsx';
import { usePagination } from '../../hooks/usePagination.js';
import { deptHasCharts } from '../../utils/allocation.js';

// ---- Admin: Browse Charts. Department cards (DeptCard), then the department's charts (DataTable).
// Data: window.CHART_DATA (built-in chart files + published uploads). Styles: .ad-* / .dc-* / .bc-* ----

const PAGE_SIZE = 9;
const LEVELS = ['beginner', 'moderate', 'advanced'];
const LEVEL_LABEL = { beginner: 'Beginner', moderate: 'Moderate', advanced: 'Advanced' };
const GROUPS = [
  ['all', 'All departments'],
  ['specialty', 'Specialty tracks'],
  ['setting', 'Setting domains'],
];
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

const chartsOf = (dk) => (window.CHART_DATA && window.CHART_DATA[dk]) || [];

// { beginner, moderate, advanced, handwritten, uploaded } for a list of charts.
function countLevels(charts) {
  const n = { beginner: 0, moderate: 0, advanced: 0, handwritten: 0, uploaded: 0 };
  charts.forEach((c) => {
    if (n[c.difficulty] !== undefined) n[c.difficulty] += 1;
    if (c.handwritten) n.handwritten += 1;
    if (c.uploaded) n.uploaded += 1;
  });
  return n;
}

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
function DepartmentList({ onOpen }) {
  const [group, setGroup] = useState('all');
  const [query, setQuery] = useState('');

  const all = useMemo(
    () =>
      Object.entries(DEPTS)
        .filter(([dk]) => deptHasCharts(dk))
        .map(([dk, d]) => {
          const charts = chartsOf(dk);
          return { dk, d, total: charts.length, counts: countLevels(charts) };
        }),
    [],
  );
  const q = query.trim().toLowerCase();
  const shown = all.filter((r) => (group === 'all' || r.d.group === group) && (!q || (r.d.name + ' ' + r.dk).toLowerCase().includes(q)));
  const pager = usePagination(shown, { pageSize: PAGE_SIZE, resetKey: group + '|' + q });
  const count = (g) => (g === 'all' ? all.length : all.filter((r) => r.d.group === g).length);
  const sum = (k) => all.reduce((n, r) => n + (k === 'total' ? r.total : r.counts[k]), 0);

  return (
    <div className="ad">
      <div className="page-head">
        <h1>Browse Charts</h1>
        <p>Open a department to review its charts: read the record and check the answer key.</p>
      </div>

      <StatTiles>
        <StatTile lead icon={ICON.grid} label="Departments" value={all.length} caption={count('specialty') + ' specialty · ' + count('setting') + ' setting'} />
        <StatTile icon={ICON.files} label="Charts" value={sum('total').toLocaleString()} caption="across all departments" />
        <StatTile icon={ICON.pen} label="Handwritten" value={sum('handwritten').toLocaleString()} caption="scanned-style records" />
        <StatTile icon={ICON.upload} label="Uploaded" value={sum('uploaded').toLocaleString()} caption="published by admins" />
      </StatTiles>

      <div className="ad-toolbar">
        <div className="pg-filters" role="tablist" aria-label="Department group">
          {GROUPS.map(([g, label]) => (
            <button key={g} type="button" role="tab" aria-selected={group === g} className={group === g ? 'on' : ''} onClick={() => setGroup(g)}>
              {label}
              <span>{count(g)}</span>
            </button>
          ))}
        </div>
        <SearchBox value={query} onChange={setQuery} placeholder="Search by name or key…" label="Search departments" />
      </div>

      {shown.length ? (
        <>
          <div className="ad-grid">
            {pager.items.map((r) => (
              <DeptCard
                key={r.dk}
                deptKey={r.dk}
                name={r.d.name}
                meta={r.dk + ' · ' + (GROUP_LABEL[r.d.group] || r.d.group)}
                badge={{ label: r.total.toLocaleString() + ' charts', tone: 'brand' }}
                footer={
                  <button type="button" className="dc-action" onClick={() => onOpen(r.dk)}>
                    Browse charts <span aria-hidden="true">→</span>
                  </button>
                }
              >
                <ElementTiles dept={r.d} setting={r.d.group === 'setting'} />
                <LevelBar counts={r.counts} total={r.total} />
              </DeptCard>
            ))}
          </div>
          <Pagination {...pager.props} itemLabel="departments" />
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

function DepartmentCharts({ dk, onBack, onView }) {
  const d = DEPTS[dk];
  const charts = chartsOf(dk);
  const counts = useMemo(() => countLevels(charts), [charts]);
  const [level, setLevel] = useState('all');
  const [query, setQuery] = useState('');
  const columns = useMemo(() => CHART_COLUMNS(onView), [onView]);

  const q = query.trim().toLowerCase();
  const rows = useMemo(
    () =>
      charts.filter(
        (c) =>
          (level === 'all' || (level === 'handwritten' ? c.handwritten : c.difficulty === level)) &&
          (!q || (c.title + ' ' + c.id + ' ' + c.patient.name + ' ' + c.answerKey.map((a) => a.code).join(' ')).toLowerCase().includes(q)),
      ),
    [charts, level, q],
  );

  const tabs = [['all', 'All', charts.length], ...LEVELS.map((l) => [l, LEVEL_LABEL[l], counts[l]]), ['handwritten', 'Handwritten', counts.handwritten]].filter(
    ([k, , n]) => k === 'all' || n > 0,
  );

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
          <h1>{d.name}</h1>
          <p>{dk + ' · ' + (GROUP_LABEL[d.group] || d.group) + ' · ' + charts.length.toLocaleString() + ' charts'}</p>
          <ElementTiles dept={d} setting={d.group === 'setting'} />
        </div>
      </div>

      <div className="ad-toolbar">
        <div className="pg-filters" role="tablist" aria-label="Chart level">
          {tabs.map(([k, label, n]) => (
            <button key={k} type="button" role="tab" aria-selected={level === k} className={level === k ? 'on' : ''} onClick={() => setLevel(k)}>
              {label}
              <span>{n}</span>
            </button>
          ))}
        </div>
        <SearchBox value={query} onChange={setQuery} placeholder="Search title, ID, code, patient…" label="Search charts" />
      </div>

      <div className="bc-table">
        <DataTable
          columns={columns}
          data={rows}
          rowKey="id"
          itemLabel="charts"
          resetKey={level + '|' + q}
          onRowClick={onView}
          emptyMessage={charts.length ? 'No charts match your search.' : 'This department has no charts yet.'}
        />
      </div>
    </div>
  );
}

export function AdminCharts({ onView }) {
  const [dept, setDept] = useState(null);
  return dept ? <DepartmentCharts key={dept} dk={dept} onBack={() => setDept(null)} onView={onView} /> : <DepartmentList onOpen={setDept} />;
}

// route: /admin/charts
export default function ChartsPage() {
  const { setBrowseChart } = useAdmin();
  return <AdminCharts onView={setBrowseChart} />;
}
