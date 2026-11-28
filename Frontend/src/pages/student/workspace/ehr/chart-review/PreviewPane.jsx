/* Chart Review preview, below the list: toolbar (back, refresh, find, print, copy, close) and the
   selected row — a structured form when the row has `detail` (referrals), else the note text. */
import { useRef, useState } from 'react';
import { VisitReport } from '../sidebar/VisitReport.jsx';
import { ImagingReport } from './ImagingReport.jsx';
import { ReportView } from '../ui/index.js';

// Plain text of the preview, for Copy.
const asText = (row) =>
  [
    row.cells.desc,
    ...(row.detail || []).flatMap((g) => [
      g.title,
      ...g.rows.filter(([, v]) => v).map(([l, v]) => `${l}: ${v}`),
    ]),
    ...row.sections.map((s) => (s.head !== 'RECORD' ? s.head + '\n' : '') + (s.body || '')),
  ]
    .filter(Boolean)
    .join('\n');

function DetailForm({ groups }) {
  return (
    <div className="ehr-detail">
      {groups
        .filter((g) => g.rows.some(([, v]) => v !== undefined && v !== null && v !== ''))
        .map((g, i) => (
          <section key={i}>
            {g.title && <h4>{g.title}</h4>}
            {g.rows
              .filter(([, v]) => v !== undefined && v !== null && v !== '')
              .map(([l, v]) => (
                <div key={l} className="row">
                  <span>{l}:</span>
                  <b>{v}</b>
                </div>
              ))}
          </section>
        ))}
    </div>
  );
}

// visit = the encounter's visit report model (encounter rows) — shown as a visit report.
// onPin = "Display in Chart Sidebar": opens this record as its own tab in the right panel.
// right / onLayout = where the preview sits (below the list or beside it) and the switch for it.
// onOpenNote(docKey) = "View Encounter" in the imaging report.
export function PreviewPane({
  row,
  visit,
  find,
  onClose,
  onBack,
  canBack,
  onUseCodes,
  onPin,
  right,
  onLayout,
  onOpenNote,
}) {
  const [q, setQ] = useState('');
  const [findOpen, setFindOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const findRef = useRef(null);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(asText(row));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };
  const hit = q.trim() || find;
  return (
    <aside className="ehr-preview" aria-label="Preview">
      <div className="ehr-preview-tb">
        <button type="button" className="ehr-x" onClick={onBack} disabled={!canBack} title="Back">
          <i className="bi bi-arrow-left" />
        </button>
        <button type="button" className="ehr-x" onClick={() => setQ('')} title="Refresh">
          <i className="bi bi-arrow-clockwise" />
        </button>
        <button
          type="button"
          className={'ehr-x' + (findOpen ? ' on' : '')}
          onClick={() => (
            setFindOpen(!findOpen), setTimeout(() => findRef.current && findRef.current.focus(), 0)
          )}
          title="Find in this record"
        >
          <i className="bi bi-binoculars" />
        </button>
        <button type="button" className="ehr-x" onClick={() => window.print()} title="Print">
          <i className="bi bi-printer" />
        </button>
        <button type="button" className="ehr-x" onClick={copy} title="Copy the text">
          <i className={'bi ' + (copied ? 'bi-clipboard-check' : 'bi-copy')} />
        </button>
        {findOpen && (
          <input
            ref={findRef}
            className="ehr-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Find…"
            aria-label="Find in this record"
          />
        )}
        <div className="sp" />
        {!visit && row.prev && (row.prev.codes || []).length > 0 && (
          <button type="button" className="ehr-btn" onClick={() => onUseCodes(row.prev)}>
            <i className="bi bi-box-arrow-in-down" /> Use these codes
          </button>
        )}
        {onLayout && (
          <>
            <button
              type="button"
              className={'ehr-x' + (!right ? ' on' : '')}
              onClick={() => onLayout(false)}
              title="Show the preview below the list"
              aria-pressed={!right}
            >
              <i className="bi bi-view-stacked" />
            </button>
            <button
              type="button"
              className={'ehr-x' + (right ? ' on' : '')}
              onClick={() => onLayout(true)}
              title="Show the preview beside the list"
              aria-pressed={!!right}
            >
              <i className="bi bi-layout-split" />
            </button>
          </>
        )}
        {onPin && (
          <button
            type="button"
            className="ehr-x"
            onClick={() => onPin(row)}
            title="Display in Chart Sidebar"
          >
            <i className="bi bi-layout-sidebar-reverse" />
          </button>
        )}
        <button
          type="button"
          className="ehr-x"
          onClick={onClose}
          aria-label="Close preview"
          title="Close"
        >
          <i className="bi bi-x-lg" />
        </button>
      </div>
      <div className="ehr-preview-body">
        {visit ? (
          <>
            {/* ED visits: arrival, triage, disposition … above the visit report */}
            {row.detail && <DetailForm groups={row.detail} />}
            <VisitReport model={visit} wide find={hit} onUseCodes={onUseCodes} />
          </>
        ) : row.imaging ? (
          <ImagingReport
            row={row}
            find={hit}
            onViewEncounter={row.doc && onOpenNote ? () => onOpenNote(row.doc) : null}
          />
        ) : row.detail ? (
          <>
            <DetailForm groups={row.detail} />
            <ReportView
              title={row.sourceTitle || 'Source in the record'}
              sections={row.sections}
              find={hit}
            />
          </>
        ) : (
          <ReportView
            title={row.cells.desc}
            meta={[row.when, row.cells.author || row.cells.with, row.cells.status]
              .filter(Boolean)
              .join(' · ')}
            sections={row.sections}
            find={hit}
            actions={
              row.prev && (row.prev.codes || []).length ? (
                <div className="ehr-codes">
                  {row.prev.codes.map((c, i) => (
                    <span key={i} title={c.desc || ''}>
                      {c.code}
                    </span>
                  ))}
                </div>
              ) : null
            }
          />
        )}
      </div>
    </aside>
  );
}
