/* CODIVIA workspace — encoder: search the code database, read the tabular notes, add the code. */
import { useEffect, useMemo, useState } from 'react';
import { get } from '../../../services/apiHelper.js';
import { CODE_NOTES } from '../../../services/endpoints.js';
import { searchCodeDB } from './model.js';

const NOTE_LABELS = { inc: 'Includes', ex1: 'Excludes1', ex2: 'Excludes2', use: 'Use additional code', first: 'Code first', also: 'Code also', note: 'Note' };
const SYS_LABEL = ['ICD-10', 'PCS', 'CPT', 'HCPCS'];

// Notes are shared by the encoder and the edits engine, so cache them for the page's lifetime.
const notesCache = new Map();
export function fetchNotes(code) {
  const key = String(code).toUpperCase();
  if (!notesCache.has(key)) notesCache.set(key, get(CODE_NOTES(key)).catch(() => ({ code: key, results: [] })));
  return notesCache.get(key);
}

export function Encoder({ codeDB, dbStatus, systems, q, setQ, sel, setSel, inputRef, actionsFor }) {
  const [sys, setSys] = useState(systems[0].key);
  const [notes, setNotes] = useState(null);
  const system = systems.find((s) => s.key === sys) || systems[0];
  const results = useMemo(() => searchCodeDB(codeDB, q, system.sys, 40), [codeDB, q, system]);

  useEffect(() => {
    setNotes(null);
    if (!sel || sel[0] !== 0) return undefined;
    let live = true;
    fetchNotes(sel[2]).then((n) => live && setNotes(n));
    return () => {
      live = false;
    };
  }, [sel]);

  return (
    <div className="wsx-enc">
      <div className="row">
        <select className="inp sys" value={sys} onChange={(e) => setSys(e.target.value)} aria-label="Code set">
          {systems.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
        <input
          ref={inputRef}
          className="inp"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setSel(null);
          }}
          placeholder={dbStatus === 'ready' ? 'Encoder: search a code or condition, e.g. “respiratory failure hypoxia”  (Ctrl+K)' : dbStatus === 'error' ? 'Code search unavailable — the code database failed to load' : 'Loading the code database…'}
          disabled={dbStatus === 'error'}
          aria-label="Search codes"
          autoComplete="off"
        />
      </div>
      {q.trim().length >= 2 && !sel && (
        <div className="wsx-encres" role="listbox">
          {results.length ? (
            results.map((r) => (
              <button type="button" key={r[0] + r[1]} className="wsx-er" onClick={() => setSel(r)}>
                <span className="code">{r[2]}</span>
                <span className="s">{SYS_LABEL[r[0]]}</span>
                <span>{r[3]}</span>
              </button>
            ))
          ) : (
            <div className="empty" style={{ border: 'none' }}>
              {codeDB ? 'No match. Try the main term (the condition), not the body part.' : dbStatus === 'error' ? 'The code database failed to load.' : 'Loading the code database…'}
            </div>
          )}
        </div>
      )}
      {sel && (
        <div className="wsx-tabular">
          <div className="hier">
            Tabular › {SYS_LABEL[sel[0]]} {sel[4] === 1 || sel[4] === '1' ? '· billable' : '· header (not billable)'}
          </div>
          <div>
            <span className="code" style={{ fontSize: 16 }}>
              {sel[2]}
            </span>{' '}
            {sel[3]}
          </div>
          {sel[0] === 0 &&
            (notes ? (
              notes.results.length ? (
                notes.results.map((r) =>
                  Object.entries(r.notes).map(([k, lines]) =>
                    (lines || []).slice(0, 6).map((line, i) => (
                      <div key={r.code + k + i} className={'wsx-tnote ' + k}>
                        <b>
                          {NOTE_LABELS[k] || k} · {r.code}
                        </b>
                        {line}
                      </div>
                    )),
                  ),
                )
              ) : (
                <div className="wsx-tnote">No instructional notes at this code.</div>
              )
            ) : (
              <div className="wsx-tnote">Loading tabular notes…</div>
            ))}
          {/\bunspecified\b/i.test(sel[3]) && (
            <div className="wsx-tnote ex2">
              <b>Specificity</b>Unspecified code — check the record for a more specific diagnosis.
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            {actionsFor(sel).map((a) => (
              <button key={a.label} type="button" className={'btn sm' + (a.primary ? ' primary' : '')} onClick={() => a.run(sel)} disabled={a.disabled}>
                {a.label}
              </button>
            ))}
            <button type="button" className="btn sm ghost" onClick={() => setSel(null)}>
              Back to results
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
