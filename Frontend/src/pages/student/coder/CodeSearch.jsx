import { useMemo, useState } from 'react';
import { SYS_SHORT } from '../../../config/constants.js';

export function CodeSearch({ codeDB, filterSys, onPick }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const results = useMemo(() => {
    if (!codeDB || q.trim().length < 2) return [];
    const ql = q.toLowerCase().trim();
    const isCodeish = /^[a-z0-9]{1,7}\.?[a-z0-9]*$/i.test(q.trim()) && /\d/.test(q);
    const qcode = ql.replace('.', '');
    const scored = [];
    const terms = ql.split(/\s+/).filter(Boolean); // multi-word: all terms must appear
    const multi = terms.length > 1;
    for (let idx = 0; idx < codeDB.length; idx++) {
      const row = codeDB[idx]; // [sysInt, code, disp, desc, billable]
      if (filterSys && !filterSys.includes(row[0])) continue;
      const codeRaw = row[1].toLowerCase();
      const disp = row[2].toLowerCase();
      const desc = row[3].toLowerCase();
      const codeMatch = codeRaw.startsWith(qcode) || disp.startsWith(ql);
      let score;
      if (multi) {
        // every term must be present somewhere in the description
        if (!terms.every((t) => desc.indexOf(t) !== -1)) {
          if (!codeMatch) continue;
        }
        // score by earliest term position + count of word-boundary hits
        let wbHits = 0,
          firstPos = 999;
        terms.forEach((t) => {
          const p = desc.indexOf(t);
          if (p < firstPos && p !== -1) firstPos = p;
          if (new RegExp('(^|[^a-z])' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(desc))
            wbHits++;
        });
        score = codeMatch ? 1 : 2 + (terms.length - wbHits) + Math.min(firstPos, 200) / 1000;
      } else {
        const descPos = desc.indexOf(ql);
        if (!codeMatch && descPos === -1) continue;
        if (disp === ql || codeRaw === qcode) score = 0;
        else if (codeMatch) score = 1;
        else if (descPos === 0) score = 2;
        else if (/(^|[^a-z])$/.test(desc.slice(0, descPos))) score = 3;
        else score = 5 + Math.min(descPos, 200) / 1000;
      }
      // demote procedural-complication codes
      if (
        /during (a |other |an )?procedure|accidental (puncture|laceration)|complication|intraoperative|postprocedural|iatrogenic|sequela/.test(
          desc,
        )
      )
        score += 3;
      if (/\bunspecified\b/.test(desc)) score += 0.3;
      if (row[4] === 1 || row[4] === '1') score -= 0.2;
      scored.push([score, desc.length, row]);
    }
    scored.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    return scored.slice(0, 50).map((s) => s[2]);
  }, [q, codeDB, filterSys]);

  return (
    <div className="searchbox">
      <input
        value={q}
        placeholder="Search code or description…"
        onChange={(ev) => {
          setQ(ev.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 180)}
      />
      {open && q.trim().length >= 2 && (
        <div className="dropdown">
          {results.length === 0 ? (
            <div className="dropempty">
              {codeDB ? 'No matches — try another term' : 'Loading code database…'}
            </div>
          ) : (
            results.map((row, i) => (
              <div className="dropitem" key={i} onMouseDown={() => onPick(row[2], row[3])}>
                <span className="dc">{row[2]}</span>
                <span className="sys">{SYS_SHORT[row[0]]}</span>
                <span className="dd">{row[3]}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
