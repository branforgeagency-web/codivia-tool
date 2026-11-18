import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageLoader } from '../../components/ui/PageLoader.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { useAdmin } from '../../context/AdminContext.jsx';
import { useApiList } from '../../hooks/useApiList.js';
import { useDebounced } from '../../hooks/useDebounced.js';
import { ADMIN_AUDIT } from '../../services/endpoints.js';

// ---- Admin: Audit Log. Every change an admin made — students, allocations, charts and uploads,
// departments, chart work (query answers, returns, resolved transfers, notes) — with who, what, to
// what and when. Read-only: entries are written by the actions themselves and never edited.
// Data: GET /admin/audit (category tab, admin, action, date range, search, 20 per page).
// Styles: .al-* in refinements.css (filters reuse .pg-filters / .wa-select / .ad-search). ----

const PAGE_LIMIT = 20;
const CATEGORIES = ['all', 'students', 'allocations', 'charts', 'departments', 'work'];

const CATEGORY_ICON = {
  students: 'bi-people',
  allocations: 'bi-grid-3x3-gap',
  charts: 'bi-file-earmark-medical',
  departments: 'bi-folder2',
  work: 'bi-chat-left-text',
};

const day = (when) => new Date(when).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const time = (when) => new Date(when).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

// Details as label: value lines; arrays joined, nested ranges written out, empty values left out.
function detailLines(details) {
  if (!details || typeof details !== 'object') return [];
  const show = (v) => {
    if (v == null || v === '') return '';
    if (Array.isArray(v)) {
      if (!v.length) return '';
      return v.map((x) => (x && typeof x === 'object' ? (x.userId ? x.userId + ': ' : '') + (x.start != null ? x.start + '–' + x.end : 'removed') : String(x))).join(', ');
    }
    if (typeof v === 'object') {
      return Object.entries(v)
        .map(([k, r]) => k + (r && r.start != null ? ' ' + r.start + '–' + r.end : r && typeof r !== 'object' ? ' ' + r : ' removed'))
        .join(', ');
    }
    return String(v);
  };
  return Object.entries(details)
    .map(([k, v]) => [k, show(v)])
    .filter(([, v]) => v);
}

