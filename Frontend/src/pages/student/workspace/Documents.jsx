/* CODIVIA workspace — source documents: list, viewer, find, evidence highlights, select-to-link. */
import { useEffect, useRef, useState } from 'react';
import { parseRecordSections } from './recordSections.js';

// The left list, grouped like Epic Chart Review. A document lands in the first group whose
// pattern matches its title; everything else is "Chart". Empty groups say "No records found".
const DOC_GROUPS = [
  { key: 'lab', label: 'Pathology & Lab', re: /\blab|patholog|specimen|blood work|biopsy|cytolog/i },
  { key: 'rad', label: 'Radiology', re: /radiolog|imaging|x-?ray|\bct\b|\bmri\b|ultrasound|sonogra|mammogra/i },
  { key: 'op', label: 'Operative procedure', re: /operative|\bop note|procedure note|surgical note|surgery/i },
];
const groupOf = (d) => (d.isQuery ? 'chart' : (DOC_GROUPS.find((g) => g.re.test(d.title)) || { key: 'chart' }).key);
export const PREV_PREFIX = 'prev:';
const CAT_PREFIX = 'cat:';

// Right box for a category: its records as cards. Previous records carry codes, so clicking one
// fills them into Coding ("View record" opens it); the others just open the record.
function RecordList({ cat, onOpen, onUseCodes }) {
  return (
    <div className="wsx-reclist">
      <div className="rh">
        <h3>{cat.label}</h3>
        <span>{cat.coded ? 'Click a record to fill its codes into Coding' : 'Click a record to see the details'}</span>
      </div>
      {!cat.items.length ? (
        <div className="wsx-norec">No records found</div>
      ) : (
        cat.items.map((d) => {
          const r = d.prev;
          const codes = (r && r.codes) || [];
          return (
            <div
              key={d.key}
              role="button"
              tabIndex={0}
              className="rc"
              onClick={() => (cat.coded ? onUseCodes(r) : onOpen(d.key))}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), cat.coded ? onUseCodes(r) : onOpen(d.key))}
              title={cat.coded ? 'Fill these codes into Coding' : 'Open this record'}
            >
              <div className="rt">
                <b>{d.title}</b>
                {cat.coded ? (
                  <button
                    type="button"
                    className="lnk"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpen(d.key);
                    }}
                  >
                    View record
                  </button>
                ) : (
                  <span className="go">›</span>
                )}
              </div>
              {d.sub && <small>{d.sub}</small>}
              {cat.coded &&
                (codes.length ? (
                  <div className="codes">
                    {codes.map((c, i) => (
                      <span key={i} className="cc" title={c.desc}>
                        <em>{c.type}</em>
                        {c.code}
                      </span>
                    ))}
                  </div>
                ) : (
                  <small>No codes on this record</small>
                ))}
            </div>
          );
        })
      )}
    </div>
  );
}

// One of the chart's previous medical records ({ key, title, dos, provider, facility, body, codes })
// as a viewable document.
function previousDoc(r, i) {
  return { key: PREV_PREFIX + (r.key || i), title: r.title || 'Previous record', sub: [r.dos, r.provider].filter(Boolean).join(' · '), sections: parseRecordSections(r.body || ''), prev: r };
}

// Split one line of text into plain / evidence / find segments (evidence wins on overlap).
function segments(text, evid, find) {
  const marks = [];
  evid.forEach((e) => {
    const at = e.text && text.indexOf(e.text);
    if (at >= 0) marks.push({ s: at, e: at + e.text.length, kind: 'ev', ev: e });
  });
  const q = (find || '').trim().toLowerCase();
  if (q.length >= 2) {
    const low = text.toLowerCase();
    let i = low.indexOf(q);
    while (i >= 0) {
      marks.push({ s: i, e: i + q.length, kind: 'find' });
      i = low.indexOf(q, i + q.length);
    }
  }
  marks.sort((a, b) => a.s - b.s || (a.kind === 'ev' ? -1 : 1));
  const out = [];
  let pos = 0;
  marks.forEach((m) => {
    if (m.s < pos) return;
    if (m.s > pos) out.push({ t: text.slice(pos, m.s) });
    out.push({ t: text.slice(m.s, m.e), kind: m.kind, ev: m.ev });
    pos = m.e;
  });
  if (pos < text.length) out.push({ t: text.slice(pos) });
  return out;
}

