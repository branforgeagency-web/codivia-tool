import React from 'react';

// ---- Coding Guidelines: reference for ICD-10-CM, CPT, HCPCS and ICD-10-PCS ----
export function CodingGuide() {
  const ORDER = ['icd', 'cpt', 'pcs', 'hcpcs'];
  const [set, setSet] = React.useState('icd');
  const [open, setOpen] = React.useState({});
  const [q, setQ] = React.useState('');
  const g = CODING_GUIDE[set];

  const ql = q.trim().toLowerCase();
  const items = React.useMemo(() => {
    const all = g.chapters;
    if (!ql) return all;
    return all.filter((c) => {
      let hay = (c.ref || '') + ' ' + c.t + ' ' + c.r + ' ' + c.i;
      (c.s || []).forEach((sb) => {
        hay += ' ' + sb.ref + ' ' + sb.t + ' ' + (sb.b || '') + ' ' + (sb.p || []).join(' ');
      });
      return hay.toLowerCase().indexOf(ql) !== -1;
    });
  }, [g, ql]);

  const opened = (k) => (ql ? true : !!open[set + ':' + k]);
  const toggle = (k) =>
    setOpen((o) => Object.assign({}, o, { [set + ':' + k]: !o[set + ':' + k] }));
  const ruleCount = (c) => (c.s || []).reduce((n, sb) => n + (sb.p || []).length, 0);

  const setBtn = (id) => {
    const c = CODING_GUIDE[id];
    const on = set === id;
    return (
      <button
        key={id}
        onClick={() => {
          setSet(id);
          setQ('');
        }}
        style={{
          flex: '1 1 160px',
          textAlign: 'left',
          padding: '11px 14px',
          borderRadius: 10,
          cursor: 'pointer',
          border: '2px solid ' + (on ? c.color : 'var(--line)'),
          background: on ? c.color + '12' : 'var(--color-white)',
        }}
      >
        <div style={{ fontSize: 13.5, fontWeight: 800, color: on ? c.color : 'var(--ink)' }}>
          {c.label}
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{c.sub}</div>
      </button>
    );
  };

  return (
    <div className="page">
      <div className="page-head">
        <h1>Coding Guidelines</h1>
        <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: 13 }}>
          Chapter-by-chapter guidance, laid out the way the codebooks are. Open a chapter to see its
          numbered guideline subsections.
        </p>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {ORDER.map(setBtn)}
      </div>
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <input
          value={q}
          placeholder={
            'Search ' +
            g.label +
            ' \u2014 e.g. sepsis, hypertension, modifier 25, 7th character\u2026'
          }
          onChange={(ev) => setQ(ev.target.value)}
          style={{
            width: '100%',
            padding: '11px 14px',
            fontSize: 14,
            border: '1px solid var(--line)',
            borderRadius: 10,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        <span
          style={{ position: 'absolute', right: 14, top: 12, fontSize: 11, color: 'var(--muted)' }}
        >
          {items.length + ' of ' + g.chapters.length}
        </span>
      </div>
      {items.length === 0 ? (
        <div
          className="card"
          style={{
            padding: '28px 16px',
            textAlign: 'center',
            color: 'var(--muted)',
            fontSize: 13.5,
          }}
        >
          {'Nothing matches that term in ' + g.label + '. Try a shorter word or another code set.'}
        </div>
      ) : (
        <div>
          {items.map((c, ci) => {
            const isOpen = opened(c.r);
            return (
              <div key={ci} className="card" style={{ marginBottom: 10, overflow: 'hidden' }}>
                <div
                  onClick={() => toggle(c.r)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 11,
                    padding: '13px 16px',
                    cursor: 'pointer',
                    borderLeft: '4px solid ' + g.color,
                  }}
                >
                  <span style={{ fontSize: 12, color: 'var(--muted)', minWidth: 12 }}>
                    {isOpen ? '\u25be' : '\u25b8'}
                  </span>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 800,
                      color: 'var(--color-white)',
                      background: g.color,
                      padding: '3px 8px',
                      borderRadius: 5,
                      whiteSpace: 'nowrap',
                      fontFamily: "'SF Mono',monospace",
                    }}
                  >
                    {c.r}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--navy)' }}>
                      {(typeof c.n === 'number' ? 'Chapter ' + c.n + ' \u2014 ' : '') + c.t}
                    </div>
                    {c.ref && c.ref !== c.r && (
                      <div
                        style={{
                          fontSize: 10.5,
                          color: 'var(--muted)',
                          marginTop: 1,
                          fontFamily: "'SF Mono',monospace",
                        }}
                      >
                        {c.ref}
                      </div>
                    )}
                  </div>
                  {!isOpen && (
                    <span style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                      {(c.s || []).length + ' sections \u00b7 ' + ruleCount(c) + ' rules'}
                    </span>
                  )}
                </div>
                {isOpen && (
                  <div style={{ padding: '0 18px 16px 18px' }}>
                    <p
                      style={{
                        fontSize: 13,
                        color: 'var(--ink)',
                        lineHeight: 1.65,
                        margin: '0 0 14px',
                        paddingLeft: 16,
                        borderLeft: '2px solid ' + g.color + '40',
                      }}
                    >
                      {c.i}
                    </p>
                    {(c.s || []).map((sb, si) => (
                      <div key={si} style={{ marginBottom: 14, paddingLeft: 16 }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'baseline',
                            gap: 8,
                            marginBottom: 4,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 800,
                              color: g.color,
                              fontFamily: "'SF Mono',monospace",
                              minWidth: 22,
                            }}
                          >
                            {(c.ref && typeof c.n === 'number' ? c.ref + '.' : '') + sb.ref}
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--navy)' }}>
                            {sb.t}
                          </span>
                        </div>
                        {sb.b && (
                          <p
                            style={{
                              fontSize: 12.5,
                              color: 'var(--muted)',
                              lineHeight: 1.6,
                              margin: '0 0 7px',
                              paddingLeft: 30,
                            }}
                          >
                            {sb.b}
                          </p>
                        )}
                        <ul style={{ margin: 0, paddingLeft: 48 }}>
                          {(sb.p || []).map((pt, pi) => (
                            <li
                              key={pi}
                              style={{
                                fontSize: 12.5,
                                color: 'var(--ink)',
                                lineHeight: 1.6,
                                marginBottom: 5,
                              }}
                            >
                              {pt}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 14, lineHeight: 1.6 }}>
        CODIVIA teaching reference. The chapter and section structure follows the official code sets
        so students learn to navigate the real books; all guidance is summarised in CODIVIA’s own
        words and is not a reproduction of the ICD-10-CM Official Guidelines, the AMA CPT codebook,
        or any other publication. For production coding, always verify against the current official
        guidelines and your payer policies.
      </div>
    </div>
  );
}

// route: /guidelines
export default function CodingGuidelinesPage() {
  return <CodingGuide />;
}
