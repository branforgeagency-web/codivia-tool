/* CODIVIA workspace — direct code entry: the student types each code (no search dropdown) and saves
   it. One box per code set: CPT, HCPCS, ICD-10-PCS (inpatient facility), ICD-10-CM. */
import { useMemo, useState } from 'react';
import { norm } from './model.js';

// code (any punctuation / case) -> code DB row [sys, code, display, description, billable], per set.
const indexCache = new WeakMap();
function codeIndex(codeDB) {
  let idx = indexCache.get(codeDB);
  if (!idx) {
    idx = new Map();
    for (const r of codeDB) {
      const k = r[0] + ':' + norm(r[1]);
      if (!idx.has(k)) idx.set(k, r);
    }
    indexCache.set(codeDB, idx);
  }
  return idx;
}

const SET_LABELS = ['ICD-10-CM', 'ICD-10-PCS', 'CPT', 'HCPCS'];

// A code typed into the wrong box: which code set it belongs to, and the box on this chart that takes it.
function wrongBox(codeDB, typed, box, boxes) {
  const idx = codeIndex(codeDB);
  for (const s of [0, 1, 2, 3]) {
    if (box.sys.includes(s)) continue;
    const r = idx.get(s + ':' + typed);
    if (r) return { row: r, set: SET_LABELS[s], target: boxes.find((b) => b.sys.includes(s)) || null };
  }
  return null;
}

function EntryBox({ box, boxes, codeDB, dbStatus, onSave, initial, onSwitch }) {
  const [val, setVal] = useState(initial || '');
  const [msg, setMsg] = useState('');
  const [move, setMove] = useState(null); // { key, label, code } when the code belongs in another box
  const typed = norm(val);
  const row = useMemo(() => {
    if (!codeDB || !typed) return null;
    const idx = codeIndex(codeDB);
    for (const s of box.sys) {
      const r = idx.get(s + ':' + typed);
      if (r) return r;
    }
    return null;
  }, [codeDB, typed, box.sys]);
  const billable = row && (row[4] === 1 || row[4] === '1' || row[4] === true);

  const save = () => {
    if (!typed) return;
    if (!codeDB) return setMsg(dbStatus === 'error' ? 'The code database failed to load.' : 'Loading the code database…');
    if (!row) {
      const other = wrongBox(codeDB, typed, box, boxes || []);
      if (other && other.target) {
        setMove({ key: other.target.key, label: other.target.label, code: other.row[2] });
        return setMsg(`${other.row[2]} is an ${other.set} code, not ${box.label}. Enter it under ${other.target.label}.`);
      }
      if (other) return setMsg(`${other.row[2]} is an ${other.set} code. This chart does not code ${other.set}.`);
      return setMsg(`${val.trim().toUpperCase()} is not a valid ${box.label} code.`);
    }
    if (!billable) return setMsg(`${row[2]} is a header code — code to the highest specificity.`);
    // A save returns '' (added), an error message, or { msg, move } when the code belongs somewhere else.
    const err = onSave(row);
    if (err && typeof err === 'object') {
      setMove(err.move || null);
      return setMsg(err.msg);
    }
    if (err) return setMsg(err);
    setVal('');
    setMsg('');
  };

  return (
    <div className="wsx-entry">
      <label htmlFor={'ce-' + box.key}>{box.label}</label>
      <div className="row">
        {box.extra || null}
        <input
          id={'ce-' + box.key}
          className={'inp code' + (typed && codeDB ? (row && billable ? ' ok' : ' bad') : '')}
          value={val}
          maxLength={10}
          autoComplete="off"
          spellCheck={false}
          placeholder={box.placeholder}
          onChange={(e) => {
            setVal(e.target.value.toUpperCase());
            setMsg('');
            setMove(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              save();
            }
          }}
        />
        <button type="button" className="btn sm primary" onClick={save} disabled={!typed}>
          {box.button || 'Save'}
        </button>
      </div>
      <div className={'hint' + (msg ? ' err' : '')} role={msg ? 'alert' : undefined}>
        {msg || (typed && row ? row[3] : box.help)}
        {msg && move && onSwitch && (
          <button type="button" className="btn sm" style={{ marginLeft: 8 }} onClick={() => onSwitch(move.key, move.code)}>
            Move to {move.label}
          </button>
        )}
      </div>
    </div>
  );
}

// boxes: [{ key, label, sys: [codeDB set numbers], placeholder, help, save(row) -> '' | error | { msg, move },
//          extra (optional control before the input, e.g. the diagnosis type), button (label) }]
// allBoxes: every box on this chart (to point a wrong-box code at the right one); onSwitch(key, code)
// opens that box with the code filled in; prefill: { key, code } for the box being opened.
export function CodeEntry({ boxes, allBoxes, codeDB, dbStatus, onSwitch, prefill }) {
  if (!boxes.length) return null;
  return (
    <div className="wsx-entries">
      {boxes.map((b) => (
        <EntryBox
          key={b.key + (prefill && prefill.key === b.key ? ':' + prefill.n : '')}
          box={b}
          boxes={allBoxes || boxes}
          codeDB={codeDB}
          dbStatus={dbStatus}
          onSave={b.save}
          initial={prefill && prefill.key === b.key ? prefill.code : ''}
          onSwitch={onSwitch}
        />
      ))}
    </div>
  );
}