function Line({ text, evid, find, onEvClick }) {
  if (!text.trim()) return <p>&nbsp;</p>;
  return (
    <p>
      {segments(text, evid, find).map((s, i) =>
        s.kind === 'ev' ? (
          <mark key={i} className="ev" data-ev={s.ev.id} title={'Evidence for ' + s.ev.code} onClick={() => onEvClick(s.ev)}>
            {s.t}
          </mark>
        ) : s.kind === 'find' ? (
          <mark key={i} className="find">
            {s.t}
          </mark>
        ) : (
          <span key={i}>{s.t}</span>
        ),
      )}
    </p>
  );
}

// Top of a previous record: when / who, its final codes, and "Use these codes".
function PreviousHead({ r, onUse }) {
  const codes = r.codes || [];
  return (
    <div className="wsx-prevhead">
      <div className="t">
        <span className="pill gray">Previous record</span>
        <b>{r.title || 'Previous record'}</b>
      </div>
      <div className="m">{[r.dos && 'Date of service: ' + r.dos, r.provider, r.facility].filter(Boolean).join(' · ')}</div>
      {codes.length ? (
        <>
          <div className="codes">
            {codes.map((c, i) => (
              <span key={i} className="cc" title={c.desc}>
                <em>{c.type}</em>
                {c.code}
              </span>
            ))}
          </div>
          <button type="button" className="btn sm primary" onClick={onUse}>
            Use these codes
          </button>
        </>
      ) : (
        <div className="muted">No codes on this record.</div>
      )}
    </div>
  );
}

function Burger({ open, onClick, count }) {
  return (
    <button type="button" className={'wsx-burger' + (open ? ' on' : '')} onClick={onClick} aria-expanded={open} aria-label={open ? 'Close documents' : 'Open documents'} title={open ? 'Close documents' : 'Open documents'}>
      <span className="bars" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      {!open && count ? <span className="cnt">{count}</span> : null}
    </button>
  );
}

export function DocumentsPanel(props) {
  // Collapsed by default: a slim column with a hamburger that opens the full panel.
  if (!props.open) {
    return (
      <div className="wsx-docrail">
        <Burger open={false} count={props.docs.length} onClick={() => props.setOpen(true)} />
        <span className="lbl" aria-hidden="true">Documents</span>
      </div>
    );
  }
  return <DocumentsOpen {...props} />;
}

