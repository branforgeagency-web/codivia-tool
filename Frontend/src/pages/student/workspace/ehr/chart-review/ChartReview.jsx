/* CODIVIA EHR shell — Chart Review activity: record-type tabs, toolbar, quick filters, a table grouped
   by time (This Visit, Recent, 6 Months Ago …) and a preview pane. Rows come from chartReviewRows. */
import { useMemo, useState } from 'react';
import { useDragSize } from '../lib/useDragWidth.js';
import { CR_FILTERS, CR_TABS, rowText, typeIcon } from './chartReviewData.js';
import { PreviewPane } from './PreviewPane.jsx';

const GROUP_ORDER = ['This Visit', 'Recent', '6 Months Ago'];
const groupRank = (g) =>
  GROUP_ORDER.includes(g)
    ? GROUP_ORDER.indexOf(g)
    : g === 'Unknown Date'
      ? 1000
      : g === 'Earlier'
        ? 999
        : 10 + (parseInt(g, 10) || 0);

// visitOf(row) = visit report model for encounter rows; onPin(row) = show the row as a sidebar tab.
export function ChartReview({
  rows,
  find,
  onOpenNotes,
  onUseCodes,
  onRoute,
  onClose,
  visitOf,
  onPin,
}) {
  const [tab, setTab] = useState('enc');
  const [sel, setSelRaw] = useState(null);
  const [seen, setSeen] = useState([]); // rows opened before, for the preview's Back button
  const setSel = (id) => {
    if (sel && id && id !== sel) setSeen((s) => [...s, sel].slice(-20));
    setSelRaw(id);
  };
  const back = () => {
    const prev = seen[seen.length - 1];
    setSeen((s) => s.slice(0, -1));
    setSelRaw(prev || null);
  };
  // Preview height: drag the bar between the list and the preview (remembered on this device).
  const previewSize = useDragSize({
    storageKey: 'codivia.chartReview.previewHeight',
    axis: 'y',
    min: 140,
    maxRatio: 0.8,
    label: 'Resize the preview',
  });
  // Preview width when it sits beside the list (Rad, or the reader's choice).
  const previewWidth = useDragSize({
    storageKey: 'codivia.chartReview.previewWidth',
    axis: 'x',
    min: 280,
    maxRatio: 0.8,
    label: 'Resize the preview',
  });
  const [rightOf, setRightOf] = useState({}); // { rad: true } = preview beside the list on that tab
  const [preview, setPreview] = useState(true);
  const [grouped, setGrouped] = useState(true);
  const [q, setQ] = useState('');
  const [hideOther, setHideOther] = useState(false);
  const [hideReviewed, setHideReviewed] = useState(false);
  const [quick, setQuick] = useState({}); // { 'notes.hp': true }
  const [info, setInfo] = useState(true);
  const [reviewed, setReviewed] = useState(() => new Set());
  const [sort, setSort] = useState({ col: 'when', dir: -1 });

  const def = CR_TABS.find((t) => t.key === tab);
  const filters = CR_FILTERS[tab] || [];
  const [moreFilters, setMoreFilters] = useState(false); // compact tabs: text filter etc. behind "Filters"
  const on = (f) => quick[tab + '.' + f.key] ?? !!f.default;
  const tools = def.tools; // tab-specific toolbar (Rad) in place of the review buttons
  const compact = def.compactFilters && !moreFilters;
  const only = filters.filter((f) => f.mode === 'only' && on(f));
  const hide = filters.filter((f) => f.mode === 'hide' && on(f));
  const counts = useMemo(
    () =>
      Object.fromEntries(CR_TABS.map((t) => [t.key, rows.filter((r) => r.tab === t.key).length])),
    [rows],
  );
  const shown = rows
    .filter((r) => r.tab === tab)
    .filter((r) => !hideOther || r.current)
    .filter((r) => !only.length || only.some((f) => f.test(r)))
    .filter((r) => !hide.some((f) => f.test(r)))
    .filter((r) => !hideReviewed || !reviewed.has(r.id))
    .filter((r) => !q.trim() || rowText(r).includes(q.trim().toLowerCase()))
    .sort((a, b) => {
      if (sort.col === 'when')
        return (
          sort.dir * ((a.date ? a.date.getTime() : 0) - (b.date ? b.date.getTime() : 0)) ||
          (a.current === b.current ? 0 : a.current ? -1 : 1)
        );
      return (
        sort.dir * String(a.cells[sort.col] || '').localeCompare(String(b.cells[sort.col] || ''))
      );
    });
  const groups = grouped
    ? Object.entries(shown.reduce((m, r) => ((m[r.group] = m[r.group] || []).push(r), m), {})).sort(
        ([a], [b]) => groupRank(a) - groupRank(b),
      )
    : [['', shown]];
  const selected = rows.find((r) => r.id === sel && r.tab === tab) || null;
  const current = rows.find((r) => r.tab === 'enc' && r.current);
  const open = preview && !!selected;
  const right = rightOf[tab] ?? def.preview === 'right';
  const size = right ? previewWidth : previewSize;
  const bar = open && (
    <div
      className={'ehr-resizer' + (right ? '' : ' y')}
      title="Drag to resize · double-click to reset"
      {...size.handleProps}
    >
      <i className={'bi bi-grip-' + (right ? 'vertical' : 'horizontal')} aria-hidden="true" />
    </div>
  );
  const pane = open && (
    <PreviewPane
      row={selected}
      visit={selected.tab === 'enc' && visitOf ? visitOf(selected) : null}
      onPin={onPin}
      find={find}
      onClose={() => setSelRaw(null)}
      onBack={back}
      canBack={seen.length > 0}
      onUseCodes={onUseCodes}
      right={right}
      onLayout={(v) => setRightOf((m) => ({ ...m, [tab]: v }))}
      onOpenNote={onOpenNotes}
    />
  );
  const markReviewed = (ids) => setReviewed((s) => new Set([...s, ...ids]));
  const clearFilters = () => {
    setQ('');
    setHideOther(false);
    setHideReviewed(false);
    setQuick({});
  };
  const sortBy = (col) =>
    setSort((s) => ({ col, dir: s.col === col ? -s.dir : col === 'when' ? -1 : 1 }));
  const check = (label, value, set, key) => (
    <label key={key || label} className={value ? 'on' : ''}>
      <input type="checkbox" checked={value} onChange={(e) => set(e.target.checked)} /> {label}
    </label>
  );

  return (
    <div
      className={'ehr-cr' + (open && !right ? ' with-preview' : '')}
      style={
        open && !right && previewSize.size ? { '--prev-h': previewSize.size + 'px' } : undefined
      }
    >
      <div className="ehr-cr-main">
        <div className="ehr-acthead">
          <h2>Chart Review</h2>
          <div className="sp" />
          {onClose && (
            <button
              type="button"
              className="ehr-x"
              onClick={onClose}
              aria-label="Close Chart Review"
              title="Close"
            >
              <i className="bi bi-x-lg" />
            </button>
          )}
        </div>
        <div className="ehr-subtabs" role="tablist" aria-label="Record types">
          <span className="flag" aria-hidden="true">
            <i className="bi bi-bookmark-fill" />
          </span>
          {CR_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              className={tab === t.key ? 'on' : ''}
              style={t.color ? { boxShadow: `inset 0 2px 0 ${t.color}` } : undefined}
              onClick={() => (setTab(t.key), setSel(null))}
            >
              {t.label}
              {counts[t.key] > 0 && <small>{counts[t.key]}</small>}
            </button>
          ))}
        </div>
        <div className="ehr-toolbar">
          <label className="ehr-tb">
            <input
              type="checkbox"
              checked={preview}
              onChange={(e) => setPreview(e.target.checked)}
            />{' '}
            Preview
          </label>
          <button
            type="button"
            className="ehr-tb"
            onClick={() => (clearFilters(), setSort({ col: 'when', dir: -1 }))}
          >
            <i className="bi bi-arrow-clockwise" /> Refresh
          </button>
          {tab === 'enc' && (
            <button
              type="button"
              className="ehr-tb"
              disabled={!current || !current.doc}
              onClick={() => current && onOpenNotes(current.doc)}
            >
              <i className="bi bi-hospital" /> Encounter
            </button>
          )}
          <button
            type="button"
            className="ehr-tb"
            onClick={onRoute}
            title="Route a question about this chart to the physician"
          >
            <i className="bi bi-share" /> Route
          </button>
          {tools ? (
            tools.map(([icon, label]) => (
              <button
                key={label}
                type="button"
                className="ehr-tb"
                disabled
                title={label + ' — not available to coders'}
              >
                <i className={'bi ' + icon} /> {label}
              </button>
            ))
          ) : (
            <>
              <button
                type="button"
                className="ehr-tb"
                disabled={!selected}
                onClick={() => selected && (markReviewed([selected.id]), setPreview(true))}
              >
                <i className="bi bi-file-earmark-check" /> Review Selected
              </button>
              <button
                type="button"
                className="ehr-tb"
                disabled={!shown.length}
                onClick={() => markReviewed(shown.map((r) => r.id))}
              >
                <i className="bi bi-check2-all" /> Mark All Reviewed
              </button>
              <button
                type="button"
                className="ehr-tb"
                disabled={!selected || !selected.doc}
                onClick={() => selected && onOpenNotes(selected.doc)}
              >
                <i className="bi bi-journal-text" /> Open Note
              </button>
            </>
          )}
          {selected && selected.prev && (selected.prev.codes || []).length > 0 && (
            <button type="button" className="ehr-tb" onClick={() => onUseCodes(selected.prev)}>
              <i className="bi bi-box-arrow-in-down" /> Use Codes
            </button>
          )}
        </div>
        <div className="ehr-filterbar">
          {def.compactFilters ? (
            <button
              type="button"
              className={'ehr-tb' + (moreFilters ? ' on' : '')}
              onClick={() => setMoreFilters(!moreFilters)}
              aria-pressed={moreFilters}
              title="More filters"
            >
              <i className="bi bi-funnel-fill" /> Filters
            </button>
          ) : (
            <span className="lbl">
              <i className="bi bi-funnel" /> Filters
            </span>
          )}
          {!compact && (
            <input
              className="ehr-input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filter rows…"
              aria-label="Filter rows"
            />
          )}
          {(tab === 'enc' || tab === 'notes') && check('Hide Other Enc', hideOther, setHideOther)}
          {filters.map((f) =>
            check(
              f.label,
              on(f),
              (v) => setQuick((x) => ({ ...x, [tab + '.' + f.key]: v })),
              f.key,
            ),
          )}
          {!compact && check('Hide Reviewed', hideReviewed, setHideReviewed)}
          {!compact && (
            <button type="button" className="ehr-link" onClick={clearFilters}>
              <i className="bi bi-eraser" /> Clear Filters
            </button>
          )}
          <div className="sp" />
          <button
            type="button"
            className={'ehr-toggle' + (grouped ? ' on' : '')}
            onClick={() => setGrouped(!grouped)}
            aria-pressed={grouped}
            title="Group by time"
          >
            {grouped ? 'On' : 'Off'}
            <span />
          </button>
        </div>
        {info && (
          <div className="ehr-infobar">
            <i className="bi bi-exclamation-circle" /> {rows.length} records on this chart: this
            visit's documents and {rows.filter((r) => !r.current && r.tab === 'enc').length} earlier
            encounter(s).
            <button type="button" className="ehr-btn" onClick={() => setInfo(false)}>
              Hide
            </button>
          </div>
        )}
        <div
          className={'ehr-cr-body' + (open && right ? ' split' : '')}
          style={
            open && right && previewWidth.size
              ? { '--prev-w': previewWidth.size + 'px' }
              : undefined
          }
        >
          <div className="ehr-tablewrap">
            <table className="ehr-table">
              <thead>
                <tr>
                  <th className="fl">
                    <i className="bi bi-bookmark-fill" />
                  </th>
                  {def.cols.map(([k, l]) => (
                    <th
                      key={k}
                      onClick={() => sortBy(k)}
                      aria-sort={
                        sort.col === k ? (sort.dir > 0 ? 'ascending' : 'descending') : 'none'
                      }
                    >
                      {l}
                      {sort.col === k && (
                        <i className={'bi bi-caret-' + (sort.dir > 0 ? 'up' : 'down') + '-fill'} />
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groups.map(([g, list]) => [
                  g && (
                    <tr key={'g' + g} className="grp">
                      <td colSpan={def.cols.length + 1}>
                        <span>{g}</span>
                      </td>
                    </tr>
                  ),
                  ...list.map((r) => (
                    <tr
                      key={r.id}
                      className={(sel === r.id ? 'sel' : '') + (reviewed.has(r.id) ? ' rev' : '')}
                      onClick={() => setSel(r.id)}
                      onDoubleClick={() =>
                        r.doc ? onOpenNotes(r.doc) : (setSel(r.id), setPreview(true))
                      }
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && setSel(r.id)}
                    >
                      <td className="fl">
                        {reviewed.has(r.id) ? (
                          <i className="bi bi-check2" title="Reviewed" />
                        ) : sel === r.id ? (
                          <i className="bi bi-bookmark" />
                        ) : null}
                      </td>
                      {def.cols.map(([k, , icon]) => (
                        <td
                          key={k}
                          className={
                            k === 'abn' && r.cells.abn
                              ? 'abn'
                              : k === 'desc'
                                ? 'desc'
                                : k === 'author' && /^me$/i.test(r.cells.author)
                                  ? 'b'
                                  : ''
                          }
                        >
                          {icon && r.cells[k] && (
                            <i className={'bi ' + typeIcon(r.cells[k]) + ' ehr-ti'} />
                          )}
                          {k === 'when' ? r.when || '—' : r.cells[k] || ''}
                        </td>
                      ))}
                    </tr>
                  )),
                ])}
                {!shown.length && (
                  <tr>
                    <td colSpan={def.cols.length + 1} className="ehr-empty">
                      No records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {right && bar}
          {right && pane}
        </div>
      </div>
      {!right && bar}
      {!right && pane}
    </div>
  );
}
