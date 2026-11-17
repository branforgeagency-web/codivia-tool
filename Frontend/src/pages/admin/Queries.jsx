import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageLoader } from '../../components/ui/PageLoader.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { useAdmin } from '../../context/AdminContext.jsx';
import { useApiList } from '../../hooks/useApiList.js';
import { useDebounced } from '../../hooks/useDebounced.js';
import { post } from '../../services/apiHelper.js';
import { ADMIN_QUERIES, ADMIN_QUERY_ANSWER } from '../../services/endpoints.js';

// ---- Admin: Physician Queries. Students send CDI queries from the chart workspace; the chart is on
// hold until the admin answers here (there is no automatic reply). The answer reaches the student's
// workspace on its next check (about 10 s): the hold lifts and a "Query Response" document appears.
// Data: GET /admin/queries (tabs, search, pages); POST /admin/queries/:workId/:queryId/answer.
// The list re-checks every 15 s so new queries appear without a reload. Styles: .pq-* in refinements.css ----

const LIST_POLL_MS = 15 * 1000;
const PAGE_LIMIT = 10; // queries per page (sent as ?limit=; the API echoes it back with totalPages)
const STATUSES = ['pending', 'answered', 'all'];

const ICON = {
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
  inbox: 'M22 12h-6l-2 3h-4l-2-3H2M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z',
};
const Svg = ({ d, size = 18 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden={true}>
    <path d={d} />
  </svg>
);

const initials = (name) =>
  String(name || '')
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || '?';

// "just now", "5 min ago", "3 h ago", then the date.
function ago(when) {
  if (!when) return '';
  const s = Math.max(0, (Date.now() - new Date(when).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + ' min ago';
  if (s < 86400) return Math.floor(s / 3600) + ' h ago';
  return new Date(when).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}
const fullTime = (when) => (when ? new Date(when).toLocaleString() : '');

const EMPTY = {
  pending: ['No pending queries', 'When a student sends a physician query from a chart, it shows up here.'],
  answered: ['No answered queries yet', 'Queries you answer move here.'],
  all: ['No queries yet', 'Students send physician queries from the chart workspace.'],
};

// One query as a card that opens and closes. Closed: who, chart, physician, when, status and a
// one-line preview of the question. The answer being typed is kept while the card is closed.
function QueryCard({ q, open, onToggle, onAnswered }) {
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = q.status === 'pending';
  const ready = answer.trim().length >= 2 && !busy;

  // Picking an option fills the answer; "Other" leaves room to specify.
  const pick = (opt) => setAnswer(/^other/i.test(opt) ? 'Other: ' : opt);

  const send = async () => {
    if (!ready) return;
    setBusy(true);
    setError('');
    try {
      await post(ADMIN_QUERY_ANSWER(q.workId, q.queryId), { answer: answer.trim() });
      onAnswered(q);
    } catch (e) {
      setError(e.message || 'The answer was not sent.');
      setBusy(false);
    }
  };

  const bodyId = 'pq-body-' + q.queryId;
  const drafted = pending && answer.trim() && !open;

  return (
    <article className={'pq-card ' + q.status + (open ? ' open' : '')}>
      <button type="button" className="pq-head" onClick={onToggle} aria-expanded={open} aria-controls={bodyId}>
        <span className="sc-avatar" aria-hidden="true">
          {initials(q.student.name)}
        </span>
        <span className="pq-who">
          <b title={q.student.email}>{q.student.name}</b>
          <span>
            {q.chart.id} · to {q.to} · {ago(q.sentAt)}
            {q.student.disabled && <em className="pq-off"> · account disabled</em>}
          </span>
          {!open && <span className="pq-preview">{q.question}</span>}
        </span>
        {drafted && <span className="dc-badge brand">Draft</span>}
        <span className={'dc-badge ' + (pending ? 'warn' : 'ok')}>{pending ? '⏳ Pending' : '✓ Answered'}</span>
        <i className={'bi bi-chevron-down pq-chev'} aria-hidden="true" />
        <span className="sr-only">{open ? 'Close' : 'Open'}</span>
      </button>

      {open && (
      <div className="pq-body" id={bodyId}>
      <div className="pq-chart">
        <span className="pq-dept">{q.chart.deptName}</span>
        <b>{q.chart.id}</b>
        {q.chart.title && <span className="pq-title">{q.chart.title}</span>}
      </div>

      <dl className="pq-meta">
        <div>
          <dt>Student</dt>
          <dd>
            {q.student.id} · {q.student.email}
          </dd>
        </div>
        <div>
          <dt>To</dt>
          <dd>{q.to}</dd>
        </div>
        <div>
          <dt>Sent</dt>
          <dd title={fullTime(q.sentAt)}>{fullTime(q.sentAt)}</dd>
        </div>
      </dl>

      {q.indicators && (
        <section className="pq-block">
          <h4>Clinical indicators</h4>
          <p>{q.indicators}</p>
        </section>
      )}
      <section className="pq-block">
        <h4>Question</h4>
        <p>{q.question}</p>
      </section>

      {pending ? (
        <div className="pq-reply">
          {q.options.length > 0 && (
            <div className="pq-opts">
              <h4>Options offered — click one to use it</h4>
              <div>
                {q.options.map((o) => (
                  <button key={o} type="button" className={'pq-opt' + (answer === o ? ' on' : '')} onClick={() => pick(o)}>
                    {o}
                  </button>
                ))}
              </div>
            </div>
          )}
          {q.suggestedAnswer && (
            <button type="button" className="pq-suggest" onClick={() => setAnswer(q.suggestedAnswer)} title={q.suggestedAnswer}>
              <i className="bi bi-lightbulb" aria-hidden="true" /> Use the chart's suggested answer
            </button>
          )}
          <label className="as-field">
            <span>Answer as {q.to}</span>
            <textarea
              className="pq-text"
              value={answer}
              maxLength={2000}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Write the physician's response, or pick an option above…"
              onKeyDown={(e) => (e.ctrlKey || e.metaKey) && e.key === 'Enter' && send()}
            />
          </label>
          {error && (
            <div className="cvx-msg err" role="alert">
              {error}
            </div>
          )}
          <div className="pq-acts">
            <span className="pq-hint">The student sees this answer within a few seconds, and their chart comes off hold.</span>
            <button type="button" className="dc-action" onClick={send} disabled={!ready}>
              {busy ? 'Sending…' : 'Send answer'}
            </button>
          </div>
        </div>
      ) : (
        <section className="pq-block pq-answer">
          <h4>
            Answer <span title={fullTime(q.answeredAt)}>· {ago(q.answeredAt)}</span>
            {q.answeredBy && <span> · by {q.answeredBy}</span>}
          </h4>
          <p>{q.answer}</p>
        </section>
      )}
      </div>
      )}
    </article>
  );
}

// route: /admin/queries
export default function QueriesPage() {
  const { version, refreshAll, setNotice } = useAdmin();
  // Tab and page live in the address bar (/admin/queries?status=answered&page=2), so a reload or a
  // shared link opens the same page. They are sent to GET /admin/queries with ?limit=10.
  const [urlParams, setUrlParams] = useSearchParams();
  const [status, setStatus] = useState(() => (STATUSES.includes(urlParams.get('status')) ? urlParams.get('status') : 'pending'));
  const [query, setQuery] = useState('');
  const search = useDebounced(query.trim());
  const list = useApiList(ADMIN_QUERIES, {
    params: { status, search },
    limit: PAGE_LIMIT,
    initialPage: Number(urlParams.get('page')) || 1,
    reloadKey: version,
  });
  const { page, totalPages } = list;

  useEffect(() => {
    const next = new URLSearchParams();
    if (status !== 'pending') next.set('status', status);
    if (page > 1) next.set('page', String(page));
    if (next.toString() !== urlParams.toString()) setUrlParams(next, { replace: true });
  }, [status, page, urlParams, setUrlParams]);

  // A new page starts at the top of the list.
  const top = useRef(null);
  const firstPage = useRef(page);
  useEffect(() => {
    if (firstPage.current === page) return;
    firstPage.current = page;
    top.current && top.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [page]);
  const filters = (list.data && list.data.filters) || [
    { key: 'pending', label: 'Pending', count: 0 },
    { key: 'answered', label: 'Answered', count: 0 },
    { key: 'all', label: 'All', count: 0 },
  ];
  const { reload } = list;

  // New queries appear without a reload (only while the tab is visible).
  useEffect(() => {
    const t = setInterval(() => document.visibilityState === 'visible' && reload(), LIST_POLL_MS);
    return () => clearInterval(t);
  }, [reload]);

  // Open / closed cards. Until the admin opens or closes one, the first pending query is open.
  const [openIds, setOpenIds] = useState(() => new Set());
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    setTouched(false);
    setOpenIds(new Set());
  }, [status, page]);
  const firstPending = (list.results.find((q) => q.status === 'pending') || {}).queryId;
  const isOpen = (id) => (touched ? openIds.has(id) : id === firstPending);
  const currentOpen = () => (touched ? new Set(openIds) : new Set(firstPending ? [firstPending] : []));
  const toggle = (id) => {
    const next = currentOpen();
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setOpenIds(next);
    setTouched(true);
  };
  const allOpen = list.results.length > 0 && list.results.every((q) => isOpen(q.queryId));
  const toggleAll = () => {
    setOpenIds(allOpen ? new Set() : new Set(list.results.map((q) => q.queryId)));
    setTouched(true);
  };

  const onAnswered = (q) => {
    setNotice({ tone: 'ok', text: 'Answer sent to ' + q.student.name + ' (' + q.chart.id + ').' });
    refreshAll(); // the list and the sidebar badge
  };
  const [title, text] = EMPTY[status] || EMPTY.all;

  return (
    <div className="ad" ref={top}>
      <div className="page-head sc-head">
        <div>
          <h1>Physician Queries</h1>
          <p>Students' CDI queries. The chart stays on hold until you answer as the physician they wrote to.</p>
        </div>
      </div>

      <div className="ad-toolbar">
        <div className="pg-filters" role="tablist" aria-label="Query status">
          {filters.map((f) => (
            <button key={f.key} type="button" role="tab" aria-selected={status === f.key} className={status === f.key ? 'on' : ''} onClick={() => setStatus(f.key)}>
              {f.label}
              <span>{f.count}</span>
            </button>
          ))}
        </div>
        <label className="ad-search">
          <Svg d={ICON.search} size={16} />
          <span className="sr-only">Search queries</span>
          <input type="search" value={query} onChange={(ev) => setQuery(ev.target.value)} placeholder="Student, chart, physician or question…" />
        </label>
      </div>

      {list.error && !list.data ? (
        <div className="cvx-msg err" role="alert">
          {list.error}
        </div>
      ) : !list.data ? (
        <PageLoader variant="inline" label="Loading queries" />
      ) : list.results.length ? (
        <>
          <div className="pq-listbar">
            <span>
              {list.results.length} on this page · click a card to open or close it
            </span>
            <button type="button" className="sc-ghost" onClick={toggleAll}>
              <i className={'bi ' + (allOpen ? 'bi-arrows-collapse' : 'bi-arrows-expand')} aria-hidden="true" /> {allOpen ? 'Collapse all' : 'Expand all'}
            </button>
          </div>
          <div className="pq-list">
            {list.results.map((q) => (
              <QueryCard key={q.queryId} q={q} open={isOpen(q.queryId)} onToggle={() => toggle(q.queryId)} onAnswered={onAnswered} />
            ))}
          </div>
          <div className="pq-pager">
            {totalPages > 1 && (
              <span className="pq-pageof">
                Page <b>{page}</b> of <b>{totalPages}</b>
              </span>
            )}
            <Pagination {...list.pagerProps} itemLabel="queries" />
          </div>
        </>
      ) : (
        <div className="pg-empty">
          <span>
            <Svg d={ICON.inbox} size={24} />
          </span>
          <h3>{title}</h3>
          <p>{search ? 'Try another search.' : text}</p>
        </div>
      )}
    </div>
  );
}