function DocumentsOpen({ docs, active, onOpen, evidence, linkTargets, onLink, onSearchText, find, setFind, flash, handwritten, findRef, toast, setOpen, previous, onUseCodes }) {
  const prevDocs = (previous || []).map(previousDoc);
  // Left list: the chart's own documents, then one entry per category. A category opens a list of
  // its records in the right box; a record opens its details (previous records: fills the codes).
  const cats = [
    ...DOC_GROUPS.map((g) => ({ key: CAT_PREFIX + g.key, label: g.label, items: docs.filter((d) => groupOf(d) === g.key) })),
    { key: CAT_PREFIX + 'prev', label: 'Previous records', items: prevDocs, coded: true },
  ];
  const cat = cats.find((c) => c.key === active);
  const doc = cat ? null : docs.find((d) => d.key === active) || prevDocs.find((d) => d.key === active) || docs[0];
  const parentCat = doc && cats.find((c) => c.items.some((d) => d.key === doc.key));
  const isPrev = !!(doc && doc.prev);
  const viewKey = cat ? cat.key : doc.key;
  const bodyRef = useRef(null);
  const [pop, setPop] = useState(null); // { x, y, text }
  const evid = !doc || isPrev ? [] : evidence.filter((e) => e.doc === doc.key);
  const chartDocs = docs.filter((d) => groupOf(d) === 'chart');

  const navButton = (key, title, sub, extra) => {
    const n = evidence.filter((e) => e.doc === key).length;
    const on = key === viewKey || (parentCat && parentCat.key === key);
    return (
      <button key={key} type="button" className={'d' + (on ? ' on' : '') + (extra || '')} onClick={() => onOpen(key)} aria-current={on}>
        {n ? <span className="evn" title="Evidence links">{n}</span> : null}
        <b>{title}</b>
        {sub ? <small>{sub}</small> : null}
      </button>
    );
  };

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [viewKey]);
  useEffect(() => {
    if (!flash) return;
    const m = bodyRef.current && bodyRef.current.querySelector(`mark[data-ev="${flash}"]`);
    if (m) {
      m.scrollIntoView({ block: 'center', behavior: 'smooth' });
      m.classList.add('flash');
      setTimeout(() => m.classList.remove('flash'), 1600);
    }
  }, [flash, viewKey]);
  useEffect(() => {
    const q = (find || '').trim();
    if (q.length < 2 || !bodyRef.current) return;
    const m = bodyRef.current.querySelector('mark.find');
    if (m) m.scrollIntoView({ block: 'center' });
  }, [find, viewKey]);
  useEffect(() => {
    if (!pop) return undefined;
    const close = (e) => {
      if (!e.target.closest('.wsx-selpop')) setPop(null);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [pop]);

  const onMouseUp = () => {
    const sel = window.getSelection();
    const text = sel ? sel.toString().trim() : '';
    if (!text || text.length < 3 || !bodyRef.current || !bodyRef.current.contains(sel.anchorNode)) return;
    const r = sel.getRangeAt(0).getBoundingClientRect();
    setPop({ x: Math.max(8, Math.min(r.left, window.innerWidth - 330)), y: Math.min(r.bottom + 6, window.innerHeight - 220), text: text.slice(0, 400) });
  };

  return (
    <div className="card panel">
      <div className="ph">
        <Burger open={true} onClick={() => setOpen(false)} />
        <h2>Documents</h2>
        <div className="r">
          <input ref={findRef} className="inp" style={{ height: 32, width: 200 }} value={find} onChange={(e) => setFind(e.target.value)} placeholder="Find in document  (Ctrl+F)" aria-label="Find in document" />        </div>
      </div>
      <div className="wsx-docs">
        <nav className="wsx-doclist" aria-label="Documents">
          {chartDocs.map((d) => navButton(d.key, d.title, d.sub, d.isQuery ? ' query' : ''))}
          <div className="wsx-docsep" />
          {cats.map((c) => navButton(c.key, c.label, c.items.length ? c.items.length + ' record' + (c.items.length > 1 ? 's' : '') : 'No records', ' cat'))}
        </nav>
        {cat ? (
          <div className="pb" ref={bodyRef}>
            <RecordList cat={cat} onOpen={onOpen} onUseCodes={onUseCodes} />
          </div>
        ) : (
        <div className="pb" ref={bodyRef} onMouseUp={isPrev ? undefined : onMouseUp}>
          <article className={'wsx-doc' + (handwritten && !isPrev ? ' hw' : '')}>
            {parentCat && (
              <button type="button" className="wsx-back" onClick={() => onOpen(parentCat.key)}>
                ← {parentCat.label}
              </button>
            )}
            {isPrev && <PreviousHead r={doc.prev} onUse={() => onUseCodes(doc.prev)} />}
            {handwritten && !isPrev && <div className="pill warn" style={{ marginBottom: 10 }}>✎ Scanned handwritten chart — transcribe from the note</div>}
            {doc.sections.map((s, i) => (
              <section key={i}>
                {s.head !== 'RECORD' && <h5>{s.head}</h5>}
                {String(s.body || '')
                  .split('\n')
                  .map((line, k) => (
                    <Line key={k} text={line} evid={evid} find={find} onEvClick={(ev) => toast(`Evidence for ${ev.code}: “${ev.text.slice(0, 60)}”`)} />
                  ))}
              </section>
            ))}
          </article>
        </div>
        )}
      </div>
      <div className="wsx-tip">Tip: select text in a document to link it as evidence for a code, or to search it in the encoder.</div>
      {pop && (
        <div className="wsx-selpop" style={{ left: pop.x, top: pop.y }} role="menu">
          <div className="h">
            Link “{pop.text.slice(0, 40)}
            {pop.text.length > 40 ? '…' : ''}” as evidence for
          </div>
          {linkTargets.length ? (
            linkTargets.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  onLink(doc.key, pop.text, t);
                  window.getSelection().removeAllRanges();
                  setPop(null);
                }}
              >
                <span className="code">{t.code}</span> {String(t.desc || '').slice(0, 40)}
              </button>
            ))
          ) : (
            <div className="h">Add a diagnosis or procedure first.</div>
          )}
          <button
            type="button"
            onClick={() => {
              onSearchText(pop.text);
              setPop(null);
            }}
          >
            ⌕ Search the encoder for this text
          </button>
        </div>
      )}
    </div>
  );
}
