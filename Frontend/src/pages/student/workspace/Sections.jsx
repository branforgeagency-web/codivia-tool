/* CODIVIA workspace — coding sections: diagnoses, E/M level, charge lines, procedures, abstract, MS-DRG. */
import { useMemo, useState } from 'react';
import { emGrid, isEM, LETTERS, norm, uid } from './model.js';

// `lists` = the reference lists from GET /reference/work-queue (useReference).
const opts = (lists, key) => (lists && lists[key]) || [];

const move = (arr, from, to) => {
  const a = arr.slice();
  const [x] = a.splice(from, 1);
  a.splice(to, 0, x);
  return a;
};

export function EvidenceChips({ row, evidence, docs, onGo }) {
  const ev = (row.ev || []).map((id) => evidence.find((e) => e.id === id)).filter(Boolean);
  if (!ev.length) return <span className="wsx-evchip none">no evidence linked</span>;
  return ev.map((e) => (
    <button key={e.id} type="button" className="wsx-evchip" title={'“' + e.text + '”'} onClick={() => onGo(e)}>
      📎 {((docs.find((d) => d.key === e.doc) || {}).title || 'Doc').split(' ')[0]}
    </button>
  ));
}

// ---------- diagnoses ----------
export function DxSection({ draft, change, set, lists, readOnly, evidence, docs, onGoEvidence, onInfo, removeDx }) {
  const [dragId, setDragId] = useState(null);
  const [over, setOver] = useState(null);
  const reorder = (from, to) => change((d) => (d.dx = move(d.dx, from, to)));
  return (
    <div className="sec">
      <div className="sh">
        <h3>Diagnoses</h3>
        <span className="hint">
          {readOnly ? 'As billed.' : `Drag ⣿ to re-sequence. ${set.inpatient ? 'Row 1 is the principal diagnosis (PDx).' : 'A is the primary diagnosis.'}`}
        </span>
        <span className="r">
          {draft.dx.length} of {set.maxDx}
        </span>
      </div>
      {draft.dx.length ? (
        draft.dx.map((x, i) => (
          <div
            key={x.id}
            className={'wsx-dx' + (dragId === x.id ? ' dragging' : '') + (over === x.id ? ' over' : '')}
            draggable={!readOnly}
            onDragStart={() => setDragId(x.id)}
            onDragEnd={() => {
              setDragId(null);
              setOver(null);
            }}
            onDragOver={(e) => {
              if (dragId == null) return;
              e.preventDefault();
              setOver(x.id);
            }}
            onDrop={(e) => {
              e.preventDefault();
              const from = draft.dx.findIndex((r) => r.id === dragId);
              if (from > -1) reorder(from, i);
              setDragId(null);
              setOver(null);
            }}
          >
            {!readOnly && <span className="grip" title="Drag to re-sequence">⣿</span>}
            {set.inpatient ? <span className={'seqb' + (i === 0 ? ' p' : '')}>{i === 0 ? 'PDx' : i + 1}</span> : <span className="letter">{LETTERS[i]}</span>}
            <span className="code">{x.code}</span>
            <span className="desc">
              {x.desc || '—'} {!set.inpatient && i === 0 && <span className="pill brand">Primary</span>}
              {set.inpatient && (
                <div>
                  <EvidenceChips row={x} evidence={evidence} docs={docs} onGo={onGoEvidence} />
                </div>
              )}
            </span>
            {set.inpatient && (
              <select
                className={'wsx-poa' + (x.poa ? '' : ' missing')}
                value={x.poa || ''}
                disabled={readOnly}
                aria-label={'POA for ' + x.code}
                onChange={(e) => change((d) => (d.dx[i].poa = e.target.value))}
              >
                <option value="">POA?</option>
                {opts(lists, 'poa').map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            )}
            <button type="button" className="ibtn" title="Tabular & notes" onClick={() => onInfo(x.code)}>
              ⓘ
            </button>
            {!readOnly && (
              <>
                <button type="button" className="ibtn" disabled={i === 0} title="Move up" onClick={() => reorder(i, i - 1)}>
                  ▲
                </button>
                <button type="button" className="ibtn" disabled={i === draft.dx.length - 1} title="Move down" onClick={() => reorder(i, i + 1)}>
                  ▼
                </button>
                <button type="button" className="ibtn x" title="Remove" onClick={() => removeDx(x.id)}>
                  ✕
                </button>
              </>
            )}
          </div>
        ))
      ) : (
        <div className="empty">No diagnoses yet. Use the encoder above (Ctrl+K), or select text in a document and search it.</div>
      )}
    </div>
  );
}

// ---------- E/M level of service ----------
export function EmSection({ draft, change, chart, describe, lists }) {
  const grid = emGrid(lists, draft.ptGrid);
  const em = draft.lines.find((l) => isEM(norm(l.code)));
  const t = parseInt(draft.emTime, 10);
  const fit = t > 0 && draft.ptGrid !== 'ed' ? grid.filter((g) => g.minutes && t >= g.minutes).pop() : null;
  const pick = (code) =>
    change((d) => {
      const at = d.lines.findIndex((l) => isEM(norm(l.code)));
      if (at > -1) {
        if (norm(d.lines[at].code) === code) d.lines.splice(at, 1);
        else Object.assign(d.lines[at], { code, desc: describe(code) });
      } else d.lines.unshift({ id: uid('l'), code, desc: describe(code), mods: ['', '', '', ''], units: 1, ptrs: d.dx.slice(0, 4).map((x) => x.id) });
    });
  const hasG = draft.lines.some((l) => norm(l.code) === 'G2211');
  const e = chart.encounter || {};
  return (
    <div className="sec">
      <div className="sh">
        <h3>Level of service (E/M)</h3>
        <span className="hint">Choosing a level puts it on charge line 1.</span>
      </div>
      <div className="wsx-los">
        <span className="lbl">Patient</span>
        <div>
          <div className="seg">
            {opts(lists, 'emGrids').map((g) => (
              <button key={g.value} type="button" className={draft.ptGrid === g.value ? 'on' : ''} onClick={() => change((d) => (d.ptGrid = g.value))}>
                {g.label}
              </button>
            ))}
          </div>
          {e.ptype && (
            <span className="muted" style={{ marginLeft: 10, fontSize: 13 }}>
              Chart: {e.ptype === 'new' ? 'new patient' : 'established'}
              {e.lastSeen ? ', last seen ' + e.lastSeen : ''}
            </span>
          )}
        </div>
        <span className="lbl">Level (MDM{draft.ptGrid !== 'ed' ? ' · time' : ''})</span>
        <div className="wsx-lvls" style={{ gridTemplateColumns: `repeat(${grid.length},1fr)` }}>
          {grid.map((g) => (
            <button key={g.code} type="button" className={'wsx-lv' + (em && norm(em.code) === g.code ? ' on' : '')} onClick={() => pick(g.code)}>
              <span className="code">{g.code}</span>
              <small>
                {g.mdm}
                {g.minutes ? ` · ${g.minutes}+ min` : ''}
              </small>
            </button>
          ))}
        </div>
        {draft.ptGrid !== 'ed' && (
          <>
            <span className="lbl">Total time</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <input className="inp" style={{ width: 90 }} inputMode="numeric" placeholder="min" value={draft.emTime} onChange={(ev) => change((d) => (d.emTime = ev.target.value.replace(/\D/g, '').slice(0, 4)))} aria-label="Total time in minutes" />
              <span className="muted">{!t ? '' : fit ? <>Time alone supports <b>{fit.code}</b></> : 'Below the time thresholds'}</span>
              <button
                type="button"
                className="btn sm"
                style={{ marginLeft: 'auto' }}
                onClick={() =>
                  change((d) => {
                    if (hasG) d.lines = d.lines.filter((l) => norm(l.code) !== 'G2211');
                    else {
                      const at = d.lines.findIndex((l) => isEM(norm(l.code))) + 1;
                      d.lines.splice(at, 0, { id: uid('l'), code: 'G2211', desc: describe('G2211'), mods: ['', '', '', ''], units: 1, ptrs: d.dx[0] ? [d.dx[0].id] : [] });
                    }
                  })
                }
              >
                {hasG ? '✓ G2211 added' : '+ Add-on G2211'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ---------- charge lines ----------
function CompareTable({ original, draft, describe }) {
  const codes = [...new Set([...original.lines.map((l) => norm(l.code)), ...draft.lines.map((l) => norm(l.code))])];
  const ptrCodes = (l, dx) => (l.ptrs || []).map((p) => (dx ? (dx.find((x) => x.id === p) || {}).code : p)).filter(Boolean).join(', ');
  const cell = (a, b) =>
    a === b ? (
      b || '—'
    ) : (
      <>
        {a ? <span className="del">{a}</span> : null} <span className="chg add">{b || '—'}</span>
      </>
    );
  const dxo = original.dx.map((x) => x.code).join(' · ');
  const dxn = draft.dx.map((x) => x.code).join(' · ');
  return (
    <>
      <div style={{ marginBottom: 10, fontSize: 13.5 }}>
        <b>Diagnoses</b>
        <br />
        {dxo === dxn ? dxn : (
          <>
            <span className="del">{dxo}</span>
            <br />
            <span className="chg add">{dxn || '—'}</span>
          </>
        )}
      </div>
      <table className="wsx-lines">
        <thead>
          <tr>
            <th>Code</th>
            <th>Modifiers</th>
            <th>Units</th>
            <th>Dx pointers</th>
          </tr>
        </thead>
        <tbody>
          {codes.map((c) => {
            const a = original.lines.find((l) => norm(l.code) === c);
            const b = draft.lines.find((l) => norm(l.code) === c);
            if (a && !b)
              return (
                <tr key={c}>
                  <td className="code del">{a.code}</td>
                  <td colSpan={3} className="del">Removed</td>
                </tr>
              );
            if (!a && b)
              return (
                <tr key={c}>
                  <td className="code add">{b.code}</td>
                  <td colSpan={3} className="add">
                    Added · mods {b.mods.filter(Boolean).join(' ') || '—'} · units {b.units} · dx {ptrCodes(b, draft.dx) || '—'}
                  </td>
                </tr>
              );
            return (
              <tr key={c}>
                <td className="code" title={describe(c)}>{b.code}</td>
                <td className="code">{cell((a.mods || []).filter(Boolean).join(' '), b.mods.filter(Boolean).join(' '))}</td>
                <td>{cell(String(a.units || 1), String(b.units))}</td>
                <td className="code">{cell(ptrCodes(a), ptrCodes(b, draft.dx))}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}

export function LinesSection({ draft, change, edits, original, describe, lists, readOnly, remits, noAdd, children }) {
  const [mode, setMode] = useState('current');
  const errLines = new Set(edits.filter((e) => e.sev === 'err' && e.line).map((e) => e.line));
  const warnLines = new Set(edits.filter((e) => e.sev === 'warn' && e.line).map((e) => e.line));
  const setLine = (i, fn) => change((d) => fn(d.lines[i]));
  return (
    <div className="sec">
      <div className="sh">
        <h3>Charge lines</h3>
        <span className="hint">{mode === 'current' && !readOnly ? 'Click letters to link diagnoses — first = main reason' : ''}</span>
        {original && (
          <span className="r">
            <div className="seg">
              {[['current', 'Current'], ['original', 'Original'], ['compare', 'Compare']].map(([k, l]) => (
                <button key={k} type="button" className={mode === k ? 'on' : ''} onClick={() => setMode(k)}>
                  {l}
                </button>
              ))}
            </div>
          </span>
        )}
      </div>
      {mode === 'original' && original ? (
        <>
          <div className="muted" style={{ marginBottom: 8, fontSize: 13 }}>
            As entered{original.enteredBy ? ' by ' + original.enteredBy : ''} · Dx: {original.dx.map((x, i) => `${LETTERS[i]} ${x.code}`).join(' · ')}
          </div>
          <table className="wsx-lines">
            <thead>
              <tr>
                <th>#</th>
                <th>Code</th>
                <th>Modifiers</th>
                <th>Units</th>
                <th>Dx ptr</th>
              </tr>
            </thead>
            <tbody>
              {original.lines.map((l, i) => (
                <tr key={i}>
                  <td className="ln">{i + 1}</td>
                  <td>
                    <span className="code">{l.code}</span>
                    <div className="ds">{describe(l.code)}</div>
                  </td>
                  <td className="code">{(l.mods || []).filter(Boolean).join(' ') || '—'}</td>
                  <td>{l.units || 1}</td>
                  <td className="code">{(l.ptrs || []).map((p) => LETTERS[original.dx.findIndex((x) => norm(x.code) === norm(p))]).join(',') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : mode === 'compare' && original ? (
        <CompareTable original={original} draft={draft} describe={describe} />
      ) : draft.lines.length ? (
        <table className="wsx-lines">
          <thead>
            <tr>
              <th>#</th>
              <th>Code</th>
              <th>Modifiers</th>
              <th>Units</th>
              <th>Dx pointers</th>
              {remits && <th>Remit</th>}
              <th />
            </tr>
          </thead>
          <tbody>
            {draft.lines.map((l, i) => (
              <tr key={l.id} className={errLines.has(i + 1) ? 'flag' : warnLines.has(i + 1) ? 'wflag' : ''}>
                <td className="ln">{i + 1}</td>
                <td>
                  <span className="code">{l.code}</span>
                  <div className="ds" title={l.desc}>
                    {l.desc}
                  </div>
                </td>
                <td>
                  <div className="wsx-mods">
                    {l.mods.map((m, k) => (
                      <input
                        key={k}
                        className={'wsx-mod' + (m ? ' f' : '')}
                        maxLength={2}
                        list="wsx-modlist"
                        value={m}
                        disabled={readOnly}
                        aria-label={`Line ${i + 1} modifier ${k + 1}`}
                        onChange={(e) => setLine(i, (x) => (x.mods[k] = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 2)))}
                      />
                    ))}
                  </div>
                </td>
                <td>
                  <input className="wsx-units" type="number" min={1} max={9999} value={l.units} disabled={readOnly} aria-label={`Line ${i + 1} units`} onChange={(e) => setLine(i, (x) => (x.units = Math.max(1, Math.min(9999, parseInt(e.target.value, 10) || 1))))} />
                </td>
                <td>
                  <div className="wsx-ptrs">
                    {draft.dx.length ? (
                      draft.dx.map((x, k) => (
                        <button
                          key={x.id}
                          type="button"
                          disabled={readOnly}
                          className={'wsx-pc' + (l.ptrs.includes(x.id) ? ' on' : '')}
                          title={x.code + ' — ' + x.desc}
                          onClick={() =>
                            setLine(i, (line) => {
                              if (line.ptrs.includes(x.id)) line.ptrs = line.ptrs.filter((p) => p !== x.id);
                              else if (line.ptrs.length < 4) line.ptrs.push(x.id);
                            })
                          }
                        >
                          {LETTERS[k]}
                        </button>
                      ))
                    ) : (
                      <span className="muted">add dx</span>
                    )}
                  </div>
                  {l.ptrs.length > 0 && (
                    <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>
                      Order: {l.ptrs.map((p) => LETTERS[draft.dx.findIndex((x) => x.id === p)]).join(' → ')}
                    </div>
                  )}
                </td>
                {remits && (
                  <td>
                    {remits[norm(l.code)] ? <span className={'pill remit ' + (remits[norm(l.code)] === 'CO-97' ? 'gray' : 'err')}>{remits[norm(l.code)]}</span> : <span className="muted">—</span>}
                  </td>
                )}
                <td>
                  {!readOnly && !noAdd && (
                    <button type="button" className="ibtn x" title="Remove line" onClick={() => change((d) => d.lines.splice(i, 1))}>
                      ✕
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="empty">No charge lines yet. Pick an E/M level above, or add a procedure with the encoder (CPT / HCPCS).</div>
      )}
      {children}
      <datalist id="wsx-modlist">
        {opts(lists, 'modifiers').map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </datalist>
    </div>
  );
}

// ---------- procedures (ICD-10-PCS) ----------
const PCS_AXES = ['Section', 'Body system', 'Root operation', 'Body part', 'Approach', 'Device', 'Qualifier'];
export function PcsSection({ draft, change, evidence, docs, onGoEvidence, readOnly }) {
  return (
    <div className="sec">
      <div className="sh">
        <h3>Procedures (ICD-10-PCS)</h3>
        <span className="hint">Find codes with the encoder (code set: ICD-10-PCS). Row 1 is the principal procedure.</span>
      </div>
      {draft.pcs.length ? (
        <table className="wsx-simple">
          <thead>
            <tr>
              <th>#</th>
              <th>Code</th>
              <th>Description</th>
              <th>Date</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {draft.pcs.map((p, i) => (
              <tr key={p.id}>
                <td>{i === 0 ? <span className="pill brand">Princ.</span> : i + 1}</td>
                <td>
                  <span className="code">{p.code}</span>
                  <div className="wsx-pcschars">
                    {norm(p.code)
                      .split('')
                      .slice(0, 7)
                      .map((ch, k) => (
                        <span key={k} title={PCS_AXES[k]}>
                          {ch}
                        </span>
                      ))}
                  </div>
                </td>
                <td style={{ fontSize: 13 }}>
                  {p.desc}
                  <div>
                    <EvidenceChips row={p} evidence={evidence} docs={docs} onGo={onGoEvidence} />
                  </div>
                </td>
                <td>
                  <input className="inp" style={{ height: 32, width: 112 }} placeholder="MM/DD/YYYY" value={p.date} disabled={readOnly} onChange={(e) => change((d) => (d.pcs[i].date = e.target.value.slice(0, 20)))} aria-label="Procedure date" />
                </td>
                <td>
                  {!readOnly && (
                    <button type="button" className="ibtn x" title="Remove" onClick={() => change((d) => d.pcs.splice(i, 1))}>
                      ✕
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="empty">No procedures coded.</div>
      )}
    </div>
  );
}

// ---------- abstract (UB-04) ----------
export function AbstractSection({ draft, change, chart, lists, readOnly }) {
  const e = chart.encounter || {};
  const sel = (k, label, choices) => (
    <div className="field">
      <label htmlFor={'abs-' + k}>{label}</label>
      <select id={'abs-' + k} className="inp" value={draft.abs[k] || ''} disabled={readOnly} onChange={(ev) => change((d) => (d.abs[k] = ev.target.value))}>
        <option value="">— choose —</option>
        {choices.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
  return (
    <div className="sec">
      <div className="sh">
        <h3>Abstract (UB-04)</h3>
      </div>
      <div className="wsx-form2">
        <div className="field">
          <span className="lbl">Admission date</span>
          <div className="inp" style={{ background: '#F1EFEB', display: 'flex', alignItems: 'center' }}>
            {e.admit || '—'}
          </div>
        </div>
        <div className="field">
          <span className="lbl">Discharge date</span>
          <div className="inp" style={{ background: '#F1EFEB', display: 'flex', alignItems: 'center' }}>
            {e.discharge || '—'}
          </div>
        </div>
        {sel('admitType', 'Admission type (FL 14)', opts(lists, 'admitTypes'))}
        {sel('admitSrc', 'Point of origin (FL 15)', opts(lists, 'admitSources'))}
        {sel('disp', 'Discharge disposition (FL 17)', opts(lists, 'dispositions'))}
        <div className="field">
          <label htmlFor="abs-att">Attending physician</label>
          <input id="abs-att" className="inp" value={draft.abs.attending || ''} disabled={readOnly} maxLength={120} onChange={(ev) => change((d) => (d.abs.attending = ev.target.value))} />
        </div>
      </div>
      <p className="muted" style={{ fontSize: 13, margin: '12px 0 0' }}>
        Disposition changes the MS-DRG payment for post-acute transfer DRGs and is a common audit finding. Read the discharge summary.
      </p>
    </div>
  );
}

// ---------- MS-DRG ----------
export function DrgSection({ draft, change, original, lists, readOnly }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const list = useMemo(() => {
    const t = q.toLowerCase().trim();
    const all = opts(lists, 'drgs').map((d) => d.value + ' — ' + d.label);
    return (t ? all.filter((o) => o.toLowerCase().includes(t)) : all).slice(0, 15);
  }, [q, lists]);
  const [num, ...rest] = String(draft.drg || '').split(' — ');
  return (
    <div className="sec">
      <div className="sh">
        <h3>MS-DRG</h3>
        <span className="hint">Assign the DRG from the principal diagnosis, procedures and CC/MCC secondary diagnoses.</span>
      </div>
      {draft.drg ? (
        <div className="wsx-drgt" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div>
            <div className="muted" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.4 }}>Assigned MS-DRG</div>
            <div className="n">{num}</div>
            <div>{rest.join(' — ')}</div>
          </div>
          {!readOnly && (
            <button type="button" className="btn sm" style={{ marginLeft: 'auto' }} onClick={() => change((d) => (d.drg = ''))}>
              Change
            </button>
          )}
        </div>
      ) : (
        <div className="wsx-relative">
          <input
            className="inp"
            value={q}
            placeholder="Search DRG number or title…"
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 160)}
            aria-label="Search MS-DRG"
          />
          {open && (
            <div className="wsx-drop">
              {list.map((o) => (
                <button
                  key={o}
                  type="button"
                  className="wsx-er"
                  style={{ gridTemplateColumns: '60px 1fr' }}
                  onMouseDown={() => {
                    change((d) => (d.drg = o));
                    setQ('');
                  }}
                >
                  <span className="code">{o.split(' — ')[0]}</span>
                  <span>{o.split(' — ').slice(1).join(' — ')}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <table className="wsx-simple" style={{ marginTop: 12 }}>
        <tbody>
          <tr>
            <td className="muted" style={{ width: 160 }}>Principal diagnosis</td>
            <td className="code">{draft.dx[0] ? draft.dx[0].code : '—'}</td>
          </tr>
          <tr>
            <td className="muted">Secondary diagnoses</td>
            <td>{draft.dx.length > 1 ? draft.dx.slice(1).map((x) => x.code).join(' · ') : '—'}</td>
          </tr>
          <tr>
            <td className="muted">Procedures</td>
            <td>{draft.pcs.map((p) => p.code).join(' · ') || '—'}</td>
          </tr>
          {original && original.drg && (
            <tr>
              <td className="muted">Pre-coded DRG</td>
              <td>
                <span className="code">{original.drg}</span> <span className="muted">— verify it against the documentation</span>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
