import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageLoader } from '../../components/ui/PageLoader.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { useAdmin } from '../../context/AdminContext.jsx';
import { useApiList } from '../../hooks/useApiList.js';
import { useDebounced } from '../../hooks/useDebounced.js';
import { useReference, workTypeInfo } from '../../hooks/useReference.js';
import { post } from '../../services/apiHelper.js';
import { ADMIN_WORK, ADMIN_WORK_NOTES, ADMIN_WORK_RESOLVE, ADMIN_WORK_RETURN } from '../../services/endpoints.js';
import { PATHS } from '../../routes/paths.js';

// ---- Admin: Chart Activity. What students do inside charts (ChartWork): deferred (reason),
// transferred to a work queue (queue, reason, comment), in progress, completed; their queries,
// comments and the activity timeline. The admin can send a deferred / transferred chart back to the
// student and leave notes; both appear in the student's Activity panel in the workspace.
// Data: GET /admin/work (tabs, department, queue, search, 10 per page);
//       POST /admin/work/:id/return { note? }, POST /admin/work/:id/notes { text }.
// The list re-checks every 30 s. Cards open and close like Physician Queries. Styles: .pq-* / .wa-* ----

const LIST_POLL_MS = 30 * 1000;
const PAGE_LIMIT = 10;
const TABS = ['attention', 'deferred', 'transferred', 'in_progress', 'done', 'all'];
const WAITING = ['deferred', 'transferred'];

const STATUS = {
  deferred: { label: '⏸ Deferred', tone: 'warn' },
  transferred: { label: '↪ Transferred', tone: 'brand' },
  in_progress: { label: '✎ In progress', tone: 'muted' },
  done: { label: '✓ Completed', tone: 'ok' },
};

// Closing a transfer: did the student pick the right work queue?
const VERDICTS = [
  { key: 'correct', label: 'Right queue', icon: 'bi-check-circle' },
  { key: 'incorrect', label: 'Wrong queue', icon: 'bi-x-circle' },
];
const verdictLabel = (v) => (VERDICTS.find((x) => x.key === v) || VERDICTS[0]).label;

// Timeline icons by activity kind (ChartWork.activity[].kind).
const KIND_ICON = {
  opened: 'bi-play-circle',
  resume: 'bi-arrow-repeat',
  defer: 'bi-pause-circle',
  transfer: 'bi-box-arrow-right',
  query: 'bi-question-circle',
  answer: 'bi-chat-left-text',
  comment: 'bi-chat-dots',
  session: 'bi-receipt',
  submit: 'bi-check2-circle',
  admin: 'bi-person-badge',
  dx: 'bi-clipboard2-pulse', // diagnosis added, edited, deleted, reclassified or re-sequenced
};

const EMPTY = {
  attention: ['Nothing waiting', 'No deferred charts or unresolved transfers right now.'],
  deferred: ['No deferred charts', 'Charts students put on hold show up here with their reason.'],
  transferred: ['No transferred charts', 'Charts students send to another work queue show up here.'],
  in_progress: ['No charts in progress', 'Charts students have opened but not finished show up here.'],
  done: ['No completed charts yet', 'Submitted charts show up here with their score.'],
  all: ['No chart activity yet', 'Activity appears once students start working charts.'],
};

const initials = (name) =>
  String(name || '')
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || '?';

