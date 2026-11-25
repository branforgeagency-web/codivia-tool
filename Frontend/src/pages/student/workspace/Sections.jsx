/* CODIVIA workspace — coding sections: diagnoses, E/M level, CPT / HCPCS lists, charge lines (claim grid),
   procedures, abstract, MS-DRG. */
import { useMemo, useState } from 'react';
import { DX_CLASS_LABEL, dxClassOptions, firstTerm, isEM, LETTERS, norm, uid } from './model.js';

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
// Sequence | ICD-10-CM code | description | diagnosis type | (POA) | actions. The first-listed diagnosis
// (primary on OP charts, principal on IP charts) always stays in row 1; secondary diagnoses can be
// re-sequenced (drag ⣿ or ▲▼). Edit changes the code or the classification of one row.
// editDx(id, code, cls) -> error message | '' (WorkspacePage checks the code and the one-first-listed rule).
function DxEditRow({ x, set, editDx, onDone, colSpan }) {
  const [code, setCode] = useState(x.code);
  const [cls, setCls] = useState(x.cls || 'secondary');
  const [msg, setMsg] = useState('');
  const save = () => {
    const err = editDx(x.id, code.trim(), cls);
    if (err) setMsg(err);
    else onDone();
  };
  return (
    <tr className="edit">
      <td colSpan={colSpan}>
        <div className="wsx-dxedit">
          <input
            className="inp code"
            value={code}
            maxLength={10}
            autoFocus
            spellCheck={false}
            aria-label="ICD-10-CM code"
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setMsg('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') save();
              if (e.key === 'Escape') onDone();
            }}
          />
          <select className="inp" value={cls} aria-label="Diagnosis type" onChange={(e) => setCls(e.target.value)}>
            {dxClassOptions(set).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <button type="button" className="btn sm primary" onClick={save}>
            Save
          </button>
          <button type="button" className="btn sm" onClick={onDone}>
            Cancel
          </button>
          {msg && (
            <span className="err" role="alert">
              {msg}
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}

// letters: show each diagnosis's pointer letter (A, B, C …), the letter charge lines link to.
export function DxSection({ draft, change, set, lists, readOnly, evidence, docs, onGoEvidence, onInfo, removeDx, editDx, letters }) {
  const [dragId, setDragId] = useState(null);
  const [over, setOver] = useState(null);
  const [editing, setEditing] = useState(null);
  const P = set.firstListed;
  const pinned = draft.dx[0] && draft.dx[0].cls === P; // row 1 holds the first-listed diagnosis
  const movable = (i) => !readOnly && !(pinned && i === 0) && draft.dx[i].cls !== P;
  const canMoveTo = (to) => !(pinned && to === 0);
  const reorder = (from, to) => canMoveTo(to) && change((d) => (d.dx = move(d.dx, from, to)));
  const cols = 5 + (set.inpatient ? 1 : 0);
  const typeLabel = (x) =>
    x.cls === P ? (
      <span className="pill brand">{DX_CLASS_LABEL[P]}</span>
    ) : x.cls === 'secondary' ? (
      <span className="pill gray">Secondary</span>
    ) : x.cls ? (
      <span className="pill err" title={`Not used on ${set.ip ? 'inpatient' : 'outpatient'} charts — edit it`}>
        {DX_CLASS_LABEL[x.cls]} ✕
      </span>
    ) : (
      <span className="pill warn">Not classified</span>
    );
  return (
    <div className="sec">
      <div className="sh">
        <h3>Diagnoses</h3>
        <span className="hint">
          {readOnly
            ? 'As billed.'
            : `Sequence 1 is the ${firstTerm(set)}${set.ip ? '' : ' (first-listed)'}. Drag ⣿ or use ▲▼ to re-sequence secondary diagnoses.${letters ? ' Letters A, B, C… are linked to charge lines in step 5.' : ''}`}
        </span>
        <span className="r">
          {draft.dx.length} of {set.maxDx}
        </span>
      </div>
      {draft.dx.length ? (
        <table className="wsx-lines wsx-dxt">
          <thead>
            <tr>
              <th>Seq</th>
              <th>ICD-10-CM</th>
              <th>Description</th>
              <th>Diagnosis type</th>
              {set.inpatient && <th>POA</th>}
              <th className="act">Actions</th>
            </tr>
          </thead>
          <tbody>
            {draft.dx.map((x, i) =>
              editing === x.id ? (
                <DxEditRow key={x.id} x={x} set={set} editDx={editDx} colSpan={cols} onDone={() => setEditing(null)} />
              ) : (
                <tr
                  key={x.id}
                  className={(dragId === x.id ? 'dragging' : '') + (over === x.id ? ' over' : '')}
                  draggable={movable(i)}
                  onDragStart={() => setDragId(x.id)}
                  onDragEnd={() => {
                    setDragId(null);
                    setOver(null);
                  }}
                  onDragOver={(e) => {
                    if (dragId == null || !canMoveTo(i)) return;
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
                  <td className="ln">
                    {movable(i) ? (
                      <span className="grip" title="Drag to re-sequence">
                        ⣿
                      </span>
                    ) : (
                      <span className="grip off" aria-hidden="true">
                        ⣿
                      </span>
                    )}
                    <span className={'seqb' + (x.cls === P ? ' p' : '')}>{i + 1}</span>
                  </td>
                  <td className="code">
                    {letters && (
                      <span className="wsx-dxl" title={`Pointer ${LETTERS[i]} — link it to charge lines in step 5`}>
                        {LETTERS[i]}
                      </span>
                    )}
                    {x.code}
                  </td>
                  <td className="dsx">
                    {x.desc || '—'}
                    {set.inpatient && (
                      <div>
                        <EvidenceChips row={x} evidence={evidence} docs={docs} onGo={onGoEvidence} />
                      </div>
                    )}
                  </td>
                  <td>{typeLabel(x)}</td>
                  {set.inpatient && (
                    <td>
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
                    </td>
                  )}
                  <td className="act">
                    <button type="button" className="ibtn" title="Tabular & notes" onClick={() => onInfo(x.code)}>
                      ⓘ
                    </button>
                    {!readOnly && (
                      <>
                        <button type="button" className="ibtn" disabled={!movable(i) || !canMoveTo(i - 1) || i === 0} title="Move up" aria-label={'Move ' + x.code + ' up'} onClick={() => reorder(i, i - 1)}>
                          ▲
                        </button>
                        <button type="button" className="ibtn" disabled={!movable(i) || i === draft.dx.length - 1} title="Move down" aria-label={'Move ' + x.code + ' down'} onClick={() => reorder(i, i + 1)}>
                          ▼
                        </button>
                        {editDx && (
                          <button type="button" className="ibtn" title="Edit" aria-label={'Edit ' + x.code} onClick={() => setEditing(x.id)}>
                            ✎
                          </button>
                        )}
                        <button type="button" className="ibtn x" title="Delete" aria-label={'Delete ' + x.code} onClick={() => removeDx(x.id)}>
                          ✕
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      ) : (
        <div className="empty">No diagnoses yet. Choose the diagnosis type, type an ICD-10-CM code in the box above and press Enter.</div>
      )}
    </div>
  );
}

// ---------- E/M level of service ----------
// The student types the E/M level code themselves: no level grid, no MDM / time suggestions.
// The saved level is a charge line (added as line 1; the line order is set in step 5).
// initial: an E/M code moved here from the CPT box.
export function EmSection({ draft, change, chart, describe, lists, initial }) {
  const [val, setVal] = useState(initial || '');
  const [msg, setMsg] = useState('');
  const em = draft.lines.find((l) => isEM(norm(l.code)));
  const e = chart.encounter || {};
  const typed = norm(val);
  const save = () => {
    if (!typed) return;
    if (!isEM(typed) || !describe(typed)) return setMsg(`${val.trim().toUpperCase()} is not an E/M level code.`);
    change((d) => {
      const at = d.lines.findIndex((l) => isEM(norm(l.code)));
      if (at > -1) Object.assign(d.lines[at], { code: typed, desc: describe(typed) });
      else d.lines.unshift({ id: uid('l'), code: typed, desc: describe(typed), mods: ['', '', '', ''], units: 1, ptrs: [] });
    });
    setVal('');
    setMsg('');
  };
  const remove = () => change((d) => (d.lines = d.lines.filter((l) => !isEM(norm(l.code)))));
  return (
    <div className="sec">
      <div className="sh">
        <h3>Level of service (E/M)</h3>
        <span className="hint">Type the E/M code. Its modifiers (e.g. 25) and diagnosis links are added in step 5.</span>
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
        <span className="lbl">E/M level</span>
        <div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              className="inp wsx-emcode"
              value={val}
              maxLength={6}
              autoComplete="off"
              spellCheck={false}
              placeholder={em ? 'Change level…' : 'E/M code'}
              aria-label="E/M level code"
              onChange={(ev) => {
                setVal(ev.target.value.toUpperCase());
                setMsg('');
              }}
              onKeyDown={(ev) => {
                if (ev.key === 'Enter') {
                  ev.preventDefault();
                  save();
                }
              }}
            />
            <button type="button" className="btn sm primary" onClick={save} disabled={!typed}>
              Save
            </button>
            {em && (
              <span className="wsx-emsaved">
                <span className="code">{em.code}</span>
                <span className="muted">{em.desc}</span>
                <button type="button" className="ibtn x" title="Remove E/M level" onClick={remove}>
                  ✕
                </button>
              </span>
            )}
          </div>
          {msg && (
            <div className="err" role="alert" style={{ fontSize: 12.5, marginTop: 5, color: 'var(--w-err)', fontWeight: 600 }}>
              {msg}
            </div>
          )}
        </div>
        {draft.ptGrid !== 'ed' && (
          <>
            <span className="lbl">Total time</span>
            <div>
              <input className="inp" style={{ width: 90 }} inputMode="numeric" placeholder="min" value={draft.emTime} onChange={(ev) => change((d) => (d.emTime = ev.target.value.replace(/\D/g, '').slice(0, 4)))} aria-label="Total time in minutes" />
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

const clampUnits = (v) => Math.max(1, Math.min(9999, parseInt(v, 10) || 1));

// ---------- steps 2 (CPT) and 3 (HCPCS): the charge lines entered in that step ----------
// Code, description and units only — modifiers and diagnosis links are step 5.
export function ChargeList({ draft, change, edits, filter, title, hint, empty }) {
  const rows = draft.lines.map((l, i) => [l, i]).filter(([l]) => filter(l));
  const errLines = new Set(edits.filter((e) => e.sev === 'err' && e.line).map((e) => e.line));
  return (
    <div className="sec">
      <div className="sh">
        <h3>{title}</h3>
        <span className="hint">{hint}</span>
        <span className="r">{rows.length}</span>
      </div>
      {rows.length ? (
        <table className="wsx-lines">
          <thead>
            <tr>
              <th title="Line number on the claim">Line</th>
              <th>Code</th>
              <th>Description</th>
              <th>Units</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map(([l, i]) => (
              <tr key={l.id} className={errLines.has(i + 1) ? 'flag' : ''}>
                <td className="ln">{i + 1}</td>
                <td className="code">{l.code}</td>
                <td className="dsx">{l.desc || '—'}</td>
                <td>
                  <input className="wsx-units" type="number" min={1} max={9999} value={l.units} aria-label={`${l.code} units`} onChange={(e) => change((d) => (d.lines[i].units = clampUnits(e.target.value)))} />
                </td>
                <td className="act">
                  <button type="button" className="ibtn x" title="Remove" aria-label={'Remove ' + l.code} onClick={() => change((d) => d.lines.splice(i, 1))}>
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="empty">{empty}</div>
      )}
    </div>
  );
}

// ---------- step 5: the claim (CMS-1500 box 24) — line order, modifiers, Dx pointers, units ----------
// Each line links up to 4 diagnoses (ICD → CPT). Pointer 1 is the main reason for that service.
function ClaimTable({ draft, change, edits }) {
  const errLines = new Set(edits.filter((e) => e.sev === 'err' && e.line).map((e) => e.line));
  const warnLines = new Set(edits.filter((e) => e.sev === 'warn' && e.line).map((e) => e.line));
  const setLine = (i, fn) => change((d) => fn(d.lines[i]));
  const moveLine = (from, to) => change((d) => (d.lines = move(d.lines, from, to)));
  const setPtr = (i, k, id) =>
    setLine(i, (line) => {
      const p = [...line.ptrs, '', '', '', ''].slice(0, 4);
      p[k] = id;
      line.ptrs = p.filter(Boolean);
    });
  if (!draft.lines.length) return <div className="empty">No charge lines yet. Add codes in steps 1–3 (E/M, CPT, HCPCS) first.</div>;
  return (
    <table className="wsx-lines wsx-claim">
      <thead>
        <tr>
          <th>Line</th>
          <th>Code</th>
          <th>Modifiers 1–4</th>
          <th>Dx pointers (link ICD)</th>
          <th>Units</th>
        </tr>
      </thead>
      <tbody>
        {draft.lines.map((l, i) => (
          <tr key={l.id} className={errLines.has(i + 1) ? 'flag' : warnLines.has(i + 1) ? 'wflag' : ''}>
            <td className="ln">
              <div className="wsx-lnord">
                <button type="button" className="ibtn" disabled={i === 0} title="Move line up" aria-label={'Move ' + l.code + ' up'} onClick={() => moveLine(i, i - 1)}>
                  ▲
                </button>
                <span>{i + 1}</span>
                <button type="button" className="ibtn" disabled={i === draft.lines.length - 1} title="Move line down" aria-label={'Move ' + l.code + ' down'} onClick={() => moveLine(i, i + 1)}>
                  ▼
                </button>
              </div>
            </td>
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
                    aria-label={`Line ${i + 1} modifier ${k + 1}`}
                    onChange={(e) => setLine(i, (x) => (x.mods[k] = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 2)))}
                  />
                ))}
              </div>
            </td>
            <td>
              {draft.dx.length ? (
                <div className="wsx-ptrsel">
                  {[0, 1, 2, 3].map((k) => {
                    const cur = l.ptrs[k] || '';
                    return (
                      <select
                        key={k}
                        className={'inp' + (cur ? ' f' : '')}
                        value={cur}
                        disabled={k > l.ptrs.length}
                        aria-label={`Line ${i + 1} diagnosis pointer ${k + 1}`}
                        title={k === 0 ? 'Pointer 1 — the main reason for this service' : `Pointer ${k + 1}`}
                        onChange={(e) => setPtr(i, k, e.target.value)}
                      >
                        <option value="">{k + 1} —</option>
                        {draft.dx.map((x, j) => (
                          <option key={x.id} value={x.id} disabled={x.id !== cur && l.ptrs.includes(x.id)}>
                            {LETTERS[j]} · {x.code}
                          </option>
                        ))}
                      </select>
                    );
                  })}
                </div>
              ) : (
                <span className="muted">Add diagnoses in step 4</span>
              )}
            </td>
            <td>
              <input className="wsx-units" type="number" min={1} max={9999} value={l.units} aria-label={`Line ${i + 1} units`} onChange={(e) => setLine(i, (x) => (x.units = clampUnits(e.target.value)))} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// grid: the step-5 claim grid (line order ▲▼, Dx pointer dropdowns) in place of the letter-button table.
export function LinesSection({ draft, change, edits, original, describe, lists, readOnly, remits, noAdd, children, grid }) {
  const [mode, setMode] = useState('current');
  const errLines = new Set(edits.filter((e) => e.sev === 'err' && e.line).map((e) => e.line));
  const warnLines = new Set(edits.filter((e) => e.sev === 'warn' && e.line).map((e) => e.line));
  const setLine = (i, fn) => change((d) => fn(d.lines[i]));
  return (
    <div className="sec">
      <div className="sh">
        <h3>{grid ? 'Modifiers & diagnosis links' : 'Charge lines'}</h3>
        <span className="hint">
          {mode !== 'current' || readOnly
            ? ''
            : grid
              ? 'Link each line to its diagnoses (pointer 1 = main reason) and add modifiers. Put the highest-paying service on line 1 with ▲▼ — later procedures are usually paid at a reduced rate.'
              : 'Click letters to link diagnoses — first = main reason'}
        </span>
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
      ) : grid ? (
        <ClaimTable draft={draft} change={change} edits={edits} />
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
                  <input className="wsx-units" type="number" min={1} max={9999} value={l.units} disabled={readOnly} aria-label={`Line ${i + 1} units`} onChange={(e) => setLine(i, (x) => (x.units = clampUnits(e.target.value)))} />
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
        <div className="empty">No charge lines yet. Type a CPT / HCPCS code in the box above and press Enter, or pick an E/M level.</div>
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
        <span className="hint">Type ICD-10-PCS codes in the box above. Row 1 is the principal procedure.</span>
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
