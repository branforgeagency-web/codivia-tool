import React from 'react';
import { loadB64Json, loadIcdEIndex, loadIcdIndex, loadIcdNotes } from '../../services/codeDb.js';
import { isAddOn, isExtCause } from '../../utils/codes.js';

export function FindACode({ codeDB, dbStatus, onInsert, isHH, embedded }) {
  const [q, setQ] = React.useState('');
  const [selected, setSelected] = React.useState(null);
  const [copied, setCopied] = React.useState(false);
  const [added, setAdded] = React.useState('');
  const [sysFilter, setSysFilter] = React.useState('all'); // all | icd | pcs | cpt
  const [mode, setMode] = React.useState('index'); // index | tabular
  const [iq, setIq] = React.useState(''); // index main-term filter
  const [trail, setTrail] = React.useState([]); // drill-down path of nodes
  const [openK, setOpenK] = React.useState({}); // expanded sub-term keys
  const [IDX, setIDX] = React.useState(window.ICD_INDEX || []);
  const [idxLoading, setIdxLoading] = React.useState(!window.ICD_INDEX);
  const [EIDX, setEIDX] = React.useState(window.ICD_EINDEX || []);
  const [NOTES, setNOTES] = React.useState(window.ICD_NOTES || null);
  React.useEffect(() => {
    if (window.ICD_NOTES) {
      setNOTES(window.ICD_NOTES);
      return;
    }
    let live = true;
    loadIcdNotes()
      .then((d) => {
        if (live) setNOTES(d);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  // notes for a code, walking up the hierarchy: J45.21 -> J45.2 -> J45
  const notesFor = React.useCallback(
    (code) => {
      if (!NOTES || !code) return [];
      const c = String(code).toUpperCase().replace(/-$/, '');
      const cands = [];
      cands.push(c);
      if (c.indexOf('.') !== -1) {
        const [h, tail] = c.split('.');
        for (let i = tail.length - 1; i >= 1; i--) cands.push(h + '.' + tail.slice(0, i));
        cands.push(h);
      } else {
        for (let i = c.length - 1; i >= 3; i--) cands.push(c.slice(0, i));
      }
      const out = [];
      cands.forEach((k) => {
        if (NOTES[k]) out.push({ code: k, notes: NOTES[k], self: k === c });
      });
      return out;
    },
    [NOTES],
  );

  const [TBL, setTBL] = React.useState({ neo: null, drug: null });
  const [tq, setTq] = React.useState('');
  React.useEffect(() => {
    if (mode !== 'neo' && mode !== 'drug') return;
    const key = mode === 'neo' ? 'neo' : 'drug';
    if (TBL[key]) return;
    let live = true;
    loadB64Json(
      key === 'neo' ? 'ICD_NEO_B64' : 'ICD_DRUG_B64',
      key === 'neo' ? 'ICD_NEO' : 'ICD_DRUG',
    )
      .then((d) => {
        if (live) setTBL((prev) => Object.assign({}, prev, { [key]: d }));
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [mode, TBL]);

  // ancestor path for a row index (site tables are indented hierarchies)
  const rowPath = React.useCallback((rows, i) => {
    const out = [];
    let lvl = rows[i].l;
    for (let j = i - 1; j >= 0 && lvl > 0; j--) {
      if (rows[j].l < lvl) {
        out.push(rows[j].t);
        lvl = rows[j].l;
      }
    }
    return out.reverse();
  }, []);

  const tableRows = React.useMemo(() => {
    const key = mode === 'neo' ? 'neo' : 'drug';
    const rows = TBL[key];
    if (!rows) return null;
    const q = tq.trim().toLowerCase();
    if (!q) return rows.slice(0, 80).map((r, i) => ({ r, i }));
    const starts = [],
      contains = [];
    for (let i = 0; i < rows.length; i++) {
      const t = rows[i].t.toLowerCase();
      if (t.indexOf(q) === 0) starts.push({ r: rows[i], i });
      else if (t.indexOf(q) !== -1) contains.push({ r: rows[i], i });
      if (starts.length >= 300) break;
    }
    return starts.concat(contains).slice(0, 300);
  }, [mode, TBL, tq]);

  // hoisted above every memo that reads it (avoids temporal-dead-zone crash)
  const MODE_SYS = { cpt: [2], hcpcs: [3], pcs: [1] };
  const modeCount = React.useMemo(() => {
    if (!codeDB || !MODE_SYS[mode]) return null;
    const want = MODE_SYS[mode];
    let n = 0;
    for (let i = 0; i < codeDB.length; i++) if (want.indexOf(codeDB[i][0]) !== -1) n++;
    return n;
  }, [codeDB, mode]);

  const [refNote, setRefNote] = React.useState('');
  React.useEffect(() => {
    if (window.ICD_INDEX) {
      setIDX(window.ICD_INDEX);
      setIdxLoading(false);
      return;
    }
    let live = true;
    loadIcdIndex()
      .then((d) => {
        if (live) {
          setIDX(d);
          setIdxLoading(false);
        }
      })
      .catch(() => {
        if (live) setIdxLoading(false);
      });
    loadIcdEIndex()
      .then((d) => {
        if (live) setEIDX(d);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  const SYS = {
    0: { name: 'ICD-10-CM', short: 'ICD-10-CM', color: 'var(--tone-3b82f6)' },
    1: { name: 'ICD-10-PCS', short: 'ICD-10-PCS', color: 'var(--tone-8b5cf6)' },
    2: { name: 'CPT', short: 'CPT', color: 'var(--color-brandDark)' },
    3: { name: 'HCPCS Level II', short: 'HCPCS', color: 'var(--color-gold)' },
  };
  const filterSys = MODE_SYS[mode]
    ? MODE_SYS[mode]
    : sysFilter === 'icd'
      ? [0]
      : sysFilter === 'pcs'
        ? [1]
        : sysFilter === 'cpt'
          ? [2, 3]
          : sysFilter === 'ext'
            ? [0]
            : sysFilter === 'addon'
              ? [2]
              : null;

  const results = React.useMemo(() => {
    if (!codeDB || q.trim().length < 2) return [];
    const ql = q.toLowerCase().trim();
    const qcode = ql.replace(/\./g, '');
    const terms = ql.split(/\s+/).filter(Boolean);
    const multi = terms.length > 1;
    const scored = [];
    for (let idx = 0; idx < codeDB.length; idx++) {
      const row = codeDB[idx];
      if (filterSys && !filterSys.includes(row[0])) continue;
      if (sysFilter === 'ext' && !isExtCause(row)) continue;
      if (sysFilter === 'addon' && !isAddOn(row)) continue;
      const codeRaw = row[1].toLowerCase(),
        disp = row[2].toLowerCase(),
        desc = row[3].toLowerCase();
      const codeMatch = codeRaw.startsWith(qcode) || disp.startsWith(ql);
      let score;
      if (multi) {
        if (!terms.every((t) => desc.indexOf(t) !== -1)) {
          if (!codeMatch) continue;
        }
        let wb = 0,
          first = 999;
        terms.forEach((t) => {
          const p = desc.indexOf(t);
          if (p < first && p !== -1) first = p;
          if (new RegExp('(^|[^a-z])' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(desc)) wb++;
        });
        score = codeMatch ? 1 : 2 + (terms.length - wb) + Math.min(first, 200) / 1000;
      } else {
        const p = desc.indexOf(ql);
        if (!codeMatch && p === -1) continue;
        if (disp === ql || codeRaw === qcode) score = 0;
        else if (codeMatch) score = 1;
        else if (p === 0) score = 2;
        else if (/(^|[^a-z])$/.test(desc.slice(0, p))) score = 3;
        else score = 5 + Math.min(p, 200) / 1000;
      }
      if (
        /during (a |other |an )?procedure|accidental (puncture|laceration)|complication|intraoperative|postprocedural|iatrogenic/.test(
          desc,
        )
      )
        score += 3;
      // 'sequela' is a normal 7th-character variant on injury and external cause
      // codes, so only demote it where it signals a procedural complication.
      if (/sequela/.test(desc) && !/^[VWXYST]/.test(row[2])) score += 3;
      if (/\bunspecified\b/.test(desc)) score += 0.3;
      if (row[4] === 1 || row[4] === '1') score -= 0.2;
      scored.push([score, desc.length, row]);
    }
    scored.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    return scored.slice(0, 80).map((s) => s[2]);
  }, [q, codeDB, filterSys, sysFilter]);

  const doCopy = (code) => {
    try {
      navigator.clipboard.writeText(code);
    } catch (e) {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  // --- Alphabetic Index helpers ---
  // function declaration (hoisted) so every memo below can use it safely
  function nrm(t) {
    return String(t)
      .replace(/\([^)]*\)/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }
  const ACTIVE = mode === 'eindex' ? EIDX : IDX;
  const mainTerms = React.useMemo(() => {
    const t = iq.trim().toLowerCase();
    if (!t) return ACTIVE.slice(0, 60);
    const starts = [],
      contains = [];
    for (let i = 0; i < ACTIVE.length; i++) {
      const n = nrm(ACTIVE[i].t);
      if (n.indexOf(t) === 0) starts.push(ACTIVE[i]);
      else if (n.indexOf(t) !== -1) contains.push(ACTIVE[i]);
      if (starts.length >= 400) break;
    }
    return starts.concat(contains).slice(0, 400);
  }, [iq, ACTIVE]);

  const [fam, setFam] = React.useState(null); // {stem, from} when drilled from Index
  const gotoTabular = (code, fromTerm) => {
    const stem = String(code).replace(/-$/, '');
    setMode('tabular');
    setSelected(null);
    setSysFilter('icd');
    setFam({ stem: stem, from: fromTerm || '' });
    setQ(stem);
  };
  // normalized title (drop parenthetical modifiers) for matching
  const mainMap = React.useMemo(() => {
    const m = {};
    const order = [];
    ACTIVE.forEach((x) => {
      const k = nrm(x.t);
      if (!(k in m)) {
        m[k] = x;
        order.push(k);
      }
    });
    order.sort((a, b) => b.length - a.length);
    return { map: m, titles: order };
  }, [ACTIVE]);

  const findMain = (ref) => {
    const r = nrm(ref);
    const { map, titles } = mainMap;
    if (map[r]) return { node: map[r], rest: '' };
    for (let i = 0; i < titles.length; i++) {
      const t = titles[i];
      if (r.indexOf(t + ' ') === 0 || r.indexOf(t + ',') === 0)
        return { node: map[t], rest: r.slice(t.length).replace(/^[\s,]+/, '') };
    }
    // first-word fallback: "Fracture, radius..." -> "fracture, traumatic"
    const w = r.split(',')[0].split(' ')[0];
    let best = null;
    if (map[w]) best = w;
    else if (map[w + ', traumatic']) best = w + ', traumatic';
    else {
      const c = titles.filter(
        (t) => t === w || t.indexOf(w + ',') === 0 || t.indexOf(w + ' ') === 0,
      );
      if (c.length) best = c.sort((a, b) => a.length - b.length)[0];
    }
    if (best) {
      const rest =
        r.indexOf(best) === 0
          ? r.slice(best.length).replace(/^[\s,]+/, '')
          : r.indexOf(',') !== -1
            ? r.slice(r.indexOf(',') + 1).trim()
            : '';
      return { node: map[best], rest: rest };
    }
    return null;
  };

  const followRef = (target) => {
    // "see" / "see also" cross-reference
    const raw = String(target);
    // references to a code / category range -> verify directly in the Tabular
    const cm = raw.match(/\b([A-TV-Z][0-9][0-9A-Z](?:\.[0-9A-Z]+)?)\b/);
    if (cm && !/^table of drugs/i.test(raw)) {
      const hit0 = findMain(raw);
      if (!hit0) {
        gotoTabular(cm[1], raw);
        return;
      }
    }
    if (/^table of drugs/i.test(raw)) {
      const after = raw
        .replace(/^table of drugs and chemicals[,\s]*/i, '')
        .split(',')[0]
        .trim();
      setMode('drug');
      setTq(/^(categories|by |with )/i.test(after) ? '' : after);
      return;
    }
    const hit = findMain(target);
    if (!hit) {
      setRefNote(raw);
      setIq(String(target).split(',')[0].trim());
      setTrail([]);
      return;
    }
    setRefNote('');
    let n = hit.node;
    const opens = {};
    const segs = hit.rest
      ? hit.rest
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    let pathKey = '';
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i],
        d = n.d || [];
      let k = -1;
      for (let j = 0; j < d.length; j++) {
        if (nrm(d[j].t) === s) {
          k = j;
          break;
        }
      }
      if (k < 0)
        for (let j = 0; j < d.length; j++) {
          if (nrm(d[j].t).indexOf(s) === 0) {
            k = j;
            break;
          }
        }
      if (k < 0)
        for (let j = 0; j < d.length; j++) {
          if (nrm(d[j].t).indexOf(s) !== -1) {
            k = j;
            break;
          }
        }
      if (k < 0) break;
      pathKey = pathKey ? pathKey + '.' + k : String(k);
      opens[pathKey] = true;
      n = d[k];
    }
    setTrail([hit.node]);
    setOpenK(opens);
    setIq('');
  };
  const modeBtn = (id, label, sub) => (
    <button
      key={id}
      onClick={() => setMode(id)}
      style={{
        flex: 1,
        textAlign: 'left',
        padding: '11px 14px',
        borderRadius: 10,
        cursor: 'pointer',
        border: '2px solid ' + (mode === id ? 'var(--teal)' : 'var(--line)'),
        background: mode === id ? 'var(--tone-eefaf8)' : 'var(--color-white)',
      }}
    >
      <div
        style={{
          fontSize: 13.5,
          fontWeight: 800,
          color: mode === id ? 'var(--teal)' : 'var(--ink)',
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{sub}</div>
    </button>
  );

  // recursive sub-term renderer (book indentation)
  const renderNode = (node, path, depth) => {
    const key = path;
    const kids = node.d || [];
    const isOpen = !!openK[key];
    return (
      <div key={key} style={{ marginLeft: depth === 0 ? 0 : 16 }}>
        <div
          onClick={() => {
            if (kids.length) setOpenK(Object.assign({}, openK, { [key]: !isOpen }));
          }}
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 8,
            padding: '5px 6px',
            borderRadius: 6,
            cursor: kids.length ? 'pointer' : 'default',
            borderLeft: depth > 0 ? '1px dotted var(--line)' : 'none',
          }}
        >
          <span style={{ fontSize: 11, color: 'var(--muted)', minWidth: 10 }}>
            {kids.length ? (isOpen ? '\u25be' : '\u25b8') : '\u00b7'}
          </span>
          <span style={{ fontSize: 13.5, color: 'var(--ink)' }}>{node.t}</span>
          {node.c && (
            <span
              onClick={(ev) => {
                ev.stopPropagation();
                gotoTabular(node.c, node.t);
              }}
              style={{
                fontSize: 12.5,
                fontWeight: 800,
                color: 'var(--teal)',
                fontFamily: "'SF Mono',monospace",
                cursor: 'pointer',
                border: '1px solid var(--teal)',
                borderRadius: 5,
                padding: '1px 7px',
              }}
            >
              {node.c}
            </span>
          )}
          {node.s && (
            <span
              onClick={(ev) => {
                ev.stopPropagation();
                followRef(node.s);
              }}
              style={{ fontSize: 12, fontStyle: 'italic', color: 'var(--tone-8b5cf6)', cursor: 'pointer' }}
            >
              {'see ' + node.s}
            </span>
          )}
          {node.sa && (
            <span
              onClick={(ev) => {
                ev.stopPropagation();
                followRef(node.sa);
              }}
              style={{ fontSize: 12, fontStyle: 'italic', color: 'var(--tone-8b5cf6)', cursor: 'pointer' }}
            >
              {'see also ' + node.sa}
            </span>
          )}
        </div>
        {isOpen && kids.map((k, i) => renderNode(k, key + '.' + i, depth + 1))}
      </div>
    );
  };

  const indexPanel = () => {
    const cur = trail.length ? trail[trail.length - 1] : null;
    return (
      <div>
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <input
            value={iq}
            placeholder={
              idxLoading
                ? 'Loading the index\u2026'
                : mode === 'eindex'
                  ? 'Look up how the injury happened \u2014 e.g. Fall, Struck, Bite, Assault, Contact\u2026'
                  : 'Look up a main term \u2014 e.g. Pain, Fracture, Diabetes, Laceration, Burn\u2026'
            }
            onChange={(ev) => {
              setIq(ev.target.value);
              setTrail([]);
              setRefNote('');
            }}
            style={{
              width: '100%',
              padding: '13px 16px',
              fontSize: 15,
              border: '1px solid var(--line)',
              borderRadius: 10,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <span
            style={{
              position: 'absolute',
              right: 14,
              top: 13,
              fontSize: 11,
              color: idxLoading ? 'var(--mod)' : 'var(--ok)',
            }}
          >
            {idxLoading ? 'loading\u2026' : ACTIVE.length.toLocaleString() + ' main terms'}
          </span>
        </div>
        {mode === 'eindex' && (
          <div
            style={{
              fontSize: 12,
              color: 'var(--muted)',
              lineHeight: 1.55,
              marginBottom: 10,
              background: 'var(--tone-fff8ec)',
              border: '1px solid var(--tone-f0d9a8)',
              borderRadius: 8,
              padding: '9px 12px',
            }}
          >
            {'This is the separate '}
            <b>Index to External Causes</b>
            {
              ' \u2014 it indexes how an injury happened, not the injury itself. Look up the mechanism (Fall, Struck by, Bite, Assault), then the circumstances. These codes are '
            }
            <b>never first-listed</b>
            {' \u2014 report them after the injury code.'}
          </div>
        )}
        {refNote && (
          <div
            style={{
              fontSize: 12,
              color: 'var(--mod)',
              background: 'var(--tone-fff8ec)',
              border: '1px solid var(--tone-f0d9a8)',
              borderRadius: 6,
              padding: '8px 11px',
              marginBottom: 10,
              display: 'flex',
              justifyContent: 'space-between',
              gap: 10,
            }}
          >
            <span>
              {/^table of drugs/i.test(refNote)
                ? 'The Index points to the Table of Drugs and Chemicals \u2014 a separate table for poisonings and adverse effects, not part of the alphabetic index.'
                : 'The Index refers you to: \u201c' +
                  refNote +
                  '\u201d \u2014 follow that instruction in the Tabular List.'}
            </span>
            <span onClick={() => setRefNote('')} style={{ cursor: 'pointer', fontWeight: 800 }}>
              ×
            </span>
          </div>
        )}
        {cur && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 10,
              fontSize: 12.5,
            }}
          >
            <span
              onClick={() => {
                setTrail([]);
                setOpenK({});
              }}
              style={{ color: 'var(--teal)', fontWeight: 700, cursor: 'pointer' }}
            >
              ← All main terms
            </span>
            <span style={{ color: 'var(--muted)' }}>/</span>
            <span style={{ fontWeight: 800, color: 'var(--ink)' }}>{cur.t}</span>
          </div>
        )}
        <div
          style={{
            background: 'var(--color-white)',
            border: '1px solid var(--line)',
            borderRadius: 12,
            padding: '12px 14px',
          }}
        >
          {!cur ? (
            mainTerms.length === 0 ? (
              <div
                style={{
                  padding: '28px 8px',
                  textAlign: 'center',
                  color: 'var(--muted)',
                  fontSize: 13,
                }}
              >
                {idxLoading
                  ? 'Loading the Alphabetic Index\u2026'
                  : 'No main term starts with that. Try the condition, not the site \u2014 the book indexes "Laceration, forearm", not "Forearm laceration".'}
              </div>
            ) : (
              mainTerms.map((m, i) => (
                <div
                  key={i}
                  onClick={() => {
                    setTrail([m]);
                    setOpenK({});
                    setRefNote('');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 8px',
                    cursor: 'pointer',
                    borderBottom: i < mainTerms.length - 1 ? '1px solid var(--line-soft)' : 'none',
                  }}
                >
                  <span style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--navy)' }}>
                    {m.t}
                  </span>
                  {m.c && (
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: 'var(--teal)',
                        fontFamily: "'SF Mono',monospace",
                      }}
                    >
                      {m.c}
                    </span>
                  )}
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)' }}>
                    {(m.d ? m.d.length : 0) + ' sub-terms \u203a'}
                  </span>
                </div>
              ))
            )
          ) : (
            <div>
              <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--navy)', marginBottom: 2 }}>
                {cur.t}
              </div>
              {cur.sa && (
                <div
                  onClick={() => followRef(cur.sa)}
                  style={{
                    fontSize: 12,
                    fontStyle: 'italic',
                    color: 'var(--tone-8b5cf6)',
                    cursor: 'pointer',
                    marginBottom: 8,
                  }}
                >
                  {'see also ' + cur.sa}
                </div>
              )}
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10 }}>
                Click a sub-term to open deeper levels. Click a code to verify it in the Tabular
                List.
              </div>
              {(cur.d || []).map((k, i) => renderNode(k, String(i), 0))}
            </div>
          )}
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>
          {(iq.trim()
            ? ''
            : 'Showing the first 60 main terms \u2014 type to search all ' +
              (ACTIVE.length || 0).toLocaleString() +
              '. ') +
            (mode === 'eindex'
              ? 'Official CMS ICD-10-CM Index to External Causes, FY2026. Never code directly from the Index \u2014 always verify in the Tabular List.'
              : 'Official CMS ICD-10-CM Alphabetic Index, FY2026. Never code directly from the Index \u2014 always verify in the Tabular List.')}
        </div>
      </div>
    );
  };

  // --- Code family expansion (Index -> Tabular verification step) ---
  const famRows = React.useMemo(() => {
    if (!fam || !codeDB) return [];
    const p = fam.stem.replace(/\./g, '').toLowerCase();
    const out = [];
    for (let i = 0; i < codeDB.length; i++) {
      const r = codeDB[i];
      if (r[0] !== 0) continue;
      if (r[1].toLowerCase().indexOf(p) === 0) out.push(r);
    }
    out.sort((a, b) => (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0));
    return out;
  }, [fam, codeDB]);

  const EXT = {
    A: 'Initial encounter',
    D: 'Subsequent encounter',
    S: 'Sequela',
    B: 'Initial \u2013 open fracture I/II',
    C: 'Initial \u2013 open fracture IIIA/B/C',
    E: 'Subsequent \u2013 open I/II, routine healing',
    F: 'Subsequent \u2013 open III, routine healing',
    G: 'Subsequent \u2013 delayed healing',
    H: 'Subsequent \u2013 open I/II, delayed healing',
    J: 'Subsequent \u2013 open III, delayed healing',
    K: 'Subsequent \u2013 nonunion',
    M: 'Subsequent \u2013 open I/II, nonunion',
    N: 'Subsequent \u2013 open III, nonunion',
    P: 'Subsequent \u2013 malunion',
    Q: 'Subsequent \u2013 open I/II, malunion',
    R: 'Subsequent \u2013 open III, malunion',
  };

  const familyPanel = () => {
    if (!fam) return null;
    const incomplete = famRows.length > 1;
    return (
      <div
        style={{
          background: 'var(--color-white)',
          border: '2px solid var(--teal)',
          borderRadius: 12,
          padding: '16px 18px',
          marginBottom: 16,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 12,
            marginBottom: 10,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: 'var(--teal)',
                letterSpacing: 0.6,
                marginBottom: 3,
              }}
            >
              FROM THE INDEX
            </div>
            <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--navy)' }}>
              {fam.stem + (fam.from ? '  \u2014  ' + fam.from : '')}
            </div>
          </div>
          <button
            onClick={() => {
              setFam(null);
              setMode('index');
            }}
            style={{
              fontSize: 12,
              fontWeight: 700,
              padding: '7px 13px',
              borderRadius: 8,
              cursor: 'pointer',
              border: '1px solid var(--line)',
              background: 'var(--color-white)',
              color: 'var(--muted)',
              whiteSpace: 'nowrap',
            }}
          >
            ← Back to Index
          </button>
        </div>
        {incomplete && (
          <div
            style={{
              fontSize: 12,
              color: 'var(--mod)',
              background: 'var(--tone-fff8ec)',
              border: '1px solid var(--tone-f0d9a8)',
              borderRadius: 6,
              padding: '8px 11px',
              marginBottom: 12,
            }}
          >
            {'\u26a0 This Index entry is not a complete code. ' +
              famRows.length +
              ' codes sit beneath it \u2014 choose the one matching laterality and encounter documented in the chart.'}
          </div>
        )}
        {famRows.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--muted)', padding: '10px 0' }}>
            {dbStatus === 'ready'
              ? 'No tabular entries found under this stem.'
              : 'Loading code database\u2026'}
          </div>
        ) : (
          <div style={{ maxHeight: 340, overflowY: 'auto' }}>
            {famRows.map((r, i) => {
              const c7 = r[2].length === 7 ? r[2].charAt(6).toUpperCase() : '';
              const ch = /[A-Z]/.test(c7) ? c7 : '';
              const lbl = EXT[ch];
              return (
                <div
                  key={i}
                  onClick={() => {
                    setSelected(r);
                    setCopied(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 11,
                    padding: '9px 8px',
                    cursor: 'pointer',
                    borderBottom: i < famRows.length - 1 ? '1px solid var(--line-soft)' : 'none',
                    background: selected && selected[2] === r[2] ? 'var(--tone-eef4fb)' : 'var(--color-white)',
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: 'var(--navy)',
                      fontFamily: "'SF Mono',monospace",
                      minWidth: 86,
                    }}
                  >
                    {r[2]}
                  </span>
                  {lbl && (
                    <span
                      title={lbl}
                      style={{
                        fontSize: 9.5,
                        fontWeight: 700,
                        color: 'var(--color-white)',
                        background: 'var(--tone-8b5cf6)',
                        padding: '2px 6px',
                        borderRadius: 4,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {ch + ' \u00b7 ' + lbl}
                    </span>
                  )}
                  <span style={{ fontSize: 12.5, color: 'var(--ink)', flex: 1 }}>{r[3]}</span>
                  {(r[4] === 1 || r[4] === '1') && (
                    <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--ok)' }}>●</span>
                  )}
                  {onInsert && !(isHH && r[0] !== 0) && (
                    <button
                      onClick={(ev) => {
                        ev.stopPropagation();
                        onInsert(r);
                        setAdded(r[2]);
                        setTimeout(() => setAdded(''), 1100);
                      }}
                      title={'Add ' + r[2] + ' to the chart'}
                      style={{
                        marginLeft: 'auto',
                        fontSize: 10,
                        fontWeight: 800,
                        padding: '2px 9px',
                        borderRadius: 5,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        border: '1px solid ' + (added === r[2] ? 'var(--ok)' : 'var(--teal)'),
                        background: added === r[2] ? 'var(--ok)' : 'var(--color-white)',
                        color: added === r[2] ? 'var(--color-white)' : 'var(--teal-d)',
                      }}
                    >
                      {added === r[2] ? '\u2713 added' : '+ add'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 10 }}>
          Click the exact code to open its detail and copy it.
        </div>
      </div>
    );
  };

  const tablePanel = () => {
    const isNeo = mode === 'neo';
    const key = isNeo ? 'neo' : 'drug';
    const COLS = isNeo
      ? [
          { k: 'Malignant Primary', c: 'var(--tone-b4232a)' },
          { k: 'Malignant Secondary', c: 'var(--tone-c4562a)' },
          { k: 'Ca in situ', c: 'var(--tone-8b5cf6)' },
          { k: 'Benign', c: 'var(--tone-0e7c66)' },
          { k: 'Uncertain Behavior', c: 'var(--tone-7a6a2e)' },
          { k: 'Unspecified Behavior', c: 'var(--tone-5a6472)' },
        ]
      : [
          { k: 'Poisoning, Accidental', c: 'var(--tone-b4232a)' },
          { k: 'Poisoning, Self-harm', c: 'var(--tone-8b2e6b)' },
          { k: 'Poisoning, Assault', c: 'var(--tone-c4562a)' },
          { k: 'Poisoning, Undetermined', c: 'var(--tone-7a6a2e)' },
          { k: 'Adverse Effect', c: 'var(--tone-0e7c66)' },
          { k: 'Underdosing', c: 'var(--tone-5a6472)' },
        ];
    const rows = TBL[key];
    return (
      <div>
        <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 10, lineHeight: 1.55 }}>
          {isNeo
            ? 'Find the anatomical site, then read across to the column matching the documented behavior. Histology drives the column \u2014 check the Index first if the diagnosis names a cell type.'
            : 'Find the substance, then read across to the column matching the documented intent. Adverse effect means the drug was correctly prescribed and taken as directed; poisoning means it was not.'}
        </div>
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <input
            value={tq}
            placeholder={
              rows
                ? isNeo
                  ? 'Search a site \u2014 e.g. breast, lung, kidney, colon\u2026'
                  : 'Search a substance \u2014 e.g. acetaminophen, insulin, warfarin\u2026'
                : 'Loading table\u2026'
            }
            onChange={(ev) => setTq(ev.target.value)}
            style={{
              width: '100%',
              padding: '13px 16px',
              fontSize: 15,
              border: '1px solid var(--line)',
              borderRadius: 10,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <span
            style={{
              position: 'absolute',
              right: 14,
              top: 13,
              fontSize: 11,
              color: rows ? 'var(--ok)' : 'var(--mod)',
            }}
          >
            {rows ? rows.length.toLocaleString() + ' rows' : 'loading\u2026'}
          </span>
        </div>
        <div
          style={{
            background: 'var(--color-white)',
            border: '1px solid var(--line)',
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          {!rows ? (
            <div
              style={{
                padding: '34px 20px',
                textAlign: 'center',
                color: 'var(--muted)',
                fontSize: 13.5,
              }}
            >
              Loading table…
            </div>
          ) : (tableRows || []).length === 0 ? (
            <div
              style={{
                padding: '34px 20px',
                textAlign: 'center',
                color: 'var(--muted)',
                fontSize: 13.5,
              }}
            >
              No match. Try a shorter or more general term.
            </div>
          ) : (
            <div style={{ maxHeight: 520, overflowY: 'auto' }}>
              {(tableRows || []).map((it, n) => {
                const r = it.r,
                  anc = rowPath(rows, it.i);
                return (
                  <div
                    key={n}
                    style={{
                      padding: '10px 14px',
                      borderBottom:
                        n < tableRows.length - 1 ? '1px solid var(--line-soft)' : 'none',
                    }}
                  >
                    {anc.length > 0 && (
                      <div style={{ fontSize: 10.5, color: 'var(--muted)', marginBottom: 2 }}>
                        {anc.join(' \u203a ')}
                      </div>
                    )}
                    <div
                      style={{
                        fontSize: 13.5,
                        fontWeight: 700,
                        color: 'var(--navy)',
                        marginBottom: 6,
                        paddingLeft: Math.min(r.l, 4) * 10,
                      }}
                    >
                      {r.t}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {COLS.map((c, ci) => {
                        const v = r.c[ci];
                        if (!v)
                          return (
                            <span
                              key={ci}
                              style={{
                                fontSize: 10,
                                color: 'var(--tone-c3c8cf)',
                                border: '1px dashed var(--line)',
                                borderRadius: 5,
                                padding: '3px 7px',
                              }}
                            >
                              {c.k + ': \u2014'}
                            </span>
                          );
                        return (
                          <span
                            key={ci}
                            onClick={() => gotoTabular(v, r.t)}
                            title={'Verify ' + v + ' in the Tabular List'}
                            style={{
                              fontSize: 10.5,
                              cursor: 'pointer',
                              borderRadius: 5,
                              padding: '3px 8px',
                              border: '1px solid ' + c.c,
                              color: c.c,
                              fontWeight: 700,
                              background: 'var(--color-white)',
                            }}
                          >
                            {c.k + ': '}
                            <span style={{ fontFamily: "'SF Mono',monospace", fontWeight: 800 }}>
                              {v}
                            </span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>
          {(tq.trim()
            ? ''
            : 'Showing the first 80 rows \u2014 type to search all ' +
              (rows ? rows.length.toLocaleString() : '\u2026') +
              '. ') +
            'Official CMS ICD-10-CM FY2026. Click any code to verify it in the Tabular List. A dash in the code means a further character is required.'}
        </div>
      </div>
    );
  };

  const chip = (id, label) => (
    <button
      key={id}
      onClick={() => {
        setSysFilter(id);
        setSelected(null);
      }}
      style={{
        fontSize: 12,
        fontWeight: 700,
        padding: '6px 13px',
        borderRadius: 20,
        cursor: 'pointer',
        marginRight: 8,
        border: '1px solid ' + (sysFilter === id ? 'var(--teal)' : 'var(--line)'),
        background: sysFilter === id ? 'var(--teal)' : 'var(--color-white)',
        color: sysFilter === id ? 'var(--color-white)' : 'var(--muted)',
      }}
    >
      {label}
    </button>
  );

  return (
    <div className="page" style={embedded ? { padding: '12px 14px 18px' } : null}>
      {!embedded && (
        <div className="page-head">
          <h1>CODIVIA Code Search</h1>
          <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: 13 }}>
            Work it the way the codebook works: start in the Alphabetic Index, drill from the main
            term down to the sub-term, then verify the code and its instructional notes in the
            Tabular List. The Neoplasm and Drug tables work the same way — find the row, then pick
            the column.
          </p>
        </div>
      )}
      <div
        style={{
          fontSize: 10.5,
          fontWeight: 800,
          color: 'var(--muted)',
          letterSpacing: 0.7,
          marginBottom: 6,
        }}
      >
        ICD-10-CM · DIAGNOSIS CODING
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {modeBtn('index', '1 \u00b7 Alphabetic Index', 'Main term \u2192 sub-terms \u2192 code')}
        {modeBtn('tabular', '2 \u00b7 Tabular List', 'Verify the code and its notes')}
        {modeBtn('neo', 'Neoplasm Table', 'Site \u00d7 behavior')}
        {modeBtn('drug', 'Drugs & Chemicals', 'Substance \u00d7 intent')}
        {modeBtn('eindex', 'External Cause Index', 'How the injury happened')}
      </div>
      <div
        style={{
          fontSize: 10.5,
          fontWeight: 800,
          color: 'var(--muted)',
          letterSpacing: 0.7,
          marginBottom: 6,
        }}
      >
        {'PROCEDURE & SUPPLY CODING'}
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {modeBtn('cpt', 'CPT', 'Procedures & services')}
        {modeBtn('hcpcs', 'HCPCS Level II', 'Supplies, drugs, DME')}
        {modeBtn('pcs', 'ICD-10-PCS', 'Inpatient procedures')}
      </div>
      {mode === 'neo' || mode === 'drug' ? (
        tablePanel()
      ) : mode === 'index' || mode === 'eindex' ? (
        indexPanel()
      ) : (
        <>
          {MODE_SYS[mode] && (
            <div
              style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 10, lineHeight: 1.55 }}
            >
              {mode === 'cpt'
                ? 'CPT codes report physician and outpatient procedures and services. Search by procedure name or code \u2014 then check whether a modifier is needed.'
                : mode === 'hcpcs'
                  ? 'HCPCS Level II covers supplies, drugs, DME and services CPT does not: A, E, J, K, L codes and more. Search by item or code.'
                  : 'ICD-10-PCS codes inpatient hospital procedures. Every code is 7 characters, each character a value from a table \u2014 search by procedure name or partial code.'}
            </div>
          )}
          {!MODE_SYS[mode] && familyPanel()}
          {!MODE_SYS[mode] && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
              {chip('all', 'All code sets')}
              {chip('icd', 'ICD-10-CM')}
              {chip('pcs', 'ICD-10-PCS')}
              {chip('cpt', 'CPT / HCPCS')}
              {chip('ext', '\u26a0 External cause')}
              {chip('addon', '+ Add-on codes')}
            </div>
          )}
          <div style={{ position: 'relative', marginBottom: 8 }}>
            <input
              value={q}
              autoFocus={true}
              placeholder={
                dbStatus !== 'ready'
                  ? 'Loading code database\u2026'
                  : mode === 'cpt'
                    ? 'Search a procedure or CPT code \u2014 e.g. colonoscopy, 45378\u2026'
                    : mode === 'hcpcs'
                      ? 'Search a supply, drug or HCPCS code \u2014 e.g. wheelchair, J1885\u2026'
                      : mode === 'pcs'
                        ? 'Search an inpatient procedure or PCS code \u2014 e.g. bypass, 0DTJ4ZZ\u2026'
                        : 'Search a condition, procedure, or code\u2026'
              }
              onChange={(ev) => {
                setQ(ev.target.value);
                setSelected(null);
                setFam(null);
              }}
              style={{
                width: '100%',
                padding: '13px 16px',
                fontSize: 15,
                border: '1px solid var(--line)',
                borderRadius: 10,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <span
              style={{
                position: 'absolute',
                right: 14,
                top: 13,
                fontSize: 11,
                color: dbStatus === 'ready' ? 'var(--ok)' : 'var(--mod)',
              }}
            >
              {dbStatus !== 'ready'
                ? 'loading\u2026'
                : modeCount !== null
                  ? modeCount.toLocaleString() + ' codes'
                  : '171,568 codes'}
            </span>
            {/* detail panel (when a code is selected) */}
            {selected && (
              <div
                style={{
                  background: 'var(--color-white)',
                  border: '2px solid ' + SYS[selected[0]].color,
                  borderRadius: 12,
                  padding: '18px 20px',
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 12,
                  }}
                >
                  <div>
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}
                    >
                      <span
                        style={{
                          fontSize: 26,
                          fontWeight: 900,
                          color: 'var(--navy)',
                          fontFamily: "'SF Mono',monospace",
                        }}
                      >
                        {selected[2]}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          color: 'var(--color-white)',
                          background: SYS[selected[0]].color,
                          padding: '3px 9px',
                          borderRadius: 5,
                        }}
                      >
                        {SYS[selected[0]].name}
                      </span>
                      {selected[4] === 1 || selected[4] === '1' ? (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: 'var(--ok)',
                            border: '1px solid var(--ok)',
                            borderRadius: 5,
                            padding: '2px 7px',
                          }}
                        >
                          ✓ BILLABLE
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: 'var(--muted)',
                            border: '1px solid var(--line)',
                            borderRadius: 5,
                            padding: '2px 7px',
                          }}
                        >
                          NON-BILLABLE / HEADER
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 15, color: 'var(--ink)', lineHeight: 1.5 }}>
                      {selected[3]}
                    </div>
                  </div>
                  <button
                    onClick={() => doCopy(selected[2])}
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      padding: '9px 18px',
                      borderRadius: 8,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      border: 'none',
                      background: copied ? 'var(--ok)' : 'var(--teal)',
                      color: 'var(--color-white)',
                    }}
                  >
                    {copied ? '\u2713 Copied!' : 'Copy code'}
                  </button>
                </div>
                {selected[4] !== 1 && selected[4] !== '1' && (
                  <div
                    style={{
                      fontSize: 11.5,
                      color: 'var(--mod)',
                      marginTop: 10,
                      background: 'var(--tone-fff8ec)',
                      border: '1px solid var(--tone-f0d9a8)',
                      borderRadius: 6,
                      padding: '7px 10px',
                    }}
                  >
                    ⚠ This is a category/header code and is not billable on its own — assign a more
                    specific code beneath it.
                  </div>
                )}
                {(function () {
                  const groups = selected[0] === 0 ? notesFor(selected[2]) : [];
                  // CPT add-on codes get their own explanation panel
                  if (selected[0] === 2) {
                    if (!isAddOn(selected)) return null;
                    return (
                      <div
                        style={{
                          background: 'var(--tone-f5f1fc)',
                          border: '1px solid var(--tone-ded2f2)',
                          borderRadius: 10,
                          padding: '13px 16px',
                          marginTop: 14,
                          lineHeight: 1.65,
                          fontSize: 13.5,
                          color: 'var(--ink)',
                        }}
                      >
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            color: 'var(--tone-7a5ab8)',
                            letterSpacing: 0.5,
                            marginBottom: 6,
                          }}
                        >
                          + ADD-ON CODE
                        </div>
                        <span>
                          {'CPT '}
                          <b style={{ fontFamily: "'SF Mono',monospace" }}>{selected[2]}</b>
                          {
                            ' is an add-on code. It reports work performed in addition to a primary procedure and is '
                          }
                          <b>never reported on its own</b>
                          {'. Report it alongside its designated primary procedure, and do '}
                          <b>not</b>
                          {
                            ' append modifier 51 \u2014 add-on codes are exempt from multiple-procedure reduction.'
                          }
                        </span>
                      </div>
                    );
                  }
                  if (selected[0] !== 0) return null;
                  const META = {
                    inc: {
                      label: 'Includes',
                      color: 'var(--tone-0e7c66)',
                      bg: 'var(--tone-eefaf8)',
                      bd: 'var(--tone-bfe6dd)',
                      hint: 'Terms that ARE coded here.',
                    },
                    ex1: {
                      label: 'Excludes1',
                      color: 'var(--tone-b4232a)',
                      bg: 'var(--tone-fdeeee)',
                      bd: 'var(--tone-f3c9c9)',
                      hint: 'NEVER code together \u2014 the two conditions cannot coexist.',
                    },
                    ex2: {
                      label: 'Excludes2',
                      color: 'var(--tone-b4232a)',
                      bg: 'var(--tone-fdf3ee)',
                      bd: 'var(--tone-f3d9c9)',
                      hint: 'Not included here, but MAY be coded together if both are documented.',
                    },
                    use: {
                      label: 'Use additional code',
                      color: 'var(--tone-7a5ab8)',
                      bg: 'var(--tone-f5f1fc)',
                      bd: 'var(--tone-ded2f2)',
                      hint: 'Add this secondary code when documented.',
                    },
                    first: {
                      label: 'Code first',
                      color: 'var(--tone-7a5ab8)',
                      bg: 'var(--tone-f5f1fc)',
                      bd: 'var(--tone-ded2f2)',
                      hint: 'The underlying condition is sequenced BEFORE this code.',
                    },
                    also: {
                      label: 'Code also',
                      color: 'var(--tone-7a5ab8)',
                      bg: 'var(--tone-f5f1fc)',
                      bd: 'var(--tone-ded2f2)',
                      hint: 'Both codes may be needed; sequencing depends on the encounter.',
                    },
                    note: {
                      label: 'Note',
                      color: 'var(--tone-5a6472)',
                      bg: 'var(--tone-f4f6f8)',
                      bd: 'var(--tone-dfe4ea)',
                      hint: '',
                    },
                  };
                  const ORDER = ['inc', 'ex1', 'ex2', 'use', 'first', 'also', 'note'];

                  // ---- plain-English summary of what this code means and requires ----
                  const self = groups.filter((x) => x.self);
                  const inherited = groups.filter((x) => !x.self);
                  const billable = selected[4] === 1 || selected[4] === '1';
                  const collect = (k) => groups.reduce((a, g) => a.concat(g.notes[k] || []), []);
                  const fmt = (arr) =>
                    arr.length <= 3
                      ? arr.join('; ')
                      : arr.slice(0, 3).join('; ') +
                        ' and ' +
                        (arr.length - 3) +
                        ' more listed below';
                  const needsUse = collect('use');
                  const needsFirst = collect('first');
                  const needsAlso = collect('also');
                  const hasEx1 = collect('ex1');

                  const bits = [];
                  bits.push(
                    <span key="d">
                      {'ICD-10-CM code '}
                      <b style={{ fontFamily: "'SF Mono',monospace" }}>{selected[2]}</b>
                      {' denotes '}
                      <b>{selected[3]}</b>
                      {'. '}
                    </span>,
                  );
                  bits.push(
                    <span key="b">
                      {billable
                        ? 'This is a billable code'
                        : 'This is a non-billable category or header code and cannot be reported on a claim on its own'}
                      {needsUse.length || needsFirst.length ? ', but ' : '. '}
                    </span>,
                  );
                  if (needsFirst.length) {
                    bits.push(
                      <span key="f">
                        it requires the underlying condition to be sequenced first (
                        <b>{needsFirst[0]}</b>){needsUse.length ? ', and ' : '. '}
                      </span>,
                    );
                  }
                  if (needsUse.length) {
                    bits.push(
                      <span key="u">
                        {'it requires an additional code to identify '}
                        <b>{fmt(needsUse)}</b>
                        {'. '}
                      </span>,
                    );
                  }
                  if (needsAlso.length) {
                    bits.push(
                      <span key="a">
                        {'The Tabular also directs you to code '}
                        <b>{fmt(needsAlso)}</b>
                        {'. '}
                      </span>,
                    );
                  }
                  if (hasEx1.length) {
                    bits.push(
                      <span key="x">
                        {
                          'An Excludes1 note applies, so it is never reported together with the conditions listed below. '
                        }
                      </span>,
                    );
                  }
                  if (!billable && !needsUse.length && !needsFirst.length) {
                    bits.push(<span key="m">{'Assign a more specific code beneath it. '}</span>);
                  }
                  if (isExtCause(selected)) {
                    const ch = selected[2].charAt(0);
                    const kind =
                      ch === 'Y' && /place of occurrence/i.test(selected[3])
                        ? 'place of occurrence'
                        : ch === 'Y' && /^Y93/.test(selected[2])
                          ? 'activity'
                          : ch === 'Y' && /^Y99/.test(selected[2])
                            ? 'external cause status'
                            : 'cause of injury';
                    bits.push(
                      <span key="e">
                        This is an external cause code (<b>{kind}</b>
                        {'). It is '}
                        <b>never a first-listed or principal diagnosis</b>
                        {' \u2014 report it after the injury or condition it explains.'}
                        {/^Y9[239]/.test(selected[2])
                          ? ' Place of occurrence, activity and status are each reported once, at the initial encounter only.'
                          : ''}
                      </span>,
                    );
                  }

                  const summary = (
                    <div
                      style={{
                        background: 'var(--tone-0f2f56)',
                        color: 'var(--color-white)',
                        borderRadius: 10,
                        padding: '13px 16px',
                        marginTop: 14,
                        lineHeight: 1.65,
                        fontSize: 13.5,
                      }}
                    >
                      {bits}
                    </div>
                  );

                  return (
                    <div>
                      {summary}
                      {groups.length > 0 && (
                        <div
                          style={{
                            marginTop: 14,
                            borderTop: '1px solid var(--line-soft)',
                            paddingTop: 12,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 800,
                              color: 'var(--muted)',
                              letterSpacing: 0.6,
                              marginBottom: 8,
                            }}
                          >
                            TABULAR LIST INSTRUCTIONAL NOTES
                          </div>
                          {groups.map((g, gi) => (
                            <div key={gi} style={{ marginBottom: 10 }}>
                              {!g.self && (
                                <div
                                  style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 5 }}
                                >
                                  {'Inherited from category '}
                                  <span
                                    style={{
                                      fontWeight: 800,
                                      color: 'var(--navy)',
                                      fontFamily: "'SF Mono',monospace",
                                    }}
                                  >
                                    {g.code}
                                  </span>
                                  {' \u2014 applies to every code beneath it.'}
                                </div>
                              )}
                              {ORDER.filter((k) => g.notes[k]).map((k) => {
                                const M = META[k];
                                return (
                                  <div
                                    key={k}
                                    style={{
                                      background: M.bg,
                                      border: '1px solid ' + M.bd,
                                      borderRadius: 8,
                                      padding: '8px 11px',
                                      marginBottom: 6,
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: 'flex',
                                        alignItems: 'baseline',
                                        gap: 8,
                                        flexWrap: 'wrap',
                                        marginBottom: 4,
                                      }}
                                    >
                                      <span
                                        style={{ fontSize: 11, fontWeight: 800, color: M.color }}
                                      >
                                        {M.label}
                                      </span>
                                      {M.hint && (
                                        <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>
                                          {M.hint}
                                        </span>
                                      )}
                                    </div>
                                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                                      {g.notes[k].map((t, ti) => (
                                        <li
                                          key={ti}
                                          style={{
                                            fontSize: 12.5,
                                            color: 'var(--ink)',
                                            lineHeight: 1.5,
                                          }}
                                        >
                                          {t}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
            {/* results list */}
            {!fam && (
              <div
                style={{
                  background: 'var(--color-white)',
                  border: '1px solid var(--line)',
                  borderRadius: 12,
                  overflow: 'hidden',
                }}
              >
                {q.trim().length < 2 ? (
                  <div
                    style={{
                      padding: '34px 20px',
                      textAlign: 'center',
                      color: 'var(--muted)',
                      fontSize: 13.5,
                    }}
                  >
                    Start typing to search the codebook. Try "diabetes", "fracture radius",
                    "colonoscopy", or a partial code like "S52".
                  </div>
                ) : results.length === 0 ? (
                  <div
                    style={{
                      padding: '34px 20px',
                      textAlign: 'center',
                      color: 'var(--muted)',
                      fontSize: 13.5,
                    }}
                  >
                    {dbStatus === 'ready'
                      ? 'No matches. Try fewer or different words, or a code prefix.'
                      : 'Loading code database\u2026'}
                  </div>
                ) : (
                  results.map((r, i) => (
                    <div
                      key={i}
                      onClick={() => {
                        setSelected(r);
                        setCopied(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '11px 16px',
                        cursor: 'pointer',
                        borderBottom:
                          i < results.length - 1 ? '1px solid var(--line-soft)' : 'none',
                        background: selected && selected[2] === r[2] ? 'var(--tone-eef4fb)' : 'var(--color-white)',
                      }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 800,
                          color: 'var(--navy)',
                          fontFamily: "'SF Mono',monospace",
                          minWidth: 82,
                        }}
                      >
                        {r[2]}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: 'var(--color-white)',
                          background: SYS[r[0]].color,
                          padding: '2px 7px',
                          borderRadius: 4,
                          minWidth: 44,
                          textAlign: 'center',
                        }}
                      >
                        {SYS[r[0]].short}
                      </span>
                      {onInsert && !(isHH && r[0] !== 0) && (
                        <button
                          onClick={(ev) => {
                            ev.stopPropagation();
                            onInsert(r);
                            setAdded(r[2]);
                            setTimeout(() => setAdded(''), 1100);
                          }}
                          title={'Add ' + r[2] + ' to the chart'}
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            padding: '2px 9px',
                            borderRadius: 5,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            border: '1px solid ' + (added === r[2] ? 'var(--ok)' : 'var(--teal)'),
                            background: added === r[2] ? 'var(--ok)' : 'var(--color-white)',
                            color: added === r[2] ? 'var(--color-white)' : 'var(--teal-d)',
                          }}
                        >
                          {added === r[2] ? '\u2713 added' : '+ add'}
                        </button>
                      )}
                      {isAddOn(r) ? (
                        <span
                          title="Add-on code — never reported alone, and exempt from modifier 51"
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            color: 'var(--tone-7a5ab8)',
                            background: 'var(--tone-f5f1fc)',
                            border: '1px solid var(--tone-ded2f2)',
                            padding: '2px 6px',
                            borderRadius: 4,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          + ADD-ON
                        </span>
                      ) : null}
                      {isExtCause(r) ? (
                        <span
                          title="External cause of morbidity — never a first-listed diagnosis"
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            color: 'var(--tone-9a6b12)',
                            background: 'var(--tone-fff2cf)',
                            border: '1px solid var(--tone-e3bd5c)',
                            padding: '2px 6px',
                            borderRadius: 4,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          ⚠ EXT CAUSE
                        </span>
                      ) : null}
                      <span style={{ fontSize: 13, color: 'var(--ink)', flex: 1 }}>{r[3]}</span>
                      {(r[4] === 1 || r[4] === '1') && (
                        <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--ok)' }}>●</span>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
            {!fam && q.trim().length >= 2 && results.length > 0 && (
              <div
                style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8, textAlign: 'right' }}
              >
                {'Showing top ' +
                  results.length +
                  ' matches \u00b7 click a row for full detail and copy'}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
