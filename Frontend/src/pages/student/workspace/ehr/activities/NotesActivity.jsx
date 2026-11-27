/* Notes activity: note-type tabs (All Notes, Progress, H&P, Consults …), the notes listed by date
   on the left, and the open note on the right with its toolbar and header. Notes = the Chart Review
   rows that are notes (this visit's notes, query responses, earlier encounters' notes).
   Coders read notes but do not write them, so Edit / Cosign / Delete / Sign / Flag / Tag are shown
   disabled; Copy and Route (= physician query) work. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { ReportView } from '../ui/index.js';

const NOTE_ROW_TABS = ['notes', 'letters', 'ed', 'anes', 'proc'];
const text = (r) => `${r.cells.type} ${r.cells.desc}`;
const has = (re) => (r) => re.test(text(r));
const NOTE_TABS = [
  { key: 'all', label: 'All Notes', test: () => true },
  { key: 'progress', label: 'Progress', test: has(/progress/i) },
  { key: 'hp', label: 'H&P', test: has(/h&p|history and physical/i) },
  { key: 'consults', label: 'Consults', test: has(/consult/i) },
  { key: 'anes', label: 'Anes', test: has(/anesth/i) },
  { key: 'proc', label: 'Procedures', test: has(/procedure|operative/i) },
  { key: 'discharge', label: 'Discharge', test: has(/discharge/i) },
  { key: 'ed', label: 'ED Notes', test: has(/emergency|\bED\b|triage/) },
  { key: 'conf', label: 'Confidential', test: has(/confidential/i) },
  {
    key: 'misc',
    label: 'Misc',
    test: (r) =>
      r.cells.type === 'Query Response' ||
      !/progress|h&p|history and physical|consult|anesth|procedure|operative|discharge|emergency|triage/i.test(
        text(r),
      ),
  },
  { key: 'goals', label: 'Goals of Care', test: has(/goals of care/i) },
  {
    key: 'incomplete',
    label: 'Incomplete',
    test: (r) => /incomplete|unsigned|pending/i.test(r.cells.status || ''),
  },
];
const LOCKED = 'Coders read notes; they do not edit or sign them.';

export function NotesActivity({
  rows,
  find,
  setFind,
  findRef,
  docKey,
  onSelectDoc,
  onRoute,
  onUseCodes,
  handwritten,
}) {
  const notes = useMemo(
    () =>
      rows
        .filter((r) => NOTE_ROW_TABS.includes(r.tab))
        .sort((a, b) =>
          a.current === b.current
            ? (b.date ? b.date.getTime() : 0) - (a.date ? a.date.getTime() : 0)
            : a.current
              ? -1
              : 1,
        ),
    [rows],
  );
  const [tab, setTab] = useState('all');
  const [sel, setSel] = useState(null);
  const [copied, setCopied] = useState(false);
  const bodyRef = useRef(null);
  const shown = notes.filter(NOTE_TABS.find((t) => t.key === tab).test);
  // Open the note asked for from elsewhere (Synopsis, sidebar index, Chart Review "Open Note").
  useEffect(() => {
    const hit = notes.find((r) => r.doc === docKey);
    if (hit) setSel(hit.id);
  }, [docKey, notes]);
  const open = shown.find((r) => r.id === sel) || shown[0] || null;
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [open && open.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const groups = shown.reduce((m, r) => {
    const g = r.current ? 'This Visit' : r.when || 'Earlier';
    (m[g] = m[g] || []).push(r);
    return m;
  }, {});
  const choose = (r) => {
    setSel(r.id);
    if (r.doc) onSelectDoc(r.doc);
  };
  const copy = async () => {
    if (!open) return;
    try {
      await navigator.clipboard.writeText(
        open.sections
          .map((s) => (s.head !== 'RECORD' ? s.head + '\n' : '') + (s.body || ''))
          .join('\n\n'),
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };
  const tool = (icon, label, onClick) => (
    <button
      key={label}
      type="button"
      className="ehr-tb"
      onClick={onClick}
      disabled={!onClick}
      title={onClick ? label : LOCKED}
    >
      <i className={'bi ' + icon} /> {label}
    </button>
  );

  return (
    <div className="ehr-notesact">
      <div className="ehr-acthead">
        <h2>Notes</h2>
        <div className="sp" />
        <label className="ehr-notefind">
          <i className="bi bi-search" />
          <input
            ref={findRef}
            value={find}
            onChange={(e) => setFind(e.target.value)}
            placeholder="Find in notes (Ctrl+F)"
            aria-label="Find in notes"
          />
        </label>
      </div>
      <div className="ehr-subtabs" role="tablist" aria-label="Note types">
        {NOTE_TABS.map((t) => {
          const n = notes.filter(t.test).length;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              className={tab === t.key ? 'on' : ''}
              onClick={() => setTab(t.key)}
            >
              {t.label}
              {n > 0 && t.key !== 'all' && <small>{n}</small>}
            </button>
          );
        })}
      </div>
      <div className="ehr-notecount">
        Number of notes shown: {shown.length} out of {notes.length}. All loaded.
      </div>
      <div className="ehr-notesgrid">
        <nav className="ehr-notelist" aria-label="Notes">
          <div className="hd">Date</div>
          {Object.entries(groups).map(([g, list]) => (
            <div key={g}>
              <div className="grp">{g}</div>
              {list.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className={'it' + (open && open.id === r.id ? ' on' : '')}
                  onClick={() => choose(r)}
                >
                  <b>{r.cells.author || 'Provider'}</b>
                  <span>
                    {r.cells.desc && r.cells.desc !== r.cells.type ? r.cells.desc : r.cells.type}
                  </span>
                </button>
              ))}
            </div>
          ))}
          {!shown.length && <div className="ehr-empty">No notes of this type.</div>}
        </nav>
        <section className="ehr-noteview">
          <div className="ehr-toolbar">
            {tool('bi-pencil', 'Edit')}
            {tool('bi-check2', 'Cosign w/o Note')}
            {tool(
              copied ? 'bi-clipboard-check' : 'bi-copy',
              copied ? 'Copied' : 'Copy',
              open ? copy : null,
            )}
            {tool('bi-x-lg', 'Delete')}
            {tool('bi-check2-circle', 'Sign')}
            {tool('bi-share', 'Route', onRoute)}
            {tool('bi-flag', 'Flag For Chart Correction')}
            {tool('bi-tag', 'Tag')}
            {open &&
              open.prev &&
              (open.prev.codes || []).length > 0 &&
              tool('bi-box-arrow-in-down', 'Use Codes', () => onUseCodes(open.prev))}
          </div>
          {open ? (
            <div className="ehr-notebody" ref={bodyRef}>
              <div className="ehr-notehead">
                <div>
                  <b>{open.cells.author || 'Provider'}</b>
                  {open.cells.spec && <small>{open.cells.spec}</small>}
                  {open.cells.dept && <small>{open.cells.dept}</small>}
                </div>
                <div>
                  <b>{open.cells.type}</b>
                  <small>{open.cells.status}</small>
                </div>
                <div className="when">Encounter Date: {open.cells.encDate || open.when || '—'}</div>
              </div>
              {handwritten && open.current && (
                <div className="pill warn">
                  ✎ Scanned handwritten chart — transcribe from the note
                </div>
              )}
              <ReportView
                title={open.cells.desc !== open.cells.type ? open.cells.desc : ''}
                sections={open.sections}
                find={find}
              />
            </div>
          ) : (
            <div className="ehr-empty">Select a note.</div>
          )}
        </section>
      </div>
    </div>
  );
}