function ago(when) {
  if (!when) return '';
  const s = Math.max(0, (Date.now() - new Date(when).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + ' min ago';
  if (s < 86400) return Math.floor(s / 3600) + ' h ago';
  if (s < 7 * 86400) return Math.floor(s / 86400) + ' d ago';
  return new Date(when).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}
const fullTime = (when) => (when ? new Date(when).toLocaleString() : '—');
function duration(sec) {
  if (!sec) return '—';
  const m = Math.round(sec / 60);
  if (m < 1) return '< 1 min';
  if (m < 60) return m + ' min';
  return Math.floor(m / 60) + ' h ' + (m % 60) + ' min';
}

// One line under the closed card: why it is waiting, or the latest thing that happened.
function preview(w) {
  if (w.status === 'deferred' && w.defer) return 'Reason: ' + w.defer.reason + (w.defer.comment ? ' — ' + w.defer.comment : '');
  if (w.status === 'transferred' && w.transfer) return 'To ' + w.transfer.queue + ' — ' + w.transfer.reason + (w.transfer.comment ? ': ' + w.transfer.comment : '');
  const last = w.activity[w.activity.length - 1];
  return last ? last.text : '';
}

function WorkCard({ w, open, onToggle, onChanged, typeLabel }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [verdict, setVerdict] = useState('');
  const status = STATUS[w.status] || STATUS.in_progress;
  const resolution = w.status === 'transferred' && w.transfer ? w.transfer.resolution : null;
  const openTransfer = w.status === 'transferred' && !resolution;
  const waiting = WAITING.includes(w.status) && !resolution;
  const bodyId = 'wa-body-' + w.workId;

  const act = async (kind) => {
    if (busy) return;
    if (kind === 'note' && !note.trim()) return;
    if (kind === 'resolve' && !verdict) return;
    setBusy(kind);
    setError('');
    try {
      if (kind === 'return') await post(ADMIN_WORK_RETURN(w.workId), { note: note.trim() });
      else if (kind === 'resolve') await post(ADMIN_WORK_RESOLVE(w.workId), { verdict, note: note.trim() });
      else await post(ADMIN_WORK_NOTES(w.workId), { text: note.trim() });
      setNote('');
      onChanged(kind, w);
    } catch (e) {
      setError(e.message || 'That did not work.');
    }
    setBusy('');
  };

  return (
    <article className={'pq-card wa-card ' + w.status + (open ? ' open' : '')}>
      <button type="button" className="pq-head" onClick={onToggle} aria-expanded={open} aria-controls={bodyId}>
        <span className="sc-avatar" aria-hidden="true">
          {initials(w.student.name)}
        </span>
        <span className="pq-who">
          <b title={w.student.email}>{w.student.name}</b>
          <span>
            {w.chart.id} · {w.chart.deptName} · {waiting ? w.status + ' ' + ago(w.waitingSince) : 'updated ' + ago(w.updatedAt)}
            {w.student.disabled && <em className="pq-off"> · account disabled</em>}
          </span>
          {!open && <span className="pq-preview">{preview(w)}</span>}
        </span>
        {w.queries.pending > 0 && <span className="dc-badge warn">{w.queries.pending} query pending</span>}
        <span className={'dc-badge ' + status.tone}>{status.label}</span>
        {resolution && <span className={'dc-badge ' + (resolution.verdict === 'correct' ? 'ok' : 'warn')}>✓ Resolved · {verdictLabel(resolution.verdict)}</span>}
        <i className="bi bi-chevron-down pq-chev" aria-hidden="true" />
        <span className="sr-only">{open ? 'Close' : 'Open'}</span>
      </button>

      {open && (
        <div className="pq-body" id={bodyId}>
          <div className="pq-chart">
            <span className="pq-dept">{w.chart.deptName}</span>
            <b>{w.chart.id}</b>
            {w.chart.title && <span className="pq-title">{w.chart.title}</span>}
            <span className="wa-type">{typeLabel(w.chart.workType)}</span>
          </div>

          <dl className="pq-meta wa-meta">
            <div>
              <dt>Student</dt>
              <dd>
                {w.student.id} · {w.student.email}
              </dd>
            </div>
            <div>
              <dt>Started</dt>
              <dd title={fullTime(w.startedAt)}>{ago(w.startedAt)}</dd>
            </div>
            <div>
              <dt>Last activity</dt>
              <dd title={fullTime(w.updatedAt)}>{ago(w.updatedAt)}</dd>
            </div>
            <div>
              <dt>Time spent</dt>
              <dd>{duration(w.timeSpent)}</dd>
            </div>
            {w.score !== null && (
              <div>
                <dt>Score</dt>
                <dd>{w.score}%</dd>
              </div>
            )}
            <div>
              <dt>Queries</dt>
              <dd>
                {w.queries.total ? (
                  <Link to={PATHS.adminQueries + '?status=all'} title="Open Physician Queries">
                    {w.queries.total} sent{w.queries.pending ? ' · ' + w.queries.pending + ' pending' : ''}
                  </Link>
                ) : (
                  'none'
                )}
              </dd>
            </div>
          </dl>

          {w.status === 'deferred' && w.defer && (
            <section className="pq-block wa-why deferred">
              <h4>
                Deferred <span title={fullTime(w.defer.at)}>· {ago(w.defer.at)}</span>
              </h4>
              <p>
                <b>{w.defer.reason}</b>
                {w.defer.comment ? ' — ' + w.defer.comment : ''}
              </p>
            </section>
          )}
          {w.status === 'transferred' && w.transfer && (
            <section className="pq-block wa-why transferred">
              <h4>
                Transferred to {w.transfer.queue} <span title={fullTime(w.transfer.at)}>· {ago(w.transfer.at)}</span>
              </h4>
              <p>
                <b>{w.transfer.reason}</b>
                {w.transfer.comment ? ' — ' + w.transfer.comment : ''}
              </p>
              {resolution && (
                <p className={'wa-resolved ' + resolution.verdict}>
                  <i className={'bi ' + (resolution.verdict === 'correct' ? 'bi-check-circle' : 'bi-x-circle')} aria-hidden="true" /> Resolved — {verdictLabel(resolution.verdict).toLowerCase()}{' '}
                  <span title={fullTime(resolution.at)}>· {ago(resolution.at)}</span>
                  {resolution.note ? <span className="wa-resolved-note">{resolution.note}</span> : null}
                </p>
              )}
            </section>
          )}

          {w.comments.length > 0 && (
            <section className="pq-block">
              <h4>Student comments</h4>
              <ul className="wa-comments">
                {w.comments
                  .slice()
                  .reverse()
                  .map((c, i) => (
                    <li key={i}>
                      <span title={fullTime(c.at)}>{ago(c.at)}</span>
                      {c.text}
                    </li>
                  ))}
              </ul>
            </section>
          )}

          <section className="wa-timeline">
            <h4>Activity</h4>
            {w.activity.length ? (
              <ol>
                {w.activity
                  .slice()
                  .reverse()
                  .map((a, i) => (
                    <li key={i} className={'k-' + a.kind}>
                      <i className={'bi ' + (KIND_ICON[a.kind] || 'bi-dot')} aria-hidden="true" />
                      <span className="wa-t" title={fullTime(a.at)}>
                        {ago(a.at)}
                      </span>
                      <span className="wa-x">{a.text}</span>
                    </li>
                  ))}
              </ol>
            ) : (
              <p className="wa-none">Nothing recorded yet.</p>
            )}
          </section>

          <div className="pq-reply">
            <label className="as-field">
              <span>{waiting ? 'Note to the student (optional when returning)' : 'Note to the student'}</span>
              <textarea
                className="pq-text"
                value={note}
                maxLength={1000}
                onChange={(e) => setNote(e.target.value)}
                placeholder={waiting ? 'e.g. The provider has answered — please finish coding.' : 'Shown in the Activity panel of this chart…'}
              />
            </label>
            {openTransfer && (
              <fieldset className="wa-verdict">
                <legend>Resolve transfer — was {w.transfer.queue} the right work queue?</legend>
                {VERDICTS.map((v) => (
                  <label key={v.key} className={'wa-verdict-opt ' + v.key + (verdict === v.key ? ' on' : '')}>
                    <input type="radio" name={'verdict-' + w.workId} value={v.key} checked={verdict === v.key} onChange={() => setVerdict(v.key)} />
                    <i className={'bi ' + v.icon} aria-hidden="true" /> {v.label}
                  </label>
                ))}
              </fieldset>
            )}
            {error && (
              <div className="cvx-msg err" role="alert">
                {error}
              </div>
            )}
            <div className="pq-acts">
              <span className="pq-hint">
                {openTransfer
                  ? 'Resolve closes the transfer; the chart stays Completed for the student. Return sends it back to their To do list.'
                  : waiting
                    ? 'Returning puts the chart back in the student’s To do list. The note shows in the chart’s Activity panel.'
                    : 'The student sees your note in the chart’s Activity panel.'}
              </span>
              <span className="wa-btns">
                <button type="button" className="sc-ghost" onClick={() => act('note')} disabled={!!busy || !note.trim()}>
                  {busy === 'note' ? 'Adding…' : 'Add note'}
                </button>
                {waiting && (
                  <button type="button" className="dc-action" onClick={() => act('return')} disabled={!!busy}>
                    {busy === 'return' ? 'Returning…' : 'Return to student'}
                  </button>
                )}
                {openTransfer && (
                  <button type="button" className="dc-action" onClick={() => act('resolve')} disabled={!!busy || !verdict} title={verdict ? '' : 'Choose right or wrong queue first'}>
                    {busy === 'resolve' ? 'Resolving…' : 'Resolve transfer'}
                  </button>
                )}
              </span>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

// route: /admin/activity
export default function ActivityPage() {
  const { version, refreshAll, setNotice } = useAdmin();
  const { ref: lists } = useReference();
  const typeLabel = (t) => workTypeInfo(lists, t || 'code').label;

  // Tab, department, queue and page live in the address bar (/admin/activity?status=deferred&page=2).
  const [urlParams, setUrlParams] = useSearchParams();
  const [status, setStatus] = useState(() => (TABS.includes(urlParams.get('status')) ? urlParams.get('status') : 'attention'));
  const [dept, setDept] = useState(() => urlParams.get('dept') || '');
  const [queue, setQueue] = useState(() => urlParams.get('queue') || '');
  const [query, setQuery] = useState('');
  const search = useDebounced(query.trim());
  const showQueue = ['attention', 'transferred', 'all'].includes(status);
  const list = useApiList(ADMIN_WORK, {
    params: { status, dept, queue: showQueue ? queue : '', search },
    limit: PAGE_LIMIT,
    initialPage: Number(urlParams.get('page')) || 1,
    reloadKey: version,
  });
  const { page, totalPages, reload } = list;
  const data = list.data || {};
  const filters = data.filters || TABS.map((k) => ({ key: k, label: k, count: 0 }));

  useEffect(() => {
    const next = new URLSearchParams();
    if (status !== 'attention') next.set('status', status);
    if (dept) next.set('dept', dept);
    if (showQueue && queue) next.set('queue', queue);
    if (page > 1) next.set('page', String(page));
    if (next.toString() !== urlParams.toString()) setUrlParams(next, { replace: true });
  }, [status, dept, queue, showQueue, page, urlParams, setUrlParams]);

  useEffect(() => {
    const t = setInterval(() => document.visibilityState === 'visible' && reload(), LIST_POLL_MS);
    return () => clearInterval(t);
  }, [reload]);

  // Open / closed cards: the first card is open until the admin opens or closes one.
  const [openIds, setOpenIds] = useState(() => new Set());
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    setTouched(false);
    setOpenIds(new Set());
  }, [status, dept, queue, page]);
  const firstId = (list.results[0] || {}).workId;
  const isOpen = (id) => (touched ? openIds.has(id) : id === firstId);
  const toggle = (id) => {
    const next = touched ? new Set(openIds) : new Set(firstId ? [firstId] : []);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setOpenIds(next);
    setTouched(true);
  };
  const allOpen = list.results.length > 0 && list.results.every((w) => isOpen(w.workId));
  const toggleAll = () => {
    setOpenIds(allOpen ? new Set() : new Set(list.results.map((w) => w.workId)));
    setTouched(true);
  };

  const top = useRef(null);
  const lastPage = useRef(page);
  useEffect(() => {
    if (lastPage.current === page) return;
    lastPage.current = page;
    top.current && top.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [page]);

  const onChanged = (kind, w) => {
    setNotice({
      tone: 'ok',
      text:
        kind === 'return'
          ? w.chart.id + ' is back in ' + w.student.name + '’s To do list.'
          : kind === 'resolve'
            ? 'Transfer of ' + w.chart.id + ' (' + w.student.name + ') resolved.'
            : 'Note added to ' + w.chart.id + ' for ' + w.student.name + '.',
    });
    refreshAll(); // the list and the sidebar badge
  };
  const [title, text] = EMPTY[status] || EMPTY.all;
  const filtered = search || dept || (showQueue && queue);

  return (
    <div className="ad" ref={top}>
      <div className="page-head sc-head">
        <div>
          <h1>Chart Activity</h1>
          <p>What students do inside their charts: deferred and transferred work waiting on someone, charts in progress and completed, with every step they took.</p>
        </div>
      </div>

      <div className="ad-toolbar">
        <div className="pg-filters" role="tablist" aria-label="Chart status">
          {filters.map((f) => (
            <button key={f.key} type="button" role="tab" aria-selected={status === f.key} className={status === f.key ? 'on' : ''} onClick={() => setStatus(f.key)}>
              {f.label}
              <span>{f.count}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="ad-toolbar wa-filters">
        <label className="wa-select">
          <span>Department</span>
          <select value={dept} onChange={(e) => setDept(e.target.value)}>
            <option value="">All departments</option>
            {(data.departments || []).map((d) => (
              <option key={d.value} value={d.value}>
                {d.label} ({d.count})
              </option>
            ))}
          </select>
        </label>
        {showQueue && (
          <label className="wa-select">
            <span>Transfer queue</span>
            <select value={queue} onChange={(e) => setQueue(e.target.value)}>
              <option value="">All queues</option>
              {(data.queues || []).map((q) => (
                <option key={q.value} value={q.value}>
                  {q.label} ({q.count})
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="ad-search">
          <i className="bi bi-search" aria-hidden="true" />
          <span className="sr-only">Search chart activity</span>
          <input type="search" value={query} onChange={(ev) => setQuery(ev.target.value)} placeholder="Student, chart, reason or queue…" />
        </label>
      </div>

      {list.error && !list.data ? (
        <div className="cvx-msg err" role="alert">
          {list.error}
        </div>
      ) : !list.data ? (
        <PageLoader variant="inline" label="Loading chart activity" />
      ) : list.results.length ? (
        <>
          <div className="pq-listbar">
            <span>{list.results.length} on this page · click a card to open or close it</span>
            <button type="button" className="sc-ghost" onClick={toggleAll}>
              <i className={'bi ' + (allOpen ? 'bi-arrows-collapse' : 'bi-arrows-expand')} aria-hidden="true" /> {allOpen ? 'Collapse all' : 'Expand all'}
            </button>
          </div>
          <div className="pq-list">
            {list.results.map((w) => (
              <WorkCard key={w.workId} w={w} open={isOpen(w.workId)} onToggle={() => toggle(w.workId)} onChanged={onChanged} typeLabel={typeLabel} />
            ))}
          </div>
          <div className="pq-pager">
            {totalPages > 1 && (
              <span className="pq-pageof">
                Page <b>{page}</b> of <b>{totalPages}</b>
              </span>
            )}
            <Pagination {...list.pagerProps} itemLabel="charts" />
          </div>
        </>
      ) : (
        <div className="pg-empty">
          <span>
            <i className="bi bi-inbox" aria-hidden="true" />
          </span>
          <h3>{title}</h3>
          <p>{filtered ? 'Try another search or filter.' : text}</p>
        </div>
      )}
    </div>
  );
}
