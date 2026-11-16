/* CODIVIA workspace — source documents: list, viewer, find, evidence highlights, select-to-link. */
import { useEffect, useRef, useState } from 'react';

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

export function DocumentsPanel({ docs, active, onOpen, evidence, linkTargets, onLink, onSearchText, find, setFind, flash, handwritten, findRef, toast }) {
  const doc = docs.find((d) => d.key === active) || docs[0];
  const bodyRef = useRef(null);
  const [pop, setPop] = useState(null); // { x, y, text }
  const evid = evidence.filter((e) => e.doc === doc.key);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [doc.key]);
  useEffect(() => {
    if (!flash) return;
    const m = bodyRef.current && bodyRef.current.querySelector(`mark[data-ev="${flash}"]`);
    if (m) {
      m.scrollIntoView({ block: 'center', behavior: 'smooth' });
      m.classList.add('flash');
      setTimeout(() => m.classList.remove('flash'), 1600);
    }
  }, [flash, doc.key]);
  useEffect(() => {
    const q = (find || '').trim();
    if (q.length < 2 || !bodyRef.current) return;
    const m = bodyRef.current.querySelector('mark.find');
    if (m) m.scrollIntoView({ block: 'center' });
  }, [find, doc.key]);
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
        <h2>Documents</h2>
        <div className="r">
          <input ref={findRef} className="inp" style={{ height: 32, width: 200 }} value={find} onChange={(e) => setFind(e.target.value)} placeholder="Find in document  (Ctrl+F)" aria-label="Find in document" />
        </div>
      </div>
      <div className="wsx-docs">
        <nav className="wsx-doclist" aria-label="Documents">
          {docs.map((d) => {
            const n = evidence.filter((e) => e.doc === d.key).length;
            return (
              <button key={d.key} type="button" className={'d' + (d.key === doc.key ? ' on' : '') + (d.isQuery ? ' query' : '')} onClick={() => onOpen(d.key)} aria-current={d.key === doc.key}>
                {n ? <span className="evn" title="Evidence links">{n}</span> : null}
                <b>{d.title}</b>
                {d.sub ? <small>{d.sub}</small> : null}
              </button>
            );
          })}
        </nav>
        <div className="pb" ref={bodyRef} onMouseUp={onMouseUp}>
          <article className={'wsx-doc' + (handwritten ? ' hw' : '')}>
            {handwritten && <div className="pill warn" style={{ marginBottom: 10 }}>✎ Scanned handwritten chart — transcribe from the note</div>}
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
