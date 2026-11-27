/* CODIVIA EHR shell — a report / note body: section headings and text, with "find" highlights. */
function Highlight({ text, find }) {
  const q = (find || '').trim();
  if (q.length < 2) return text;
  const parts = [];
  const low = text.toLowerCase();
  const ql = q.toLowerCase();
  let at = 0;
  let i = low.indexOf(ql);
  while (i >= 0) {
    parts.push(text.slice(at, i), <mark key={i}>{text.slice(i, i + q.length)}</mark>);
    at = i + q.length;
    i = low.indexOf(ql, at);
  }
  parts.push(text.slice(at));
  return parts;
}

export function ReportView({ title, meta, sections, find, actions }) {
  return (
    <article className="ehr-report">
      {title && (
        <header>
          <h3>{title}</h3>
          {meta && <div className="meta">{meta}</div>}
          {actions && <div className="acts">{actions}</div>}
        </header>
      )}
      {(sections || []).map((s, i) => (
        <section key={i}>
          {s.head && s.head !== 'RECORD' && <h5>{s.head}</h5>}
          {String(s.body || '')
            .split('\n')
            .map((line, k) => (
              <p key={k}>{line ? <Highlight text={line} find={find} /> : ' '}</p>
            ))}
        </section>
      ))}
      {!(sections || []).length && <p className="ehr-empty">No text in this record.</p>}
    </article>
  );
}