function Entry({ e, open, onToggle }) {
  const lines = detailLines(e.details);
  const canOpen = lines.length > 0;
  return (
    <li className={'al-row c-' + e.category + (open ? ' open' : '')}>
      <span className="al-time" title={new Date(e.at).toLocaleString()}>
        {time(e.at)}
      </span>
      <span className="al-ic" aria-hidden="true">
        <i className={'bi ' + (CATEGORY_ICON[e.category] || 'bi-dot')} />
      </span>
      <div className="al-main">
        <div className="al-line">
          <b className="al-actor">{e.actor.name}</b> <span className="al-action">{e.actionLabel.toLowerCase()}</span>{' '}
          {e.target.label || e.target.id ? <b className="al-target">{e.target.label || e.target.id}</b> : null}
        </div>
        {e.summary && <div className="al-summary">{e.summary}</div>}
        {canOpen && (
          <button type="button" className="al-more" onClick={onToggle} aria-expanded={open}>
            {open ? 'Hide details' : 'Details'} <i className={'bi ' + (open ? 'bi-chevron-up' : 'bi-chevron-down')} aria-hidden="true" />
          </button>
        )}
        {open && canOpen && (
          <dl className="al-details">
            {lines.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </li>
  );
}

// route: /admin/audit
export default function AuditLogPage() {
  const { version } = useAdmin();

  // Tab, filters and page live in the address bar (/admin/audit?category=charts&page=2).
  const [urlParams, setUrlParams] = useSearchParams();
  const [category, setCategory] = useState(() => (CATEGORIES.includes(urlParams.get('category')) ? urlParams.get('category') : 'all'));
  const [actor, setActor] = useState(() => urlParams.get('actor') || '');
  const [action, setAction] = useState(() => urlParams.get('action') || '');
  const [from, setFrom] = useState(() => urlParams.get('from') || '');
  const [to, setTo] = useState(() => urlParams.get('to') || '');
  const [query, setQuery] = useState('');
  const search = useDebounced(query.trim());
  const badRange = from && to && to < from;

  const list = useApiList(ADMIN_AUDIT, {
    params: { category, actor, action, from, to: badRange ? '' : to, search },
    limit: PAGE_LIMIT,
    initialPage: Number(urlParams.get('page')) || 1,
    reloadKey: version,
  });
  const { page, totalPages } = list;
  const data = list.data || {};
  const filters = data.filters || CATEGORIES.map((k) => ({ key: k, label: k, count: 0 }));
  const actions = (data.actions || []).filter((a) => category === 'all' || a.category === category);

  // An action from another category makes no sense once the tab changes.
  useEffect(() => {
    if (action && data.actions && !actions.some((a) => a.value === action)) setAction('');
  }, [category]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const next = new URLSearchParams();
    if (category !== 'all') next.set('category', category);
    if (actor) next.set('actor', actor);
    if (action) next.set('action', action);
    if (from) next.set('from', from);
    if (to) next.set('to', to);
    if (page > 1) next.set('page', String(page));
    if (next.toString() !== urlParams.toString()) setUrlParams(next, { replace: true });
  }, [category, actor, action, from, to, page, urlParams, setUrlParams]);

  const [openIds, setOpenIds] = useState(() => new Set());
  const toggle = (id) => {
    const next = new Set(openIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setOpenIds(next);
  };

  const top = useRef(null);
  const lastPage = useRef(page);
  useEffect(() => {
    if (lastPage.current === page) return;
    lastPage.current = page;
    top.current && top.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [page]);

  const filtered = search || actor || action || from || to;
  const clear = () => {
    setActor('');
    setAction('');
    setFrom('');
    setTo('');
    setQuery('');
  };

  // Group the page's rows under a heading per day.
  const groups = [];
  list.results.forEach((e) => {
    const d = day(e.at);
    if (!groups.length || groups[groups.length - 1].day !== d) groups.push({ day: d, rows: [] });
    groups[groups.length - 1].rows.push(e);
  });

  return (
    <div className="ad" ref={top}>
      <div className="page-head sc-head">
        <div>
          <h1>Audit Log</h1>
          <p>Every change made by an admin — students, allocations, charts, departments and chart work — with who did it and when. Entries can’t be edited or deleted.</p>
        </div>
      </div>

      <div className="ad-toolbar">
        <div className="pg-filters" role="tablist" aria-label="Category">
          {filters.map((f) => (
            <button key={f.key} type="button" role="tab" aria-selected={category === f.key} className={category === f.key ? 'on' : ''} onClick={() => setCategory(f.key)}>
              {f.label}
              <span>{f.count}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="ad-toolbar wa-filters al-filters">
        <label className="wa-select">
          <span>Admin</span>
          <select value={actor} onChange={(e) => setActor(e.target.value)}>
            <option value="">All admins</option>
            {(data.actors || []).map((a) => (
              <option key={a.value} value={a.value}>
                {a.label} ({a.count})
              </option>
            ))}
          </select>
        </label>
        <label className="wa-select">
          <span>Action</span>
          <select value={action} onChange={(e) => setAction(e.target.value)}>
            <option value="">All actions</option>
            {actions.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </label>
        <label className="wa-select">
          <span>From</span>
          <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="wa-select">
          <span>To</span>
          <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
        </label>
        <label className="ad-search">
          <i className="bi bi-search" aria-hidden="true" />
          <span className="sr-only">Search the audit log</span>
          <input type="search" value={query} onChange={(ev) => setQuery(ev.target.value)} placeholder="Student, chart, department or admin…" />
        </label>
        {filtered && (
          <button type="button" className="sc-ghost" onClick={clear}>
            Clear filters
          </button>
        )}
      </div>
      {badRange && (
        <div className="cvx-msg err" role="alert">
          “To” is before “From” — the end date is ignored.
        </div>
      )}

      {list.error && !list.data ? (
        <div className="cvx-msg err" role="alert">
          {list.error}
        </div>
      ) : !list.data ? (
        <PageLoader variant="inline" label="Loading the audit log" />
      ) : list.results.length ? (
        <>
          <div className="al-list">
            {groups.map((g) => (
              <section key={g.day} className="al-day">
                <h3>{g.day}</h3>
                <ol>
                  {g.rows.map((e) => (
                    <Entry key={e.id} e={e} open={openIds.has(e.id)} onToggle={() => toggle(e.id)} />
                  ))}
                </ol>
              </section>
            ))}
          </div>
          <div className="pq-pager">
            {totalPages > 1 && (
              <span className="pq-pageof">
                Page <b>{page}</b> of <b>{totalPages}</b>
              </span>
            )}
            <Pagination {...list.pagerProps} itemLabel="entries" />
          </div>
        </>
      ) : (
        <div className="pg-empty">
          <span>
            <i className="bi bi-journal-text" aria-hidden="true" />
          </span>
          <h3>{filtered ? 'Nothing matches' : 'No changes recorded yet'}</h3>
          <p>{filtered ? 'Try another search, admin, action or date.' : 'Admin changes are recorded here from now on: allocations, chart edits, uploads, student and department changes, query answers.'}</p>
        </div>
      )}
    </div>
  );
}
