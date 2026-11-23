/* CODIVIA workspace — direct code entry: the student types each code (no search dropdown) and saves
   it. One box per code set, CPT / HCPCS first, then ICD-10-PCS (inpatient), then ICD-10-CM. */
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

function EntryBox({ box, codeDB, dbStatus, onSave }) {
  const [val, setVal] = useState('');
  const [msg, setMsg] = useState('');
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
    if (!row) return setMsg(`${val.trim().toUpperCase()} is not a valid ${box.label} code.`);
    if (!billable) return setMsg(`${row[2]} is a header code — code to the highest specificity.`);
    const err = onSave(row);
    if (err) return setMsg(err);
    setVal('');
    setMsg('');
  };

  return (
    <div className="wsx-entry">
      <label htmlFor={'ce-' + box.key}>{box.label}</label>
      <div className="row">
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
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              save();
            }
          }}
        />
        <button type="button" className="btn sm primary" onClick={save} disabled={!typed}>
          Save
        </button>
      </div>
      <div className={'hint' + (msg ? ' err' : '')} role={msg ? 'alert' : undefined}>
        {msg || (typed && row ? row[3] : box.help)}
      </div>
    </div>
  );
}

// boxes: [{ key, label, sys: [codeDB set numbers], placeholder, help, save(row) -> error | '' }]
export function CodeEntry({ boxes, codeDB, dbStatus }) {
  if (!boxes.length) return null;
  return (
    <div className="wsx-entries">
      {boxes.map((b) => (
        <EntryBox key={b.key} box={b} codeDB={codeDB} dbStatus={dbStatus} onSave={b.save} />
      ))}
    </div>
  );
}
